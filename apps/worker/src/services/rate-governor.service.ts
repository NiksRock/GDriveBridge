// ============================================================
// Distributed Rate Governor (Redis Token Bucket)
// Satisfies: DEFT §11.1 (2.5 writes/sec/account, distributed)
// ============================================================

import Redis from 'ioredis';

export class RateGovernor {
  private readonly redis: Redis;
  private readonly intervalMs = 400; // 2.5 writes/sec
  private readonly LUA_SCRIPT = `
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local interval = tonumber(ARGV[2])

    local last = redis.call("GET", key)

    if not last then
      redis.call("SET", key, now, "PX", interval)
      return 0
    end

    local diff = now - tonumber(last)

    if diff >= interval then
      redis.call("SET", key, now, "PX", interval)
      return 0
    else
      return interval - diff
    end
  `;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async throttle(accountId: string) {
    const key = `rate:account:${accountId}`;
    const now = Date.now();

    const wait = (await this.redis.eval(
      this.LUA_SCRIPT,
      1,
      key,
      now,
      this.intervalMs,
    )) as number;

    if (wait > 0) {
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}
