import { google, drive_v3 } from 'googleapis';
import { Crypto } from '../security/crypto';

export class GoogleDriveService {
  /**
   * Build Drive client from refresh token
   */
  static getDriveClient(refreshTokenEncrypted: string): drive_v3.Drive {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );

    oauth2Client.setCredentials({
      refresh_token: Crypto.decrypt(refreshTokenEncrypted),
    });

    return google.drive({
      version: 'v3',
      auth: oauth2Client,
    });
  }

  /**
   * Copy a file into destination folder
   */
  static async copyFile(
    sourceDrive: drive_v3.Drive,
    destinationDrive: drive_v3.Drive,
    fileId: string,
    destinationFolderId: string,
  ) {
    /**
     * Drive API copy must run under destination account
     */
    const meta = await sourceDrive.files.get({
      fileId,
      fields: 'name',
    });

    return destinationDrive.files.copy({
      fileId,
      requestBody: {
        name: meta.data.name ?? 'copied-file',
        parents: [destinationFolderId],
      },
    });
  }

  /**
   * Create folder in destination
   */
  static async createFolder(
    destinationDrive: drive_v3.Drive,
    parentId: string,
    folderName: string,
  ) {
    const res = await destinationDrive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      fields: 'id',
    });

    return res.data.id!;
  }

  /**
   * List children of folder
   */
  static async listChildren(sourceDrive: drive_v3.Drive, folderId: string) {
    const res = await sourceDrive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id,name,mimeType)',
    });

    return res.data.files ?? [];
  }
}
