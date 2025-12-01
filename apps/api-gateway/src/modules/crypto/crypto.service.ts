/**
 * Peeap Pay Dual-Key Cryptography Service
 *
 * Implements the two-key security model:
 * - PK (Public Key): Exposed in SDK, used for session requests
 * - SK (Secret Key): Server-only, used for signing tokens
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';

interface KeyPair {
  publicKey: string;  // PK - safe for client
  secretKey: string;  // SK - server only
  keyId: string;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

interface SignedPayload {
  data: string;
  signature: string;
  keyId: string;
  timestamp: number;
  nonce: string;
}

interface TokenPayload {
  cardId: string;
  merchantId?: string;
  amount?: number;
  currency?: string;
  timestamp: number;
  nonce: string;
  expiresAt: number;
  deviceFingerprint?: string;
  type: 'nfc' | 'qr' | 'session';
}

@Injectable()
export class CryptoService implements OnModuleInit {
  private keyStore: Map<string, KeyPair> = new Map();
  private activeKeyId: string = '';

  // Key rotation versions
  private readonly KEY_VERSION = 'v1';
  private readonly KEY_EXPIRY_DAYS = 90;
  private readonly TOKEN_EXPIRY_SECONDS = 300; // 5 minutes for dynamic tokens
  private readonly SESSION_EXPIRY_SECONDS = 900; // 15 minutes for sessions

  async onModuleInit() {
    // Initialize with a default key pair (in production, load from secure vault)
    await this.rotateKeys();
  }

  /**
   * Generate a new key pair for dual-key system
   */
  async generateKeyPair(): Promise<KeyPair> {
    const keyId = `pk_${this.KEY_VERSION}_${crypto.randomBytes(16).toString('hex')}`;

    // Generate ECDSA key pair for signing
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'secp256k1',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    // Create a derived public key identifier (safe for SDK)
    const pkHash = crypto.createHash('sha256')
      .update(publicKey)
      .digest('hex')
      .substring(0, 32);

    const keyPair: KeyPair = {
      publicKey: `pk_live_${pkHash}`,
      secretKey: privateKey,
      keyId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.KEY_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      isActive: true
    };

    return keyPair;
  }

  /**
   * Rotate keys - creates new active key, marks old as inactive
   */
  async rotateKeys(): Promise<string> {
    // Mark current key as inactive
    if (this.activeKeyId && this.keyStore.has(this.activeKeyId)) {
      const currentKey = this.keyStore.get(this.activeKeyId)!;
      currentKey.isActive = false;
    }

    // Generate new key pair
    const newKeyPair = await this.generateKeyPair();
    this.keyStore.set(newKeyPair.keyId, newKeyPair);
    this.activeKeyId = newKeyPair.keyId;

    console.log(`[CryptoService] Keys rotated. New active key: ${newKeyPair.keyId}`);
    return newKeyPair.publicKey;
  }

  /**
   * Get the current public key (safe for SDK distribution)
   */
  getPublicKey(): string {
    const activeKey = this.keyStore.get(this.activeKeyId);
    if (!activeKey) {
      throw new Error('No active key available');
    }
    return activeKey.publicKey;
  }

  /**
   * Get key ID for token signing
   */
  getActiveKeyId(): string {
    return this.activeKeyId;
  }

  /**
   * Generate a secure nonce
   */
  generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate a unique card ID
   * Format: crd_{uuid}_h{hash256}
   */
  generateCardId(userId: string): string {
    const uuid = crypto.randomUUID().replace(/-/g, '');
    const hash = crypto.createHash('sha256')
      .update(`${userId}:${uuid}:${Date.now()}`)
      .digest('hex')
      .substring(0, 16);

    return `crd_${uuid}_h${hash}`;
  }

  /**
   * Sign a token payload using the secret key
   */
  signPayload(payload: TokenPayload): SignedPayload {
    const activeKey = this.keyStore.get(this.activeKeyId);
    if (!activeKey) {
      throw new Error('No active key available for signing');
    }

    const data = JSON.stringify(payload);
    const dataBuffer = Buffer.from(data);

    // Create HMAC signature using derived secret
    const hmacSecret = crypto.createHash('sha256')
      .update(activeKey.secretKey)
      .digest();

    const signature = crypto.createHmac('sha256', hmacSecret)
      .update(dataBuffer)
      .digest('base64url');

    return {
      data: Buffer.from(data).toString('base64url'),
      signature,
      keyId: activeKey.keyId,
      timestamp: Date.now(),
      nonce: payload.nonce
    };
  }

  /**
   * Create a signed token string for NFC/QR URLs
   */
  createSignedToken(payload: TokenPayload): string {
    const signed = this.signPayload(payload);
    const tokenData = {
      d: signed.data,
      s: signed.signature,
      k: signed.keyId.substring(0, 16), // Shortened key ID
      t: signed.timestamp,
      n: signed.nonce
    };

    return Buffer.from(JSON.stringify(tokenData)).toString('base64url');
  }

  /**
   * Verify a signed token
   */
  verifyToken(token: string): { valid: boolean; payload?: TokenPayload; error?: string } {
    try {
      const tokenData = JSON.parse(Buffer.from(token, 'base64url').toString());
      const { d: data, s: signature, k: keyIdPrefix, t: timestamp, n: nonce } = tokenData;

      // Find the key by prefix
      let matchedKey: KeyPair | undefined;
      for (const [keyId, keyPair] of this.keyStore) {
        if (keyId.startsWith(keyIdPrefix) || keyId.substring(0, 16) === keyIdPrefix) {
          matchedKey = keyPair;
          break;
        }
      }

      if (!matchedKey) {
        return { valid: false, error: 'Invalid key' };
      }

      // Verify signature
      const dataBuffer = Buffer.from(data, 'base64url');
      const hmacSecret = crypto.createHash('sha256')
        .update(matchedKey.secretKey)
        .digest();

      const expectedSignature = crypto.createHmac('sha256', hmacSecret)
        .update(dataBuffer)
        .digest('base64url');

      if (signature !== expectedSignature) {
        return { valid: false, error: 'Invalid signature' };
      }

      // Parse and validate payload
      const payload: TokenPayload = JSON.parse(dataBuffer.toString());

      // Check expiry
      if (payload.expiresAt < Date.now()) {
        return { valid: false, error: 'Token expired' };
      }

      return { valid: true, payload };
    } catch (error) {
      return { valid: false, error: 'Token parsing failed' };
    }
  }

  /**
   * Create NFC token with specific expiry
   */
  createNFCToken(cardId: string, merchantId?: string, deviceFingerprint?: string): string {
    const payload: TokenPayload = {
      cardId,
      merchantId,
      timestamp: Date.now(),
      nonce: this.generateNonce(),
      expiresAt: Date.now() + (this.TOKEN_EXPIRY_SECONDS * 1000),
      deviceFingerprint,
      type: 'nfc'
    };

    return this.createSignedToken(payload);
  }

  /**
   * Create QR token for specific payment
   */
  createQRToken(cardId: string, amount: number, currency: string, merchantId: string): string {
    const payload: TokenPayload = {
      cardId,
      merchantId,
      amount,
      currency,
      timestamp: Date.now(),
      nonce: this.generateNonce(),
      expiresAt: Date.now() + (this.TOKEN_EXPIRY_SECONDS * 1000),
      type: 'qr'
    };

    return this.createSignedToken(payload);
  }

  /**
   * Create session token for payment checkout
   */
  createSessionToken(cardId: string, amount: number, currency: string, merchantId: string): string {
    const payload: TokenPayload = {
      cardId,
      merchantId,
      amount,
      currency,
      timestamp: Date.now(),
      nonce: this.generateNonce(),
      expiresAt: Date.now() + (this.SESSION_EXPIRY_SECONDS * 1000),
      type: 'session'
    };

    return this.createSignedToken(payload);
  }

  /**
   * Generate merchant-bound token
   */
  createMerchantBoundToken(cardId: string, merchantId: string, permissions: string[]): string {
    const payload = {
      cardId,
      merchantId,
      permissions,
      timestamp: Date.now(),
      nonce: this.generateNonce(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      type: 'merchant_bound'
    };

    return this.createSignedToken(payload as TokenPayload);
  }

  /**
   * Hash a value using SHA-256
   */
  hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  /**
   * Generate a secure random string
   */
  generateSecureRandom(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}
