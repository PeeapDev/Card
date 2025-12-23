/**
 * Payment Intents Resource
 * Channel-agnostic payment collection API
 * Supports: NFC, QR Code, Card, Wallet, Mobile Money
 */

import { HttpClient } from '../client';

// Types
export interface CreatePaymentIntentParams {
  /** Amount in minor units (cents) */
  amount: number;
  /** Currency code (default: SLE) */
  currency?: string;
  /** Payment description */
  description?: string;
  /** Statement descriptor (max 22 chars) */
  statement_descriptor?: string;
  /** Capture method: automatic or manual */
  capture_method?: 'automatic' | 'manual';
  /** Allowed payment methods */
  payment_methods?: ('nfc' | 'qr' | 'card' | 'wallet' | 'mobile_money')[];
  /** Return URL after successful payment */
  return_url?: string;
  /** Cancel URL */
  cancel_url?: string;
  /** Customer email */
  customer_email?: string;
  /** Customer phone */
  customer_phone?: string;
  /** Terminal/device ID */
  terminal_id?: string;
  /** Custom metadata */
  metadata?: Record<string, any>;
  /** Idempotency key */
  idempotency_key?: string;
  /** Expiry time in minutes (default: 30) */
  expires_in_minutes?: number;
}

export interface PaymentIntent {
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

export type PaymentIntentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'requires_capture'
  | 'succeeded'
  | 'canceled'
  | 'failed';

export interface ConfirmPaymentIntentParams {
  /** Payment method type */
  payment_method_type: 'nfc' | 'qr' | 'card' | 'wallet' | 'mobile_money';
  /** NFC payment data */
  nfc?: {
    tag_id?: string;
    token?: string;
    type?: 'contactless_emv' | 'apple_pay' | 'google_pay' | 'peeap_nfc';
    raw_data?: Record<string, any>;
  };
  /** Card payment data */
  card?: {
    token?: string;
    number?: string;
    exp_month?: number;
    exp_year?: number;
    cvc?: string;
    cardholder_name?: string;
  };
  /** Wallet payment data */
  wallet?: {
    wallet_id: string;
    pin?: string;
  };
  /** Mobile money payment data */
  mobile_money?: {
    phone_number: string;
    provider: 'orange_money' | 'africell_money';
  };
  /** QR payment data */
  qr?: {
    scanned_by_customer?: string;
    customer_wallet_id?: string;
  };
  /** Customer ID */
  customer_id?: string;
  /** Return URL override */
  return_url?: string;
}

export interface ConfirmResult {
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

export interface QRCodeResult {
  url: string;
  data: string;
}

export interface ListPaymentIntentsParams {
  limit?: number;
  offset?: number;
  status?: PaymentIntentStatus;
}

export interface ListPaymentIntentsResult {
  data: PaymentIntent[];
  has_more: boolean;
  total: number;
}

export class PaymentIntentsResource {
  constructor(private client: HttpClient) {}

  /**
   * Create a new payment intent
   * @param params - Payment intent parameters
   * @returns Created payment intent with client_secret
   * @example
   * ```typescript
   * const intent = await sdk.paymentIntents.create({
   *   amount: 5000, // 50.00 SLE
   *   currency: 'SLE',
   *   description: 'Bus Fare',
   *   payment_methods: ['nfc', 'qr', 'wallet'],
   *   metadata: { route: 'A-B' }
   * });
   * console.log(intent.client_secret); // For frontend
   * console.log(intent.qr_code_url); // Display QR
   * ```
   */
  async create(params: CreatePaymentIntentParams): Promise<PaymentIntent> {
    const response = await this.client.post<PaymentIntent>('/v1/payment-intents', params);
    return response.data;
  }

  /**
   * Get a payment intent by ID
   * @param intentId - Payment intent ID (pi_xxx)
   * @returns Payment intent details
   */
  async get(intentId: string): Promise<PaymentIntent> {
    const response = await this.client.get<PaymentIntent>(`/v1/payment-intents/${intentId}`);
    return response.data;
  }

