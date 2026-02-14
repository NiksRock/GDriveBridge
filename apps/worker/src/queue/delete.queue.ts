// ============================================================
// Delete Queue
// Satisfies: DEFT §9 (Delayed Deletion Queue)
// ============================================================

import { Queue } from 'bullmq';
import { QUEUE_NAMES, redisConfig } from '@gdrivebridge/shared';

export const deleteQueue = new Queue(QUEUE_NAMES.DELETE_SOURCE, {
  connection: redisConfig,
});
