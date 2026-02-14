import { Injectable } from '@nestjs/common';

import { QUEUE_NAMES, TransferStatus, ItemStatus } from '@gdrivebridge/shared';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { transferQueue } from '../../queue/transfer.queue';

@Injectable()
export class TransfersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a transfer session + items in DB
   * Enqueues the job for worker execution
   */
  async createTransfer(dto: CreateTransferDto) {
    /**
     * ❗ Remove TEMP upsert hack later
     * User should come from Auth context (OAuth session)
     */

    /**
     * 1. Create transfer record
     */
    const transfer = await this.prisma.transfer.create({
      data: {
        userId: dto.userId,

        sourceAccountId: dto.sourceAccountId,
        destinationAccountId: dto.destinationAccountId,

        destinationFolderId: dto.destinationFolderId,

        mode: dto.mode,
        status: TransferStatus.PENDING,

        totalItems: dto.sourceFileIds.length,

        /**
         * Create transfer items
         */
        items: {
          create: dto.sourceFileIds.map((fileId) => ({
            googleFileId: fileId,
            fileName: 'unknown', // TODO: fetch metadata later
            status: ItemStatus.PENDING,
          })),
        },

        /**
         * Log creation event
         */
        events: {
          create: {
            type: 'created',
            message: 'Transfer session created',
          },
        },
      },

      include: {
        items: true,
        events: true,
      },
    });

    /**
     * 2. Enqueue background job
     */
    await transferQueue.add(
      QUEUE_NAMES.TRANSFER,
      { transferId: transfer.id },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );

    console.log('✅ Transfer job enqueued:', transfer.id);

    return transfer;
  }
}
