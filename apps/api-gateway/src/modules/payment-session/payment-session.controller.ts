/**
 * Payment Session API Controller
 *
 * Endpoints:
 * - POST /session/create
 * - GET /session/:id
 * - POST /session/verify
 * - POST /session/:id/pay
 * - GET /t/:token (Payment page router)
 */

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Headers,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { PaymentSessionService, PaymentSession, PaymentResult } from './payment-session.service';

interface CreateSessionDto {
  merchantId: string;
  merchantName?: string;
  amount: number;
  currency: string;
  description?: string;
  reference?: string;
  customer?: {
    email?: string;
    phone?: string;
  };
  redirectUrl?: string;
  callbackUrl?: string;
  expiresIn?: number;
  metadata?: Record<string, unknown>;
}

interface VerifySessionDto {
  token: string;
}

interface ProcessPaymentDto {
  cardId: string;
  pin?: string;
}

@Controller()
export class PaymentSessionController {
  constructor(private readonly paymentSessionService: PaymentSessionService) {}

  /**
   * Create a new payment session
   * POST /session/create
   */
  @Post('session/create')
  @HttpCode(HttpStatus.CREATED)
  async createSession(@Body() dto: CreateSessionDto): Promise<{
    success: boolean;
    data: {
      session: PaymentSession;
      paymentUrl: string;
      deepLink: string;
    };
  }> {
    const session = await this.paymentSessionService.createSession(dto);

    return {
      success: true,
      data: {
        session,
        paymentUrl: this.paymentSessionService.getPaymentUrl(session),
        deepLink: this.paymentSessionService.getDeepLink(session)
      }
    };
  }

  /**
   * Get session by ID
   * GET /session/:id
   */
  @Get('session/:id')
  async getSession(@Param('id') sessionId: string): Promise<{
    success: boolean;
    data?: PaymentSession;
    error?: string;
  }> {
    const session = await this.paymentSessionService.getSession(sessionId);

    if (!session) {
      return {
        success: false,
        error: 'Session not found'
      };
    }

    return {
      success: true,
      data: session
    };
  }

  /**
   * Verify a session token
   * POST /session/verify
   */
  @Post('session/verify')
  @HttpCode(HttpStatus.OK)
  async verifySession(@Body() dto: VerifySessionDto): Promise<{
    success: boolean;
    valid: boolean;
    session?: PaymentSession;
    error?: string;
  }> {
    const result = this.paymentSessionService.verifySession(dto.token);

    return {
      success: true,
      valid: result.valid,
      session: result.session,
      error: result.error
    };
  }

  /**
   * Process payment for session
   * POST /session/:id/pay
   */
  @Post('session/:id/pay')
  @HttpCode(HttpStatus.OK)
  async processPayment(
    @Param('id') sessionId: string,
    @Body() dto: ProcessPaymentDto
  ): Promise<{
    success: boolean;
    data?: PaymentResult;
    error?: string;
  }> {
    const result = await this.paymentSessionService.processPayment(
      sessionId,
      dto.cardId,
      dto.pin
    );

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
   * Cancel a session
   * POST /session/:id/cancel
   */
  @Post('session/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSession(@Param('id') sessionId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.paymentSessionService.cancelSession(sessionId);
    return {
      success: true,
      message: 'Session cancelled'
    };
  }

  /**
   * Payment page router - handles NFC taps and QR scans
   * GET /t/:token
   */
  @Get('t/:token')
  async handlePaymentLink(
    @Param('token') token: string,
    @Headers('user-agent') userAgent: string,
    @Query('source') source?: string,
    @Res() res?: Response
  ): Promise<void> {
    const result = await this.paymentSessionService.handleWebNFCRead(
      token,
      userAgent || ''
    );

    if (result.action === 'error') {
      res?.status(400).json({
        success: false,
        error: result.error
      });
      return;
    }

    if (result.action === 'redirect' && result.url) {
      res?.redirect(302, result.url);
      return;
    }

    // Return checkout page data
    if (result.session) {
      const checkoutData = this.paymentSessionService.getCheckoutData(result.session);
      res?.json({
        success: true,
        data: checkoutData
      });
    }
  }

  /**
   * App payment handler - for deep links
   * GET /app/pay
   */
  @Get('app/pay')
  async handleAppPayment(
    @Query('session') sessionId: string,
    @Query('token') token?: string,
    @Headers('user-agent') userAgent?: string
  ): Promise<{
    success: boolean;
    data?: {
      session: PaymentSession;
      checkoutData: ReturnType<PaymentSessionService['getCheckoutData']>;
    };
    error?: string;
  }> {
    const session = await this.paymentSessionService.getSession(sessionId);

    if (!session) {
      return {
        success: false,
        error: 'Session not found'
      };
    }

    return {
      success: true,
      data: {
        session,
        checkoutData: this.paymentSessionService.getCheckoutData(session)
      }
    };
  }

  /**
   * Merchant payment page (customer scans to pay)
   * GET /pay/:token
   */
  @Get('pay/:token')
  async handleMerchantPayment(
    @Param('token') token: string,
    @Headers('user-agent') userAgent: string
  ): Promise<{
    success: boolean;
    data?: {
      merchantId: string;
      amount: number;
      currency: string;
      deepLink: string;
      universalLink: string;
    };
    error?: string;
  }> {
    const verification = this.paymentSessionService.verifySession(token);

    if (!verification.valid) {
      return {
        success: false,
        error: verification.error
      };
    }

    const session = verification.session!;

    return {
      success: true,
      data: {
        merchantId: session.merchantId,
        amount: session.amount,
        currency: session.currency,
        deepLink: this.paymentSessionService.getDeepLink(session),
        universalLink: this.paymentSessionService.getUniversalLink(session)
      }
    };
  }
}
