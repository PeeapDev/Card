/**
 * Monime Payment Service - Centralized Backend Module
 *
 * This is the single source of truth for all Monime integrations.
 * Use this module for:
 * - Checkout payments
 * - Wallet deposits
 * - Wallet withdrawals
 * - Refunds
 *
 * IMPORTANT: Sierra Leone Leone (SLE) is a whole number currency.
 * 1 SLE = 1 SLE (no minor units/cents conversion needed)
 */

import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

// Types
export interface MonimeConfig {
  accessToken: string;
  spaceId: string;
  baseUrl?: string;
}

export interface MonimeLineItem {
  type: 'custom';
  name: string;
  price: {
    currency: string;
    value: number; // Amount in whole units for SLE
  };
  quantity: number;
}

export interface MonimeCheckoutRequest {
  name: string;
  description?: string;
  successUrl: string;
  cancelUrl: string;
  reference: string;
  lineItems: MonimeLineItem[];
  metadata?: Record<string, string>;
}

export interface MonimeCheckoutResponse {
  success: boolean;
  result?: {
    id: string;
    redirectUrl: string;
    expireTime: string;
    status: string;
  };
  error?: {
    message: string;
    code?: string;
  };
}

export interface MonimePayoutRequest {
  amount: number;
  currency: string;
  destination: {
    type: 'mobile_money' | 'bank_account';
    phoneNumber?: string;
    provider?: string;
    bankCode?: string;
    accountNumber?: string;
    accountName?: string;
  };
  reference: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface MonimePayoutResponse {
  success: boolean;
  result?: {
    id: string;
    status: string;
    reference: string;
    fee?: number;
    netAmount?: number;
  };
  error?: {
    message: string;
    code?: string;
  };
}

export interface MonimeTransactionStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired' | 'cancelled';
  amount: number;
  currency: string;
  reference?: string;
  paidAt?: string;
  failureReason?: string;
}

// Currency configuration for Monime API
// Monime expects amounts in SMALLEST CURRENCY UNIT (cents)
// For SLE: 100 cents = 1 Leone, so multiply by 100
const MONIME_CURRENCY_MULTIPLIER: Record<string, number> = {
  SLE: 100, // Monime expects cents: 1 SLE = 100 cents
  SLL: 100, // Old Leone, same treatment
  USD: 100, // 1 USD = 100 cents
  EUR: 100,
  GBP: 100,
  NGN: 100,
  GHS: 100,
};

/**
 * Get Monime multiplier for currency
 */
function getMonimeMultiplier(currency: string): number {
  return MONIME_CURRENCY_MULTIPLIER[currency.toUpperCase()] || 10;
}

/**
 * Convert amount to Monime format
 * For SLE: Multiply by 10 (Monime divides by 10 internally)
 * For USD/etc: Convert to cents (multiply by 100)
 */
export function toMonimeAmount(amount: number, currency: string): number {
  const multiplier = getMonimeMultiplier(currency);
  return Math.round(amount * multiplier);
}

/**
 * Convert Monime amount to display format
 * For SLE: Divide by 10 (Monime stores as value * 10)
 * For USD/etc: Divide by 100 (cents to dollars)
 */
export function fromMonimeAmount(amount: number, currency: string): number {
  const multiplier = getMonimeMultiplier(currency);
  return amount / multiplier;
}

/**
 * Monime Payment Service
 */
export class MonimeService {
  private config: MonimeConfig;
  private baseUrl: string;

  constructor(config: MonimeConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.monime.io/v1';
  }

  /**
   * Generate idempotency key for requests
   */
  private generateIdempotencyKey(): string {
    return crypto.randomUUID();
  }

  /**
   * Make authenticated request to Monime API
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: object
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.accessToken}`,
      'Content-Type': 'application/json',
      'Monime-Space-Id': this.config.spaceId,
    };

    if (method === 'POST') {
      headers['Idempotency-Key'] = this.generateIdempotencyKey();
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[Monime] API error (${endpoint}):`, data);
      throw new MonimeError(
        data.error?.message || data.message || 'Monime API error',
        data.error?.code || 'UNKNOWN_ERROR',
        response.status
      );
    }

    return data;
  }

  /**
   * Create a checkout session for payment collection
   * Used for: Hosted checkout, deposits
   */
  async createCheckoutSession(request: MonimeCheckoutRequest): Promise<MonimeCheckoutResponse> {
    console.log('[Monime] Creating checkout session:', JSON.stringify(request, null, 2));

    const response = await this.request<MonimeCheckoutResponse>(
      '/checkout-sessions',
      'POST',
      request
    );

    console.log('[Monime] Checkout session created:', response.result?.id);
    return response;
  }

  /**
   * Get checkout session status
   */
  async getCheckoutSession(sessionId: string): Promise<MonimeTransactionStatus> {
    const response = await this.request<{ result: MonimeTransactionStatus }>(
      `/checkout-sessions/${sessionId}`,
      'GET'
    );
    return response.result;
  }

  /**
   * Create a payout (withdrawal)
   * Used for: Wallet withdrawals, cashouts
   */
  async createPayout(request: MonimePayoutRequest): Promise<MonimePayoutResponse> {
    console.log('[Monime] Creating payout:', JSON.stringify(request, null, 2));

    const response = await this.request<MonimePayoutResponse>(
      '/payouts',
      'POST',
      request
    );

    console.log('[Monime] Payout created:', response.result?.id);
    return response;
  }

