/**
 * Card Engine API Controller
 *
 * Endpoints:
 * - POST /card/create
 * - GET /card/:id
 * - POST /card/:id/freeze
 * - POST /card/:id/unfreeze
 */

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { CardEngineService, CardCreationResult } from './card-engine.service';

interface CreateCardDto {
  userId: string;
  walletId: string;
  cardholderName: string;
  type?: 'virtual' | 'physical';
  tier?: 'basic' | 'premium' | 'business';
  dailyLimit?: number;
  monthlyLimit?: number;
}

interface ValidateCardDto {
  cardId: string;
  amount: number;
  merchantId: string;
}

@Controller('card')
export class CardEngineController {
  constructor(private readonly cardEngineService: CardEngineService) {}

  /**
   * Create a new Peeap card
   * POST /card/create
   */
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async createCard(@Body() dto: CreateCardDto): Promise<{
    success: boolean;
    data: CardCreationResult;
  }> {
    const result = await this.cardEngineService.createCard(
      dto.userId,
      dto.walletId,
      dto.cardholderName,
      dto.type || 'virtual',
      {
        tier: dto.tier,
        dailyLimit: dto.dailyLimit,
        monthlyLimit: dto.monthlyLimit
      }
    );

    return {
      success: true,
      data: result
    };
  }

  /**
   * Get card details
   * GET /card/:id
   */
  @Get(':id')
  async getCard(@Param('id') cardId: string): Promise<{
    success: boolean;
    data: {
      cardId: string;
      status: string;
    };
  }> {
    // In production, fetch from database
    return {
      success: true,
      data: {
        cardId,
        status: 'active'
      }
    };
  }

  /**
   * Freeze a card
   * POST /card/:id/freeze
   */
  @Post(':id/freeze')
  @HttpCode(HttpStatus.OK)
  async freezeCard(@Param('id') cardId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.cardEngineService.freezeCard(cardId);
    return {
      success: true,
      message: 'Card frozen successfully'
    };
  }

  /**
   * Unfreeze a card
   * POST /card/:id/unfreeze
   */
  @Post(':id/unfreeze')
  @HttpCode(HttpStatus.OK)
  async unfreezeCard(@Param('id') cardId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.cardEngineService.unfreezeCard(cardId);
    return {
      success: true,
      message: 'Card unfrozen successfully'
    };
  }

  /**
   * Validate card for transaction
   * POST /card/validate
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateCard(@Body() dto: ValidateCardDto): Promise<{
    success: boolean;
    valid: boolean;
    reason?: string;
  }> {
    const result = await this.cardEngineService.validateCardForTransaction(
      dto.cardId,
      dto.amount,
      dto.merchantId
    );

    return {
      success: true,
      valid: result.valid,
      reason: result.reason
    };
  }

  /**
   * Generate new NFC payload for card
   * POST /card/:id/nfc/generate
   */
  @Post(':id/nfc/generate')
  @HttpCode(HttpStatus.OK)
  async generateNFCPayload(
    @Param('id') cardId: string,
    @Body() dto?: { merchantId?: string; deviceFingerprint?: string }
  ) {
    const payload = this.cardEngineService.generateNFCPayload(
      cardId,
      dto?.merchantId,
      dto?.deviceFingerprint
    );

    return {
      success: true,
      data: payload
    };
  }

  /**
   * Generate new QR payload for card
   * POST /card/:id/qr/generate
   */
  @Post(':id/qr/generate')
  @HttpCode(HttpStatus.OK)
  async generateQRPayload(
    @Param('id') cardId: string,
    @Body() dto?: { amount?: number; currency?: string; merchantId?: string }
  ) {
    let payload;

    if (dto?.amount && dto?.currency && dto?.merchantId) {
      payload = this.cardEngineService.generateDynamicQRPayload(
        cardId,
        dto.amount,
        dto.currency,
        dto.merchantId
      );
    } else {
      payload = this.cardEngineService.generateStaticQRPayload(cardId);
    }

    return {
      success: true,
      data: payload
    };
  }
}
