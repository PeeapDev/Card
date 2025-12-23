/**
 * Payment Intents Service
 *
 * Channel-agnostic payment collection API
 * Supports: NFC, QR Code, Card, Wallet, Mobile Money
 */

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getSupabaseClient } from '../../lib/supabase';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ConfirmPaymentIntentDto } from './dto/confirm-payment-intent.dto';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';

export interface PaymentIntent {
  id: string;
  external_id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: PaymentIntentStatus;
  description?: string;
  merchant_id?: string;
  merchant_user_id?: string;
  payment_method_type?: string;
  payment_methods_allowed: string[];
  capture_method: 'automatic' | 'manual';
  qr_code_url?: string;
  qr_code_data?: string;
  return_url?: string;
  cancel_url?: string;
  metadata?: Record<string, any>;
  terminal_id?: string;
  transaction_id?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  succeeded_at?: string;
  canceled_at?: string;
  last_error_code?: string;
  last_error_message?: string;
}

export type PaymentIntentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'requires_capture'
  | 'succeeded'
  | 'canceled'
  | 'failed';

export interface ConfirmResult {
  success: boolean;
  status: PaymentIntentStatus;
  transaction_id?: string;
  error_code?: string;
  error_message?: string;
  next_action?: {
    type: string;
    redirect_url?: string;
    qr_code_url?: string;
  };
}

@Injectable()
export class PaymentIntentsService {
  private readonly logger = new Logger(PaymentIntentsService.name);
  private readonly PAY_DOMAIN: string;

  constructor(private readonly configService: ConfigService) {
    this.PAY_DOMAIN = this.configService.get('PAY_DOMAIN', 'pay.peeap.com');
  }

  /**
   * Create a new payment intent
   */
  async create(
    dto: CreatePaymentIntentDto,
    merchantId?: string,
    merchantUserId?: string,
    apiKeyId?: string,
  ): Promise<PaymentIntent> {
    const supabase = getSupabaseClient();

    // Generate identifiers
    const externalId = `pi_${crypto.randomBytes(16).toString('hex')}`;
    const clientSecret = `${externalId}_secret_${crypto.randomBytes(24).toString('hex')}`;
    const expiresAt = new Date(Date.now() + (dto.expires_in_minutes || 30) * 60 * 1000);

    // Generate QR code URL
    const qrCodeUrl = `https://${this.PAY_DOMAIN}/i/${externalId}`;

    // Generate QR code image
    let qrCodeData: string | undefined;
    try {
      qrCodeData = await QRCode.toDataURL(qrCodeUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
    } catch (err) {
      this.logger.warn('Failed to generate QR code:', err);
    }

    // Insert into database
    const { data, error } = await supabase
      .from('payment_intents')
      .insert({
        external_id: externalId,
        client_secret: clientSecret,
        merchant_id: merchantId,
        merchant_user_id: merchantUserId,
        api_key_id: apiKeyId,
        amount: dto.amount,
        currency: dto.currency || 'SLE',
        description: dto.description,
        statement_descriptor: dto.statement_descriptor,
        capture_method: dto.capture_method || 'automatic',
        payment_methods_allowed: dto.payment_methods || ['nfc', 'qr', 'card', 'wallet'],
        return_url: dto.return_url,
        cancel_url: dto.cancel_url,
        customer_email: dto.customer_email,
        customer_phone: dto.customer_phone,
        terminal_id: dto.terminal_id,
        metadata: dto.metadata || {},
        idempotency_key: dto.idempotency_key,
        expires_at: expiresAt.toISOString(),
        qr_code_url: qrCodeUrl,
        qr_code_data: qrCodeData,
        status: 'requires_payment_method',
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create payment intent:', error);

      // Check for idempotency conflict
      if (error.code === '23505' && dto.idempotency_key) {
        const existing = await this.findByIdempotencyKey(dto.idempotency_key);
        if (existing) {
          return existing;
        }
      }

      throw new BadRequestException('Failed to create payment intent');
    }

    // Log event
    await this.logEvent(data.id, 'payment_intent.created', {
      amount: dto.amount,
      currency: dto.currency,
      merchant_id: merchantId,
    });

    return this.mapToPaymentIntent(data);
  }

  /**
   * Get payment intent by external ID
   */
  async get(externalId: string): Promise<PaymentIntent> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('external_id', externalId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Payment intent not found');
    }

    return this.mapToPaymentIntent(data);
  }

  /**
   * Get payment intent by client secret (for frontend)
   */
  async getByClientSecret(clientSecret: string): Promise<PaymentIntent> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('client_secret', clientSecret)
      .single();

    if (error || !data) {
      throw new NotFoundException('Payment intent not found');
    }

    return this.mapToPaymentIntent(data);
  }

