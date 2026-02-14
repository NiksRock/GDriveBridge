import { Worker } from 'bullmq';
import { QUEUE_NAMES, redisConfig } from '@gdrivebridge/shared';
import { prisma } from '../db';

console.log('🚀 Worker started...');

new Worker(
  QUEUE_NAMES.TRANSFER,
  async (job) => {
    const { transferId } = job.data;

    console.log('🔥 Processing transfer:', transferId);

    /**
     * 1. Mark transfer as running
     */
    await prisma.transfer.update({
      where: { id: transferId },
      data: {
        status: 'running',
        startedAt: new Date(),
      },
    });

    /**
     * 2. Fetch pending items
     */
    const items = await prisma.transferItem.findMany({
      where: {
        transferId,
        status: 'pending',
      },
    });

    console.log(`📦 Found ${items.length} pending items`);

    let completedCount = 0;
    let failedCount = 0;

    /**
     * 3. Process items one-by-one
     */
    for (const item of items) {
      try {
        console.log('➡️ Processing item:', item.googleFileId);

        /**
         * ✅ Simulated copy work (later replace with Drive API)
         */
        await new Promise((r) => setTimeout(r, 500));

        /**
         * Mark item completed
         */
        await prisma.transferItem.update({
          where: { id: item.id },
          data: {
            status: 'completed',
            updatedAt: new Date(),
          },
        });

        completedCount++;

        /**
         * Increment transfer progress live
         */
        await prisma.transfer.update({
          where: { id: transferId },
          data: {
            completedItems: completedCount,
          },
        });

        /**
         * Log event
         */
        await prisma.transferEvent.create({
          data: {
            transferId,
            type: 'item.completed',
            message: `Completed file ${item.googleFileId}`,
          },
        });

        console.log('✅ Completed:', item.googleFileId);
      } catch (err: unknown) {
        // Changed 'any' to 'unknown' to fix lint error
        failedCount++;

        // Type-safe error message extraction
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';

        /**
         * Mark item failed
         */
        await prisma.transferItem.update({
          where: { id: item.id },
          data: {
            status: 'failed',
            errorMessage,
          },
        });

        /**
         * Log failure event
         */
        await prisma.transferEvent.create({
          data: {
            transferId,
            type: 'item.failed',
            message: `Failed file ${item.googleFileId}: ${errorMessage}`,
          },
        });

        console.log('❌ Failed:', item.googleFileId, errorMessage);
      }
    }

    /**
     * 4. Final transfer status
     * If even one item fails, the overall transfer is marked as failed
     */
    const finalStatus = failedCount > 0 ? 'failed' : 'completed';

    await prisma.transfer.update({
      where: { id: transferId },
      data: {
        status: finalStatus,
        failedItems: failedCount,
        finishedAt: new Date(),
      },
    });

    console.log(
      `🎉 Transfer finished: ${transferId} (completed=${completedCount}, failed=${failedCount})`,
    );
  },
  {
    connection: redisConfig,
  },
);
