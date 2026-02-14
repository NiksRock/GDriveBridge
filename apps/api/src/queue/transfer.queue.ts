import { Queue } from 'bullmq';

import { QUEUE_NAMES, redisConfig } from '@gdrivebridge/shared';

/**
 * Transfer Queue
 *
 * API enqueues transfer jobs
 * Worker consumes them asynchronously
 */
export const transferQueue = new Queue(QUEUE_NAMES.TRANSFER, {
  connection: redisConfig,

  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },

    removeOnComplete: true,
    removeOnFail: false,
  },
});
