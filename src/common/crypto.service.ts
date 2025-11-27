import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

/**
 * Cryptographic utilities for secure data handling
 */
@Injectable()
export class CryptoService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly saltRounds = 12;
  private encryptionKey: Buffer | null = null;

  constructor(private configService: ConfigService) {
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    if (key) {
      // Derive a consistent 32-byte key from the provided key
      this.encryptionKey = crypto.scryptSync(key, 'airatelimit-salt', this.keyLength);
    }
  }

  /**
   * Check if encryption is configured
   */
  isEncryptionEnabled(): boolean {
    return this.encryptionKey !== null;
  }

  /**
   * Encrypt sensitive data (API keys, etc.)
   * Returns format: iv:authTag:ciphertext (all base64)
   */
  encrypt(plaintext: string): string {
    if (!this.encryptionKey) {
      // In development without ENCRYPTION_KEY, store as-is with a prefix
      return `plain:${plaintext}`;
    }

    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    
    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    return `enc:${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext}`;
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encrypted: string): string {
    // Handle plaintext storage (development mode)
    if (encrypted.startsWith('plain:')) {
      return encrypted.substring(6);
    }

    // Handle legacy unencrypted values (migration support)
    if (!encrypted.startsWith('enc:')) {
      return encrypted;
    }

    if (!this.encryptionKey) {
      throw new Error('Cannot decrypt: ENCRYPTION_KEY not configured');
    }

    const parts = encrypted.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted format');
    }

    const [, ivB64, authTagB64, ciphertext] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');
    
    return plaintext;
  }

  /**
   * Hash a secret key for storage (one-way)
   */
  async hashSecretKey(secretKey: string): Promise<string> {
    return bcrypt.hash(secretKey, this.saltRounds);
  }

  /**
   * Verify a secret key against its hash
   */
  async verifySecretKey(secretKey: string, hash: string): Promise<boolean> {
    return bcrypt.compare(secretKey, hash);
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      // Still do a comparison to maintain constant time
      crypto.timingSafeEqual(Buffer.from(a), Buffer.from(a));
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  /**
   * Generate a secure random token
   */
  generateSecureToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }
}

