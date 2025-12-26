/**
 * Payment Intents Controller
 *
 * REST API for channel-agnostic payment collection
 * Base path: /v1/payment-intents
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  Ip,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { PaymentIntentsService, PaymentIntent, PaymentIntentStatus } from './payment-intents.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ConfirmPaymentIntentDto } from './dto/confirm-payment-intent.dto';
import { ConfigService } from '@nestjs/config';
import { getSupabaseClient } from '../../lib/supabase';

@ApiTags('Payment Intents')
@Controller('payment-intents')
export class PaymentIntentsController {
  private readonly logger = new Logger(PaymentIntentsController.name);

  constructor(
    private readonly paymentIntentsService: PaymentIntentsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new payment intent
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a payment intent' })
  @ApiHeader({ name: 'X-API-Key', description: 'Merchant API key', required: false })
  @ApiHeader({ name: 'Authorization', description: 'Bearer token (alternative to X-API-Key)', required: false })
  @ApiBody({ type: CreatePaymentIntentDto })
  async create(
    @Body() dto: CreatePaymentIntentDto,
    @Headers('x-api-key') apiKey: string,
    @Headers('authorization') authHeader: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<PaymentIntentResponse> {
    // Validate API key (accept both X-API-Key and Authorization: Bearer)
    const keyData = await this.validateApiKey(apiKey || this.extractBearerToken(authHeader));

    // Use idempotency key from header if not in body
    if (idempotencyKey && !dto.idempotency_key) {
      dto.idempotency_key = idempotencyKey;
    }

    const intent = await this.paymentIntentsService.create(
      dto,
      keyData.merchantId,
      keyData.userId,
      keyData.apiKeyId,
    );

    return this.formatResponse(intent);
  }

  /**
   * Get a payment intent by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a payment intent' })
  @ApiParam({ name: 'id', description: 'Payment intent ID (pi_xxx)' })
  @ApiHeader({ name: 'X-API-Key', description: 'Merchant API key', required: false })
  @ApiHeader({ name: 'Authorization', description: 'Bearer token (alternative to X-API-Key)', required: false })
  async get(
    @Param('id') id: string,
    @Headers('x-api-key') apiKey?: string,
    @Headers('authorization') authHeader?: string,
  ): Promise<PaymentIntentResponse> {
    // Allow public access for checkout pages
    const intent = await this.paymentIntentsService.get(id);

    // If API key provided, verify ownership
    const effectiveKey = apiKey || this.extractBearerToken(authHeader);
    if (effectiveKey) {
      const keyData = await this.validateApiKey(effectiveKey);
      if (intent.merchant_user_id !== keyData.userId) {
        throw new UnauthorizedException('Access denied');
      }
    }

    return this.formatResponse(intent, !effectiveKey);
  }

  /**
   * List payment intents for a merchant
   */
  @Get()
  @ApiOperation({ summary: 'List all payment intents' })
  @ApiHeader({ name: 'X-API-Key', description: 'Merchant API key', required: false })
  @ApiHeader({ name: 'Authorization', description: 'Bearer token (alternative to X-API-Key)', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['requires_payment_method', 'requires_confirmation', 'processing', 'succeeded', 'canceled', 'failed'] })
  async list(
    @Headers('x-api-key') apiKey: string,
    @Headers('authorization') authHeader: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('status') status?: PaymentIntentStatus,
  ): Promise<{ data: PaymentIntentResponse[]; has_more: boolean; total: number }> {
    const keyData = await this.validateApiKey(apiKey || this.extractBearerToken(authHeader));

    const result = await this.paymentIntentsService.list(keyData.userId, {
      limit: limit || 20,
      offset: offset || 0,
      status,
    });

    return {
      data: result.data.map((i) => this.formatResponse(i)),
      has_more: (offset || 0) + result.data.length < result.total,
      total: result.total,
    };
  }

  /**
   * Confirm a payment intent with a payment method
   */
  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm a payment intent' })
  @ApiParam({ name: 'id', description: 'Payment intent ID (pi_xxx)' })
  @ApiBody({ type: ConfirmPaymentIntentDto })
  async confirm(
    @Param('id') id: string,
    @Body() dto: ConfirmPaymentIntentDto,
    @Ip() ipAddress: string,
    @Headers('x-device-fingerprint') deviceFingerprint?: string,
    @Headers('x-client-secret') clientSecret?: string,
  ): Promise<ConfirmResponse> {
    // Get the intent to find the client secret
    const intent = await this.paymentIntentsService.get(id);

    // Use client secret from header or look it up
    const secret = clientSecret || intent.client_secret;

    const result = await this.paymentIntentsService.confirm(
      secret,
      dto,
      ipAddress,
      deviceFingerprint,
    );

    return {
      id: intent.external_id,
      status: result.status,
      transaction_id: result.transaction_id,
      error: result.error_code ? {
        code: result.error_code,
        message: result.error_message,
      } : undefined,
      next_action: result.next_action,
    };
  }

  /**
   * Capture a payment intent (for manual capture)
   */
  @Post(':id/capture')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Capture a payment intent' })
  @ApiParam({ name: 'id', description: 'Payment intent ID (pi_xxx)' })
  @ApiHeader({ name: 'X-API-Key', description: 'Merchant API key', required: false })
  @ApiHeader({ name: 'Authorization', description: 'Bearer token (alternative to X-API-Key)', required: false })
  async capture(
    @Param('id') id: string,
    @Body() body: { amount?: number },
    @Headers('x-api-key') apiKey: string,
    @Headers('authorization') authHeader: string,
  ): Promise<{ success: boolean; error?: string }> {
    await this.validateApiKey(apiKey || this.extractBearerToken(authHeader));
    return this.paymentIntentsService.capture(id, body.amount);
  }

  /**
   * Cancel a payment intent
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a payment intent' })
  @ApiParam({ name: 'id', description: 'Payment intent ID (pi_xxx)' })
  @ApiHeader({ name: 'X-API-Key', description: 'Merchant API key', required: false })
  @ApiHeader({ name: 'Authorization', description: 'Bearer token (alternative to X-API-Key)', required: false })
  async cancel(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Headers('x-api-key') apiKey: string,
    @Headers('authorization') authHeader: string,
  ): Promise<{ success: boolean; error?: string }> {
    await this.validateApiKey(apiKey || this.extractBearerToken(authHeader));
    return this.paymentIntentsService.cancel(id, body.reason);
  }

  /**
   * Get QR code for a payment intent
   */
  @Get(':id/qr')
  @ApiOperation({ summary: 'Get QR code for payment intent' })
  @ApiParam({ name: 'id', description: 'Payment intent ID (pi_xxx)' })
  async getQRCode(
    @Param('id') id: string,
  ): Promise<{ url: string; data: string }> {
    return this.paymentIntentsService.getQRCode(id);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Extract Bearer token from Authorization header
   */
  private extractBearerToken(authHeader: string): string | null {
    if (!authHeader) return null;
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      return parts[1];
    }
    return null;
  }

  private async validateApiKey(apiKey: string): Promise<{
    userId: string;
    merchantId?: string;
    apiKeyId: string;
  }> {
    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    // Check for valid key format
    if (!apiKey.startsWith('sk_live_') && !apiKey.startsWith('sk_test_')) {
      throw new UnauthorizedException('Invalid API key format');
    }

    const supabase = getSupabaseClient();

    // Look up API key (check in payment_settings for now)
    const { data: settings, error } = await supabase
      .from('payment_settings')
      .select('user_id, business_id')
      .or(`api_key_live.eq.${apiKey},api_key_test.eq.${apiKey}`)
      .single();

    if (error || !settings) {
      throw new UnauthorizedException('Invalid API key');
    }

    return {
      userId: settings.user_id,
      merchantId: settings.business_id,
      apiKeyId: apiKey.substring(0, 20), // Use prefix as ID
    };
  }

  private formatResponse(intent: PaymentIntent, publicMode = false): PaymentIntentResponse {
    const response: PaymentIntentResponse = {
      id: intent.external_id,
      object: 'payment_intent',
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
      description: intent.description,
      capture_method: intent.capture_method,
      payment_method_types: intent.payment_methods_allowed,
      metadata: intent.metadata,
      qr_code_url: intent.qr_code_url,
      return_url: intent.return_url,
      cancel_url: intent.cancel_url,
      created: Math.floor(new Date(intent.created_at).getTime() / 1000),
      expires_at: Math.floor(new Date(intent.expires_at).getTime() / 1000),
    };

    // Only include client_secret for non-public requests
    if (!publicMode) {
      response.client_secret = intent.client_secret;
    }

    // Include payment method info if confirmed
    if (intent.payment_method_type) {
      response.payment_method = {
        type: intent.payment_method_type,
      };
    }

    // Include transaction info if succeeded
    if (intent.transaction_id) {
      response.latest_charge = intent.transaction_id;
    }

    // Include error info if failed
    if (intent.last_error_code) {
      response.last_payment_error = {
        code: intent.last_error_code,
        message: intent.last_error_message,
      };
    }

    return response;
  }
}

// Response types
interface PaymentIntentResponse {
  id: string;
  object: 'payment_intent';
  amount: number;
  currency: string;
  status: PaymentIntentStatus;
  client_secret?: string;
  description?: string;
  capture_method: 'automatic' | 'manual';
  payment_method_types: string[];
  payment_method?: {
    type: string;
  };
  metadata?: Record<string, any>;
  qr_code_url?: string;
  return_url?: string;
  cancel_url?: string;
  latest_charge?: string;
  last_payment_error?: {
    code: string;
    message?: string;
  };
  created: number;
  expires_at: number;
}

interface ConfirmResponse {
  id: string;
  status: PaymentIntentStatus;
  transaction_id?: string;
  error?: {
    code: string;
    message?: string;
  };
  next_action?: {
    type: string;
    redirect_url?: string;
    qr_code_url?: string;
  };
}
