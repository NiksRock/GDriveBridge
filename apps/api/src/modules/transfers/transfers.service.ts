import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';

import { google } from 'googleapis';

import { QUEUE_NAMES, TransferStatus, ItemStatus } from '@gdrivebridge/shared';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { transferQueue } from '../../queue/transfer.queue';

@Injectable()
export class TransfersService {
  constructor(private readonly prisma: PrismaService) {}

  async createTransfer(dto: CreateTransferDto) {
    /**
     * ✅ TEMP user ensure exists
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
     * ✅ Validate source + destination accounts
     */
    const sourceAccount = await this.prisma.googleAccount.findFirst({
      where: { id: dto.sourceAccountId, userId: user.id },
    });

    if (!sourceAccount) {
      throw new ForbiddenException('Invalid source account');
    }

    const destinationAccount = await this.prisma.googleAccount.findFirst({
      where: { id: dto.destinationAccountId, userId: user.id },
    });

    if (!destinationAccount) {
      throw new ForbiddenException('Invalid destination account');
    }

    /**
     * ✅ Create Drive client for metadata lookup
     */
    const oauth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );

    oauth.setCredentials({
      refresh_token: sourceAccount.refreshToken,
    });

    const drive = google.drive({
      version: 'v3',
      auth: oauth,
    });

    /**
     * ✅ FIX: Explicitly typed array (prevents never[])
     */
    const enrichedItems: Array<{
      googleFileId: string;
      fileName: string;
      mimeType?: string | null;
      sizeBytes?: bigint | null;
      status: ItemStatus;
    }> = [];

    /**
     * ✅ Fetch metadata for each selected file/folder
     */
    for (const fileId of dto.sourceFileIds) {
      const meta = await drive.files.get({
        fileId,
        fields: 'id,name,mimeType,size',
      });

      enrichedItems.push({
        googleFileId: meta.data.id!,
        fileName: meta.data.name ?? 'unknown',
        mimeType: meta.data.mimeType,
        sizeBytes: meta.data.size ? BigInt(meta.data.size) : null,
        status: ItemStatus.PENDING,
      });
    }

    /**
     * ✅ Create Transfer + Items
     */
    const transfer = await this.prisma.transfer.create({
      data: {
        userId: user.id,

        sourceAccountId: sourceAccount.id,
        destinationAccountId: destinationAccount.id,

        destinationFolderId: dto.destinationFolderId,

        mode: dto.mode,
        status: TransferStatus.PENDING,

        totalItems: enrichedItems.length,

        items: {
          create: enrichedItems,
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
      progress:
        t.totalItems === 0 ? 0 : Math.round((t.completedItems / t.totalItems) * 100),
    }));
  }

  async getTransferById(id: string) {
    const transfer = await this.prisma.transfer.findUnique({
      where: { id },
      include: { items: true, events: true },
    });

    if (!transfer) throw new NotFoundException('Transfer not found');

    return {
      ...transfer,
      progress:
        transfer.totalItems === 0
          ? 0
          : Math.round((transfer.completedItems / transfer.totalItems) * 100),
    };
  }
}
