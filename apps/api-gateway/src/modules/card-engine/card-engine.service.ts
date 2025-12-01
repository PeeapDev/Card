/**
 * Peeap Pay Card Engine Service
 *
 * Handles:
 * - Card creation and management
 * - NFC payload signing
 * - QR payload signing
 * - User card identity generation
 */

import { Injectable } from '@nestjs/common';
import { CryptoService } from '../crypto/crypto.service';
import * as crypto from 'crypto';

export interface PeeapCard {
  id: string;                    // crd_{uuid}_h{hash}
  userId: string;
  walletId: string;
  permanentQRIdentifier: string; // Static QR for user identification
  permanentNFCToken: string;     // Base NDEF token
  status: 'active' | 'inactive' | 'blocked' | 'expired';
  type: 'virtual' | 'physical';
  cardholderName: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: CardMetadata;
}

export interface CardMetadata {
  issuedBy: string;
  tier: 'basic' | 'premium' | 'business';
  dailyLimit: number;
  monthlyLimit: number;
  allowedMerchantCategories?: string[];
  blockedMerchantCategories?: string[];
}

export interface NFCPayload {
  cardId: string;
  signedToken: string;
  ndefUrl: string;
  ndefRecord: string;
  expiresAt: number;
}

export interface QRPayload {
  cardId: string;
  signedToken: string;
  qrUrl: string;
  qrData: string;
  amount?: number;
  currency?: string;
  merchantId?: string;
  expiresAt: number;
}

export interface CardCreationResult {
  card: PeeapCard;
  nfcPayload: NFCPayload;
  qrPayload: QRPayload;
}

@Injectable()
export class CardEngineService {
  private readonly PAY_DOMAIN = 'pay.peeap.com';
  private readonly DEEP_LINK_SCHEME = 'peeappay';

  constructor(private readonly cryptoService: CryptoService) {}

  /**
   * Create a new Peeap card for a user
   */
  async createCard(
    userId: string,
    walletId: string,
    cardholderName: string,
    type: 'virtual' | 'physical' = 'virtual',
    metadata?: Partial<CardMetadata>
  ): Promise<CardCreationResult> {
    // Generate unique card ID
    const cardId = this.cryptoService.generateCardId(userId);

    // Generate permanent QR identifier (static, for user identification)
    const permanentQRIdentifier = this.generatePermanentQRIdentifier(userId, cardId);

    // Generate permanent NFC token base (NDEF base)
    const permanentNFCToken = this.generatePermanentNFCToken(userId, cardId);

    const card: PeeapCard = {
      id: cardId,
      userId,
      walletId,
      permanentQRIdentifier,
      permanentNFCToken,
      status: 'active',
      type,
      cardholderName,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        issuedBy: 'peeap',
        tier: metadata?.tier || 'basic',
        dailyLimit: metadata?.dailyLimit || 500000, // $5000 default
        monthlyLimit: metadata?.monthlyLimit || 2000000, // $20000 default
        allowedMerchantCategories: metadata?.allowedMerchantCategories,
        blockedMerchantCategories: metadata?.blockedMerchantCategories
      }
    };

    // Generate initial NFC and QR payloads
    const nfcPayload = this.generateNFCPayload(cardId);
    const qrPayload = this.generateStaticQRPayload(cardId);

