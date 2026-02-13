import { Worker } from 'bullmq';
import { QUEUE_NAMES, redisConfig } from '@gdrivebridge/shared';
import { prisma } from '../db';

console.log('Worker started...');

new Worker(
  QUEUE_NAMES.TRANSFER,
  async (job) => {
    const { transferId } = job.data;

    console.log('🔥 Processing transfer:', transferId);

    // 1. Mark transfer running
    await prisma.transfer.update({
      where: { id: transferId },
      data: {
        status: 'running',
        startedAt: new Date(),
      },
    });

    // 2. Fetch pending items
    const items = await prisma.transferItem.findMany({
      where: {
        transferId,
        status: 'pending',
      },
    });

    console.log('Found items:', items.length);

    // 3. Process each item (mock completion)
    for (const item of items) {
      console.log('✅ Completing item:', item.googleFileId);

      await prisma.transferItem.update({
        where: { id: item.id },
        data: {
          status: 'completed',
          updatedAt: new Date(),
        },
      });
    }

    // 4. Update transfer totals
    await prisma.transfer.update({
      where: { id: transferId },
      data: {
        status: 'completed',
        completedItems: items.length,
        finishedAt: new Date(),
      },
    });

    console.log('🎉 Transfer completed:', transferId);
  },
  {
    connection: redisConfig,
  },
);
