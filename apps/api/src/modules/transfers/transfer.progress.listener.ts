// ============================================================
// Redis → WebSocket Bridge
// Satisfies: DEFT §10 (Realtime Progress Streaming)
// ============================================================

import { Injectable, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { QUEUE_NAMES } from '@gdrivebridge/shared';
import { TransferGateway } from './transfer.gateway';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TransferProgressListener implements OnModuleInit {
  private subscriber = new Redis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    enableReadyCheck: false,
  });

  constructor(
    private readonly gateway: TransferGateway,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.subscriber.subscribe(QUEUE_NAMES.TRANSFER_PROGRESS);

    this.subscriber.on('message', async (_, message) => {
      const payload = JSON.parse(message);

      const transfer = await this.prisma.transferJob.findUnique({
        where: { id: payload.transferId },
      });

      if (!transfer) return;

      this.gateway.emitProgress(payload.transferId, {
        currentFileName: payload.currentFileName,
        completedFiles: transfer.completedItems,
        totalFiles: transfer.totalItems,
        status: transfer.status,
      });
    });

    console.log('📡 Redis progress listener started');
  }
}
