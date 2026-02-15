import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';

import { PreScanService } from './pre-scan.service';
import { TransferExpansionService } from './transfer-expansion.service';

import { QUEUE_NAMES, TransferStatus } from '@gdrivebridge/shared';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { transferQueue } from '../../queue/transfer.queue';
import { TransferMode } from '@prisma/client';

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly preScanService: PreScanService,
    private readonly expansionService: TransferExpansionService,
  ) {}

  // ============================================================
  // CREATE TRANSFER (DEFT §3.1 + §5 + §8 compliant)
  // ============================================================

  async createTransfer(userId: string, dto: CreateTransferDto) {
    const prismaMode = dto.mode === 'copy' ? TransferMode.COPY : TransferMode.MOVE;
    const dtoMode = dto.mode;
    const existing = await this.prisma.transferJob.findFirst({
      where: {
        userId,
        sourceAccountId: dto.sourceAccountId,
        destinationAccountId: dto.destinationAccountId,
        destinationFolderId: dto.destinationFolderId,
        status: {
          in: ['PENDING', 'RUNNING', 'PAUSED', 'AUTO_PAUSED_QUOTA'],
        },
      },
    });

    if (existing) {
      throw new ForbiddenException(
        'An active transfer already exists for this source and destination',
      );
    }
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
      where: { id: dto.destinationAccountId, userId },
    });

    if (!destinationAccount) {
      throw new ForbiddenException('Invalid destination account');
    }

    // ============================================================
    // 🔥 DEFT §3.1 — Source and Destination MUST be distinct
    // ============================================================

    if (sourceAccount.id === destinationAccount.id) {
      throw new ForbiddenException('Source and destination accounts must be distinct');
    }

    if (sourceAccount.email === destinationAccount.email) {
      throw new ForbiddenException('Source and destination accounts must be distinct');
    }

    // ============================================================
    // 1️⃣ Mandatory Pre-Scan Enforcement (DEFT §12)
    // ============================================================

    const preScan = await this.preScanService.runPreScan(userId, {
      userId, // 👈 ADD THIS
      sourceAccountId: dto.sourceAccountId,
      destinationAccountId: dto.destinationAccountId,
      sourceFileIds: dto.sourceFileIds,
      destinationFolderId: dto.destinationFolderId,
      mode: dtoMode,
    });

    if (preScan.riskFlags.includes('DESTINATION_ITEM_LIMIT_BLOCK')) {
      throw new ForbiddenException({
        message: 'Destination folder exceeds safe 500k item limit',
        riskFlags: preScan.riskFlags,
        warnings: preScan.warnings,
      });
    }

    // ============================================================
    // 2️⃣ Create Transfer Session FIRST (Crash-safe)
    // ============================================================

    const transfer = await this.prisma.transferJob.create({
      data: {
        userId,
        sourceAccountId: sourceAccount.id,
        destinationAccountId: destinationAccount.id,
        destinationFolderId: dto.destinationFolderId,
        mode: prismaMode,
        status: TransferStatus.PENDING,
        riskFlags: preScan.riskFlags,
        warnings: preScan.warnings,
      },
    });

    console.log('🧠 Transfer session created:', transfer.id);

    // ============================================================
    // 3️⃣ Recursive Expansion + Persistence (DEFT §5 + §8)
    // ============================================================

    const expansion = await this.expansionService.expandAndPersist(
      transfer.id,
      sourceAccount.refreshTokenEncrypted,
      dto.sourceFileIds,
    );

    // ============================================================
    // 4️⃣ Update totals AFTER expansion completes
    // ============================================================

    await this.prisma.transferJob.update({
      where: { id: transfer.id },
      data: {
        totalItems: expansion.totalItems,
        totalBytes: expansion.totalBytes,
      },
    });

    console.log(
      `📦 Expansion complete: ${expansion.totalItems} items, ${expansion.totalBytes} bytes`,
    );

    // ============================================================
    // 5️⃣ Enqueue Worker ONLY after full persistence
    // ============================================================

    await transferQueue.add(
      QUEUE_NAMES.TRANSFER,
      { transferId: transfer.id },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );

    console.log('✅ Transfer job enqueued:', transfer.id);

    return {
      id: transfer.id,
      totalItems: expansion.totalItems,
      totalBytes: expansion.totalBytes.toString(),
      status: TransferStatus.PENDING,
    };
  }

  // ============================================================
  // RETRY FAILED ITEMS
  // ============================================================

  async retryFailedItems(userId: string, transferId: string) {
    const transfer = await this.prisma.transferJob.findFirst({
      where: { id: transferId, userId },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (transfer.failedItems === 0) {
      throw new ForbiddenException('No failed items to retry');
    }

    if (
      transfer.status !== TransferStatus.FAILED &&
      transfer.status !== TransferStatus.COMPLETED
    ) {
      throw new ForbiddenException('Retry allowed only after transfer has finished');
    }

    const failedItems = await this.prisma.transferItem.findMany({
      where: {
        jobId: transferId,
        status: 'FAILED',
      },
      select: { id: true },
    });

    if (failedItems.length === 0) {
      throw new ForbiddenException('No failed items found');
    }

    await this.prisma.$transaction([
      this.prisma.transferItem.updateMany({
        where: {
          jobId: transferId,
          status: 'FAILED',
        },
        data: {
          status: 'PENDING',
          errorMessage: null,
        },
      }),

      this.prisma.transferJob.update({
        where: { id: transferId },
        data: {
          status: TransferStatus.PENDING,
          failedItems: 0,
          finishedAt: null,
        },
      }),

      this.prisma.transferEvent.create({
        data: {
          jobId: transferId,
          type: 'retry.failed.items',
          message: `Retrying ${failedItems.length} failed items`,
        },
      }),
    ]);

    await transferQueue.add(QUEUE_NAMES.TRANSFER, {
      transferId,
    });

    return {
      message: 'Failed items reset and transfer resumed',
      retriedItems: failedItems.length,
    };
  }

  // ============================================================
  // PAUSE
  // ============================================================

  async pauseTransfer(userId: string, id: string) {
    const transfer = await this.prisma.transferJob.findFirst({
      where: { id, userId },
    });

    if (!transfer) throw new NotFoundException('Transfer not found');

    await this.prisma.transferJob.update({
      where: { id },
      data: {
        status: TransferStatus.PAUSED,
        pausedAt: new Date(),
      },
    });

    return { status: 'PAUSED' };
  }

  // ============================================================
  // RESUME
  // ============================================================

  async resumeTransfer(userId: string, id: string) {
    const transfer = await this.prisma.transferJob.findFirst({
      where: { id, userId },
    });

    if (!transfer) throw new NotFoundException('Transfer not found');

    if (
      transfer.status !== TransferStatus.PAUSED &&
      transfer.status !== TransferStatus.AUTO_PAUSED_QUOTA
    ) {
      throw new ForbiddenException('Transfer is not paused');
    }

    await this.prisma.transferJob.update({
      where: { id },
      data: {
        status: TransferStatus.PENDING,
        pausedAt: null,
      },
    });

    await transferQueue.add(QUEUE_NAMES.TRANSFER, { transferId: id });

    return { status: 'RESUMED' };
  }

  // ============================================================
  // CANCEL
  // ============================================================

  async cancelTransfer(userId: string, id: string) {
    const transfer = await this.prisma.transferJob.findFirst({
      where: { id, userId },
    });

    if (!transfer) throw new NotFoundException('Transfer not found');

    await this.prisma.$transaction([
      this.prisma.transferJob.update({
        where: { id },
        data: {
          status: TransferStatus.CANCELLED,
          finishedAt: new Date(),
        },
      }),

      this.prisma.transferEvent.create({
        data: {
          jobId: id,
          type: 'transfer.cancelled',
          message: 'Transfer cancelled by user',
        },
      }),
    ]);

    return { status: 'CANCELLED' };
  }

  // ============================================================
  // LIST
  // ============================================================

  async listTransfers(userId: string) {
    const transfers = await this.prisma.transferJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
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

  // ============================================================
  // GET ONE
  // ============================================================

  async getTransferById(userId: string, id: string) {
    const transfer = await this.prisma.transferJob.findFirst({
      where: { id, userId },
      include: { items: true, events: true },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    return {
      ...transfer,
      totalBytes: transfer.totalBytes?.toString(),
      transferredBytes: transfer.transferredBytes?.toString(),
      progress:
        transfer.totalItems === 0
          ? 0
          : Math.round((transfer.completedItems / transfer.totalItems) * 100),
    };
  }
}
