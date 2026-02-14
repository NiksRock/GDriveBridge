import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';

import { QUEUE_NAMES, TransferStatus, ItemStatus } from '@gdrivebridge/shared';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { transferQueue } from '../../queue/transfer.queue';

@Injectable()
export class TransfersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * POST: Create transfer + enqueue job
   */
  async createTransfer(dto: CreateTransferDto) {
    /**
     * ✅ TEMP: Ensure user exists (until auth system is real)
     */
    const user = await this.prisma.user.upsert({
      where: { id: dto.userId },
      update: {},
      create: {
        id: dto.userId,
        email: dto.userId,
      },
    });

    /**
     * ✅ Validate Source Account belongs to user
     */
    const sourceAccount = await this.prisma.googleAccount.findFirst({
      where: {
        id: dto.sourceAccountId,
        userId: user.id,
      },
    });

    if (!sourceAccount) {
      throw new ForbiddenException('Invalid source account');
    }

    if (sourceAccount.userId !== user.id) {
      throw new ForbiddenException('Source account does not belong to this user');
    }

    /**
     * ✅ Validate Destination Account belongs to user
     */
    const destinationAccount = await this.prisma.googleAccount.findFirst({
      where: {
        id: dto.destinationAccountId,
        userId: user.id,
      },
    });

    if (!destinationAccount) {
      throw new ForbiddenException('Invalid destination account');
    }

    if (destinationAccount.userId !== user.id) {
      throw new ForbiddenException('Destination account does not belong to this user');
    }

    /**
     * ✅ Create Transfer
     */
    const transfer = await this.prisma.transfer.create({
      data: {
        userId: user.id,

        sourceAccountId: sourceAccount.id,
        destinationAccountId: destinationAccount.id,

        destinationFolderId: dto.destinationFolderId,

        mode: dto.mode,
        status: TransferStatus.PENDING,

        totalItems: dto.sourceFileIds.length,

        items: {
          create: dto.sourceFileIds.map((fileId) => ({
            googleFileId: fileId,
            fileName: 'unknown',
            status: ItemStatus.PENDING,
          })),
        },

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
     * ✅ Enqueue Worker Job
     */
    await transferQueue.add(
      QUEUE_NAMES.TRANSFER,
      { transferId: transfer.id },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );

    console.log('✅ Transfer job enqueued:', transfer.id);

    return transfer;
  }

  /**
   * GET: List all transfers
   */
  async listTransfers() {
    const transfers = await this.prisma.transfer.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });

    return transfers.map((t) => ({
      id: t.id,
      status: t.status,
      mode: t.mode,
      totalItems: t.totalItems,
      completedItems: t.completedItems,
      failedItems: t.failedItems,
      createdAt: t.createdAt,
      progress:
        t.totalItems === 0 ? 0 : Math.round((t.completedItems / t.totalItems) * 100),
    }));
  }

  /**
   * GET: Fetch single transfer by ID
   */
  async getTransferById(id: string) {
    const transfer = await this.prisma.transfer.findUnique({
      where: { id },
      include: {
        items: true,
        events: true,
      },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    return {
      ...transfer,
      progress:
        transfer.totalItems === 0
          ? 0
          : Math.round((transfer.completedItems / transfer.totalItems) * 100),
    };
  }
}