  /**
   * List all payment intents
   * @param params - Pagination and filter parameters
   * @returns Paginated list of payment intents
   */
  async list(params?: ListPaymentIntentsParams): Promise<ListPaymentIntentsResult> {
    const response = await this.client.get<ListPaymentIntentsResult>('/v1/payment-intents', params);
    return response.data;
  }

  /**
   * Confirm a payment intent with a payment method
   * @param intentId - Payment intent ID
   * @param params - Confirmation parameters
   * @returns Confirmation result
   * @example
   * ```typescript
   * // Confirm with NFC tap
   * const result = await sdk.paymentIntents.confirm(intent.id, {
   *   payment_method_type: 'nfc',
   *   nfc: {
   *     token: nfcData.token,
   *     type: 'contactless_emv'
   *   }
   * });
   *
   * // Confirm with card
   * const result = await sdk.paymentIntents.confirm(intent.id, {
   *   payment_method_type: 'card',
   *   card: {
   *     number: '4111111111111111',
   *     exp_month: 12,
   *     exp_year: 2025,
   *     cvc: '123'
   *   }
   * });
   *
   * // Confirm with wallet
   * const result = await sdk.paymentIntents.confirm(intent.id, {
   *   payment_method_type: 'wallet',
   *   wallet: { wallet_id: 'wal_xxx' }
   * });
   * ```
   */
  async confirm(intentId: string, params: ConfirmPaymentIntentParams): Promise<ConfirmResult> {
    const response = await this.client.post<ConfirmResult>(
      `/v1/payment-intents/${intentId}/confirm`,
      params
    );
    return response.data;
  }

  /**
   * Capture a payment intent (for manual capture mode)
   * @param intentId - Payment intent ID
   * @param amount - Optional amount to capture (for partial capture)
   * @returns Capture result
   */
  async capture(intentId: string, amount?: number): Promise<{ success: boolean; error?: string }> {
    const response = await this.client.post<{ success: boolean; error?: string }>(
      `/v1/payment-intents/${intentId}/capture`,
      { amount }
    );
    return response.data;
  }

  /**
   * Cancel a payment intent
   * @param intentId - Payment intent ID
   * @param reason - Cancellation reason
   * @returns Cancellation result
   */
  async cancel(
    intentId: string,
    reason: 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'abandoned' = 'requested_by_customer'
  ): Promise<{ success: boolean; error?: string }> {
    const response = await this.client.post<{ success: boolean; error?: string }>(
      `/v1/payment-intents/${intentId}/cancel`,
      { reason }
    );
    return response.data;
  }

  /**
   * Get QR code for a payment intent
   * @param intentId - Payment intent ID
   * @returns QR code URL and data
   */
  async getQRCode(intentId: string): Promise<QRCodeResult> {
    const response = await this.client.get<QRCodeResult>(`/v1/payment-intents/${intentId}/qr`);
    return response.data;
  }

  /**
   * Poll for payment intent status changes
   * Useful for terminals waiting for customer payment
   * @param intentId - Payment intent ID
   * @param options - Polling options
   * @returns Promise that resolves when status changes or timeout
   * @example
   * ```typescript
   * // Wait for payment completion (max 5 minutes)
   * const finalStatus = await sdk.paymentIntents.waitForCompletion(intent.id, {
   *   timeout: 300000,
   *   interval: 2000
   * });
   * if (finalStatus.status === 'succeeded') {
   *   console.log('Payment received!');
   * }
   * ```
   */
  async waitForCompletion(
    intentId: string,
    options: {
      timeout?: number;
      interval?: number;
      onStatusChange?: (intent: PaymentIntent) => void;
    } = {}
  ): Promise<PaymentIntent> {
    const { timeout = 300000, interval = 2000, onStatusChange } = options;
    const startTime = Date.now();

    const terminalStatuses: PaymentIntentStatus[] = ['succeeded', 'canceled', 'failed'];

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const intent = await this.get(intentId);

          if (onStatusChange) {
            onStatusChange(intent);
          }

          if (terminalStatuses.includes(intent.status)) {
            resolve(intent);
            return;
          }

          if (Date.now() - startTime > timeout) {
            reject(new Error('Timeout waiting for payment completion'));
            return;
          }

          setTimeout(poll, interval);
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }
}
