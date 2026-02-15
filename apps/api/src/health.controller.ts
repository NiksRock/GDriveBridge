import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import Redis from 'ioredis';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    const redis = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
    });

    await this.prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    await redis.quit();

    return {
      status: 'ok',
      db: 'connected',
      redis: 'connected',
    };
  }
}
