// ============================================================
// Worker Crypto Utility
// Must match API CryptoService exactly
// ============================================================

import * as crypto from 'crypto';

export class Crypto {
  private static algorithm = 'aes-256-gcm';
  private static key = (() => {
    const base64Key = process.env.ENCRYPTION_KEY;

    if (!base64Key) {
      throw new Error('ENCRYPTION_KEY not set');
    }

    const key = Buffer.from(base64Key, 'base64');

    if (key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 32 bytes');
    }

    return key;
  })();

  static decrypt(payload: string): string {
    const [ivBase64, encryptedBase64, authTagBase64] = payload.split(':');

    const iv = Buffer.from(ivBase64, 'base64');
    const encrypted = Buffer.from(encryptedBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      iv,
    ) as crypto.DecipherGCM;

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    return decrypted.toString('utf8');
  }
}
