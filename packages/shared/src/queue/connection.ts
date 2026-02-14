import type { ConnectionOptions } from 'bullmq';

export const redisConfig: ConnectionOptions = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
};
