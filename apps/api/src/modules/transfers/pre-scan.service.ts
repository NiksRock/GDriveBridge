// ============================================================
// PreScanService
// Satisfies:
// - DEFT §12 (Mandatory Pre-Scan)
// - DEFT §11.3 (500k Item Limit Protection)
// - DEFT §11.2 (Byte Estimation for Quota Control)
// ============================================================
import { CryptoService } from '../../security/crypto.service';

import { Injectable, ForbiddenException } from '@nestjs/common';
import { google } from 'googleapis';
import { PrismaService } from '../../prisma/prisma.service';
import { PreScanDto } from './dto/pre-scan.dto';

@Injectable()
export class PreScanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {}

  async runPreScan(userId: string, dto: PreScanDto) {
    const sourceAccount = await this.prisma.googleAccount.findFirst({
      where: { id: dto.sourceAccountId, userId: userId },
    });

    if (!sourceAccount) {
      throw new ForbiddenException('Invalid source account');
    }

    const destinationAccount = await this.prisma.googleAccount.findFirst({
      where: { id: dto.destinationAccountId, userId: userId },
    });

    if (!destinationAccount) {
      throw new ForbiddenException('Invalid destination account');
    }

    const oauth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );

    oauth.setCredentials({
      refresh_token: this.cryptoService.decrypt(sourceAccount.refreshTokenEncrypted),
    });

    const drive = google.drive({
      version: 'v3',
      auth: oauth,
    });

    let totalFiles = 0;
    let totalFolders = 0;
    let totalBytes = BigInt(0);
    let maxDepth = 0;

    const scanRecursive = async (fileId: string, depth: number) => {
      if (depth > maxDepth) maxDepth = depth;

      const meta = await drive.files.get({
        fileId,
        fields: 'id,name,mimeType,size',
      });

      if (meta.data.mimeType === 'application/vnd.google-apps.folder') {
        totalFolders++;

        const children = await drive.files.list({
          q: `'${fileId}' in parents and trashed=false`,
          fields: 'files(id,mimeType,size)',
        });

        for (const child of children.data.files ?? []) {
          if (!child.id) continue;
          await scanRecursive(child.id, depth + 1);
        }
      } else {
        totalFiles++;
        if (meta.data.size) {
          totalBytes += BigInt(meta.data.size);
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
    // 500k Destination Limit Protection (DEFT §11.3)
    // ============================================================

    if (totalItems > 450_000) {
      riskFlags.push('ITEM_LIMIT_RISK');
      warnings.push('Transfer approaches Google 500k item limit.');
    }

    // ============================================================
    // Daily Byte Cap Protection (DEFT §11.2)
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
}
