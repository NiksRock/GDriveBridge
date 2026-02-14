// ============================================================
// CryptoService
// Satisfies: DEFT §4.9 Security & Compliance
// Encrypts OAuth tokens at rest using AES-256-GCM
// ============================================================

import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor() {
    const base64Key = process.env.ENCRYPTION_KEY;

    if (!base64Key) {
      throw new Error('ENCRYPTION_KEY not set');
    }

    this.key = Buffer.from(base64Key, 'base64');

    if (this.key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 32 bytes');
    }
  }

  encrypt(plainText: string): string {
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);

    const authTag = cipher.getAuthTag();

    return `${iv.toString('base64')}:${encrypted.toString(
      'base64',
    )}:${authTag.toString('base64')}`;
  }

  decrypt(payload: string): string {
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
