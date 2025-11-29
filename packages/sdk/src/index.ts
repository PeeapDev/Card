/**
 * SoftTouch Payment SDK
 * Official JavaScript/TypeScript SDK for the SoftTouch Payment Platform
 *
 * @example
 * ```typescript
 * import { SoftTouchSDK } from '@softtouch/sdk';
 *
 * const sdk = new SoftTouchSDK({
 *   apiKey: process.env.SOFTTOUCH_API_KEY!,
 *   environment: 'sandbox'
 * });
 *
 * // Get wallet balance
 * const balance = await sdk.wallet.getBalance();
 *
 * // Create a virtual card
 * const card = await sdk.cards.createVirtual({
 *   spendingLimit: 500000,
 *   currency: 'SLE'
 * });
 *
 * // Process a payment
 * const payment = await sdk.payments.charge({
 *   amount: 25000,
 *   currency: 'SLE',
 *   customerId: 'cust_123'
 * });
 * ```
 */

import { HttpClient } from './client';
import { SDKConfig } from './types';

// Resources
import { WalletResource } from './resources/wallet';
import { CardsResource } from './resources/cards';
import { PaymentsResource } from './resources/payments';
import { TransfersResource } from './resources/transfers';
import { MerchantsResource } from './resources/merchants';
import { DeveloperResource } from './resources/developer';
import { SettlementResource } from './resources/settlement';
import { QRCodeResource } from './resources/qrcode';
import { NFCResource } from './resources/nfc';

// Utilities
import { verifyWebhookSignature, parseWebhookEvent, constructWebhookEvent, computeWebhookSignature } from './utils/webhooks';

/**
 * Main SDK class
 * @class SoftTouchSDK
 */
export class SoftTouchSDK {
  private client: HttpClient;

  /** Wallet operations - balance, top-ups, withdrawals */
  public readonly wallet: WalletResource;

  /** Card operations - virtual/physical cards, transactions */
  public readonly cards: CardsResource;

  /** Payment operations - charges, refunds */
  public readonly payments: PaymentsResource;

  /** Transfer operations - internal transfers between users */
  public readonly transfers: TransfersResource;

  /** Merchant operations - profile, stats, settlements */
  public readonly merchants: MerchantsResource;

  /** Developer operations - API keys, webhooks, logs */
  public readonly developer: DeveloperResource;

  /** Settlement operations - payouts, schedules */
  public readonly settlements: SettlementResource;

  /** QR Code operations - generate, scan, payments */
  public readonly qr: QRCodeResource;

  /** NFC operations - tap-to-pay, tag management */
  public readonly nfc: NFCResource;

  /** Webhook utilities */
  public readonly webhooks = {
    /**
     * Verify webhook signature
     * @param params - Verification parameters
     * @returns Whether the signature is valid
     */
    verifySignature: verifyWebhookSignature,

    /**
     * Parse webhook event from request body
     * @param body - Raw request body
     * @returns Parsed webhook event
     */
    parseEvent: parseWebhookEvent,

    /**
     * Construct webhook event for testing
     * @param type - Event type
     * @param data - Event data
     * @returns Webhook event object
     */
    constructEvent: constructWebhookEvent,

    /**
     * Compute webhook signature for testing
     * @param payload - The payload to sign
     * @param secret - The webhook secret
     * @returns Computed signature
     */
    computeSignature: computeWebhookSignature,
  };

  /**
   * Create a new SoftTouch SDK instance
   * @param config - SDK configuration
   */
  constructor(config: SDKConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }

    this.client = new HttpClient(config);

    // Initialize resources
    this.wallet = new WalletResource(this.client);
    this.cards = new CardsResource(this.client);
    this.payments = new PaymentsResource(this.client);
    this.transfers = new TransfersResource(this.client);
    this.merchants = new MerchantsResource(this.client);
    this.developer = new DeveloperResource(this.client);
    this.settlements = new SettlementResource(this.client);
    this.qr = new QRCodeResource(this.client);
    this.nfc = new NFCResource(this.client);
  }

  /**
   * Get the current environment
   * @returns Current environment (sandbox or production)
   */
  getEnvironment(): string {
    return this.client.getEnvironment();
  }

  /**
   * Get the base URL being used
   * @returns Base URL for API requests
   */
  getBaseUrl(): string {
    return this.client.getBaseUrl();
  }
}

// Export types
export * from './types';

// Export config
export { WEBHOOK_EVENTS, ERROR_CODES, ENVIRONMENTS } from './config';

// Export webhook utilities directly
export { verifyWebhookSignature, parseWebhookEvent, constructWebhookEvent, computeWebhookSignature };

// Default export
export default SoftTouchSDK;
