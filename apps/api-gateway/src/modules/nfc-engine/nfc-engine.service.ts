/**
 * Peeap Pay NFC Engine Service
 *
 * Handles:
 * - NFC tag registration
 * - NDEF payload generation
 * - NFC payment processing
 * - Tap-to-pay flows
 */

import { Injectable } from '@nestjs/common';
import { CryptoService } from '../crypto/crypto.service';
import { CardEngineService } from '../card-engine/card-engine.service';
import * as crypto from 'crypto';

export interface NFCTag {
  id: string;
  tagId: string;               // Physical NFC tag ID
  userId?: string;
  walletId?: string;
  cardId?: string;
  type: 'payment' | 'identity' | 'merchant';
  status: 'active' | 'inactive' | 'blocked';
  registeredAt: Date;
  lastUsedAt?: Date;
  metadata: NFCTagMetadata;
}

export interface NFCTagMetadata {
  deviceType?: string;
  manufacturer?: string;
  capacity?: number;
  isWriteProtected?: boolean;
}

export interface NDEFMessage {
  records: NDEFRecord[];
  byteLength: number;
  encoded: string;
}

export interface NDEFRecord {
  recordType: 'url' | 'text' | 'smart-poster' | 'mime';
  mediaType?: string;
  id?: string;
  data: string;
  encoding?: 'utf-8' | 'utf-16';
  lang?: string;
}

export interface NFCPaymentRequest {
  tagId: string;
  merchantId: string;
  amount: number;
  currency: string;
  terminalId?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface NFCPaymentResult {
  success: boolean;
  transactionId?: string;
  signedToken?: string;
  paymentUrl?: string;
  deepLink?: string;
  error?: string;
}

@Injectable()
export class NFCEngineService {
  private readonly PAY_DOMAIN = 'pay.peeap.com';
  private tagStore: Map<string, NFCTag> = new Map();

  constructor(
    private readonly cryptoService: CryptoService,
    private readonly cardEngineService: CardEngineService
  ) {}

  /**
   * Register a new NFC tag
   */
  async registerTag(
    tagId: string,
    type: 'payment' | 'identity' | 'merchant',
    userId?: string,
    metadata?: NFCTagMetadata
  ): Promise<NFCTag> {
    const id = `nfc_${crypto.randomBytes(12).toString('hex')}`;

    const tag: NFCTag = {
      id,
      tagId,
      userId,
      type,
      status: 'active',
      registeredAt: new Date(),
      metadata: metadata || {}
    };

    this.tagStore.set(id, tag);
    console.log(`[NFCEngine] Tag registered: ${id}`);

    return tag;
  }

  /**
   * Link NFC tag to wallet
   */
  async linkToWallet(tagId: string, walletId: string, cardId?: string): Promise<NFCTag | null> {
    const tag = this.findTagByTagId(tagId);
    if (!tag) {
      return null;
    }

    tag.walletId = walletId;
    tag.cardId = cardId;

    return tag;
  }

  /**
   * Find tag by physical tag ID
   */
  private findTagByTagId(tagId: string): NFCTag | undefined {
    for (const tag of this.tagStore.values()) {
      if (tag.tagId === tagId) {
        return tag;
      }
    }
    return undefined;
  }

  /**
   * Generate NDEF message for payment
   */
  generateNDEFMessage(cardId: string, merchantId?: string, amount?: number, currency?: string): NDEFMessage {
    let signedToken: string;

    if (amount && currency && merchantId) {
      signedToken = this.cryptoService.createQRToken(cardId, amount, currency, merchantId);
    } else {
      signedToken = this.cryptoService.createNFCToken(cardId, merchantId);
    }

    const paymentUrl = `https://${this.PAY_DOMAIN}/t/${signedToken}`;

    // Create NDEF URI record
    const uriRecord = this.createNDEFURIRecord(paymentUrl);

    // Create Smart Poster record (for better compatibility)
    const smartPosterRecord = this.createSmartPosterRecord(paymentUrl, 'Peeap Pay');

    const records: NDEFRecord[] = [uriRecord];
    const encoded = this.encodeNDEFMessage(records);

    return {
      records,
      byteLength: Buffer.from(encoded, 'base64').length,
      encoded
    };
  }

  /**
   * Create NDEF URI record
   */
  private createNDEFURIRecord(url: string): NDEFRecord {
    return {
      recordType: 'url',
      data: url,
      encoding: 'utf-8'
    };
  }

