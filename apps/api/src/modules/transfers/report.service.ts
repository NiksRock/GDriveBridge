import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { format } from '@fast-csv/format';
import { Response } from 'express';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async generateReport(userId: string, transferId: string, res: Response) {
    const transfer = await this.prisma.transferJob.findFirst({
      where: { id: transferId, userId },
      include: {
        items: true,
        events: true,
      },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="transfer-${transferId}.csv"`,
    );
    res.setHeader('Content-Type', 'text/csv');

    const csvStream = format({ headers: true });

    csvStream.pipe(res);

    // ============================================================
    // HEADER SUMMARY SECTION
    // ============================================================

    csvStream.write({
      section: 'TRANSFER SUMMARY',
      transferId,
      status: transfer.status,
      totalItems: transfer.totalItems,
      completedItems: transfer.completedItems,
      failedItems: transfer.failedItems,
      totalBytes: transfer.totalBytes?.toString(),
      startedAt: transfer.startedAt?.toISOString(),
      finishedAt: transfer.finishedAt?.toISOString(),
    });

    csvStream.write({}); // blank row

    // ============================================================
    // FILE-LEVEL DETAILS
    // ============================================================

    csvStream.write({ section: 'FILE DETAILS' });

    for (const item of transfer.items) {
      csvStream.write({
        fileName: item.fileName,
        sourceFileId: item.sourceFileId,
        destinationFileId: item.destinationFileId,
        status: item.status,
        sizeBytes: item.sizeBytes?.toString(),
        retryCount: item.retryCount,
        errorMessage: item.errorMessage,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      });
    }

    csvStream.write({}); // blank row

    // ============================================================
    // EVENTS
    // ============================================================

    csvStream.write({ section: 'EVENTS' });

    for (const event of transfer.events) {
      csvStream.write({
        type: event.type,
        message: event.message,
        createdAt: event.createdAt.toISOString(),
      });
    }

    csvStream.end();
  }
}
