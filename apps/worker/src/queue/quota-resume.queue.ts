import { Queue } from 'bullmq';
import { QUEUE_NAMES, redisConfig } from '@gdrivebridge/shared';

export const quotaResumeQueue = new Queue(QUEUE_NAMES.QUOTA_RESUME, {
  connection: redisConfig,
});
