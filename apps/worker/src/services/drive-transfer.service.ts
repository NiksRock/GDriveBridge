import { drive_v3 } from 'googleapis';
import { PrismaClient } from '@prisma/client';
import { GoogleDriveService } from './google-drive.service';

export class DriveTransferEngine {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly sourceDrive: drive_v3.Drive,
    private readonly destinationDrive: drive_v3.Drive,
    private readonly transferId: string,
  ) {}

  /**
   * Copy folder recursively preserving structure
   */
  async copyFolderRecursive(
    sourceFolderId: string,
    destinationParentId: string,
    folderName: string,
  ) {
    console.log(`📁 Creating folder: ${folderName}`);

    /**
     * 1. Create folder in destination
     */
    const newFolderId = await GoogleDriveService.createFolder(
      this.destinationDrive,
      destinationParentId,
      folderName,
    );

    /**
     * 2. List children in source folder
     */
    const children = await GoogleDriveService.listChildren(
      this.sourceDrive,
      sourceFolderId,
    );

    /**
     * 3. Process each child
     */
    for (const child of children) {
      if (!child.id) continue;

      if (child.mimeType === 'application/vnd.google-apps.folder') {
        await this.copyFolderRecursive(child.id, newFolderId, child.name!);
      } else {
        console.log(`📄 Copying file: ${child.name}`);

        await GoogleDriveService.copyFile(
          this.sourceDrive,
          this.destinationDrive,
          child.id,
          newFolderId,
        );

        /**
         * ✅ Increment progress per copied file
         */
        await this.prisma.transferJob.update({
          where: { id: this.transferId },
          data: {
            completedItems: { increment: 1 },
          },
        });

        /**
         * Log event
         */
        await this.prisma.transferEvent.create({
          data: {
            jobId: this.transferId,
            type: 'file.copied',
            message: `Copied ${child.name}`,
          },
        });
      }
    }
  }
}
