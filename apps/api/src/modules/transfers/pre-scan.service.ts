// ============================================================
// PreScanService (Pagination-Safe + Accurate)
// Satisfies:
// - DEFT §12 (Mandatory Pre-Scan)
// - DEFT §11.3 (500k Item Protection)
// - DEFT §11.2 (Byte Estimation Accuracy)
// - Handles >1000 children safely
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

    const drive = this.buildDriveClient(sourceAccount.refreshTokenEncrypted);

    let totalFiles = 0;
    let totalFolders = 0;
    let totalBytes = BigInt(0);
    let maxDepth = 0;

    // ------------------------------------------------------------
    // Recursive Scanner (Pagination Safe)
    // ------------------------------------------------------------

    const scanRecursive = async (fileId: string, depth: number): Promise<void> => {
      if (depth > maxDepth) maxDepth = depth;

      const meta = await drive.files.get({
        fileId,
        fields: 'id,name,mimeType,size',
      });

      const file = meta.data;

      if (file.mimeType === 'application/vnd.google-apps.folder') {
        totalFolders++;

        let pageToken: string | undefined = undefined;

        do {
          const children = await drive.files.list({
            q: `'${fileId}' in parents and trashed=false`,
            fields: 'nextPageToken, files(id,mimeType,size)',
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

        if (file.size) {
          totalBytes += BigInt(file.size);
        }
      }
    };

    for (const id of dto.sourceFileIds) {
      await scanRecursive(id, 0);
    }

    const totalItems = totalFiles + totalFolders;

    const riskFlags: string[] = [];
    const warnings: string[] = [];

    // ============================================================
    // 500k Item Limit Risk
    // ============================================================

    if (totalItems > 450_000) {
      riskFlags.push('ITEM_LIMIT_RISK');
      warnings.push('Transfer approaches Google 500k item limit.');
    }

    // ============================================================
    // Daily Quota Projection
    // ============================================================

    const dailyBytes = destinationAccount.dailyBytesTransferred ?? BigInt(0);

    const projected = dailyBytes + totalBytes;

    const GB = BigInt(1024 ** 3);

    if (projected >= 700n * GB) {
      riskFlags.push('DAILY_QUOTA_RISK');
      warnings.push('Estimated transfer may exceed 700GB daily limit.');
    }

    return {
      totalFiles,
      totalFolders,
      totalItems,
      estimatedBytes: totalBytes.toString(),
      maxDepth,
      riskFlags,
      warnings,
      canStart: riskFlags.length === 0,
    };
  }

  // ------------------------------------------------------------
  // Drive Client Builder
  // ------------------------------------------------------------

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
