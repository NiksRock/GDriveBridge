// ============================================================
// Verification Worker
// Satisfies:
// - DEFT §9 (Checksum + Count Verification Before Delete)
// - DEFT §7 (Integrity enforcement)
// - DEFT §6 (Cancel must override delete)
// ============================================================

import { Worker } from 'bullmq';
import { QUEUE_NAMES, redisConfig } from '@gdrivebridge/shared';
import { prisma } from '../db';
import { deleteQueue } from './delete.queue';
import { GoogleDriveService } from '../services/google-drive.service';

new Worker(
  QUEUE_NAMES.TRANSFER_EVENTS,
  async (job) => {
    const { transferId } = job.data;

    const transfer = await prisma.transferJob.findUnique({
      where: { id: transferId },
      include: { items: true },
    });

    if (!transfer) return;

    // ============================================================
    // Must be MOVE + COMPLETED
    // ============================================================

    if (transfer.mode !== 'MOVE') return;

    if (transfer.status !== 'COMPLETED') {
      console.warn(`⚠️ Verification skipped — status=${transfer.status}`);
      return;
    }

    // ============================================================
    // Count Verification
    // ============================================================

    if (transfer.totalItems !== transfer.completedItems) {
      console.error('❌ Verification failed: item count mismatch');
      return;
    }

    // ============================================================
    // Build destination drive client
    // ============================================================

    const destinationAccount = await prisma.googleAccount.findUnique({
      where: { id: transfer.destinationAccountId },
    });

    if (!destinationAccount) return;

    const drive = GoogleDriveService.getDriveClient(
      destinationAccount.refreshTokenEncrypted,
    );

    // ============================================================
    // Checksum Verification
    // ============================================================

    for (const item of transfer.items) {
      // Skip folders and unsupported types
      if (
        item.mimeType === 'application/vnd.google-apps.folder' ||
        !item.checksum ||
        !item.destinationFileId
      ) {
        continue;
      }

      const meta = await drive.files.get({
        fileId: item.destinationFileId,
        fields: 'md5Checksum',
      });

      const destinationChecksum = meta.data.md5Checksum ?? null;

      if (destinationChecksum !== item.checksum) {
        console.error(`❌ Checksum mismatch for ${item.fileName}`);

        await prisma.transferEvent.create({
          data: {
            jobId: transferId,
            type: 'verification.failed',
            message: `Checksum mismatch for ${item.fileName}`,
          },
        });

        return; // 🔥 Block deletion entirely
      }
    }

    console.log('✅ Verification passed (count + checksum):', transferId);

    // ============================================================
    // FINAL STATUS RE-CHECK (Race Condition Protection)
    // Satisfies: DEFT §6 + §9
    // ============================================================

    const latest = await prisma.transferJob.findUnique({
      where: { id: transferId },
      select: { status: true },
    });

    if (!latest || latest.status !== 'COMPLETED') {
      console.warn(
        `🛑 Delete queue blocked — transfer no longer completed (status=${latest?.status})`,
      );
      return;
    }

    // ============================================================
    // Enqueue Delete Tasks
    // ============================================================

    for (const item of transfer.items) {
      await deleteQueue.add(
        QUEUE_NAMES.DELETE_SOURCE,
        {
          transferId,
          sourceFileId: item.sourceFileId,
          sourceAccountId: transfer.sourceAccountId,
        },
        {
          delay: 5000,
        },
      );
    }

    console.log('🗑 Delete tasks queued:', transferId);
  },
  { connection: redisConfig },
);
