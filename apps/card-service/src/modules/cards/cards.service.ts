import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Card, CardRequest, CardStatus, CardType, CardTier } from '@payment-system/database';
import { TokenVaultService } from '../token-vault/token-vault.service';
import { generateCardToken, generateAuthCode } from '@payment-system/common';
import * as crypto from 'crypto';

interface IssueCardDto {
  userId: string;
  walletId: string;
  type: CardType;
  tier?: CardTier;
  nickname?: string;
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

interface CardLimits {
  dailyLimit?: number;
  monthlyLimit?: number;
  perTransactionLimit?: number;
}

@Injectable()
export class CardsService {
  private readonly logger = new Logger(CardsService.name);
  private readonly binPrefix = '4' + '00000'; // Sample BIN for closed-loop

  constructor(
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
    @InjectRepository(CardRequest)
    private readonly cardRequestRepository: Repository<CardRequest>,
    private readonly tokenVaultService: TokenVaultService,
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

      // Generate CVV
      const cvv = this.generateCvv();

      // Tokenize the card
      const tokenizedCard = await this.tokenVaultService.tokenize(
        {
          pan,
          expiryMonth,
          expiryYear,
          cvv,
        },
        dto.userId,
      );

      // Set default limits based on tier
      const limits = this.getDefaultLimits(dto.tier || CardTier.STANDARD);

      // Create the card
      const card = manager.create(Card, {
        userId: dto.userId,
        walletId: dto.walletId,
        cardToken: tokenizedCard.token,
        lastFour: tokenizedCard.lastFour,
        expiryMonth,
        expiryYear,
        type: dto.type,
        tier: dto.tier || CardTier.STANDARD,
        status: dto.type === CardType.VIRTUAL ? CardStatus.ACTIVE : CardStatus.PENDING_ACTIVATION,
        nickname: dto.nickname,
        dailyLimit: limits.dailyLimit,
        monthlyLimit: limits.monthlyLimit,
        perTransactionLimit: limits.perTransactionLimit,
        dailySpent: 0,
        monthlySpent: 0,
        nfcEnabled: true,
        onlineEnabled: true,
        internationalEnabled: false,
        atmEnabled: dto.type === CardType.PHYSICAL,
      });

      await manager.save(card);

      // If physical card, create request for production
      if (dto.type === CardType.PHYSICAL) {
        const cardRequest = manager.create(CardRequest, {
          cardId: card.id,
          userId: dto.userId,
          status: 'PENDING',
          shippingAddress: dto.shippingAddress,
        });

        await manager.save(cardRequest);

        this.logger.log(`Physical card request created: ${cardRequest.id}`);
      }

      this.logger.log(`Card issued: ${card.id} for user ${dto.userId}`);

      return card;
    });
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
      where: { cardToken },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    return card;
  }

  async activateCard(cardId: string, activationCode?: string): Promise<Card> {
    const card = await this.getCard(cardId);

    if (card.status !== CardStatus.PENDING_ACTIVATION) {
      throw new BadRequestException('Card is not pending activation');
    }

    // For physical cards, verify activation code
    if (card.type === CardType.PHYSICAL && activationCode) {
      const request = await this.cardRequestRepository.findOne({
        where: { cardId },
      });

      if (!request || request.activationCode !== activationCode) {
        throw new BadRequestException('Invalid activation code');
      }
    }

    card.status = CardStatus.ACTIVE;
    card.activatedAt = new Date();
    await this.cardRepository.save(card);

    this.logger.log(`Card activated: ${cardId}`);

    return card;
  }

  async blockCard(cardId: string, reason: string, blockedBy: 'USER' | 'SYSTEM' | 'ADMIN'): Promise<Card> {
    const card = await this.getCard(cardId);

    if (card.status === CardStatus.CANCELLED) {
      throw new BadRequestException('Card is already cancelled');
    }

    card.status = CardStatus.BLOCKED;
    card.blockedAt = new Date();
    card.blockedReason = reason;
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
    card.blockedReason = null as any;
    await this.cardRepository.save(card);

    this.logger.log(`Card unblocked: ${cardId}`);

    return card;
  }

  async cancelCard(cardId: string, reason: string): Promise<Card> {
    const card = await this.getCard(cardId);

    if (card.status === CardStatus.CANCELLED) {
      throw new BadRequestException('Card is already cancelled');
    }

    card.status = CardStatus.CANCELLED;
    card.cancelledAt = new Date();
    card.cancelledReason = reason;
    await this.cardRepository.save(card);

    // Deactivate the token
    await this.tokenVaultService.deactivateToken(card.cardToken);

    this.logger.log(`Card cancelled: ${cardId}, reason: ${reason}`);

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
    if (limits.perTransactionLimit !== undefined) {
      card.perTransactionLimit = limits.perTransactionLimit;
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

  async setPin(cardId: string, pinHash: string): Promise<void> {
    const card = await this.getCard(cardId);

    if (card.type !== CardType.PHYSICAL) {
      throw new BadRequestException('PIN can only be set for physical cards');
    }

    card.pinHash = pinHash;
    card.pinSetAt = new Date();
    await this.cardRepository.save(card);

    this.logger.log(`PIN set for card: ${cardId}`);
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
      if (options.amount > Number(card.perTransactionLimit)) {
        return { valid: false, card, reason: 'Exceeds per-transaction limit' };
      }

      const dailyRemaining = Number(card.dailyLimit) - Number(card.dailySpent);
      if (options.amount > dailyRemaining) {
        return { valid: false, card, reason: 'Exceeds daily limit' };
      }

      const monthlyRemaining = Number(card.monthlyLimit) - Number(card.monthlySpent);
      if (options.amount > monthlyRemaining) {
        return { valid: false, card, reason: 'Exceeds monthly limit' };
      }
    }

    return { valid: true, card };
  }

  async recordSpend(cardId: string, amount: number): Promise<void> {
    const card = await this.getCard(cardId);

    card.dailySpent = Number(card.dailySpent) + amount;
    card.monthlySpent = Number(card.monthlySpent) + amount;
    card.lastUsedAt = new Date();

    await this.cardRepository.save(card);
  }

  async reverseSpend(cardId: string, amount: number): Promise<void> {
    const card = await this.getCard(cardId);

    card.dailySpent = Math.max(0, Number(card.dailySpent) - amount);
    card.monthlySpent = Math.max(0, Number(card.monthlySpent) - amount);

    await this.cardRepository.save(card);
  }

  async resetDailySpent(): Promise<number> {
    const result = await this.cardRepository
      .createQueryBuilder()
      .update(Card)
      .set({ dailySpent: 0 })
      .where('daily_spent > 0')
      .execute();

    this.logger.log(`Reset daily spent for ${result.affected} cards`);
    return result.affected || 0;
  }

  async resetMonthlySpent(): Promise<number> {
    const result = await this.cardRepository
      .createQueryBuilder()
      .update(Card)
      .set({ monthlySpent: 0 })
      .where('monthly_spent > 0')
      .execute();

    this.logger.log(`Reset monthly spent for ${result.affected} cards`);
    return result.affected || 0;
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

  private generateCvv(): string {
    return Math.floor(100 + Math.random() * 900).toString();
  }

  private getDefaultLimits(tier: CardTier): CardLimits {
    const limits: Record<CardTier, CardLimits> = {
      [CardTier.BASIC]: {
        dailyLimit: 500,
        monthlyLimit: 2000,
        perTransactionLimit: 200,
      },
      [CardTier.STANDARD]: {
        dailyLimit: 2000,
        monthlyLimit: 10000,
        perTransactionLimit: 1000,
      },
      [CardTier.PREMIUM]: {
        dailyLimit: 10000,
        monthlyLimit: 50000,
        perTransactionLimit: 5000,
      },
      [CardTier.PLATINUM]: {
        dailyLimit: 50000,
        monthlyLimit: 200000,
        perTransactionLimit: 25000,
      },
    };

    return limits[tier] || limits[CardTier.STANDARD];
  }
}
