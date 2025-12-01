/**
 * Peeap Pay QR Engine Service
 *
 * Handles:
 * - QR code generation (static and dynamic)
 * - QR token creation and signing
 * - QR payment processing
 * - QR code image generation
 */

import { Injectable } from '@nestjs/common';
import { CryptoService } from '../crypto/crypto.service';
import { CardEngineService } from '../card-engine/card-engine.service';
import * as crypto from 'crypto';

export interface QRCode {
  id: string;
  cardId: string;
  type: 'static' | 'dynamic';
  signedToken: string;
  paymentUrl: string;
  qrImage?: string;         // Base64 SVG/PNG
  amount?: number;
  currency?: string;
  merchantId?: string;
  merchantName?: string;
  description?: string;
  status: 'active' | 'used' | 'expired' | 'cancelled';
  createdAt: Date;
  expiresAt: Date;
  usedAt?: Date;
}

export interface QRGenerateRequest {
  cardId: string;
  type: 'static' | 'dynamic';
  amount?: number;
  currency?: string;
  merchantId?: string;
  merchantName?: string;
  description?: string;
  expiresIn?: number;       // seconds
}

export interface QRDecodeResult {
  valid: boolean;
  cardId?: string;
  merchantId?: string;
  amount?: number;
  currency?: string;
  type?: string;
  expiresAt?: number;
  error?: string;
}

export interface QRPaymentResult {
  success: boolean;
  transactionId?: string;
  qrId?: string;
  error?: string;
}

@Injectable()
export class QREngineService {
  private readonly PAY_DOMAIN = 'pay.peeap.com';
  private qrStore: Map<string, QRCode> = new Map();

  constructor(
    private readonly cryptoService: CryptoService,
    private readonly cardEngineService: CardEngineService
  ) {}

  /**
   * Generate a new QR code
   */
  async generate(request: QRGenerateRequest): Promise<QRCode> {
    const id = `qr_${crypto.randomBytes(12).toString('hex')}`;
    const expiresIn = request.expiresIn || (request.type === 'static' ? 86400 : 300); // 24h for static, 5min for dynamic

    let signedToken: string;

    if (request.type === 'dynamic' && request.amount && request.currency && request.merchantId) {
      signedToken = this.cryptoService.createQRToken(
        request.cardId,
        request.amount,
        request.currency,
        request.merchantId
      );
    } else {
      signedToken = this.cryptoService.createNFCToken(request.cardId, request.merchantId);
    }

    const paymentUrl = `https://${this.PAY_DOMAIN}/t/${signedToken}`;
    const qrImage = await this.generateQRImage(paymentUrl);

    const qrCode: QRCode = {
      id,
      cardId: request.cardId,
      type: request.type,
      signedToken,
      paymentUrl,
      qrImage,
      amount: request.amount,
      currency: request.currency,
      merchantId: request.merchantId,
      merchantName: request.merchantName,
      description: request.description,
      status: 'active',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (expiresIn * 1000))
    };

    this.qrStore.set(id, qrCode);

