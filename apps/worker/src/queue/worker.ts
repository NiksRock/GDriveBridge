// ============================================================
// GDriveBridge Worker v4 (Enterprise Correct + Realtime)
// Implements:
// - DEFT §7 Exactly-Once Idempotency
// - DEFT §11.1 Rate Governor (2.5 writes/sec)
// - DEFT §6 Crash-Safe Resumability
// - DEFT §9 Move Mode Trigger (Verification Queue)
// - DEFT §10 Real-Time Progress Publishing
// ============================================================

import { Worker, Queue } from 'bullmq';
import { QUEUE_NAMES, redisConfig } from '@gdrivebridge/shared';
import { prisma } from '../db';

import Redis from 'ioredis';

import { GoogleDriveService } from '../services/google-drive.service';
import { IdempotentCopyService } from '../services/idempotent-copy.service';

console.log('🚀 Worker started...');

// ============================================================
// Redis Publisher for Progress Events (DEFT §10)
// ============================================================

const progressPublisher = new Redis({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
});

// ============================================================
// Verification Queue (Move Mode) (DEFT §9)
// ============================================================

const verificationQueue = new Queue(QUEUE_NAMES.TRANSFER_EVENTS, {
  connection: redisConfig,
});

new Worker(
  QUEUE_NAMES.TRANSFER,
  async (job) => {
    const { transferId } = job.data;

    console.log('🔥 Processing transfer:', transferId);

    // ============================================================
    // 1️⃣ Fetch Transfer
    // ============================================================

    const transfer = await prisma.transferJob.findUnique({
      where: { id: transferId },
      include: {
        sourceAccount: true,
        destinationAccount: true,
      },
    });

    if (!transfer) throw new Error('Transfer not found');

    // Abort if cancelled
    if (transfer.status === 'CANCELLED') {
      console.log('⛔ Transfer cancelled:', transferId);
      return;
    }

    // ============================================================
    // 2️⃣ Mark RUNNING (if not already)
    // ============================================================

    if (transfer.status !== 'RUNNING') {
      await prisma.transferJob.update({
        where: { id: transferId },
        data: {
          status: 'RUNNING',
          startedAt: transfer.startedAt ?? new Date(),
        },
      });
    }

    // ============================================================
    // 3️⃣ Build Destination Drive Client
    // ============================================================

    const destinationDrive = GoogleDriveService.getDriveClient(
      transfer.destinationAccount.refreshTokenEncrypted,
    );

    const copyService = new IdempotentCopyService(prisma, destinationDrive);

    // ============================================================
    // 4️⃣ Query Pending Items (Resumable Pattern)
    // ============================================================

    const pendingItems = await prisma.transferItem.findMany({
      where: {
        jobId: transferId,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'asc' },
    });

    for (const item of pendingItems) {
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

        // ============================================================
        // Publish Real-Time Progress (DEFT §10)
        // ============================================================

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
    // 5️⃣ Determine Final Status
    // ============================================================

    const fresh = await prisma.transferJob.findUnique({
      where: { id: transferId },
    });

    const finalStatus =
      fresh?.failedItems && fresh.failedItems > 0 ? 'FAILED' : 'COMPLETED';

    await prisma.transferJob.update({
      where: { id: transferId },
      data: {
        status: finalStatus,
        finishedAt: new Date(),
      },
    });

    console.log(`🎉 Transfer finished: ${transferId}`);

    // ============================================================
    // 6️⃣ Trigger Move Mode Verification (DEFT §9)
    // ============================================================

    if (finalStatus === 'COMPLETED' && transfer.mode === 'MOVE') {
      await verificationQueue.add(QUEUE_NAMES.TRANSFER_EVENTS, { transferId });

      console.log('🔍 Verification queued:', transferId);
    }
  },
  {
    connection: redisConfig,
  },
);
