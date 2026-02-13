import { Queue } from 'bullmq';
import { QUEUE_NAMES, redisConfig } from '@gdrivebridge/shared';

export const transferQueue = new Queue(QUEUE_NAMES.TRANSFER, {
  connection: redisConfig,
});
