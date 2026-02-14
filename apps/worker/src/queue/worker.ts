import { Worker } from 'bullmq';
import { QUEUE_NAMES, redisConfig, TransferStatus } from '@gdrivebridge/shared';
import { prisma } from '../db';

console.log('🚀 Worker started...');

new Worker(
  QUEUE_NAMES.TRANSFER,
  async (job) => {
    const { transferId } = job.data;

    console.log('🔥 Processing transfer:', transferId);

    try {
      /**
       * 1. Mark transfer as RUNNING
       */
      await prisma.transfer.update({
        where: { id: transferId },
        data: {
          status: TransferStatus.RUNNING,
          startedAt: new Date(),
        },
      });

      /**
       * 2. Fetch all pending items
       */
      const items = await prisma.transferItem.findMany({
        where: {
          transferId,
          status: TransferStatus.PENDING,
        },
      });

      console.log(`📦 Found ${items.length} pending items`);

      /**
       * 3. Process each item one-by-one
       * (Later: replace this with Google Drive copy logic)
       */
      for (const item of items) {
        console.log('✅ Completing item:', item.googleFileId);

        await prisma.transferItem.update({
          where: { id: item.id },
          data: {
            status: TransferStatus.COMPLETED,
            updatedAt: new Date(),
          },
        });

        /**
         * Progress checkpoint
         */
        await prisma.transfer.update({
          where: { id: transferId },
          data: {
            completedItems: {
              increment: 1,
            },
          },
        });
      }

      /**
       * 4. Mark transfer as COMPLETED
       */
      await prisma.transfer.update({
        where: { id: transferId },
        data: {
          status: TransferStatus.COMPLETED,
          finishedAt: new Date(),
        },
      });

      console.log('🎉 Transfer completed successfully:', transferId);
    } catch (error) {
      console.error('❌ Transfer failed:', transferId, error);

      /**
       * Mark transfer as FAILED
       */
      await prisma.transfer.update({
        where: { id: transferId },
        data: {
          status: TransferStatus.FAILED,
          finishedAt: new Date(),
        },
      });

      throw error;
    }
  },
  {
    connection: redisConfig,
    concurrency: 1,
  },
);
