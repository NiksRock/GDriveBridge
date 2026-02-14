import { Worker } from 'bullmq';
import { QUEUE_NAMES, redisConfig } from '@gdrivebridge/shared';
import { prisma } from '../db';

import { GoogleDriveService } from '../services/google-drive.service';
import { DriveTransferEngine } from '../services/drive-transfer.service';

console.log('🚀 Worker started...');

new Worker(
  QUEUE_NAMES.TRANSFER,
  async (job) => {
    const { transferId } = job.data;

    console.log('🔥 Processing transfer:', transferId);

    /**
     * 1. Fetch transfer + accounts
     */
    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
      include: {
        sourceAccount: true,
        destinationAccount: true,
        items: true,
      },
    });

    if (!transfer) throw new Error('Transfer not found');

    /**
     * 2. Create Drive clients
     */
    const sourceDrive = GoogleDriveService.getDriveClient(
      transfer.sourceAccount.refreshToken,
    );

    const destinationDrive = GoogleDriveService.getDriveClient(
      transfer.destinationAccount.refreshToken,
    );

    /**
     * 3. Mark transfer running
     */
    await prisma.transfer.update({
      where: { id: transferId },
      data: {
        status: 'running',
        startedAt: new Date(),
      },
    });

    /**
     * 4. Transfer Engine
     */
    const engine = new DriveTransferEngine(
      prisma,
      sourceDrive,
      destinationDrive,
      transferId,
    );

    /**
     * 5. Process root selected items
     */
    for (const item of transfer.items) {
      if (item.status !== 'pending') continue;

      try {
        if (item.mimeType === 'application/vnd.google-apps.folder') {
          await engine.copyFolderRecursive(
            item.googleFileId,
            transfer.destinationFolderId,
            item.fileName,
          );
        } else {
          await GoogleDriveService.copyFile(
            sourceDrive,
            destinationDrive,
            item.googleFileId,
            transfer.destinationFolderId,
          );

          await prisma.transfer.update({
            where: { id: transferId },
            data: {
              completedItems: { increment: 1 },
            },
          });
        }

        await prisma.transferItem.update({
          where: { id: item.id },
          data: { status: 'completed' },
        });
      } catch (err: unknown) {
        let message = 'Unknown error';

        if (err instanceof Error) {
          message = err.message;
        }

        await prisma.transferItem.update({
          where: { id: item.id },
          data: {
            status: 'failed',
            errorMessage: message,
          },
        });

        await prisma.transfer.update({
          where: { id: transferId },
          data: {
            failedItems: { increment: 1 },
          },
        });

        await prisma.transferEvent.create({
          data: {
            transferId,
            type: 'item.failed',
            message: `Failed copying ${item.googleFileId}: ${message}`,
          },
        });

        console.log('❌ Copy failed:', item.googleFileId, message);
      }
    }

    /**
     * 6. Final status
     */
    const fresh = await prisma.transfer.findUnique({
      where: { id: transferId },
    });

    const finalStatus =
      fresh?.failedItems && fresh.failedItems > 0 ? 'failed' : 'completed';

    await prisma.transfer.update({
      where: { id: transferId },
      data: {
        status: finalStatus,
        finishedAt: new Date(),
      },
    });

    console.log(`🎉 Transfer finished: ${transferId}`);
  },
  {
    connection: redisConfig,
  },
);
