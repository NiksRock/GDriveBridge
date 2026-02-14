// ============================================================
// GDriveBridge Worker — Enterprise Locked Execution Engine
// FIXED VERSION
// ============================================================

import { Worker, Queue } from 'bullmq';
import { QUEUE_NAMES, redisConfig, TransferStatus } from '@gdrivebridge/shared';
import { prisma } from '../db';
import Redis from 'ioredis';

import { GoogleDriveService } from '../services/google-drive.service';
import { IdempotentCopyService } from '../services/idempotent-copy.service';
import { RateGovernor } from '../services/rate-governor.service';
import { AccountLockService } from '../services/account-lock.service';

console.log('🚀 Enterprise Worker started...');

const redisClient = new Redis({
  host: redisConfig.host,
  port: redisConfig.port,
});

const progressPublisher = new Redis({
  host: redisConfig.host,
  port: redisConfig.port,
});

const rateGovernor = new RateGovernor();
const accountLock = new AccountLockService(redisClient);

const verificationQueue = new Queue(QUEUE_NAMES.TRANSFER_EVENTS, {
  connection: redisConfig,
});

new Worker(
  QUEUE_NAMES.TRANSFER,
  async (job) => {
    const { transferId } = job.data;

    const transfer = await prisma.transferJob.findUnique({
      where: { id: transferId },
      include: { destinationAccount: true },
    });

    if (!transfer) return;

    if (
      transfer.status === TransferStatus.CANCELLED ||
      transfer.status === TransferStatus.PAUSED ||
      transfer.status === TransferStatus.AUTO_PAUSED_QUOTA
    ) {
      return;
    }

    const acquired = await accountLock.acquire(transfer.destinationAccountId, transferId);
    if (!acquired) throw new Error('Account busy — retry later');

    try {
      await prisma.transferJob.update({
        where: { id: transferId },
        data: {
          status: TransferStatus.RUNNING,
          startedAt: transfer.startedAt ?? new Date(),
        },
      });

      const destinationDrive = GoogleDriveService.getDriveClient(
        transfer.destinationAccount.refreshTokenEncrypted,
      );

      const copyService = new IdempotentCopyService(
        prisma,
        destinationDrive,
        rateGovernor,
        transfer.destinationAccountId,
      );

      const pendingItems = await prisma.transferItem.findMany({
        where: { jobId: transferId, status: 'PENDING' },
        orderBy: [{ depth: 'asc' }, { createdAt: 'asc' }],
      });

      for (const item of pendingItems) {
        await accountLock.extend(transfer.destinationAccountId, transferId);

        const latest = await prisma.transferJob.findUnique({
          where: { id: transferId },
          select: { status: true },
        });

        if (!latest) return;

        if (
          latest.status === TransferStatus.PAUSED ||
          latest.status === TransferStatus.CANCELLED ||
          latest.status === TransferStatus.AUTO_PAUSED_QUOTA
        ) {
          return;
        }

        try {
          await prisma.transferItem.update({
            where: { id: item.id },
            data: { status: 'RUNNING' },
          });

          let destinationParentId = transfer.destinationFolderId;

          if (item.sourceParentId) {
            const parent = await prisma.transferItem.findFirst({
              where: {
                jobId: transferId,
                sourceFileId: item.sourceParentId,
              },
            });

            if (!parent?.destinationFileId) {
              throw new Error('Parent not ready');
            }

            destinationParentId = parent.destinationFileId;
          }

          if (item.mimeType === 'application/vnd.google-apps.folder') {
            await copyService.createFolderExactlyOnce({
              itemId: item.id,
              folderName: item.fileName,
              destinationParentId,
            });
          } else {
            await copyService.copyExactlyOnce({
              itemId: item.id,
              sourceFileId: item.sourceFileId,
              destinationFolderId: destinationParentId,
              fileName: item.fileName,
            });
          }

          await prisma.transferJob.update({
            where: { id: transferId },
            data: {
              completedItems: { increment: 1 },
              transferredBytes: {
                increment: item.sizeBytes ?? BigInt(0),
              },
            },
          });

          await progressPublisher.publish(
            QUEUE_NAMES.TRANSFER_PROGRESS,
            JSON.stringify({
              transferId,
              currentFileName: item.fileName,
            }),
          );
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown';

          const updated = await prisma.transferItem.update({
            where: { id: item.id },
            data: {
              retryCount: { increment: 1 },
              errorMessage: message,
            },
          });

          if (updated.retryCount >= 5) {
            await prisma.transferItem.update({
              where: { id: item.id },
              data: { status: 'FAILED' },
            });

            await prisma.transferJob.update({
              where: { id: transferId },
              data: { failedItems: { increment: 1 } },
            });
          } else {
            await prisma.transferItem.update({
              where: { id: item.id },
              data: { status: 'PENDING' },
            });
          }
        }
      }

      const fresh = await prisma.transferJob.findUnique({
        where: { id: transferId },
      });

      if (!fresh) return;

      // 🔥 FIXED FINAL STATUS LOGIC
      let finalStatus: TransferStatus;

      if (fresh.failedItems > 0) {
        finalStatus = TransferStatus.FAILED;
      } else {
        finalStatus = TransferStatus.COMPLETED;
      }

      await prisma.transferJob.update({
        where: { id: transferId },
        data: {
          status: finalStatus,
          finishedAt: new Date(),
        },
      });

      if (finalStatus === TransferStatus.COMPLETED && transfer.mode === 'MOVE') {
        await verificationQueue.add(QUEUE_NAMES.TRANSFER_EVENTS, {
          transferId,
        });
      }
    } finally {
      await accountLock.release(transfer.destinationAccountId, transferId);
    }
  },
  {
    connection: redisConfig,
    concurrency: 5,
  },
);
