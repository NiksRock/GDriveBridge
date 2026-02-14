// ============================================================
// Idempotent Copy Service
// Satisfies:
// - DEFT §7 Exactly-Once Guarantee
// - DEFT §11.1 Rate Governor
// - DEFT §6 Crash Resumability
// ============================================================

import { drive_v3 } from 'googleapis';
import { PrismaClient } from '@prisma/client';

class RateGovernor {
  private lastExecution = 0;
  private readonly intervalMs = 400; // 2.5 writes/sec

  async throttle() {
    const now = Date.now();
    const diff = now - this.lastExecution;

    if (diff < this.intervalMs) {
      await new Promise((r) => setTimeout(r, this.intervalMs - diff));
    }

    this.lastExecution = Date.now();
  }
}

export class IdempotentCopyService {
  private governor = new RateGovernor();

  constructor(
    private prisma: PrismaClient,
    private destinationDrive: drive_v3.Drive,
  ) {}

  async copyExactlyOnce(params: {
    itemId: string;
    sourceFileId: string;
    destinationFolderId: string;
    fileName: string;
  }) {
    const { itemId, sourceFileId, destinationFolderId, fileName } = params;

    // ============================================================
    // 1️⃣ DB Check (DEFT §7)
    // ============================================================

    const item = await this.prisma.transferItem.findUnique({
      where: { id: itemId },
    });

    if (!item) throw new Error('TransferItem not found');

    if (item.destinationFileId) {
      return item.destinationFileId;
    }

    // ============================================================
    // 2️⃣ API Verification (DEFT §7)
    // ============================================================

    const query = `
      name='${fileName.replace(/'/g, "\\'")}'
      and '${destinationFolderId}' in parents
      and trashed=false
    `;

    const search = await this.destinationDrive.files.list({
      q: query,
      fields: 'files(id,name,appProperties)',
    });

    const found = search.data.files?.find(
      (f) => f.appProperties?.app_id === 'gdrivebridge_v2',
    );

    if (found?.id) {
      await this.prisma.transferItem.update({
        where: { id: itemId },
        data: {
          destinationFileId: found.id,
          status: 'COMPLETED',
        },
      });

      return found.id;
    }

    // ============================================================
    // 3️⃣ Throttled Copy (DEFT §11.1)
    // ============================================================

    await this.governor.throttle();

    const copied = await this.destinationDrive.files.copy({
      fileId: sourceFileId,
      requestBody: {
        name: fileName,
        parents: [destinationFolderId],
        appProperties: {
          app_id: 'gdrivebridge_v2',
        },
      },
      fields: 'id',
    });

    const newId = copied.data.id!;

    // ============================================================
    // 4️⃣ Persist result (DEFT §6)
    // ============================================================

    await this.prisma.transferItem.update({
      where: { id: itemId },
      data: {
        destinationFileId: newId,
        status: 'COMPLETED',
      },
    });

    return newId;
  }
}
