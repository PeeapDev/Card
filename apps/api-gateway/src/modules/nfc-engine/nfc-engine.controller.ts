/**
 * NFC Engine API Controller
 *
 * Endpoints:
 * - POST /nfc/register
 * - POST /nfc/token/sign
 * - POST /nfc/link
 * - POST /nfc/payment
 */

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NFCEngineService, NFCTag, NFCPaymentResult } from './nfc-engine.service';

interface RegisterTagDto {
  tagId: string;
  type: 'payment' | 'identity' | 'merchant';
  userId?: string;
  metadata?: {
    deviceType?: string;
    manufacturer?: string;
  };
}

interface LinkTagDto {
  tagId: string;
  walletId: string;
  cardId?: string;
}

interface GenerateNDEFDto {
  cardId: string;
  merchantId?: string;
  amount?: number;
  currency?: string;
}

interface ProcessPaymentDto {
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

@Controller('nfc')
export class NFCEngineController {
  constructor(private readonly nfcEngineService: NFCEngineService) {}

  /**
   * Register a new NFC tag
   * POST /nfc/register
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async registerTag(@Body() dto: RegisterTagDto): Promise<{
    success: boolean;
    data: NFCTag;
  }> {
    const tag = await this.nfcEngineService.registerTag(
      dto.tagId,
      dto.type,
      dto.userId,
      dto.metadata
    );

    return {
      success: true,
      data: tag
    };
  }

  /**
   * Link NFC tag to wallet
   * POST /nfc/link
   */
  @Post('link')
  @HttpCode(HttpStatus.OK)
  async linkTag(@Body() dto: LinkTagDto): Promise<{
    success: boolean;
    data?: NFCTag;
    error?: string;
  }> {
    const tag = await this.nfcEngineService.linkToWallet(
      dto.tagId,
      dto.walletId,
      dto.cardId
    );

    if (!tag) {
      return {
        success: false,
        error: 'NFC tag not found'
      };
    }

    return {
      success: true,
      data: tag
    };
  }

  /**
   * Generate NDEF message for NFC writing
   * POST /nfc/token/sign
   */
  @Post('token/sign')
  @HttpCode(HttpStatus.OK)
  async generateNDEFToken(@Body() dto: GenerateNDEFDto): Promise<{
    success: boolean;
    data: {
      ndefMessage: string;
      paymentUrl: string;
      expiresAt: number;
    };
  }> {
    const ndefMessage = this.nfcEngineService.generateNDEFMessage(
      dto.cardId,
      dto.merchantId,
      dto.amount,
      dto.currency
    );

    return {
      success: true,
      data: {
        ndefMessage: ndefMessage.encoded,
        paymentUrl: `https://pay.peeap.com/t/...`, // Would be extracted from NDEF
        expiresAt: Date.now() + (5 * 60 * 1000)
      }
    };
  }

  /**
   * Process NFC payment
   * POST /nfc/payment
   */
  @Post('payment')
  @HttpCode(HttpStatus.OK)
  async processPayment(@Body() dto: ProcessPaymentDto): Promise<{
    success: boolean;
    data?: NFCPaymentResult;
    error?: string;
  }> {
    const result = await this.nfcEngineService.processPayment(dto);

    if (!result.success) {
      return {
        success: false,
        error: result.error
      };
    }

    return {
      success: true,
      data: result
    };
  }

  /**
   * Get NFC tag details
   * GET /nfc/:id
   */
  @Get(':id')
  async getTag(@Param('id') id: string): Promise<{
    success: boolean;
    data?: NFCTag;
    error?: string;
  }> {
    const tag = await this.nfcEngineService.getTag(id);

    if (!tag) {
      return {
        success: false,
        error: 'NFC tag not found'
      };
    }

    return {
      success: true,
      data: tag
    };
  }

  /**
   * Deactivate NFC tag
   * POST /nfc/:id/deactivate
   */
  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivateTag(@Param('id') id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.nfcEngineService.deactivateTag(id);
    return {
      success: true,
      message: 'NFC tag deactivated'
    };
  }

  /**
   * Block NFC tag
   * POST /nfc/:id/block
   */
  @Post(':id/block')
  @HttpCode(HttpStatus.OK)
  async blockTag(@Param('id') id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.nfcEngineService.blockTag(id);
    return {
      success: true,
      message: 'NFC tag blocked'
    };
  }

  /**
   * Get user's NFC tags
   * GET /nfc/user/:userId
   */
  @Get('user/:userId')
  async getUserTags(@Param('userId') userId: string): Promise<{
    success: boolean;
    data: NFCTag[];
  }> {
    const tags = await this.nfcEngineService.getTagsForUser(userId);
    return {
      success: true,
      data: tags
    };
  }
}
