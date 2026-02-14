// ============================================================
// GDriveBridge Worker v5 (Enterprise + Cancellation Safe)
// Implements:
// - Exactly-Once
// - 2.5 writes/sec
// - Crash-safe resume
// - Move verification
// - Real-time progress
// - Immediate cancellation support
// ============================================================

import { Worker, Queue } from 'bullmq';
import { QUEUE_NAMES, redisConfig, TransferStatus } from '@gdrivebridge/shared';
import { prisma } from '../db';

import Redis from 'ioredis';
import { GoogleDriveService } from '../services/google-drive.service';
import { IdempotentCopyService } from '../services/idempotent-copy.service';

console.log('🚀 Worker started...');

const progressPublisher = new Redis({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
});

const verificationQueue = new Queue(QUEUE_NAMES.TRANSFER_EVENTS, {
  connection: redisConfig,
});

new Worker(
  QUEUE_NAMES.TRANSFER,
  async (job) => {
    const { transferId } = job.data;

    console.log('🔥 Processing transfer:', transferId);

    // ============================================================
    // 1️⃣ Load Transfer
    // ============================================================

    const transfer = await prisma.transferJob.findUnique({
      where: { id: transferId },
      include: {
        sourceAccount: true,
        destinationAccount: true,
      },
    });

    if (!transfer) throw new Error('Transfer not found');

    if (transfer.status === TransferStatus.CANCELLED) {
      console.log('⛔ Already cancelled before start');
      return;
    }

    // ============================================================
    // 2️⃣ Mark RUNNING
    // ============================================================

    if (transfer.status !== TransferStatus.RUNNING) {
      await prisma.transferJob.update({
        where: { id: transferId },
        data: {
          status: TransferStatus.RUNNING,
          startedAt: transfer.startedAt ?? new Date(),
        },
      });
    }

    const destinationDrive = GoogleDriveService.getDriveClient(
      transfer.destinationAccount.refreshTokenEncrypted,
    );

    const copyService = new IdempotentCopyService(prisma, destinationDrive);

    // ============================================================
    // 3️⃣ Resumable Pending Query
    // ============================================================

    const pendingItems = await prisma.transferItem.findMany({
      where: {
        jobId: transferId,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'asc' },
    });

    for (const item of pendingItems) {
      // ============================================================
      // 🔥 REAL-TIME CANCELLATION CHECK
      // ============================================================

      const latestState = await prisma.transferJob.findUnique({
        where: { id: transferId },
        select: { status: true },
      });

      if (latestState?.status === TransferStatus.CANCELLED) {
        console.log('⛔ Transfer cancelled mid-execution:', transferId);

        await prisma.transferEvent.create({
          data: {
            jobId: transferId,
            type: 'transfer.cancelled',
            message: 'Transfer stopped by user',
          },
        });

        return; // Immediately stop worker loop
      }

      try {
        // Mark item RUNNING
        await prisma.transferItem.update({
          where: { id: item.id },
          data: { status: 'RUNNING' },
        });

        await copyService.copyExactlyOnce({
          itemId: item.id,
          sourceFileId: item.sourceFileId,
          destinationFolderId: transfer.destinationFolderId,
          fileName: item.fileName,
        });

        await prisma.transferJob.update({
          where: { id: transferId },
          data: {
            completedItems: { increment: 1 },
          },
        });

        // Publish progress
        await progressPublisher.publish(
          QUEUE_NAMES.TRANSFER_PROGRESS,
          JSON.stringify({
            transferId,
            currentFileName: item.fileName,
          }),
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';

        await prisma.transferItem.update({
          where: { id: item.id },
          data: {
            status: 'FAILED',
            errorMessage: message,
            retryCount: { increment: 1 },
          },
        });

        await prisma.transferJob.update({
          where: { id: transferId },
          data: {
            failedItems: { increment: 1 },
          },
        });

        await prisma.transferEvent.create({
          data: {
            jobId: transferId,
            type: 'item.failed',
            message,
          },
        });

        console.error('❌ Failed:', item.fileName, message);
      }
    }

    // ============================================================
    // 4️⃣ Final Status Resolution
    // ============================================================

    const fresh = await prisma.transferJob.findUnique({
      where: { id: transferId },
    });

    if (!fresh) return;

    if (fresh.status === TransferStatus.CANCELLED) {
      console.log('⛔ Transfer was cancelled before completion');
      return;
    }

    const finalStatus =
      fresh.failedItems && fresh.failedItems > 0
        ? TransferStatus.FAILED
        : TransferStatus.COMPLETED;

    await prisma.transferJob.update({
      where: { id: transferId },
      data: {
        status: finalStatus,
        finishedAt: new Date(),
      },
    });

    console.log(`🎉 Transfer finished: ${transferId}`);

    // ============================================================
    // 5️⃣ Move Mode Verification Trigger
    // ============================================================

    if (finalStatus === TransferStatus.COMPLETED && transfer.mode === 'MOVE') {
      await verificationQueue.add(QUEUE_NAMES.TRANSFER_EVENTS, { transferId });

      console.log('🔍 Verification queued:', transferId);
    }
  },
  {
    connection: redisConfig,
  },
);
