import Redis from 'ioredis';

export class AccountLockService {
  private readonly redis: Redis;
  private readonly LOCK_TTL = 60 * 60; // seconds

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async acquire(accountId: string, transferId: string): Promise<boolean> {
    const key = `lock:account:${accountId}`;

    const result = await this.redis.set(key, transferId, 'EX', this.LOCK_TTL, 'NX');

    return result === 'OK';
  }

  async extend(accountId: string, transferId: string) {
    const key = `lock:account:${accountId}`;
    const owner = await this.redis.get(key);

    if (owner === transferId) {
      await this.redis.expire(key, this.LOCK_TTL);
    }
  }

  async release(accountId: string, transferId: string) {
    const key = `lock:account:${accountId}`;
    const owner = await this.redis.get(key);

    if (owner === transferId) {
      await this.redis.del(key);
    }
  }
}