    return { card, nfcPayload, qrPayload };
  }

  /**
   * Generate permanent QR identifier for user
   */
  private generatePermanentQRIdentifier(userId: string, cardId: string): string {
    const data = `${userId}:${cardId}:permanent`;
    return `qr_${crypto.createHash('sha256').update(data).digest('hex').substring(0, 24)}`;
  }

  /**
   * Generate permanent NFC token base
   */
  private generatePermanentNFCToken(userId: string, cardId: string): string {
    const data = `${userId}:${cardId}:nfc:permanent`;
    return `nfc_${crypto.createHash('sha256').update(data).digest('hex').substring(0, 24)}`;
  }

  /**
   * Generate NFC NDEF payload for tap-to-pay
   */
  generateNFCPayload(cardId: string, merchantId?: string, deviceFingerprint?: string): NFCPayload {
    const signedToken = this.cryptoService.createNFCToken(cardId, merchantId, deviceFingerprint);
    const ndefUrl = `https://${this.PAY_DOMAIN}/t/${signedToken}`;

    // NDEF record format (simplified)
    const ndefRecord = this.createNDEFRecord(ndefUrl);

    return {
      cardId,
      signedToken,
      ndefUrl,
      ndefRecord,
      expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
    };
  }

  /**
   * Create NDEF record for NFC
   */
  private createNDEFRecord(url: string): string {
    // NDEF URI Record format
    // Type: 'U' (URI)
    // Payload: URL with protocol prefix stripped
    const urlWithoutProtocol = url.replace('https://', '');
    const protocolCode = 0x04; // https://

    const record = {
      type: 'URI',
      protocolCode,
      payload: urlWithoutProtocol,
      // Full NDEF message bytes (base64 encoded for transport)
      bytes: Buffer.from([
        0xD1, // MB=1, ME=1, CF=0, SR=1, IL=0, TNF=1 (NFC Forum well-known type)
        0x01, // Type length
        urlWithoutProtocol.length + 1, // Payload length
        0x55, // 'U' - URI record type
        protocolCode,
        ...Buffer.from(urlWithoutProtocol)
      ]).toString('base64')
    };

    return JSON.stringify(record);
  }

  /**
   * Generate static QR payload (for user identification)
   */
  generateStaticQRPayload(cardId: string): QRPayload {
    const signedToken = this.cryptoService.createNFCToken(cardId); // Reuse NFC token logic
    const qrUrl = `https://${this.PAY_DOMAIN}/t/${signedToken}`;

    return {
      cardId,
      signedToken,
      qrUrl,
      qrData: qrUrl,
      expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
    };
  }

  /**
   * Generate dynamic QR for specific payment
   */
  generateDynamicQRPayload(
    cardId: string,
    amount: number,
    currency: string,
    merchantId: string
  ): QRPayload {
    const signedToken = this.cryptoService.createQRToken(cardId, amount, currency, merchantId);
    const qrUrl = `https://${this.PAY_DOMAIN}/t/${signedToken}`;

    return {
      cardId,
      signedToken,
      qrUrl,
      qrData: qrUrl,
      amount,
      currency,
      merchantId,
      expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
    };
  }

  /**
   * Generate merchant-bound NFC payload
   */
  generateMerchantNFCPayload(
    cardId: string,
    merchantId: string,
    amount: number,
    currency: string
  ): NFCPayload {
    const signedToken = this.cryptoService.createQRToken(cardId, amount, currency, merchantId);
    const ndefUrl = `https://${this.PAY_DOMAIN}/t/${signedToken}`;
    const ndefRecord = this.createNDEFRecord(ndefUrl);

    return {
      cardId,
      signedToken,
      ndefUrl,
      ndefRecord,
      expiresAt: Date.now() + (5 * 60 * 1000)
    };
  }

  /**
   * Verify a payment token (NFC or QR)
   */
  verifyPaymentToken(token: string): {
    valid: boolean;
    cardId?: string;
    merchantId?: string;
    amount?: number;
    currency?: string;
    type?: string;
    error?: string;
  } {
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
      type: result.payload?.type
    };
  }

  /**
   * Generate deep link URL for app
   */
  generateDeepLink(token: string): string {
    return `${this.DEEP_LINK_SCHEME}://pay?token=${token}`;
  }

  /**
   * Generate universal link for iOS
   */
  generateUniversalLink(token: string): string {
    return `https://${this.PAY_DOMAIN}/app/pay?token=${token}`;
  }

  /**
   * Freeze a card
   */
  async freezeCard(cardId: string): Promise<boolean> {
    // In production, update database
    console.log(`[CardEngine] Card frozen: ${cardId}`);
    return true;
  }

  /**
   * Unfreeze a card
   */
  async unfreezeCard(cardId: string): Promise<boolean> {
    // In production, update database
    console.log(`[CardEngine] Card unfrozen: ${cardId}`);
    return true;
  }

  /**
   * Check if card is valid for transaction
   */
  async validateCardForTransaction(
    cardId: string,
    amount: number,
    merchantId: string
  ): Promise<{ valid: boolean; reason?: string }> {
    // In production, check:
    // 1. Card status
    // 2. Daily/monthly limits
    // 3. Merchant category restrictions
    // 4. Fraud checks

    return { valid: true };
  }
}
