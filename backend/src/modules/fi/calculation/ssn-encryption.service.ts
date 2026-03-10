import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV for GCM
const AUTH_TAG_LENGTH = 16;

@Injectable()
export class SsnEncryptionService {
  private readonly key: Buffer;

  constructor() {
    const keyHex = process.env.SSN_ENCRYPTION_KEY;
    if (!keyHex || keyHex.length !== 64) {
      throw new Error('SSN_ENCRYPTION_KEY must be set as a 64-character hex string (32 bytes)');
    }
    this.key = Buffer.from(keyHex, 'hex');
  }

  encrypt(ssn: string): { ciphertext: string; iv: string; lastFour: string } {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);

    const encrypted = Buffer.concat([cipher.update(ssn, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Append auth tag to ciphertext before base64 encoding
    const ciphertextWithTag = Buffer.concat([encrypted, authTag]);

    const digitsOnly = ssn.replace(/\D/g, '');
    const lastFour = digitsOnly.slice(-4);

    return {
      ciphertext: ciphertextWithTag.toString('base64'),
      iv: iv.toString('base64'),
      lastFour,
    };
  }

  decrypt(ciphertext: string, iv: string): string {
    const ciphertextBuf = Buffer.from(ciphertext, 'base64');
    const ivBuf = Buffer.from(iv, 'base64');

    const encryptedData = ciphertextBuf.slice(0, ciphertextBuf.length - AUTH_TAG_LENGTH);
    const authTag = ciphertextBuf.slice(ciphertextBuf.length - AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, ivBuf);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encryptedData), decipher.final()]).toString('utf8');
  }

  mask(lastFour: string): string {
    return `XXX-XX-${lastFour}`;
  }
}
