import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CardToken } from '@payment-system/database';
import { generateCardToken } from '@payment-system/common';
import * as crypto from 'crypto';

interface CardData {
  pan: string;
  expiryMonth: number;
  expiryYear: number;
  cvv?: string;
  cardType?: 'VIRTUAL' | 'PHYSICAL';
}

interface TokenizedCard {
  token: string;
  panFirst6: string;
  panLast4: string;
}

/**
 * Token Vault Service - Handles PCI-compliant card tokenization
 * Stores encrypted PAN data and returns tokens for card operations
 * 
 * Note: For the closed-loop hosted checkout flow, we primarily use
 * the Card entity directly (via CardsService.lookupTokenByPan) since
 * cards are issued internally. This service is for future external
 * card tokenization needs.
 */
@Injectable()
export class TokenVaultService {
  private readonly logger = new Logger(TokenVaultService.name);
  private readonly encryptionKey: Buffer;
  private readonly currentKeyVersion = 1;

  constructor(
    @InjectRepository(CardToken)
    private readonly tokenRepository: Repository<CardToken>,
    private readonly configService: ConfigService,
  ) {
    // In production, this should come from HSM or secure key management
    const encryptionKeyHex = this.configService.get('CARD_ENCRYPTION_KEY');
    this.encryptionKey = encryptionKeyHex
      ? Buffer.from(encryptionKeyHex, 'hex')
      : crypto.randomBytes(32);
  }

  /**
   * Tokenize card data - encrypts PAN and stores token
   */
  async tokenize(cardData: CardData, issuedBy?: string): Promise<TokenizedCard> {
    const token = generateCardToken();
    const tokenHash = this.hashToken(token);
    const panFirst6 = cardData.pan.slice(0, 6);
    const panLast4 = cardData.pan.slice(-4);

    // Encrypt PAN
    const encryptedPan = this.encryptData(cardData.pan);

    // Encrypt expiry as string "MM/YYYY"
    const expiryStr = `${cardData.expiryMonth.toString().padStart(2, '0')}/${cardData.expiryYear}`;
    const encryptedExpiry = this.encryptData(expiryStr);

    const cardToken = this.tokenRepository.create({
      token,
      tokenHash,
      encryptedPan,
      panFirst6,
      panLast4,
      encryptedExpiry,
      keyVersion: this.currentKeyVersion,
      cardType: cardData.cardType || 'VIRTUAL',
      status: 'active',
      issuedBy: issuedBy || 'peeap',
    });

    await this.tokenRepository.save(cardToken);

    this.logger.log(`Card tokenized: ${token.slice(0, 8)}...`);

    return {
      token,
      panFirst6,
      panLast4,
    };
  }

  /**
   * Find token by PAN parts (first 6 / last 4)
   */
  async findByPanParts(panFirst6: string, panLast4: string): Promise<CardToken | null> {
    return this.tokenRepository.findOne({
      where: {
        panFirst6,
        panLast4,
        status: 'active',
      },
    });
  }

  /**
   * Get token info (non-sensitive data only)
   */
  async getTokenInfo(token: string): Promise<{
    panFirst6: string;
    panLast4: string;
    cardType: string;
    status: string;
  } | null> {
    const cardToken = await this.tokenRepository.findOne({
      where: { token, status: 'active' },
    });

    if (!cardToken) {
      return null;
    }

    return {
      panFirst6: cardToken.panFirst6,
      panLast4: cardToken.panLast4,
      cardType: cardToken.cardType,
      status: cardToken.status,
    };
  }

  /**
   * Deactivate a token (soft delete)
   */
  async deactivateToken(token: string): Promise<void> {
    const cardToken = await this.tokenRepository.findOne({
      where: { token },
    });

    if (cardToken) {
      cardToken.status = 'deleted';
      await this.tokenRepository.save(cardToken);
      this.logger.log(`Token deactivated: ${token.slice(0, 8)}...`);
    }
  }

  /**
   * Suspend a token
   */
  async suspendToken(token: string): Promise<void> {
    const cardToken = await this.tokenRepository.findOne({
      where: { token },
    });

    if (cardToken) {
      cardToken.status = 'suspended';
      await this.tokenRepository.save(cardToken);
      this.logger.log(`Token suspended: ${token.slice(0, 8)}...`);
    }
  }

  /**
   * Reactivate a suspended token
   */
  async reactivateToken(token: string): Promise<void> {
    const cardToken = await this.tokenRepository.findOne({
      where: { token, status: 'suspended' },
    });

    if (cardToken) {
      cardToken.status = 'active';
      await this.tokenRepository.save(cardToken);
      this.logger.log(`Token reactivated: ${token.slice(0, 8)}...`);
    }
  }

  private encryptData(data: string): Buffer {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    // Return iv + authTag + encrypted as single buffer
    return Buffer.concat([iv, authTag, encrypted]);
  }

  private decryptData(encryptedBuffer: Buffer): string {
    const iv = encryptedBuffer.subarray(0, 12);
    const authTag = encryptedBuffer.subarray(12, 28);
    const encrypted = encryptedBuffer.subarray(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  private hashToken(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
  }
}
