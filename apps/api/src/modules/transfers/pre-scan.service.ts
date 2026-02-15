// ============================================================
// PreScanService (Pagination-Safe + Accurate)
// Satisfies:
// - DEFT §12 (Mandatory Pre-Scan)
// - DEFT §11.3 (500k Item Protection)
// - Hard Max Item Cap Enforcement
// ============================================================

import { Injectable, ForbiddenException } from '@nestjs/common';
import { google, drive_v3 } from 'googleapis';
import { PrismaService } from '../../prisma/prisma.service';
import { PreScanDto } from './dto/pre-scan.dto';
import { CryptoService } from '../../security/crypto.service';

@Injectable()
export class PreScanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {}

  private readonly DEST_WARNING_THRESHOLD = 480_000;
  private readonly DEST_BLOCK_THRESHOLD = 495_000;
  private readonly MAX_ITEMS_PER_JOB = 200_000;

  async runPreScan(userId: string, dto: PreScanDto) {
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

    const sourceDrive = this.buildDriveClient(sourceAccount.refreshTokenEncrypted);
    const destinationDrive = this.buildDriveClient(
      destinationAccount.refreshTokenEncrypted,
    );

    let totalFiles = 0;
    let totalFolders = 0;
    let totalBytes = BigInt(0);
    let maxDepth = 0;

    const scanRecursive = async (fileId: string, depth: number): Promise<void> => {
      if (depth > 1000) {
        throw new ForbiddenException('Folder depth exceeds safe limit');
      }
      if (depth > maxDepth) maxDepth = depth;

      const meta = await sourceDrive.files.get({
        fileId,
        fields: 'id,name,mimeType,size',
      });

      const file = meta.data;

      if (file.mimeType === 'application/vnd.google-apps.folder') {
        totalFolders++;

        let pageToken: string | undefined = undefined;

        do {
          const children = await sourceDrive.files.list({
            q: `'${fileId}' in parents and trashed=false`,
            fields: 'nextPageToken,files(id,mimeType,size)',
            pageSize: 1000,
            pageToken,
          });

          for (const child of children.data.files ?? []) {
            if (!child.id) continue;
            await scanRecursive(child.id, depth + 1);
          }

          pageToken = children.data.nextPageToken ?? undefined;
        } while (pageToken);
      } else {
        totalFiles++;
        if (file.size) totalBytes += BigInt(file.size);
      }
    };

    for (const id of dto.sourceFileIds) {
      await scanRecursive(id, 0);
    }

    const totalItems = totalFiles + totalFolders;

    if (totalItems > this.MAX_ITEMS_PER_JOB) {
      throw new ForbiddenException(
        `Transfer exceeds maximum allowed item count (${this.MAX_ITEMS_PER_JOB})`,
      );
    }

    // Destination child count
    let destinationItemCount = 0;
    let pageToken: string | undefined = undefined;

    do {
      const res = await destinationDrive.files.list({
        q: `'${dto.destinationFolderId}' in parents and trashed=false`,
        fields: 'nextPageToken,files(id)',
        pageSize: 1000,
        pageToken,
      });

      destinationItemCount += (res.data.files ?? []).length;

      if (destinationItemCount >= this.DEST_BLOCK_THRESHOLD) break;

      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);

    const projectedTotal = destinationItemCount + totalItems;

    const riskFlags: string[] = [];
    const warnings: string[] = [];

    if (projectedTotal >= this.DEST_BLOCK_THRESHOLD) {
      riskFlags.push('DESTINATION_ITEM_LIMIT_BLOCK');
      warnings.push(
        `Projected total items (${projectedTotal}) exceeds safe Drive limit.`,
      );
    } else if (projectedTotal >= this.DEST_WARNING_THRESHOLD) {
      riskFlags.push('DESTINATION_ITEM_LIMIT_WARNING');
      warnings.push(
        `Projected total items (${projectedTotal}) approaching 500k Drive limit.`,
      );
    }

    const dailyBytes = destinationAccount.dailyBytesTransferred ?? BigInt(0);
    const projectedBytes = dailyBytes + totalBytes;
    const GB = BigInt(1024 ** 3);

    if (projectedBytes >= 700n * GB) {
      riskFlags.push('DAILY_QUOTA_RISK');
      warnings.push('Estimated transfer may exceed 700GB daily limit.');
    }

    return {
      totalFiles,
      totalFolders,
      totalItems,
      estimatedBytes: totalBytes.toString(),
      maxDepth,
      destinationItemCount,
      projectedTotalItems: projectedTotal,
      riskFlags,
      warnings,
      canStart: !riskFlags.includes('DESTINATION_ITEM_LIMIT_BLOCK'),
    };
  }

  private buildDriveClient(refreshTokenEncrypted: string): drive_v3.Drive {
    const oauth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );

    oauth.setCredentials({
      refresh_token: this.cryptoService.decrypt(refreshTokenEncrypted),
    });

    return google.drive({
      version: 'v3',
      auth: oauth,
    });
  }
}
