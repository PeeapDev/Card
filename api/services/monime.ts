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

// Monime Payout Request - matches Monime API v1 format
export interface MonimePayoutRequest {
  amount: {
    currency: string;
    value: number; // Minor units (e.g., 100 = 1 SLE)
  };
  destination: {
    type: 'momo' | 'bank';
    providerId: string; // e.g., 'm17' for Orange Money
    phoneNumber?: string; // For momo type - phone number with country code
    accountNumber?: string; // For bank type - bank account number
  };
  source: {
    financialAccountId: string; // Monime financial account ID
  };
  metadata?: Record<string, string>;
}

export interface MonimePayoutResponse {
  success: boolean;
  result?: {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    amount: {
      currency: string;
      value: number;
    };
    source?: {
      financialAccountId: string;
      transactionReference?: string;
    };
    destination?: {
      type: string;
      providerId?: string;
      accountNumber?: string;
    };
    fees?: Array<{
      name: string;
      amount: { currency: string; value: number };
    }>;
    failureDetail?: {
      code: string;
      message: string;
    };
    createTime: string;
    updateTime: string;
  };
  error?: {
    message: string;
    code?: string;
  };
}

// Mobile Money Provider
export interface MobileMoneyProvider {
  providerId: string;
  name: string;
  country: string;
  status: { active: boolean };
  featureSet: {
    payout: { canPayTo: boolean };
    payment: { canPayFrom: boolean };
    kycVerification: { canVerifyAccount: boolean };
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
  async getBanks(country: string = 'SL'): Promise<Array<{ providerId: string; name: string; country: string }>> {
    const response = await this.request<{ result: Array<{ providerId: string; name: string; country: string }> }>(
      `/banks?country=${country}`,
      'GET'
    );
    return response.result || [];
  }

  /**
   * Get available mobile money providers for payout
   * Returns providers like Orange Money (m17), Africell (m18)
   */
  async getMobileMoneyProviders(country: string = 'SL'): Promise<MobileMoneyProvider[]> {
    const response = await this.request<{ result: MobileMoneyProvider[] }>(
      `/momos?country=${country}`,
      'GET'
    );
    return response.result || [];
  }

  /**
   * Lookup mobile money account holder name (KYC verification)
   * Verifies the phone number and returns the account holder's name
   * @param providerId - Mobile money provider ID (e.g., 'm17' for Orange Money)
   * @param accountNumber - Phone number to lookup
   * @returns Account holder information including name
   */
  async lookupAccountHolder(providerId: string, accountNumber: string): Promise<{
    verified: boolean;
    accountName?: string;
    accountNumber?: string;
    providerId?: string;
  }> {
    try {
      const response = await this.request<{
        result: {
          verified: boolean;
          accountName?: string;
          name?: string;
          fullName?: string;
          accountNumber?: string;
          providerId?: string;
        }
      }>(
        `/provider-kyc/${providerId}?accountId=${encodeURIComponent(accountNumber)}`,
        'GET'
      );

      const result = response.result;
      return {
        verified: result?.verified || false,
        accountName: result?.accountName || result?.name || result?.fullName,
        accountNumber: result?.accountNumber || accountNumber,
        providerId: result?.providerId || providerId,
      };
    } catch (error) {
      console.error('[Monime] Account lookup failed:', error);
      // Return unverified result on error
      return {
        verified: false,
        accountNumber,
        providerId,
      };
    }
  }

  /**
   * Get financial accounts (to get source account ID for payouts)
   */
  async getFinancialAccounts(): Promise<Array<{ id: string; name: string; currency: string; balance: { value: number } }>> {
    const response = await this.request<{ result: Array<{ id: string; name: string; currency: string; balance: { value: number } }> }>(
      '/financial-accounts',
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
   * Helper: Create payout for wallet withdrawal to mobile money
   * @param params.walletId - Source wallet ID (for tracking)
   * @param params.userId - User ID (for tracking)
   * @param params.amount - Amount in display units (e.g., 100 SLE)
   * @param params.currency - Currency code (default: SLE)
   * @param params.phoneNumber - Recipient phone number
   * @param params.providerId - Mobile money provider ID (e.g., 'm17' for Orange Money)
   * @param params.financialAccountId - Monime financial account ID for source funds
   */
  async createWithdrawal(params: {
    walletId: string;
    userId: string;
    amount: number;
    currency: string;
    phoneNumber: string;
    providerId: string;
    financialAccountId: string;
    description?: string;
  }): Promise<{ payoutId: string; status: string; fees?: Array<{ name: string; amount: { currency: string; value: number } }> }> {
    const currency = params.currency || 'SLE';

    const response = await this.createPayout({
      amount: {
        currency: currency,
        value: toMonimeAmount(params.amount, currency),
      },
      destination: {
        type: 'momo',
        providerId: params.providerId,
        phoneNumber: params.phoneNumber, // Monime API expects phoneNumber for momo type
      },
      source: {
        financialAccountId: params.financialAccountId,
      },
      metadata: {
        type: 'withdrawal',
        walletId: params.walletId,
        userId: params.userId,
        description: params.description || 'Peeap Wallet Withdrawal',
      },
    });

    if (!response.result) {
      throw new MonimeError('Invalid response from Monime', 'INVALID_RESPONSE', 500);
    }

    return {
      payoutId: response.result.id,
      status: response.result.status,
      fees: response.result.fees,
    };
  }

  /**
   * Helper: Send money to mobile money number (Orange Money, Africell)
   * This is the main method for platform-to-mobile-money transfers
   */
  async sendToMobileMoney(params: {
    amount: number;
    currency: string;
    phoneNumber: string;
    providerId: string;
    financialAccountId: string;
    userId: string;
    walletId: string;
    description?: string;
  }): Promise<{
    payoutId: string;
    status: string;
    fees?: Array<{ name: string; amount: { currency: string; value: number } }>;
    totalFee?: number;
  }> {
    const currency = params.currency || 'SLE';
    const monimeAmount = toMonimeAmount(params.amount, currency);

    console.log('[Monime] Sending to mobile money:', {
      amount: params.amount,
      monimeAmount,
      phoneNumber: params.phoneNumber,
      providerId: params.providerId,
    });

    const response = await this.createPayout({
      amount: {
        currency: currency,
        value: monimeAmount,
      },
      destination: {
        type: 'momo',
        providerId: params.providerId,
        phoneNumber: params.phoneNumber, // Monime API expects phoneNumber for momo type
      },
      source: {
        financialAccountId: params.financialAccountId,
      },
      metadata: {
        type: 'mobile_money_send',
        userId: params.userId,
        walletId: params.walletId,
        description: params.description || 'Send to Mobile Money',
      },
    });

    if (!response.result) {
      throw new MonimeError('Invalid response from Monime', 'INVALID_RESPONSE', 500);
    }

    // Calculate total fee
    let totalFee = 0;
    if (response.result.fees) {
      totalFee = response.result.fees.reduce((sum, fee) => {
        return sum + fromMonimeAmount(fee.amount.value, fee.amount.currency);
      }, 0);
    }

    return {
      payoutId: response.result.id,
      status: response.result.status,
      fees: response.result.fees,
      totalFee,
    };
  }

  /**
   * List existing webhooks
   */
  async listWebhooks(): Promise<Array<{ id: string; url: string; events: string[]; active: boolean }>> {
    try {
      const response = await this.request<{ result: { data: Array<{ id: string; url: string; events: string[]; active: boolean }> } }>(
        '/webhooks',
        'GET'
      );
      return response.result?.data || [];
    } catch (error) {
      console.error('[Monime] Error listing webhooks:', error);
      return [];
    }
  }

  /**
   * Create a webhook
   */
  async createWebhook(params: {
    url: string;
    events: string[];
    description?: string;
  }): Promise<{ id: string; url: string; secret?: string }> {
    const response = await this.request<{ result: { id: string; url: string; secret?: string } }>(
      '/webhooks',
      'POST',
      {
        url: params.url,
        events: params.events,
        description: params.description || 'Peeap webhook',
        active: true,
      }
    );

    if (!response.result) {
      throw new MonimeError('Failed to create webhook', 'WEBHOOK_ERROR', 500);
    }

    return response.result;
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<boolean> {
    try {
      await this.request(`/webhooks/${webhookId}`, 'DELETE');
      return true;
    } catch (error) {
      console.error('[Monime] Error deleting webhook:', error);
      return false;
    }
  }

  /**
   * Setup webhook for deposit/checkout notifications
   * This creates or updates the webhook to point to our endpoint
   */
  async setupPeeapWebhook(webhookUrl: string): Promise<{ success: boolean; webhookId?: string; secret?: string; error?: string }> {
    try {
      // First, list existing webhooks to see if we already have one
      const existingWebhooks = await this.listWebhooks();

      // Find any existing Peeap webhook
      const existingPeeapWebhook = existingWebhooks.find(w => w.url.includes('peeap.com') || w.url.includes('api.peeap.com'));

      // Delete existing webhook if found (to recreate with correct URL)
      if (existingPeeapWebhook) {
        console.log('[Monime] Deleting existing webhook:', existingPeeapWebhook.id);
        await this.deleteWebhook(existingPeeapWebhook.id);
      }

      // Create new webhook with all relevant events
      const result = await this.createWebhook({
        url: webhookUrl,
        events: [
          'checkout.session.completed',
          'checkout.session.expired',
          'payout.completed',
          'payout.failed',
          'payment.received',
        ],
        description: 'Peeap payment notifications',
      });

      console.log('[Monime] Webhook created:', result.id);

      return {
        success: true,
        webhookId: result.id,
        secret: result.secret,
      };
    } catch (error: any) {
      console.error('[Monime] Error setting up webhook:', error);
      return {
        success: false,
        error: error.message || 'Failed to setup webhook',
      };
    }
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
 * Create MonimeService instance from Supabase settings
 * Checks both the module is_enabled and payment_settings.monime_enabled
 */
export async function createMonimeService(supabase: any, settingsId: string): Promise<MonimeService> {
  // First check if the Monime module is enabled
  const { data: module } = await supabase
    .from('modules')
    .select('is_enabled')
    .eq('code', 'monime')
    .single();

  if (!module?.is_enabled) {
    throw new MonimeError('Monime module is not enabled. Enable it in Admin > Modules.', 'MODULE_DISABLED', 400);
  }

  // Then check payment settings for credentials
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
    throw new MonimeError('Mobile money payments are not enabled in settings', 'MONIME_DISABLED', 400);
  }

  if (!settings.monime_access_token || !settings.monime_space_id) {
    throw new MonimeError('Monime credentials not configured. Go to Admin > Settings > Payment.', 'CREDENTIALS_MISSING', 500);
  }

  return new MonimeService({
    accessToken: settings.monime_access_token,
    spaceId: settings.monime_space_id,
  });
}

/**
 * Check if Monime module is enabled (quick check without creating service)
 */
export async function isMonimeEnabled(supabase: any): Promise<boolean> {
  const { data: module } = await supabase
    .from('modules')
    .select('is_enabled')
    .eq('code', 'monime')
    .single();

  return module?.is_enabled === true;
}

export default MonimeService;
