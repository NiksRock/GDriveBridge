// ============================================================
// Idempotent Copy Service — Enterprise Safe + Folder Hardened
//
// Satisfies:
// - DEFT §7 (Exactly-once semantics)
// - DEFT §8 (Folder-safe execution)
// - DEFT §11.1 (Distributed throttle)
// - DEFT §11.2 (700GB/day limit)
// - DEFT §6 (Crash-safe resumability)
// ============================================================

import { drive_v3 } from 'googleapis';
import { PrismaClient } from '@prisma/client';
import { TransferStatus } from '@gdrivebridge/shared';
import { RateGovernor } from './rate-governor.service';
import { QUEUE_NAMES } from '@gdrivebridge/shared';
import dayjs from 'dayjs';

interface GoogleApiError extends Error {
  response?: {
    status?: number;
  };
}

export class IdempotentCopyService {
  private readonly MAX_RETRIES = 5;
  private readonly DAILY_LIMIT_BYTES = BigInt(700) * BigInt(1024 ** 3);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly destinationDrive: drive_v3.Drive,
    private readonly rateGovernor: RateGovernor,
    private readonly accountId: string,
  ) {}

  // ============================================================
  // Retryable Detection
  // ============================================================

  private isRetryable(error: unknown): boolean {
    const err = error as GoogleApiError;
    const status = err.response?.status ?? 0;
    return [429, 500, 503].includes(status);
  }

  // ============================================================
  // Daily Reset
  // ============================================================

  private async ensureDailyReset() {
    const account = await this.prisma.googleAccount.findUnique({
      where: { id: this.accountId },
    });

    if (!account) return;

    const today = dayjs().startOf('day');

    if (!account.lastQuotaReset || dayjs(account.lastQuotaReset).isBefore(today)) {
      await this.prisma.googleAccount.update({
        where: { id: this.accountId },
        data: {
          dailyBytesTransferred: BigInt(0),
          lastQuotaReset: new Date(),
        },
      });
    }
  }

  // ============================================================
  // Atomic Quota Enforcement
  // ============================================================

  private async incrementAndValidateQuota(transferId: string, bytes: bigint) {
    await this.ensureDailyReset();

    const updated = await this.prisma.googleAccount.updateMany({
      where: {
        id: this.accountId,
        dailyBytesTransferred: {
          lt: this.DAILY_LIMIT_BYTES - bytes,
        },
      },
      data: {
        dailyBytesTransferred: { increment: bytes },
      },
    });

    if (updated.count === 0) {
      await this.prisma.transferJob.update({
        where: { id: transferId },
        data: {
          status: TransferStatus.AUTO_PAUSED_QUOTA,
          pausedAt: new Date(),
        },
      });

      const { quotaResumeQueue } = await import('../queue/quota-resume.queue');

      await quotaResumeQueue.add(
        QUEUE_NAMES.QUOTA_RESUME,
        { transferId },
        {
          delay: 24 * 60 * 60 * 1000,
          jobId: `quota-resume-${transferId}`,
        },
      );

      throw new Error('Daily 700GB quota exceeded — transfer auto-paused');
    }
  }

  // ============================================================
  // Exactly-Once File Copy
  // ============================================================

  async copyExactlyOnce(params: {
    itemId: string;
    sourceFileId: string;
    destinationFolderId: string;
    fileName: string;
  }): Promise<string> {
    const { itemId, sourceFileId, destinationFolderId, fileName } = params;

    const item = await this.prisma.transferItem.findUnique({
      where: { id: itemId },
    });

    if (!item) throw new Error('TransferItem not found');

    // 1️⃣ DB CHECK
    if (item.destinationFileId) return item.destinationFileId;

    const fileSize = item.sizeBytes ?? BigInt(0);

    // 2️⃣ API VERIFICATION
    const safeName = fileName.replace(/'/g, "\\'");

    const existing = await this.destinationDrive.files.list({
      q: `
        name='${safeName}'
        and '${destinationFolderId}' in parents
        and trashed=false
      `,
      fields: 'files(id,size,appProperties)',
    });

    const match = existing.data.files?.find(
      (f) => f.appProperties?.app_id === 'gdrivebridge_v2',
    );

    if (match?.id) {
      const remoteSize = match.size ? BigInt(match.size) : BigInt(0);

      if (remoteSize === fileSize) {
        await this.prisma.transferItem.update({
          where: { id: itemId },
          data: {
            destinationFileId: match.id,
            status: 'COMPLETED',
          },
        });

        await this.prisma.transferEvent.create({
          data: {
            jobId: item.jobId,
            type: 'automatic.recovery',
            message: `Recovered existing file ${fileName}`,
          },
        });

        return match.id;
      }

      // Corrupt fragment
      await this.rateGovernor.throttle(this.accountId);
      await this.destinationDrive.files.delete({ fileId: match.id });

      await this.prisma.transferEvent.create({
        data: {
          jobId: item.jobId,
          type: 'automatic.recovery',
          message: `Deleted corrupt fragment for ${fileName}`,
        },
      });
    }

    // 3️⃣ SAFE COPY
    let attempt = 0;

    while (attempt < this.MAX_RETRIES) {
      try {
        await this.rateGovernor.throttle(this.accountId);

        const copied = await this.destinationDrive.files.copy({
          fileId: sourceFileId,
          requestBody: {
            name: fileName,
            parents: [destinationFolderId],
            appProperties: {
              app_id: 'gdrivebridge_v2',
            },
          },
          fields: 'id',
        });

        const newId = copied.data.id;
        if (!newId) throw new Error('Google API returned empty file ID');

        await this.incrementAndValidateQuota(item.jobId, fileSize);

        await this.prisma.transferItem.update({
          where: { id: itemId },
          data: {
            destinationFileId: newId,
            status: 'COMPLETED',
          },
        });

        return newId;
      } catch (error) {
        if (this.isRetryable(error)) {
          attempt++;
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
          continue;
        }

        throw error;
      }
    }

    throw new Error('Max retry attempts exceeded');
  }

  // ============================================================
  // Exactly-Once Folder Create
  // ============================================================

  async createFolderExactlyOnce(params: {
    itemId: string;
    folderName: string;
    destinationParentId: string;
  }): Promise<string> {
    const { itemId, folderName, destinationParentId } = params;

    const item = await this.prisma.transferItem.findUnique({
      where: { id: itemId },
    });

    if (!item) throw new Error('TransferItem not found');

    if (item.destinationFileId) return item.destinationFileId;

    const safeName = folderName.replace(/'/g, "\\'");

    const existing = await this.destinationDrive.files.list({
      q: `
        name='${safeName}'
        and '${destinationParentId}' in parents
        and mimeType='application/vnd.google-apps.folder'
        and trashed=false
      `,
      fields: 'files(id,appProperties)',
    });

    const match = existing.data.files?.find(
      (f) => f.appProperties?.app_id === 'gdrivebridge_v2',
    );

    if (match?.id) {
      await this.prisma.transferItem.update({
        where: { id: itemId },
        data: {
          destinationFileId: match.id,
          status: 'COMPLETED',
        },
      });

      return match.id;
    }

    await this.rateGovernor.throttle(this.accountId);

    const created = await this.destinationDrive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [destinationParentId],
        appProperties: {
          app_id: 'gdrivebridge_v2',
        },
      },
      fields: 'id',
    });

    const newId = created.data.id;
    if (!newId) throw new Error('Folder creation failed');

    await this.prisma.transferItem.update({
      where: { id: itemId },
      data: {
        destinationFileId: newId,
        status: 'COMPLETED',
      },
    });

    return newId;
  }
}
