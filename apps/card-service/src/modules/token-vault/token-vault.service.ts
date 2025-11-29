import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CardToken } from '@payment-system/database';
import { encrypt, decrypt, generateCardToken } from '@payment-system/common';
import * as crypto from 'crypto';

interface CardData {
  pan: string;
  expiryMonth: number;
  expiryYear: number;
  cvv?: string;
}

interface TokenizedCard {
  token: string;
  lastFour: string;
  expiryMonth: number;
  expiryYear: number;
  cardBrand: string;
}

@Injectable()
export class TokenVaultService {
  private readonly logger = new Logger(TokenVaultService.name);
  private readonly encryptionKey: Buffer;
  private readonly kekKey: Buffer;

  constructor(
    @InjectRepository(CardToken)
    private readonly tokenRepository: Repository<CardToken>,
    private readonly configService: ConfigService,
  ) {
    // In production, these should come from HSM or secure key management
    const encryptionKeyHex = this.configService.get('CARD_ENCRYPTION_KEY');
    const kekKeyHex = this.configService.get('CARD_KEK_KEY');

    this.encryptionKey = encryptionKeyHex
      ? Buffer.from(encryptionKeyHex, 'hex')
      : crypto.randomBytes(32);

    this.kekKey = kekKeyHex
      ? Buffer.from(kekKeyHex, 'hex')
      : crypto.randomBytes(32);
  }

  async tokenize(cardData: CardData, userId: string): Promise<TokenizedCard> {
    const token = generateCardToken();
    const lastFour = cardData.pan.slice(-4);
    const bin = cardData.pan.slice(0, 6);
    const cardBrand = this.detectCardBrand(cardData.pan);

    // Encrypt PAN with DEK (Data Encryption Key)
    const dek = this.generateDek();
    const encryptedPan = this.encryptSensitiveData(cardData.pan, dek);

    // Encrypt DEK with KEK (Key Encryption Key)
    const encryptedDek = this.encryptDek(dek);

    // Hash PAN for lookups
    const panHash = this.hashPan(cardData.pan);

    // Encrypt CVV separately (if provided) - short-lived
    let encryptedCvv: string | undefined;
    if (cardData.cvv) {
      encryptedCvv = this.encryptSensitiveData(cardData.cvv, dek);
    }

    const cardToken = this.tokenRepository.create({
      token,
      encryptedPan,
      encryptedDek,
      panHash,
      bin,
      lastFour,
      expiryMonth: cardData.expiryMonth,
      expiryYear: cardData.expiryYear,
      cardBrand,
      userId,
      isActive: true,
    });

    await this.tokenRepository.save(cardToken);

    this.logger.log(`Card tokenized: ${token} for user ${userId}`);

    return {
      token,
      lastFour,
      expiryMonth: cardData.expiryMonth,
      expiryYear: cardData.expiryYear,
      cardBrand,
    };
  }

  async detokenize(token: string): Promise<{ pan: string; expiryMonth: number; expiryYear: number }> {
    const cardToken = await this.tokenRepository.findOne({
      where: { token, isActive: true },
    });

    if (!cardToken) {
      throw new NotFoundException('Card token not found');
    }

    // Decrypt DEK with KEK
    const dek = this.decryptDek(cardToken.encryptedDek);

    // Decrypt PAN with DEK
    const pan = this.decryptSensitiveData(cardToken.encryptedPan, dek);

    // Update last used
    cardToken.lastUsedAt = new Date();
    await this.tokenRepository.save(cardToken);

    return {
      pan,
      expiryMonth: cardToken.expiryMonth,
      expiryYear: cardToken.expiryYear,
    };
  }

  async getTokenInfo(token: string): Promise<{
    lastFour: string;
    expiryMonth: number;
    expiryYear: number;
    cardBrand: string;
    bin: string;
  }> {
    const cardToken = await this.tokenRepository.findOne({
      where: { token, isActive: true },
    });

    if (!cardToken) {
      throw new NotFoundException('Card token not found');
    }

    return {
      lastFour: cardToken.lastFour,
      expiryMonth: cardToken.expiryMonth,
      expiryYear: cardToken.expiryYear,
      cardBrand: cardToken.cardBrand,
      bin: cardToken.bin,
    };
  }

  async findByPanHash(panHash: string): Promise<CardToken | null> {
    return this.tokenRepository.findOne({
      where: { panHash, isActive: true },
    });
  }

  async deactivateToken(token: string): Promise<void> {
    const cardToken = await this.tokenRepository.findOne({
      where: { token },
    });

    if (cardToken) {
      cardToken.isActive = false;
      cardToken.deactivatedAt = new Date();
      await this.tokenRepository.save(cardToken);

      this.logger.log(`Token deactivated: ${token}`);
    }
  }

  async rotateTokenEncryption(token: string): Promise<void> {
    const cardToken = await this.tokenRepository.findOne({
      where: { token, isActive: true },
    });

    if (!cardToken) {
      throw new NotFoundException('Card token not found');
    }

    // Decrypt with old DEK
    const oldDek = this.decryptDek(cardToken.encryptedDek);
    const pan = this.decryptSensitiveData(cardToken.encryptedPan, oldDek);

    // Generate new DEK and re-encrypt
    const newDek = this.generateDek();
    cardToken.encryptedPan = this.encryptSensitiveData(pan, newDek);
    cardToken.encryptedDek = this.encryptDek(newDek);

    await this.tokenRepository.save(cardToken);

    this.logger.log(`Token encryption rotated: ${token}`);
  }

  private generateDek(): Buffer {
    return crypto.randomBytes(32);
  }

  private encryptSensitiveData(data: string, dek: Buffer): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
  }

  private decryptSensitiveData(encryptedData: string, dek: Buffer): string {
    const [ivHex, encrypted, authTagHex] = encryptedData.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', dek, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private encryptDek(dek: Buffer): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.kekKey, iv);

    let encrypted = cipher.update(dek);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${encrypted.toString('hex')}:${authTag.toString('hex')}`;
  }

  private decryptDek(encryptedDek: string): Buffer {
    const [ivHex, encryptedHex, authTagHex] = encryptedDek.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.kekKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted;
  }

  private hashPan(pan: string): string {
    const salt = this.configService.get('PAN_HASH_SALT', 'default-salt');
    return crypto
      .createHmac('sha256', salt)
      .update(pan)
      .digest('hex');
  }

  private detectCardBrand(pan: string): string {
    const bin = pan.slice(0, 6);
    const firstDigit = pan.charAt(0);
    const firstTwo = pan.slice(0, 2);

    // Since this is a closed-loop system, we might have our own BIN ranges
    // For now, return "INTERNAL" as the default brand
    return 'INTERNAL';
  }
}
