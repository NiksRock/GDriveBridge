// ============================================================
// TransferExpansionService (Idempotent + Crash-Safe)
// Satisfies:
// - DEFT §5 (All recursion children MUST persist)
// - DEFT §8 (Folder recursive algorithm)
// - DEFT §6 (Crash-safe resumability)
// - Exactly-once expansion
// ============================================================

import { Injectable } from '@nestjs/common';
import { google, drive_v3 } from 'googleapis';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../../security/crypto.service';
import { ItemStatus } from '@gdrivebridge/shared';

interface ExpansionContext {
  jobId: string;
  drive: drive_v3.Drive;
}

@Injectable()
export class TransferExpansionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async expandAndPersist(
    jobId: string,
    sourceAccountRefreshTokenEncrypted: string,
    rootFileIds: string[],
  ): Promise<{ totalItems: number; totalBytes: bigint }> {
    const drive = this.buildDriveClient(sourceAccountRefreshTokenEncrypted);

    let totalItems = 0;
    let totalBytes = BigInt(0);

    for (const rootId of rootFileIds) {
      const result = await this.expandRecursive({ jobId, drive }, rootId, null, 0);

      totalItems += result.items;
      totalBytes += result.bytes;
    }

    return { totalItems, totalBytes };
  }

  private async expandRecursive(
    ctx: ExpansionContext,
    sourceFileId: string,
    sourceParentId: string | null,
    depth: number,
  ): Promise<{ items: number; bytes: bigint }> {
    const { drive, jobId } = ctx;

    const meta = await drive.files.get({
      fileId: sourceFileId,
      fields: 'id,name,mimeType,size',
    });

    const file = meta.data;
    if (!file.id) return { items: 0, bytes: BigInt(0) };

    // 🔥 UPSERT (Idempotent Expansion)
    await this.prisma.transferItem.upsert({
      where: {
        jobId_sourceFileId: {
          jobId,
          sourceFileId: file.id,
        },
      },
      update: {},
      create: {
        jobId,
        sourceFileId: file.id,
        sourceParentId,
        fileName: file.name ?? 'unknown',
        mimeType: file.mimeType,
        sizeBytes: file.size ? BigInt(file.size) : null,
        depth,
        status: ItemStatus.PENDING,
      },
    });

    let totalItems = 1;
    let totalBytes = file.size ? BigInt(file.size) : BigInt(0);

    if (file.mimeType === 'application/vnd.google-apps.folder') {
      let pageToken: string | undefined = undefined;

      do {
        const children = await drive.files.list({
          q: `'${file.id}' in parents and trashed=false`,
          fields: 'nextPageToken, files(id)',
          pageSize: 1000,
          pageToken,
        });

        for (const child of children.data.files ?? []) {
          if (!child.id) continue;

          const result = await this.expandRecursive(ctx, child.id, file.id, depth + 1);

          totalItems += result.items;
          totalBytes += result.bytes;
        }

        pageToken = children.data.nextPageToken ?? undefined;
      } while (pageToken);
    }

    return { items: totalItems, bytes: totalBytes };
  }

  private buildDriveClient(refreshTokenEncrypted: string): drive_v3.Drive {
    const oauth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );

    oauth.setCredentials({
      refresh_token: this.crypto.decrypt(refreshTokenEncrypted),
    });

    return google.drive({
      version: 'v3',
      auth: oauth,
    });
  }
}
