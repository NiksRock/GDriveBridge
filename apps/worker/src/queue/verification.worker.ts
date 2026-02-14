// ============================================================
// Verification Worker
// Satisfies: DEFT §9 (Verification Before Delete)
// ============================================================

import { Worker } from 'bullmq';
import { QUEUE_NAMES, redisConfig } from '@gdrivebridge/shared';
import { prisma } from '../db';
import { deleteQueue } from './delete.queue';

new Worker(
  QUEUE_NAMES.TRANSFER_EVENTS, // trigger verification
  async (job) => {
    const { transferId } = job.data;

    const transfer = await prisma.transferJob.findUnique({
      where: { id: transferId },
      include: { items: true },
    });

    if (!transfer) return;

    // ============================================================
    // 1️⃣ Must be MOVE mode
    // ============================================================

    if (transfer.mode !== 'MOVE') return;

    // ============================================================
    // 2️⃣ Must be completed
    // ============================================================

    if (transfer.status !== 'COMPLETED') return;

    // ============================================================
    // 3️⃣ File Count Verification
    // ============================================================

    const total = transfer.totalItems;
    const completed = transfer.completedItems;

    if (total !== completed) {
      console.warn('❌ Verification failed: counts mismatch');
      return;
    }

    console.log('✅ Verification passed for:', transferId);

    // ============================================================
    // 4️⃣ Enqueue Deletion Tasks
    // ============================================================

    for (const item of transfer.items) {
      await deleteQueue.add(
        QUEUE_NAMES.DELETE_SOURCE,
        {
          transferId,
          sourceFileId: item.sourceFileId,
          sourceAccountId: transfer.sourceAccountId,
        },
        {
          delay: 5000, // small safety delay
        },
      );
    }

    console.log('🗑 Delete tasks queued:', transferId);
  },
  { connection: redisConfig },
);
