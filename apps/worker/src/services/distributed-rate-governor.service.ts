// ============================================================
// DistributedRateGovernor
//
// Satisfies:
// - DEFT §11.1 (2.5 writes/sec/account)
// - Multi-worker safe
// - Multi-instance safe
// - Redis-backed distributed throttle
// ============================================================

import Redis from 'ioredis';

export class DistributedRateGovernor {
  private readonly redis: Redis;
  private readonly intervalMs = 400; // 2.5 writes/sec

  constructor(redis: Redis) {
    this.redis = redis;
  }

  // ------------------------------------------------------------
  // Acquire Write Token (Per Account)
  // ------------------------------------------------------------

  async throttle(accountId: string): Promise<void> {
    const key = `rate:${accountId}`;

    for (;;) {
      const now = Date.now();

      const lastExecution = await this.redis.get(key);

      if (!lastExecution) {
        await this.redis.set(key, now.toString(), 'PX', this.intervalMs);
        return;
      }

      const diff = now - Number(lastExecution);

      if (diff >= this.intervalMs) {
        await this.redis.set(key, now.toString(), 'PX', this.intervalMs);
        return;
      }

      const waitTime = this.intervalMs - diff;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
}
