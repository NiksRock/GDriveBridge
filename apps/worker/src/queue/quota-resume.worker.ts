import { Worker } from 'bullmq';
import { QUEUE_NAMES, redisConfig, TransferStatus } from '@gdrivebridge/shared';
import { prisma } from '../db';
// or re-import queue
import { Queue } from 'bullmq';

const transferQueueInstance = new Queue(QUEUE_NAMES.TRANSFER, {
  connection: redisConfig,
});

new Worker(
  QUEUE_NAMES.QUOTA_RESUME,
  async (job) => {
    const { transferId } = job.data;

    const transfer = await prisma.transferJob.findUnique({
      where: { id: transferId },
    });

    if (!transfer) return;

    // Only resume if still quota paused
    if (transfer.status !== TransferStatus.AUTO_PAUSED_QUOTA) {
      return;
    }

    console.log('🔄 Auto-resuming transfer after quota sleep:', transferId);

    await prisma.transferJob.update({
      where: { id: transferId },
      data: {
        status: TransferStatus.PENDING,
        pausedAt: null,
      },
    });

    await transferQueueInstance.add(QUEUE_NAMES.TRANSFER, { transferId });
  },
  { connection: redisConfig },
);
