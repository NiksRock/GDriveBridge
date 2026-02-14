// ============================================================
// Idempotent Copy Service (Enterprise Fault-Tolerant)
// Implements:
// - DEFT §7 Exactly-Once Guarantee
// - DEFT §11.1 2.5 writes/sec/account
// - DEFT §4.8 Intelligent Retry + Backoff
// - DEFT §11.2 Auto Pause on Quota Exhaustion
// - DEFT §6 Crash-Safe Resumability
// ============================================================

import { drive_v3 } from 'googleapis';
import { PrismaClient } from '@prisma/client';
import { TransferStatus } from '@gdrivebridge/shared';

// ============================================================
// Google API Error Shape (Strictly Typed)
// ============================================================

interface GoogleApiError extends Error {
  code?: string;
  response?: {
    status?: number;
    data?: {
      error?: {
        errors?: Array<{
          reason?: string;
        }>;
      };
    };
  };
}

// ============================================================
// 2.5 writes/sec Governor (DEFT §11.1)
// ============================================================

class RateGovernor {
  private lastExecution = 0;
  private readonly intervalMs = 400; // 2.5 writes/sec

  async throttle(): Promise<void> {
    const now = Date.now();
    const diff = now - this.lastExecution;

    if (diff < this.intervalMs) {
      await new Promise((resolve) => setTimeout(resolve, this.intervalMs - diff));
    }

    this.lastExecution = Date.now();
  }
}

// ============================================================
// Idempotent Copy Service
// ============================================================

export class IdempotentCopyService {
  private readonly governor = new RateGovernor();
  private readonly MAX_RETRIES = 5;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly destinationDrive: drive_v3.Drive,
  ) {}

  // ============================================================
  // Retryable Error Detection (DEFT §4.8)
  // ============================================================

  private isRetryable(error: unknown): boolean {
    const err = error as GoogleApiError;

    const status = err.response?.status ?? 0;

    if ([429, 500, 503].includes(status)) return true;

    if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
      return true;
    }

    return false;
  }

  // ============================================================
  // Quota Exhaustion Detection (DEFT §11.2)
  // ============================================================

  private isQuotaError(error: unknown): boolean {
    const err = error as GoogleApiError;

    const status = err.response?.status;
    const reason = err.response?.data?.error?.errors?.[0]?.reason ?? '';

    if (
      status === 403 &&
      ['rateLimitExceeded', 'userRateLimitExceeded', 'quotaExceeded'].includes(reason)
    ) {
      return true;
    }

    return false;
  }

  // ============================================================
  // Exactly-Once Copy Execution (DEFT §7)
  // ============================================================

  async copyExactlyOnce(params: {
    itemId: string;
    sourceFileId: string;
    destinationFolderId: string;
    fileName: string;
  }): Promise<string> {
    const { itemId, sourceFileId, destinationFolderId, fileName } = params;

    // 1️⃣ DB Check (Resumability)
    const item = await this.prisma.transferItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new Error('TransferItem not found');
    }

    if (item.destinationFileId) {
      return item.destinationFileId;
    }

    // 2️⃣ Destination Verification (Idempotency)
    const safeName = fileName.replace(/'/g, "\\'");

    const query = `
      name='${safeName}'
      and '${destinationFolderId}' in parents
      and trashed=false
    `;

    const search = await this.destinationDrive.files.list({
      q: query,
      fields: 'files(id,name,appProperties)',
    });

    const found = search.data.files?.find(
      (f) => f.appProperties?.app_id === 'gdrivebridge_v2',
    );

    if (found?.id) {
      await this.prisma.transferItem.update({
        where: { id: itemId },
        data: {
          destinationFileId: found.id,
          status: 'COMPLETED',
        },
      });

      return found.id;
    }

    // 3️⃣ Copy with Intelligent Retry
    let attempt = 0;

    while (attempt < this.MAX_RETRIES) {
      try {
        await this.governor.throttle();

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

        if (!newId) {
          throw new Error('Google API returned empty file ID');
        }

        // Persist result immediately (Crash-safe)
        await this.prisma.transferItem.update({
          where: { id: itemId },
          data: {
            destinationFileId: newId,
            status: 'COMPLETED',
          },
        });

        return newId;
      } catch (error: unknown) {
        // 4️⃣ Quota Handling (Auto Pause)
        if (this.isQuotaError(error)) {
          await this.prisma.transferJob.update({
            where: { id: item.jobId },
            data: {
              status: TransferStatus.AUTO_PAUSED_QUOTA,
              pausedAt: new Date(),
            },
          });

          throw new Error('Quota exceeded. Transfer auto-paused.');
        }

        // 5️⃣ Retryable Error Handling
        if (this.isRetryable(error)) {
          attempt++;

          const delay = Math.pow(2, attempt) * 1000; // exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay));

          continue;
        }

        // Non-retryable
        throw error;
      }
    }

    throw new Error('Max retry attempts exceeded.');
  }
}