    return qrCode;
  }

  /**
   * Generate QR image as SVG
   */
  private async generateQRImage(data: string): Promise<string> {
    // Simple QR code SVG generation (in production, use a proper QR library)
    // This creates a placeholder - in real implementation, use 'qrcode' npm package

    const size = 200;
    const moduleCount = 25; // QR version for URL length
    const moduleSize = size / moduleCount;

    // Create a deterministic pattern based on data hash
    const hash = crypto.createHash('sha256').update(data).digest();
    const bits: boolean[] = [];

    // Generate pseudo-random pattern from hash
    for (let i = 0; i < moduleCount * moduleCount; i++) {
      const byteIndex = Math.floor(i / 8) % 32;
      const bitIndex = i % 8;
      bits.push((hash[byteIndex] & (1 << bitIndex)) !== 0);
    }

    // Create SVG
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`;
    svg += `<rect width="${size}" height="${size}" fill="white"/>`;

    // Add finder patterns (the three corner squares)
    const finderPattern = (x: number, y: number) => {
      svg += `<rect x="${x}" y="${y}" width="${7 * moduleSize}" height="${7 * moduleSize}" fill="black"/>`;
      svg += `<rect x="${x + moduleSize}" y="${y + moduleSize}" width="${5 * moduleSize}" height="${5 * moduleSize}" fill="white"/>`;
      svg += `<rect x="${x + 2 * moduleSize}" y="${y + 2 * moduleSize}" width="${3 * moduleSize}" height="${3 * moduleSize}" fill="black"/>`;
    };

    finderPattern(0, 0);
    finderPattern((moduleCount - 7) * moduleSize, 0);
    finderPattern(0, (moduleCount - 7) * moduleSize);

    // Add data modules (simplified - not actual QR encoding)
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        // Skip finder pattern areas
        if ((row < 8 && col < 8) ||
            (row < 8 && col >= moduleCount - 8) ||
            (row >= moduleCount - 8 && col < 8)) {
          continue;
        }

        const index = row * moduleCount + col;
        if (bits[index]) {
          svg += `<rect x="${col * moduleSize}" y="${row * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="black"/>`;
        }
      }
    }

    svg += '</svg>';

    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }

  /**
   * Decode a QR payload
   */
  decode(payload: string): QRDecodeResult {
    // Extract token from URL if full URL is passed
    let token = payload;
    if (payload.includes('/t/')) {
      token = payload.split('/t/')[1];
    }

    const result = this.cryptoService.verifyToken(token);

    if (!result.valid) {
      return { valid: false, error: result.error };
    }

    return {
      valid: true,
      cardId: result.payload?.cardId,
      merchantId: result.payload?.merchantId,
      amount: result.payload?.amount,
      currency: result.payload?.currency,
      type: result.payload?.type,
      expiresAt: result.payload?.expiresAt
    };
  }

  /**
   * Complete QR payment (after user confirms)
   */
  async completePayment(qrId: string, userPin?: string): Promise<QRPaymentResult> {
    const qrCode = this.qrStore.get(qrId);

    if (!qrCode) {
      return { success: false, error: 'QR code not found' };
    }

    if (qrCode.status !== 'active') {
      return { success: false, error: `QR code is ${qrCode.status}` };
    }

    if (qrCode.expiresAt < new Date()) {
      qrCode.status = 'expired';
      return { success: false, error: 'QR code has expired' };
    }

    // Validate card
    if (qrCode.amount && qrCode.merchantId) {
      const validation = await this.cardEngineService.validateCardForTransaction(
        qrCode.cardId,
        qrCode.amount,
        qrCode.merchantId
      );

      if (!validation.valid) {
        return { success: false, error: validation.reason };
      }
    }

    // Mark as used (for dynamic QR)
    if (qrCode.type === 'dynamic') {
      qrCode.status = 'used';
      qrCode.usedAt = new Date();
    }

    // Generate transaction ID
    const transactionId = `txn_${crypto.randomBytes(16).toString('hex')}`;

    return {
      success: true,
      transactionId,
      qrId: qrCode.id
    };
  }

  /**
   * Get QR code by ID
   */
  async getQRCode(id: string): Promise<QRCode | null> {
    return this.qrStore.get(id) || null;
  }

  /**
   * Cancel a QR code
   */
  async cancelQRCode(id: string): Promise<boolean> {
    const qrCode = this.qrStore.get(id);
    if (qrCode) {
      qrCode.status = 'cancelled';
      return true;
    }
    return false;
  }

  /**
   * List QR codes for a card
   */
  async getQRCodesForCard(cardId: string): Promise<QRCode[]> {
    const codes: QRCode[] = [];
    for (const qr of this.qrStore.values()) {
      if (qr.cardId === cardId) {
        codes.push(qr);
      }
    }
    return codes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Generate merchant payment QR
   */
  async generateMerchantPaymentQR(
    merchantId: string,
    merchantName: string,
    amount: number,
    currency: string,
    description?: string
  ): Promise<QRCode> {
    // For merchant-initiated QR (customer scans to pay)
    const id = `qr_merchant_${crypto.randomBytes(12).toString('hex')}`;

    // Create a merchant session token
    const signedToken = this.cryptoService.createSessionToken(
      `merchant_${merchantId}`,
      amount,
      currency,
      merchantId
    );

    const paymentUrl = `https://${this.PAY_DOMAIN}/pay/${signedToken}`;
    const qrImage = await this.generateQRImage(paymentUrl);

    const qrCode: QRCode = {
      id,
      cardId: `merchant_${merchantId}`,
      type: 'dynamic',
      signedToken,
      paymentUrl,
      qrImage,
      amount,
      currency,
      merchantId,
      merchantName,
      description,
      status: 'active',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (15 * 60 * 1000)) // 15 minutes
    };

    this.qrStore.set(id, qrCode);

    return qrCode;
  }
}
