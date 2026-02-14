// ============================================================
// Delete Worker
// Satisfies: DEFT §9 (Delayed Safe Delete)
// ============================================================

import { Worker } from 'bullmq';
import { QUEUE_NAMES, redisConfig } from '@gdrivebridge/shared';
import { prisma } from '../db';
import { GoogleDriveService } from '../services/google-drive.service';

new Worker(
  QUEUE_NAMES.DELETE_SOURCE,
  async (job) => {
    const { transferId, sourceFileId, sourceAccountId } = job.data;

    const account = await prisma.googleAccount.findUnique({
      where: { id: sourceAccountId },
    });

    if (!account) return;

    const drive = GoogleDriveService.getDriveClient(account.refreshTokenEncrypted);

    try {
      const transfer = await prisma.transferJob.findUnique({
        where: { id: transferId },
        select: { status: true },
      });

      if (!transfer || transfer.status !== 'COMPLETED') {
        console.warn(
          `🛑 Delete blocked — transfer not completed (status=${transfer?.status})`,
        );
        return;
      }

      await drive.files.delete({ fileId: sourceFileId });

      await prisma.transferEvent.create({
        data: {
          jobId: transferId,
          type: 'source.deleted',
          message: `Deleted ${sourceFileId}`,
        },
      });

      console.log('🗑 Deleted source:', sourceFileId);
    } catch (err) {
      console.error('❌ Delete failed:', sourceFileId);
      throw err;
    }
  },
  { connection: redisConfig },
);
