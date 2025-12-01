/**
 * QR Engine API Controller
 *
 * Endpoints:
 * - POST /qr/generate
 * - POST /qr/token/create
 * - POST /qr/decode
 * - POST /qr/payment
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
import { QREngineService, QRCode, QRDecodeResult, QRPaymentResult } from './qr-engine.service';

interface GenerateQRDto {
  cardId: string;
  type: 'static' | 'dynamic';
  amount?: number;
  currency?: string;
  merchantId?: string;
  merchantName?: string;
  description?: string;
  expiresIn?: number;
}

interface DecodeQRDto {
  payload: string;
}

interface CompletePaymentDto {
  qrId: string;
  userPin?: string;
}

interface MerchantQRDto {
  merchantId: string;
  merchantName: string;
  amount: number;
  currency: string;
  description?: string;
}

@Controller('qr')
export class QREngineController {
  constructor(private readonly qrEngineService: QREngineService) {}

  /**
   * Generate a new QR code
   * POST /qr/generate
   */
  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  async generateQR(@Body() dto: GenerateQRDto): Promise<{
    success: boolean;
    data: QRCode;
  }> {
    const qrCode = await this.qrEngineService.generate(dto);

    return {
      success: true,
      data: qrCode
    };
  }

  /**
   * Create QR token (alias for generate with dynamic type)
   * POST /qr/token/create
   */
  @Post('token/create')
  @HttpCode(HttpStatus.CREATED)
  async createToken(@Body() dto: GenerateQRDto): Promise<{
    success: boolean;
    data: {
      token: string;
      paymentUrl: string;
      qrImage: string;
      expiresAt: Date;
    };
  }> {
    const qrCode = await this.qrEngineService.generate({
      ...dto,
      type: 'dynamic'
    });

    return {
      success: true,
      data: {
        token: qrCode.signedToken,
        paymentUrl: qrCode.paymentUrl,
        qrImage: qrCode.qrImage || '',
        expiresAt: qrCode.expiresAt
      }
    };
  }

  /**
   * Decode a QR payload
   * POST /qr/decode
   */
  @Post('decode')
  @HttpCode(HttpStatus.OK)
  async decodeQR(@Body() dto: DecodeQRDto): Promise<{
    success: boolean;
    data?: QRDecodeResult;
    error?: string;
  }> {
    const result = this.qrEngineService.decode(dto.payload);

    if (!result.valid) {
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
   * Complete QR payment
   * POST /qr/payment
   */
  @Post('payment')
  @HttpCode(HttpStatus.OK)
  async completePayment(@Body() dto: CompletePaymentDto): Promise<{
    success: boolean;
    data?: QRPaymentResult;
    error?: string;
  }> {
    const result = await this.qrEngineService.completePayment(dto.qrId, dto.userPin);

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
   * Get QR code details
   * GET /qr/:id
   */
  @Get(':id')
  async getQRCode(@Param('id') id: string): Promise<{
    success: boolean;
    data?: QRCode;
    error?: string;
  }> {
    const qrCode = await this.qrEngineService.getQRCode(id);

    if (!qrCode) {
      return {
        success: false,
        error: 'QR code not found'
      };
    }

    return {
      success: true,
      data: qrCode
    };
  }

  /**
   * Cancel a QR code
   * POST /qr/:id/cancel
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelQRCode(@Param('id') id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.qrEngineService.cancelQRCode(id);
    return {
      success: true,
      message: 'QR code cancelled'
    };
  }

  /**
   * Get QR codes for a card
   * GET /qr/card/:cardId
   */
  @Get('card/:cardId')
  async getCardQRCodes(@Param('cardId') cardId: string): Promise<{
    success: boolean;
    data: QRCode[];
  }> {
    const codes = await this.qrEngineService.getQRCodesForCard(cardId);
    return {
      success: true,
      data: codes
    };
  }

  /**
   * Generate merchant payment QR
   * POST /qr/merchant/generate
   */
  @Post('merchant/generate')
  @HttpCode(HttpStatus.CREATED)
  async generateMerchantQR(@Body() dto: MerchantQRDto): Promise<{
    success: boolean;
    data: QRCode;
  }> {
    const qrCode = await this.qrEngineService.generateMerchantPaymentQR(
      dto.merchantId,
      dto.merchantName,
      dto.amount,
      dto.currency,
      dto.description
    );

    return {
      success: true,
      data: qrCode
    };
  }
}
