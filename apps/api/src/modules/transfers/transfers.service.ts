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
  // CREATE TRANSFER (Option A)
  // ============================================================

  async createTransfer(userId: string, dto: CreateTransferDto) {
    const prismaMode = dto.mode === 'copy' ? TransferMode.COPY : TransferMode.MOVE;

    const sourceAccount = await this.prisma.googleAccount.findFirst({
      where: { userId, isPrimarySource: true },
    });

    if (!sourceAccount) {
      throw new ForbiddenException('Primary source account not found');
    }

    const destinationAccount = await this.prisma.googleAccount.findFirst({
      where: { userId, isDestination: true },
    });

    if (!destinationAccount) {
      throw new ForbiddenException('Destination account not connected');
    }

    if (sourceAccount.id === destinationAccount.id) {
      throw new ForbiddenException('Source and destination accounts must be distinct');
    }

    const preScan = await this.preScanService.runPreScan(userId, {
      userId,
      sourceAccountId: sourceAccount.id,
      destinationAccountId: destinationAccount.id,
      sourceFileIds: dto.sourceFileIds,
      destinationFolderId: dto.destinationFolderId,
      mode: dto.mode,
    });

    if (!preScan.canStart) {
      throw new ForbiddenException({
        message: 'Transfer blocked by Pre-Scan risk engine',
        riskFlags: preScan.riskFlags,
        warnings: preScan.warnings,
      });
    }

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

    const expansion = await this.expansionService.expandAndPersist(
      transfer.id,
      sourceAccount.refreshTokenEncrypted,
      dto.sourceFileIds,
    );

    await this.prisma.transferJob.update({
      where: { id: transfer.id },
      data: {
        totalItems: expansion.totalItems,
        totalBytes: expansion.totalBytes,
      },
    });

    await transferQueue.add(QUEUE_NAMES.TRANSFER, {
      transferId: transfer.id,
    });

    return {
      id: transfer.id,
      totalItems: expansion.totalItems,
      totalBytes: expansion.totalBytes.toString(),
      status: TransferStatus.PENDING,
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

    await this.prisma.transferJob.update({
      where: { id },
      data: {
        status: TransferStatus.CANCELLED,
        finishedAt: new Date(),
      },
    });

    return { status: 'CANCELLED' };
  }

  // ============================================================
  // RETRY FAILED
  // ============================================================

  async retryFailedItems(userId: string, transferId: string) {
    const transfer = await this.prisma.transferJob.findFirst({
      where: { id: transferId, userId },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    await this.prisma.transferItem.updateMany({
      where: {
        jobId: transferId,
        status: 'FAILED',
      },
      data: {
        status: 'PENDING',
        errorMessage: null,
      },
    });

    await this.prisma.transferJob.update({
      where: { id: transferId },
      data: {
        status: TransferStatus.PENDING,
        failedItems: 0,
        finishedAt: null,
      },
    });

    await transferQueue.add(QUEUE_NAMES.TRANSFER, {
      transferId,
    });

    return { message: 'Retry started' };
  }

  // ============================================================
  // LIST
  // ============================================================

  async listTransfers(userId: string) {
    return this.prisma.transferJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
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

    return transfer;
  }
}