  /**
   * List payment intents for a merchant
   */
  async list(
    merchantUserId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: PaymentIntentStatus;
    } = {},
  ): Promise<{ data: PaymentIntent[]; total: number }> {
    const supabase = getSupabaseClient();
    const { limit = 20, offset = 0, status } = options;

    let query = supabase
      .from('payment_intents')
      .select('*', { count: 'exact' })
      .eq('merchant_user_id', merchantUserId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      this.logger.error('Failed to list payment intents:', error);
      throw new BadRequestException('Failed to list payment intents');
    }

    return {
      data: (data || []).map(this.mapToPaymentIntent),
      total: count || 0,
    };
  }

  /**
   * Confirm payment intent with a payment method
   */
  async confirm(
    clientSecret: string,
    dto: ConfirmPaymentIntentDto,
    ipAddress?: string,
    deviceFingerprint?: string,
  ): Promise<ConfirmResult> {
    const supabase = getSupabaseClient();

    // Get and lock the payment intent
    const { data: intent, error: fetchError } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('client_secret', clientSecret)
      .single();

    if (fetchError || !intent) {
      return {
        success: false,
        status: 'failed',
        error_code: 'intent_not_found',
        error_message: 'Payment intent not found',
      };
    }

    // Check expiry
    if (new Date(intent.expires_at) < new Date()) {
      await this.updateStatus(intent.id, 'canceled', { cancellation_reason: 'abandoned' });
      return {
        success: false,
        status: 'canceled',
        error_code: 'intent_expired',
        error_message: 'Payment intent has expired',
      };
    }

    // Check status
    if (!['requires_payment_method', 'requires_confirmation'].includes(intent.status)) {
      return {
        success: false,
        status: intent.status,
        transaction_id: intent.transaction_id,
        error_code: 'invalid_status',
        error_message: `Payment intent status is ${intent.status}`,
      };
    }

    // Check if payment method is allowed
    const allowedMethods = intent.payment_methods_allowed || [];
    if (!allowedMethods.includes(dto.payment_method_type)) {
      return {
        success: false,
        status: intent.status,
        error_code: 'payment_method_not_allowed',
        error_message: 'This payment method is not allowed for this intent',
      };
    }

    // Log confirmation attempt
    await this.logConfirmation(intent.id, dto.payment_method_type, 'pending', {
      nfc_data: dto.nfc,
      card_data: dto.card ? { last4: dto.card.number?.slice(-4) } : undefined,
      ip_address: ipAddress,
      device_fingerprint: deviceFingerprint,
    });

    // Process based on payment method type
    let result: ConfirmResult;

    switch (dto.payment_method_type) {
      case 'nfc':
        result = await this.processNFCPayment(intent, dto.nfc, ipAddress);
        break;
      case 'qr':
        result = await this.processQRPayment(intent, dto.qr, ipAddress);
        break;
      case 'card':
        result = await this.processCardPayment(intent, dto.card, ipAddress);
        break;
      case 'wallet':
        result = await this.processWalletPayment(intent, dto.wallet, ipAddress);
        break;
      case 'mobile_money':
        result = await this.processMobileMoneyPayment(intent, dto.mobile_money, ipAddress);
        break;
      default:
        result = {
          success: false,
          status: intent.status,
          error_code: 'unsupported_payment_method',
          error_message: 'Unsupported payment method',
        };
    }

    // Update confirmation log
    await this.updateConfirmationStatus(
      intent.id,
      dto.payment_method_type,
      result.success ? 'succeeded' : 'failed',
      result.error_code,
      result.error_message,
    );

    return result;
  }

  /**
   * Capture a payment intent (for manual capture)
   */
  async capture(
    externalId: string,
    amount?: number,
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();

    const { data: intent, error: fetchError } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('external_id', externalId)
      .single();

    if (fetchError || !intent) {
      return { success: false, error: 'Payment intent not found' };
    }

    if (intent.status !== 'requires_capture') {
      return { success: false, error: `Cannot capture intent with status ${intent.status}` };
    }

    const captureAmount = amount || intent.amount;
    if (captureAmount > intent.amount) {
      return { success: false, error: 'Capture amount exceeds authorized amount' };
    }

    // Update status
    const { error: updateError } = await supabase
      .from('payment_intents')
      .update({
        status: 'succeeded',
        captured_amount: captureAmount,
        succeeded_at: new Date().toISOString(),
      })
      .eq('id', intent.id);

    if (updateError) {
      return { success: false, error: 'Failed to capture payment' };
    }

    await this.logEvent(intent.id, 'payment_intent.captured', { amount: captureAmount });

    return { success: true };
  }

  /**
   * Cancel a payment intent
   */
  async cancel(
    externalId: string,
    reason: string = 'requested_by_customer',
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();

    const { data: intent, error: fetchError } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('external_id', externalId)
      .single();

    if (fetchError || !intent) {
      return { success: false, error: 'Payment intent not found' };
    }

    if (['succeeded', 'canceled'].includes(intent.status)) {
      return { success: false, error: `Cannot cancel intent with status ${intent.status}` };
    }

    const { error: updateError } = await supabase
      .from('payment_intents')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        cancellation_reason: reason,
      })
      .eq('id', intent.id);

    if (updateError) {
      return { success: false, error: 'Failed to cancel payment' };
    }

    await this.logEvent(intent.id, 'payment_intent.canceled', { reason });

    return { success: true };
  }

  /**
   * Get QR code for payment intent
   */
  async getQRCode(externalId: string): Promise<{ url: string; data: string }> {
    const intent = await this.get(externalId);

    if (!intent.qr_code_url) {
      throw new BadRequestException('QR code not available for this intent');
    }

    // Regenerate QR if needed
    if (!intent.qr_code_data) {
      const qrData = await QRCode.toDataURL(intent.qr_code_url, {
        width: 300,
        margin: 2,
      });

      const supabase = getSupabaseClient();
      await supabase
        .from('payment_intents')
        .update({ qr_code_data: qrData })
        .eq('external_id', externalId);

      return { url: intent.qr_code_url, data: qrData };
    }

    return {
      url: intent.qr_code_url,
      data: intent.qr_code_data,
    };
  }

  // ============================================================================
  // Payment Method Processors
  // ============================================================================

  private async processNFCPayment(
    intent: any,
    nfcData: any,
    ipAddress?: string,
  ): Promise<ConfirmResult> {
    const supabase = getSupabaseClient();

    // For NFC, we need to verify the NFC token and process payment
    if (!nfcData?.token && !nfcData?.tag_id) {
      return {
        success: false,
        status: intent.status,
        error_code: 'invalid_nfc_data',
        error_message: 'NFC token or tag ID is required',
      };
    }

    // Look up NFC payment link if tag_id provided
    if (nfcData.tag_id) {
      const { data: nfcLink } = await supabase
        .from('nfc_payment_links')
        .select('*, wallets(*)')
        .eq('short_code', nfcData.tag_id)
        .eq('status', 'active')
        .single();

      if (!nfcLink) {
        return {
          success: false,
          status: 'failed',
          error_code: 'invalid_nfc_tag',
          error_message: 'Invalid or inactive NFC tag',
        };
      }

      // Process payment from NFC link wallet
      return this.processWalletPayment(intent, {
        wallet_id: nfcLink.wallet_id,
      }, ipAddress);
    }

    // For NFC token (from mobile wallet like Apple Pay/Google Pay)
    // This would integrate with the actual NFC processing
    const transactionId = crypto.randomUUID();

    await this.updateStatus(intent.id, 'processing', {
      payment_method_type: 'nfc',
      confirmed_at: new Date().toISOString(),
    });

    // Simulate processing (in production, this would call actual payment processor)
    await this.completePayment(intent.id, transactionId);

    return {
      success: true,
      status: 'succeeded',
      transaction_id: transactionId,
    };
  }

  private async processQRPayment(
    intent: any,
    qrData: any,
    ipAddress?: string,
  ): Promise<ConfirmResult> {
    // QR payment means customer scanned the QR and is paying from their wallet
    if (!qrData?.customer_wallet_id) {
      return {
        success: false,
        status: 'requires_action',
        error_code: 'requires_customer_action',
        error_message: 'Customer needs to scan QR and confirm payment',
        next_action: {
          type: 'display_qr_code',
          qr_code_url: intent.qr_code_url,
        },
      };
    }

    // Process from customer's wallet
    return this.processWalletPayment(intent, {
      wallet_id: qrData.customer_wallet_id,
    }, ipAddress);
  }

  private async processCardPayment(
    intent: any,
    cardData: any,
    ipAddress?: string,
  ): Promise<ConfirmResult> {
    const supabase = getSupabaseClient();

    if (!cardData) {
      return {
        success: false,
        status: intent.status,
        error_code: 'invalid_card_data',
        error_message: 'Card data is required',
      };
    }

    // If card token provided, use it
    if (cardData.token) {
      // Verify card token
      const { data: card } = await supabase
        .from('cards')
        .select('*, wallets(*)')
        .eq('token', cardData.token)
        .eq('status', 'active')
        .single();

      if (!card) {
        return {
          success: false,
          status: 'failed',
          error_code: 'invalid_card',
          error_message: 'Invalid or inactive card',
        };
      }

      // Check balance
      if (card.wallets && card.wallets.balance < intent.amount) {
        return {
          success: false,
          status: 'failed',
          error_code: 'insufficient_funds',
          error_message: 'Insufficient balance',
        };
      }

      // Process payment
      return this.processFromWallet(intent, card.wallet_id, ipAddress);
    }

    // If raw card data provided, tokenize and process
    // In production, this would go through card tokenization service
    const transactionId = crypto.randomUUID();

    await this.updateStatus(intent.id, 'processing', {
      payment_method_type: 'card',
      payment_method_id: cardData.number?.slice(-4),
      confirmed_at: new Date().toISOString(),
    });

    // Simulate card processing
    await this.completePayment(intent.id, transactionId);

    return {
      success: true,
      status: 'succeeded',
      transaction_id: transactionId,
    };
  }

  private async processWalletPayment(
    intent: any,
    walletData: any,
    ipAddress?: string,
  ): Promise<ConfirmResult> {
    if (!walletData?.wallet_id) {
      return {
        success: false,
        status: intent.status,
        error_code: 'invalid_wallet',
        error_message: 'Wallet ID is required',
      };
    }

    return this.processFromWallet(intent, walletData.wallet_id, ipAddress, walletData.pin);
  }

  private async processMobileMoneyPayment(
    intent: any,
    mobileData: any,
    ipAddress?: string,
  ): Promise<ConfirmResult> {
    if (!mobileData?.phone_number || !mobileData?.provider) {
      return {
        success: false,
        status: intent.status,
        error_code: 'invalid_mobile_money_data',
        error_message: 'Phone number and provider are required',
      };
    }

    // This would integrate with Monime or other mobile money provider
    await this.updateStatus(intent.id, 'requires_action', {
      payment_method_type: 'mobile_money',
    });

    return {
      success: false,
      status: 'requires_action',
      error_code: 'requires_customer_action',
      error_message: 'Customer needs to confirm on their phone',
      next_action: {
        type: 'mobile_money_redirect',
        redirect_url: `https://${this.PAY_DOMAIN}/mobile/${intent.external_id}`,
      },
    };
  }

  /**
   * Process payment from a wallet
   */
  private async processFromWallet(
    intent: any,
    walletId: string,
    ipAddress?: string,
    pin?: string,
  ): Promise<ConfirmResult> {
    const supabase = getSupabaseClient();

    // Get wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', walletId)
      .single();

    if (walletError || !wallet) {
      return {
        success: false,
        status: 'failed',
        error_code: 'wallet_not_found',
        error_message: 'Wallet not found',
      };
    }

    // Check balance
    const balance = parseFloat(wallet.balance?.toString() || '0');
    const amount = intent.amount / 100; // Convert from cents

    if (balance < amount) {
      return {
        success: false,
        status: 'failed',
        error_code: 'insufficient_funds',
        error_message: 'Insufficient balance',
      };
    }

    // Verify PIN if required (for high-value transactions)
    if (intent.amount > 10000 && pin) {
      // PIN verification would happen here
    }

    // Get merchant wallet
    let merchantWalletId: string | null = null;
    if (intent.merchant_id) {
      const { data: merchant } = await supabase
        .from('merchant_businesses')
        .select('merchant_id')
        .eq('id', intent.merchant_id)
        .single();

      if (merchant) {
        const { data: merchantWallet } = await supabase
          .from('wallets')
          .select('id')
          .eq('user_id', merchant.merchant_id)
          .eq('is_default', true)
          .single();

        merchantWalletId = merchantWallet?.id;
      }
    }

    // Calculate fee (1% with minimum)
    const fee = Math.max(amount * 0.01, 0.10);
    const netAmount = amount - fee;

    // Deduct from payer
    const { error: deductError } = await supabase
      .from('wallets')
      .update({ balance: balance - amount })
      .eq('id', walletId);

    if (deductError) {
      return {
        success: false,
        status: 'failed',
        error_code: 'payment_failed',
        error_message: 'Failed to process payment',
      };
    }

    // Credit merchant if wallet found
    if (merchantWalletId) {
      const { data: mWallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', merchantWalletId)
        .single();

      if (mWallet) {
        const mBalance = parseFloat(mWallet.balance?.toString() || '0');
        await supabase
          .from('wallets')
          .update({ balance: mBalance + netAmount })
          .eq('id', merchantWalletId);
      }
    }

    // Create transaction record
    const transactionId = crypto.randomUUID();
    await supabase.from('transactions').insert({
      id: transactionId,
      external_id: `PI_${intent.external_id}`,
      wallet_id: walletId,
      type: 'PAYMENT',
      amount: -amount,
      fee: fee,
      currency: intent.currency || 'SLE',
      status: 'COMPLETED',
      description: intent.description || 'Payment Intent',
      metadata: {
        payment_intent_id: intent.external_id,
        merchant_id: intent.merchant_id,
      },
    });

    // Complete the payment intent
    await this.completePayment(intent.id, transactionId);

    return {
      success: true,
      status: intent.capture_method === 'automatic' ? 'succeeded' : 'requires_capture',
      transaction_id: transactionId,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async findByIdempotencyKey(key: string): Promise<PaymentIntent | null> {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('idempotency_key', key)
      .single();

    return data ? this.mapToPaymentIntent(data) : null;
  }

  private async updateStatus(
    id: string,
    status: PaymentIntentStatus,
    additionalFields: Record<string, any> = {},
  ): Promise<void> {
    const supabase = getSupabaseClient();
    await supabase
      .from('payment_intents')
      .update({ status, ...additionalFields })
      .eq('id', id);
  }

  private async completePayment(
    id: string,
    transactionId: string,
    authorizationCode?: string,
  ): Promise<void> {
    const supabase = getSupabaseClient();

    const { data: intent } = await supabase
      .from('payment_intents')
      .select('capture_method')
      .eq('id', id)
      .single();

    const isAutoCapture = intent?.capture_method === 'automatic';

    await supabase
      .from('payment_intents')
      .update({
        status: isAutoCapture ? 'succeeded' : 'requires_capture',
        transaction_id: transactionId,
        authorization_code: authorizationCode,
        captured_amount: isAutoCapture ? undefined : 0,
        succeeded_at: isAutoCapture ? new Date().toISOString() : undefined,
      })
      .eq('id', id);

    await this.logEvent(
      id,
      isAutoCapture ? 'payment_intent.succeeded' : 'payment_intent.requires_capture',
      { transaction_id: transactionId },
    );
  }

  private async logEvent(
    intentId: string,
    eventType: string,
    eventData: Record<string, any>,
  ): Promise<void> {
    const supabase = getSupabaseClient();
    await supabase.from('payment_intent_events').insert({
      payment_intent_id: intentId,
      event_type: eventType,
      event_data: eventData,
    });
  }

  private async logConfirmation(
    intentId: string,
    methodType: string,
    status: string,
    data: Record<string, any>,
  ): Promise<void> {
    const supabase = getSupabaseClient();
    await supabase.from('payment_intent_confirmations').insert({
      payment_intent_id: intentId,
      payment_method_type: methodType,
      status,
      nfc_data: data.nfc_data,
      card_data: data.card_data,
      ip_address: data.ip_address,
      device_fingerprint: data.device_fingerprint,
    });
  }

  private async updateConfirmationStatus(
    intentId: string,
    methodType: string,
    status: string,
    errorCode?: string,
    errorMessage?: string,
  ): Promise<void> {
    const supabase = getSupabaseClient();
    await supabase
      .from('payment_intent_confirmations')
      .update({
        status,
        error_code: errorCode,
        error_message: errorMessage,
      })
      .eq('payment_intent_id', intentId)
      .eq('payment_method_type', methodType)
      .order('created_at', { ascending: false })
      .limit(1);
  }

  private mapToPaymentIntent(data: any): PaymentIntent {
    return {
      id: data.id,
      external_id: data.external_id,
      client_secret: data.client_secret,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      description: data.description,
      merchant_id: data.merchant_id,
      merchant_user_id: data.merchant_user_id,
      payment_method_type: data.payment_method_type,
      payment_methods_allowed: data.payment_methods_allowed || [],
      capture_method: data.capture_method,
      qr_code_url: data.qr_code_url,
      qr_code_data: data.qr_code_data,
      return_url: data.return_url,
      cancel_url: data.cancel_url,
      metadata: data.metadata,
      terminal_id: data.terminal_id,
      transaction_id: data.transaction_id,
      expires_at: data.expires_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
      confirmed_at: data.confirmed_at,
      succeeded_at: data.succeeded_at,
      canceled_at: data.canceled_at,
      last_error_code: data.last_error_code,
      last_error_message: data.last_error_message,
    };
  }
}
