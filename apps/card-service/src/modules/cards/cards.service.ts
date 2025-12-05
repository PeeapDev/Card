import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Card, CardRequest, CardStatus, CardType, CardRequestStatus } from '@payment-system/database';
import { generateCardToken } from '@payment-system/common';
import * as crypto from 'crypto';

interface IssueCardDto {
  userId: string;
  walletId: string;
  type: CardType;
  cardholderName?: string;
  shippingAddress?: {
    recipientName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phoneNumber?: string;
  };
}

interface CardLimits {
  dailyLimit?: number;
  monthlyLimit?: number;
  singleTransactionLimit?: number;
}

@Injectable()
export class CardsService {
  private readonly logger = new Logger(CardsService.name);
  private readonly binPrefix = '400000'; // Sample BIN for closed-loop

  constructor(
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
    @InjectRepository(CardRequest)
    private readonly cardRequestRepository: Repository<CardRequest>,
    private readonly dataSource: DataSource,
  ) {}

  async issueCard(dto: IssueCardDto): Promise<Card> {
    return this.dataSource.transaction(async (manager) => {
      // Generate card number (PAN)
      const pan = this.generatePan();

      // Generate expiry (3 years from now)
      const now = new Date();
      const expiryMonth = now.getMonth() + 1;
      const expiryYear = now.getFullYear() + 3;

      // Generate token
      const token = generateCardToken();
      const externalId = `card_${crypto.randomBytes(12).toString('hex')}`;

      // Create the card
      const card = manager.create(Card, {
        externalId,
        userId: dto.userId,
        walletId: dto.walletId,
        token,
        bin: pan.slice(0, 6),
        lastFour: pan.slice(-4),
        expiryMonth,
        expiryYear,
        cardholderName: dto.cardholderName,
        type: dto.type,
        status: dto.type === CardType.VIRTUAL ? CardStatus.ACTIVE : CardStatus.PENDING_ACTIVATION,
        dailyLimit: 2000,
        monthlyLimit: 10000,
        singleTransactionLimit: 1000,
        nfcEnabled: true,
        onlineEnabled: true,
        internationalEnabled: false,
        atmEnabled: dto.type === CardType.PHYSICAL,
      });

      await manager.save(card);

      // If physical card, create request for production
      if (dto.type === CardType.PHYSICAL && dto.shippingAddress) {
        const cardRequest = manager.create(CardRequest, {
          cardId: card.id,
          userId: dto.userId,
          status: CardRequestStatus.PENDING,
          shippingAddress: dto.shippingAddress,
        });

        await manager.save(cardRequest);

        this.logger.log(`Physical card request created: ${cardRequest.id}`);
      }

      this.logger.log(`Card issued: ${card.id} for user ${dto.userId}`);

      return card;
    });
  }

