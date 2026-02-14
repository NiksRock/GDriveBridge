import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PreScanService } from './pre-scan.service';
import { google } from 'googleapis';
import { CryptoService } from '../../security/crypto.service';

import { QUEUE_NAMES, TransferStatus, ItemStatus } from '@gdrivebridge/shared';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { transferQueue } from '../../queue/transfer.queue';

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly preScanService: PreScanService,
    private readonly cryptoService: CryptoService,
  ) {}

  async createTransfer(userId: string, dto: CreateTransferDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }
    const sourceAccount = await this.prisma.googleAccount.findFirst({
      where: { id: dto.sourceAccountId, userId },
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

    // ============================================================
    // 🔒 3️⃣ MANDATORY Pre-Scan Enforcement (DEFT §12)
    // ============================================================

    const preScan = await this.preScanService.runPreScan(userId, {
      sourceAccountId: dto.sourceAccountId,
      destinationAccountId: dto.destinationAccountId,
      sourceFileIds: dto.sourceFileIds,
      destinationFolderId: dto.destinationFolderId,
      mode: dto.mode,
    });

    if (!preScan.canStart) {
      throw new ForbiddenException({
        message: 'Transfer blocked by Pre-Scan risk analysis',
        riskFlags: preScan.riskFlags,
        warnings: preScan.warnings,
      });
    }

    /**
     * 4️⃣ Create Drive client for metadata lookup
     */
    const oauth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );

    oauth.setCredentials({
      refresh_token: this.cryptoService.decrypt(sourceAccount.refreshTokenEncrypted),
    });

    const drive = google.drive({
      version: 'v3',
      auth: oauth,
    });

    /**
     * 5️⃣ Enrich selected items
     */
    const enrichedItems: Array<{
      sourceFileId: string;
      fileName: string;
      mimeType?: string | null;
      sizeBytes?: bigint | null;
      status: ItemStatus;
    }> = [];

    for (const fileId of dto.sourceFileIds) {
      const meta = await drive.files.get({
        fileId,
        fields: 'id,name,mimeType,size',
      });

      enrichedItems.push({
        sourceFileId: meta.data.id!,
        fileName: meta.data.name ?? 'unknown',
        mimeType: meta.data.mimeType,
        sizeBytes: meta.data.size ? BigInt(meta.data.size) : null,
        status: ItemStatus.PENDING,
      });
    }

    /**
     * 6️⃣ Create Transfer + Persist Risk Metadata
     * (DEFT §5 + §12)
     */
    const transfer = await this.prisma.transferJob.create({
      data: {
        userId: user.id,
        sourceAccountId: sourceAccount.id,
        destinationAccountId: destinationAccount.id,
        destinationFolderId: dto.destinationFolderId,
        mode: dto.mode,
        status: TransferStatus.PENDING,

        totalItems: enrichedItems.length,
        totalBytes: BigInt(preScan.estimatedBytes),

        riskFlags: preScan.riskFlags,
        warnings: preScan.warnings,

        items: {
          create: enrichedItems,
        },

        events: {
          create: {
            type: 'created',
            message: 'Transfer session created after successful Pre-Scan',
          },
        },
      },
      include: {
        items: true,
        events: true,
      },
    });

    /**
     * 7️⃣ Enqueue Worker Job
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

  async listTransfers(userId: string) {
    const transfers = await this.prisma.transferJob.findMany({
      where: { userId },
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

  async getTransferById(userId: string, id: string) {
    const transfer = await this.prisma.transferJob.findFirst({
      where: { id, userId },
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
