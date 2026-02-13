import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { transferQueue } from 'src/queue/transfer.queue';

@Injectable()
export class TransfersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Creates a transfer session + items in DB
   */
  async createTransfer(dto: CreateTransferDto) {
    // ✅ TEMP: Ensure user exists
    await this.prisma.user.upsert({
      where: { id: dto.userId },
      update: {},
      create: {
        id: dto.userId,
        email: `${dto.userId}@demo.local`,
      },
    });

    // ✅ Now create transfer
    const transfer = await this.prisma.transfer.create({
      data: {
        userId: dto.userId,
        sourceAccountId: dto.sourceAccountId,
        destinationAccountId: dto.destinationAccountId,
        destinationFolderId: dto.destinationFolderId,
        mode: dto.mode,
        status: 'pending',
        totalItems: dto.sourceFileIds.length,

        items: {
          create: dto.sourceFileIds.map((fileId) => ({
            googleFileId: fileId,
            fileName: 'unknown',
            status: 'pending',
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
    await transferQueue.add('transfer.process', {
      transferId: transfer.id,
    });

    console.log('✅ Job enqueued:', transfer.id);
    return transfer;
  }
}