  /**
   * Lookup an existing Peeap card by PAN + expiry and return its token.
   * Used by hosted checkout to convert entered card details into a cardToken.
   */
  async lookupTokenByPan(pan: string, expiryMonth: number, expiryYear: number): Promise<string> {
    const cleanedPan = pan.replace(/\s|-/g, '');
    if (!/^\d{12,19}$/.test(cleanedPan)) {
      throw new BadRequestException('Invalid card number');
    }

    const month = Number(expiryMonth);
    const year = Number(expiryYear);
    if (!month || month < 1 || month > 12 || !year) {
      throw new BadRequestException('Invalid expiry');
    }

    const panFirst6 = cleanedPan.slice(0, 6);
    const panLast4 = cleanedPan.slice(-4);

    const card = await this.cardRepository.findOne({
      where: {
        bin: panFirst6,
        lastFour: panLast4,
        status: CardStatus.ACTIVE,
      },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    // Expiry check
    if (card.expiryMonth !== month || card.expiryYear !== year) {
      throw new BadRequestException('Card expiry mismatch');
    }

    // Ensure not expired
    const expiryDate = new Date(year, month, 0);
    if (expiryDate < new Date()) {
      throw new BadRequestException('Card is expired');
    }

    return card.token;
  }

  async getCard(cardId: string): Promise<Card> {
    const card = await this.cardRepository.findOne({
      where: { id: cardId },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    return card;
  }

  async getUserCards(userId: string): Promise<Card[]> {
    return this.cardRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getCardByToken(cardToken: string): Promise<Card> {
    const card = await this.cardRepository.findOne({
      where: { token: cardToken },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    return card;
  }

  async activateCard(cardId: string): Promise<Card> {
    const card = await this.getCard(cardId);

    if (card.status !== CardStatus.PENDING_ACTIVATION) {
      throw new BadRequestException('Card is not pending activation');
    }

    card.status = CardStatus.ACTIVE;
    card.activatedAt = new Date();
    await this.cardRepository.save(card);

    this.logger.log(`Card activated: ${cardId}`);

    return card;
  }

  async blockCard(cardId: string, reason: string, blockedBy: 'USER' | 'SYSTEM' | 'ADMIN'): Promise<Card> {
    const card = await this.getCard(cardId);

    if (card.status === CardStatus.TERMINATED) {
      throw new BadRequestException('Card is already terminated');
    }

    card.status = CardStatus.BLOCKED;
    card.blockedAt = new Date();
    // Store reason in metadata since entity doesn't have blockedReason field
    card.metadata = { ...card.metadata, blockedReason: reason, blockedBy };
    await this.cardRepository.save(card);

    this.logger.warn(`Card blocked: ${cardId}, reason: ${reason}, by: ${blockedBy}`);

    return card;
  }

  async unblockCard(cardId: string): Promise<Card> {
    const card = await this.getCard(cardId);

    if (card.status !== CardStatus.BLOCKED) {
      throw new BadRequestException('Card is not blocked');
    }

    card.status = CardStatus.ACTIVE;
    card.blockedAt = null as any;
    card.metadata = { ...card.metadata, blockedReason: null, blockedBy: null };
    await this.cardRepository.save(card);

    this.logger.log(`Card unblocked: ${cardId}`);

    return card;
  }

  async terminateCard(cardId: string, reason: string): Promise<Card> {
    const card = await this.getCard(cardId);

    if (card.status === CardStatus.TERMINATED) {
      throw new BadRequestException('Card is already terminated');
    }

    card.status = CardStatus.TERMINATED;
    card.terminatedAt = new Date();
    card.metadata = { ...card.metadata, terminationReason: reason };
    await this.cardRepository.save(card);

    this.logger.log(`Card terminated: ${cardId}, reason: ${reason}`);

    return card;
  }

  async updateLimits(cardId: string, limits: CardLimits): Promise<Card> {
    const card = await this.getCard(cardId);

    if (limits.dailyLimit !== undefined) {
      card.dailyLimit = limits.dailyLimit;
    }
    if (limits.monthlyLimit !== undefined) {
      card.monthlyLimit = limits.monthlyLimit;
    }
    if (limits.singleTransactionLimit !== undefined) {
      card.singleTransactionLimit = limits.singleTransactionLimit;
    }

    await this.cardRepository.save(card);

    this.logger.log(`Card limits updated: ${cardId}`);

    return card;
  }

  async updateFeatures(
    cardId: string,
    features: {
      nfcEnabled?: boolean;
      onlineEnabled?: boolean;
      internationalEnabled?: boolean;
      atmEnabled?: boolean;
    },
  ): Promise<Card> {
    const card = await this.getCard(cardId);

    if (features.nfcEnabled !== undefined) card.nfcEnabled = features.nfcEnabled;
    if (features.onlineEnabled !== undefined) card.onlineEnabled = features.onlineEnabled;
    if (features.internationalEnabled !== undefined) card.internationalEnabled = features.internationalEnabled;
    if (features.atmEnabled !== undefined) card.atmEnabled = features.atmEnabled;

    await this.cardRepository.save(card);

    this.logger.log(`Card features updated: ${cardId}`);

    return card;
  }

  async verifyCard(
    cardToken: string,
    options?: {
      checkExpiry?: boolean;
      checkStatus?: boolean;
      checkLimits?: boolean;
      amount?: number;
    },
  ): Promise<{ valid: boolean; card: Card; reason?: string }> {
    const card = await this.getCardByToken(cardToken);

    if (options?.checkStatus !== false) {
      if (card.status !== CardStatus.ACTIVE) {
        return { valid: false, card, reason: `Card is ${card.status.toLowerCase()}` };
      }
    }

    if (options?.checkExpiry !== false) {
      const now = new Date();
      const expiryDate = new Date(card.expiryYear, card.expiryMonth - 1, 28);
      if (expiryDate < now) {
        return { valid: false, card, reason: 'Card is expired' };
      }
    }

    if (options?.checkLimits && options?.amount) {
      if (card.singleTransactionLimit && options.amount > Number(card.singleTransactionLimit)) {
        return { valid: false, card, reason: 'Exceeds per-transaction limit' };
      }
    }

    return { valid: true, card };
  }

  private generatePan(): string {
    // Generate 16-digit PAN with BIN prefix and valid Luhn checksum
    const partialPan = this.binPrefix + this.generateRandomDigits(9);
    const checkDigit = this.calculateLuhnCheckDigit(partialPan);
    return partialPan + checkDigit;
  }

  private generateRandomDigits(length: number): string {
    let digits = '';
    for (let i = 0; i < length; i++) {
      digits += Math.floor(Math.random() * 10).toString();
    }
    return digits;
  }

  private calculateLuhnCheckDigit(partialPan: string): string {
    let sum = 0;
    let isEven = true;

    for (let i = partialPan.length - 1; i >= 0; i--) {
      let digit = parseInt(partialPan.charAt(i), 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return ((10 - (sum % 10)) % 10).toString();
  }
}