  /**
   * Create Smart Poster record
   */
  private createSmartPosterRecord(url: string, title: string): NDEFRecord {
    return {
      recordType: 'smart-poster',
      data: JSON.stringify({ url, title, action: 'open' }),
      encoding: 'utf-8'
    };
  }

  /**
   * Encode NDEF message to bytes
   */
  private encodeNDEFMessage(records: NDEFRecord[]): string {
    const messages: number[] = [];

    records.forEach((record, index) => {
      const isFirst = index === 0;
      const isLast = index === records.length - 1;

      let tnf = 0x01; // NFC Forum well-known type
      let flags = 0;

      if (isFirst) flags |= 0x80; // MB (Message Begin)
      if (isLast) flags |= 0x40;  // ME (Message End)
      flags |= 0x10;               // SR (Short Record)
      flags |= tnf;

      let typeBytes: number[];
      let payload: number[];

      switch (record.recordType) {
        case 'url':
          typeBytes = [0x55]; // 'U'
          // URL prefix codes
          const urlPrefixes: { [key: string]: number } = {
            'http://www.': 0x01,
            'https://www.': 0x02,
            'http://': 0x03,
            'https://': 0x04,
          };

          let prefixCode = 0x00;
          let urlData = record.data;

          for (const [prefix, code] of Object.entries(urlPrefixes)) {
            if (record.data.startsWith(prefix)) {
              prefixCode = code;
              urlData = record.data.substring(prefix.length);
              break;
            }
          }

          payload = [prefixCode, ...Buffer.from(urlData)];
          break;

        case 'text':
          typeBytes = [0x54]; // 'T'
          const lang = record.lang || 'en';
          const langBytes = Buffer.from(lang);
          const encoding = record.encoding === 'utf-16' ? 'utf16le' : 'utf8';
          const textBytes = Buffer.from(record.data, encoding as BufferEncoding);
          payload = [langBytes.length, ...langBytes, ...textBytes];
          break;

        default:
          typeBytes = [0x55];
          payload = [...Buffer.from(record.data)];
      }

      messages.push(
        flags,
        typeBytes.length,
        payload.length,
        ...typeBytes,
        ...payload
      );
    });

    return Buffer.from(messages).toString('base64');
  }

  /**
   * Process NFC payment
   */
  async processPayment(request: NFCPaymentRequest): Promise<NFCPaymentResult> {
    const tag = this.findTagByTagId(request.tagId);

    if (!tag) {
      return { success: false, error: 'NFC tag not found' };
    }

    if (tag.status !== 'active') {
      return { success: false, error: 'NFC tag is not active' };
    }

    if (!tag.cardId) {
      return { success: false, error: 'No card linked to this NFC tag' };
    }

    // Validate card for transaction
    const validation = await this.cardEngineService.validateCardForTransaction(
      tag.cardId,
      request.amount,
      request.merchantId
    );

    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    // Generate signed token for payment
    const signedToken = this.cryptoService.createQRToken(
      tag.cardId,
      request.amount,
      request.currency,
      request.merchantId
    );

    const paymentUrl = `https://${this.PAY_DOMAIN}/t/${signedToken}`;
    const deepLink = `peeappay://pay?token=${signedToken}`;

    // Generate transaction ID
    const transactionId = `txn_${crypto.randomBytes(16).toString('hex')}`;

    // Update last used
    tag.lastUsedAt = new Date();

    return {
      success: true,
      transactionId,
      signedToken,
      paymentUrl,
      deepLink
    };
  }

  /**
   * Deactivate NFC tag
   */
  async deactivateTag(id: string): Promise<boolean> {
    const tag = this.tagStore.get(id);
    if (tag) {
      tag.status = 'inactive';
      return true;
    }
    return false;
  }

  /**
   * Block NFC tag (for fraud/security)
   */
  async blockTag(id: string): Promise<boolean> {
    const tag = this.tagStore.get(id);
    if (tag) {
      tag.status = 'blocked';
      return true;
    }
    return false;
  }

  /**
   * Get tag by ID
   */
  async getTag(id: string): Promise<NFCTag | null> {
    return this.tagStore.get(id) || null;
  }

  /**
   * List tags for user
   */
  async getTagsForUser(userId: string): Promise<NFCTag[]> {
    const tags: NFCTag[] = [];
    for (const tag of this.tagStore.values()) {
      if (tag.userId === userId) {
        tags.push(tag);
      }
    }
    return tags;
  }
}
