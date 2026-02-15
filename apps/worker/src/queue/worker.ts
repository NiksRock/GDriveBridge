// ============================================================
// GDriveBridge Worker — Fully Hardened
// - Distributed Rate Governor
// - Dual Account Lock (Source + Destination)
// - Structured TransferLog
// ============================================================

import { Worker, Queue } from 'bullmq';
import { QUEUE_NAMES, redisConfig, TransferStatus } from '@gdrivebridge/shared';
import { prisma } from '../db';
import Redis from 'ioredis';

import { GoogleDriveService } from '../services/google-drive.service';
import { IdempotentCopyService } from '../services/idempotent-copy.service';
import { RateGovernor } from '../services/rate-governor.service';
import { AccountLockService } from '../services/account-lock.service';

const redisClient = new Redis(redisConfig);
const progressPublisher = new Redis(redisConfig);

const rateGovernor = new RateGovernor(redisClient);
const accountLock = new AccountLockService(redisClient);

const verificationQueue = new Queue(QUEUE_NAMES.TRANSFER_EVENTS, {
  connection: redisConfig,
});
process.on('SIGTERM', async () => {
  await redisClient.quit();
  await progressPublisher.quit();
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

    // 🔒 Dual Lock: Source + Destination
    const sourceLock = await accountLock.acquire(transfer.sourceAccountId, transferId);

    if (!sourceLock) {
      throw new Error('Source account busy');
    }

    const destinationLock = await accountLock.acquire(
      transfer.destinationAccountId,
      transferId,
    );

    if (!destinationLock) {
      await accountLock.release(transfer.sourceAccountId, transferId);
      throw new Error('Destination account busy');
    }

    try {
      await prisma.transferJob.update({
        where: { id: transferId },
        data: {
          status: TransferStatus.RUNNING,
          startedAt: transfer.startedAt ?? new Date(),
        },
      });

      await prisma.transferLog.create({
        data: {
          jobId: transferId,
          level: 'INFO',
          action: 'transfer.started',
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
        await accountLock.extend(transfer.sourceAccountId, transferId);
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

          await prisma.transferLog.create({
            data: {
              jobId: transferId,
              level: 'INFO',
              action: 'item.completed',
              context: { fileName: item.fileName },
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

            await prisma.transferLog.create({
              data: {
                jobId: transferId,
                level: 'ERROR',
                action: 'item.failed',
                context: { fileName: item.fileName, error: message },
              },
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

      const finalStatus =
        fresh.failedItems > 0 ? TransferStatus.FAILED : TransferStatus.COMPLETED;

      await prisma.transferJob.update({
        where: { id: transferId },
        data: {
          status: finalStatus,
          finishedAt: new Date(),
        },
      });

      await prisma.transferLog.create({
        data: {
          jobId: transferId,
          level: finalStatus === TransferStatus.COMPLETED ? 'INFO' : 'ERROR',
          action: 'transfer.finished',
          context: { status: finalStatus },
        },
      });

      if (finalStatus === TransferStatus.COMPLETED && transfer.mode === 'MOVE') {
        await verificationQueue.add(QUEUE_NAMES.TRANSFER_EVENTS, {
          transferId,
        });
      }
    } finally {
      await accountLock.release(transfer.sourceAccountId, transferId);
      await accountLock.release(transfer.destinationAccountId, transferId);
    }
  },
  {
    connection: redisConfig,
    concurrency: 2,
  },
);