  /**
   * Get payout status
   */
  async getPayoutStatus(payoutId: string): Promise<MonimeTransactionStatus> {
    const response = await this.request<{ result: MonimeTransactionStatus }>(
      `/payouts/${payoutId}`,
      'GET'
    );
    return response.result;
  }

  /**
   * Get available banks for payout
   */
  async getBanks(): Promise<Array<{ providerId: string; name: string; country: string }>> {
    const response = await this.request<{ result: Array<{ providerId: string; name: string; country: string }> }>(
      '/banks',
      'GET'
    );
    return response.result || [];
  }

  /**
   * Helper: Create checkout for hosted checkout payment
   */
  async createHostedCheckout(params: {
    sessionId: string;
    amount: number;
    currency: string;
    description: string;
    merchantName: string;
    merchantId?: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ paymentUrl: string; monimeSessionId: string; expiresAt: string }> {
    const response = await this.createCheckoutSession({
      name: params.description || `Payment to ${params.merchantName}`,
      description: `Checkout session ${params.sessionId}`,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      reference: params.sessionId,
      lineItems: [
        {
          type: 'custom',
          name: params.description || 'Payment',
          price: {
            currency: params.currency || 'SLE',
            value: toMonimeAmount(params.amount, params.currency || 'SLE'),
          },
          quantity: 1,
        },
      ],
      metadata: {
        peeapSessionId: params.sessionId,
        merchantId: params.merchantId || '',
        merchantName: params.merchantName,
      },
    });

    if (!response.result) {
      throw new MonimeError('Invalid response from Monime', 'INVALID_RESPONSE', 500);
    }

    return {
      paymentUrl: response.result.redirectUrl,
      monimeSessionId: response.result.id,
      expiresAt: response.result.expireTime,
    };
  }

  /**
   * Helper: Create checkout for wallet deposit
   */
  async createDepositCheckout(params: {
    walletId: string;
    userId: string;
    amount: number;
    currency: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ paymentUrl: string; monimeSessionId: string; expiresAt: string }> {
    const reference = `dep_${Date.now()}_${params.walletId.slice(-8)}`;

    const response = await this.createCheckoutSession({
      name: `Deposit to Peeap Wallet`,
      description: `Wallet deposit ${reference}`,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      reference,
      lineItems: [
        {
          type: 'custom',
          name: 'Wallet Deposit',
          price: {
            currency: params.currency || 'SLE',
            value: toMonimeAmount(params.amount, params.currency || 'SLE'),
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'deposit',
        walletId: params.walletId,
        userId: params.userId,
      },
    });

    if (!response.result) {
      throw new MonimeError('Invalid response from Monime', 'INVALID_RESPONSE', 500);
    }

    return {
      paymentUrl: response.result.redirectUrl,
      monimeSessionId: response.result.id,
      expiresAt: response.result.expireTime,
    };
  }

  /**
   * Helper: Create payout for wallet withdrawal
   */
  async createWithdrawal(params: {
    walletId: string;
    userId: string;
    amount: number;
    currency: string;
    phoneNumber: string;
    provider?: string;
    description?: string;
  }): Promise<{ payoutId: string; status: string; fee?: number }> {
    const reference = `wth_${Date.now()}_${params.walletId.slice(-8)}`;

    const response = await this.createPayout({
      amount: toMonimeAmount(params.amount, params.currency || 'SLE'),
      currency: params.currency || 'SLE',
      destination: {
        type: 'mobile_money',
        phoneNumber: params.phoneNumber,
        provider: params.provider,
      },
      reference,
      description: params.description || 'Peeap Wallet Withdrawal',
      metadata: {
        type: 'withdrawal',
        walletId: params.walletId,
        userId: params.userId,
      },
    });

    if (!response.result) {
      throw new MonimeError('Invalid response from Monime', 'INVALID_RESPONSE', 500);
    }

    return {
      payoutId: response.result.id,
      status: response.result.status,
      fee: response.result.fee,
    };
  }
}

/**
 * Monime Error class
 */
export class MonimeError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number = 500) {
    super(message);
    this.name = 'MonimeError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

interface PaymentSettings {
  monime_access_token: string | null;
  monime_space_id: string | null;
  monime_enabled: boolean | null;
}

/**
 * Create MonimeService instance from Supabase payment settings
 */
export async function createMonimeService(supabase: any, settingsId: string): Promise<MonimeService> {
  const { data, error } = await supabase
    .from('payment_settings')
    .select('monime_access_token, monime_space_id, monime_enabled')
    .eq('id', settingsId)
    .single();

  const settings = data as PaymentSettings | null;

  if (error || !settings) {
    throw new MonimeError('Payment settings not found', 'SETTINGS_NOT_FOUND', 500);
  }

  if (!settings.monime_enabled) {
    throw new MonimeError('Mobile money payments are not enabled', 'MONIME_DISABLED', 400);
  }

  if (!settings.monime_access_token || !settings.monime_space_id) {
    throw new MonimeError('Monime credentials not configured', 'CREDENTIALS_MISSING', 500);
  }

  return new MonimeService({
    accessToken: settings.monime_access_token,
    spaceId: settings.monime_space_id,
  });
}

export default MonimeService;
