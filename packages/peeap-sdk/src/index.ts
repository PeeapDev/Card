/**
 * PEEAP PAYMENT SDK v1.2.0
 *
 * Accept payments easily with Peeap. Supports Mobile Money and Peeap Cards with PIN.
 *
 * @example
 * // npm usage
 * import Peeap from 'peeap-sdk';
 *
 * const peeap = new Peeap({ publicKey: 'pk_live_xxxxx' });
 *
 * // Mobile Money payment (redirects to Monime):
 * await peeap.checkout({ amount: 100, currency: 'SLE' }); // Le 100.00
 *
 * // Card payment (Peeap card with PIN):
 * await peeap.cardPayment({
 *   amount: 100,
 *   cardNumber: '620012345678',
 *   expiryMonth: '12',
 *   expiryYear: '25',
 *   pin: '1234'
 * });
 *
 * @example
 * // Browser usage
 * <script src="https://my.peeap.com/embed/peeap-sdk.js"></script>
 * PeeapSDK.init({ publicKey: 'pk_live_xxxxx' });
 * PeeapSDK.createPayment({ amount: 100 }); // Le 100.00 (Mobile Money)
 * PeeapSDK.cardPayment({ amount: 100, cardNumber: '...', pin: '1234' }); // Card
 */

import type {
  PeeapConfig,
  PaymentOptions,
  PaymentResult,
  PaymentError,
  CheckoutSession,
  ButtonOptions,
  Currency,
} from './types';

export * from './types';

const DEFAULT_BASE_URL = 'https://my.peeap.com';

class PeeapSDK {
  private config: Required<Pick<PeeapConfig, 'publicKey' | 'baseUrl' | 'mode' | 'currency' | 'theme'>> &
                  Pick<PeeapConfig, 'businessId' | 'onSuccess' | 'onError' | 'onCancel' | 'onClose'>;
  private initialized = false;

  public readonly version = '1.2.0';

  constructor(options?: PeeapConfig) {
    this.config = {
      publicKey: '',
      baseUrl: DEFAULT_BASE_URL,
      mode: 'live',
      currency: 'SLE',
      theme: 'light',
    };

    if (options) {
      this.init(options);
    }
  }

  /**
   * Initialize the SDK with your public key
   * @param options Configuration options including your public key (pk_live_xxx or pk_test_xxx)
   */
  init(options: PeeapConfig): this {
    // Support both publicKey and legacy businessId
    const key = options.publicKey || options.businessId;

    if (!key) {
      console.error('[Peeap] publicKey is required');
      return this;
    }

    this.config = {
      ...this.config,
      ...options,
      publicKey: key,
      baseUrl: options.baseUrl || DEFAULT_BASE_URL,
    };

    this.initialized = true;
    console.log('[Peeap] SDK initialized with key:', key.substring(0, 10) + '...');

    return this;
  }

  /**
   * Check if SDK is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get current configuration (excludes sensitive data)
   */
  getConfig(): Partial<PeeapConfig> {
    return {
      publicKey: this.config.publicKey,
      mode: this.config.mode,
      currency: this.config.currency,
      theme: this.config.theme,
    };
  }

  /**
   * Generate a unique reference for the payment
   */
  private generateReference(): string {
    return `ref_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  /**
   * Generate a unique idempotency key to prevent duplicate payments
   */
  private generateIdempotencyKey(): string {
    return `idem_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
  }

  /**
   * Create a checkout session and redirect to payment page
   * This is the main method for accepting payments
   * @param options Payment options including amount, currency, etc.
   */
  async checkout(options: PaymentOptions): Promise<CheckoutSession> {
    if (!this.initialized) {
      const error: PaymentError = {
        message: 'SDK not initialized. Call init() first.',
        code: 'NOT_INITIALIZED',
      };
      this.config.onError?.(error);
      throw error;
    }

    if (!options.amount || options.amount <= 0) {
      const error: PaymentError = {
        message: 'Amount must be a positive number',
        code: 'INVALID_AMOUNT',
      };
      this.config.onError?.(error);
      throw error;
    }

    const reference = options.reference || this.generateReference();
    const idempotencyKey = this.generateIdempotencyKey();
    const currency = options.currency || this.config.currency;

    // Convert amount to minor units (cents) for the API
    const amountInMinorUnits = Math.round(options.amount * 100);

    console.log('[Peeap] Creating checkout:', { amount: options.amount, currency, reference, idempotencyKey });

    try {
      // Call Peeap API to create checkout session
      const response = await fetch(`${this.config.baseUrl}/api/checkout/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicKey: this.config.publicKey,
          amount: amountInMinorUnits,
          currency,
          reference,
          idempotencyKey,
          description: options.description,
          customerEmail: options.customer?.email,
          customerPhone: options.customer?.phone,
          paymentMethod: options.paymentMethod || 'mobile_money',
          redirectUrl: options.redirectUrl,
          metadata: options.metadata,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const error: PaymentError = {
          message: data.error || 'Failed to create checkout session',
          code: 'API_ERROR',
          details: data,
        };
        this.config.onError?.(error);
        throw error;
      }

      const session: CheckoutSession = {
        reference,
        checkoutUrl: `${this.config.baseUrl}/pay?key=${this.config.publicKey}&ref=${reference}`,
        paymentUrl: data.paymentUrl,
        status: 'pending',
        expiresAt: data.expiresAt,
      };

      console.log('[Peeap] Checkout session created:', session);

      // Redirect to Monime payment page
      if (data.paymentUrl) {
        console.log('[Peeap] Redirecting to payment page:', data.paymentUrl);

        if (typeof window !== 'undefined') {
          window.location.href = data.paymentUrl;
        }
      }

      return session;

    } catch (err: any) {
      if (err.code) {
        throw err; // Already a PaymentError
      }

      const error: PaymentError = {
        message: err.message || 'Network error',
        code: 'NETWORK_ERROR',
      };
      this.config.onError?.(error);
      throw error;
    }
  }

  /**
   * Alias for checkout() - for backwards compatibility
   */
  async createPayment(options: PaymentOptions): Promise<CheckoutSession> {
    return this.checkout(options);
  }

  /**
   * Create a payment button element
   */
  createButton(options: ButtonOptions): HTMLButtonElement {
    const button = document.createElement('button');

    const styles: Record<string, string> = {
      primary: 'background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);color:#fff;border:none;',
      secondary: 'background:#fff;color:#6366f1;border:2px solid #6366f1;',
      minimal: 'background:transparent;color:#6366f1;border:none;text-decoration:underline;',
    };

    const sizes: Record<string, string> = {
      small: 'padding:8px 16px;font-size:14px;',
      medium: 'padding:12px 24px;font-size:16px;',
      large: 'padding:16px 32px;font-size:18px;',
    };

    const baseStyle = `
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
      font-weight:600;border-radius:8px;cursor:pointer;
      display:inline-flex;align-items:center;gap:8px;
      transition:all 0.2s ease;
    `.replace(/\s+/g, '');

    button.style.cssText = baseStyle +
      (styles[options.style || 'primary']) +
      (sizes[options.size || 'medium']);

    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
      ${options.text || 'Pay with Peeap'}
    `;

    button.onclick = (e) => {
      e.preventDefault();
      this.checkout(options);
    };

    return button;
  }

  /**
   * Format an amount with currency symbol
   */
  formatAmount(amount: number, currency?: Currency): string {
    const symbols: Record<string, string> = {
      SLE: 'Le',
      USD: '$',
      EUR: '\u20AC',
      GBP: '\u00A3',
      NGN: '\u20A6',
      GHS: '\u20B5',
      KES: 'KSh',
      ZAR: 'R',
    };

    const curr = currency || this.config.currency || 'SLE';
    const symbol = symbols[curr] || curr;

    return `${symbol} ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  /**
   * Verify a payment status (server-side recommended)
   */
  async verifyPayment(reference: string): Promise<PaymentResult> {
    const response = await fetch(`${this.config.baseUrl}/api/checkout/verify?reference=${reference}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to verify payment');
    }

    return data;
  }

  /**
   * Validate a Peeap card before requesting PIN
   * Use this to check if card details are correct before showing PIN input
   *
   * @param options Card details to validate
   * @returns Card validation result with cardholder info
   */
  async validateCard(options: {
    cardNumber: string;
    expiryMonth: string | number;
    expiryYear: string | number;
  }): Promise<{
    valid: boolean;
    cardLastFour: string;
    cardholderFirstName: string;
    hasPinSet: boolean;
    message: string;
  }> {
    if (!this.initialized) {
      const error: PaymentError = {
        message: 'SDK not initialized. Call init() first.',
        code: 'NOT_INITIALIZED',
      };
      this.config.onError?.(error);
      throw error;
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/api/checkout/card-validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardNumber: options.cardNumber,
          expiryMonth: options.expiryMonth,
          expiryYear: options.expiryYear,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        const error: PaymentError = {
          message: data.error || 'Card validation failed',
          code: data.code || 'VALIDATION_FAILED',
        };
        this.config.onError?.(error);
        throw error;
      }

      return data;
    } catch (err: any) {
      if (err.code) {
        throw err;
      }

      const error: PaymentError = {
        message: err.message || 'Network error',
        code: 'NETWORK_ERROR',
      };
      this.config.onError?.(error);
      throw error;
    }
  }

  /**
   * Process a card payment using Peeap card
   *
   * @param options Card payment options including card details and PIN
   * @returns Payment result with transaction details
   */
  async cardPayment(options: {
    amount: number;
    cardNumber: string;
    expiryMonth: string | number;
    expiryYear: string | number;
    pin: string;
    currency?: string;
    reference?: string;
    description?: string;
    redirectUrl?: string;
  }): Promise<{
    reference: string;
    paymentId: string;
    transactionId: string;
    amount: number;
    amountFormatted: string;
    currency: string;
    status: string;
    cardLastFour: string;
    completedAt: string;
  }> {
    if (!this.initialized) {
      const error: PaymentError = {
        message: 'SDK not initialized. Call init() first.',
        code: 'NOT_INITIALIZED',
      };
      this.config.onError?.(error);
      throw error;
    }

    // Validation
    if (!options.amount || options.amount <= 0) {
      const error: PaymentError = {
        message: 'Amount must be a positive number',
        code: 'INVALID_AMOUNT',
      };
      this.config.onError?.(error);
      throw error;
    }

    if (!options.cardNumber) {
      const error: PaymentError = {
        message: 'Card number is required',
        code: 'CARD_NUMBER_REQUIRED',
      };
      this.config.onError?.(error);
      throw error;
    }

    if (!options.pin || !/^\d{4}$/.test(options.pin)) {
      const error: PaymentError = {
        message: 'PIN must be 4 digits',
        code: 'INVALID_PIN_FORMAT',
      };
      this.config.onError?.(error);
      throw error;
    }

    const reference = options.reference || this.generateReference();
    const idempotencyKey = this.generateIdempotencyKey();
    const currency = options.currency || this.config.currency;
    const amountInMinorUnits = Math.round(options.amount * 100);

    console.log('[Peeap] Processing card payment:', {
      amount: options.amount,
      currency,
      reference,
      cardNumber: options.cardNumber.substring(0, 4) + '****',
    });

    try {
      const response = await fetch(`${this.config.baseUrl}/api/checkout/card-pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicKey: this.config.publicKey,
          cardNumber: options.cardNumber,
          expiryMonth: options.expiryMonth,
          expiryYear: options.expiryYear,
          pin: options.pin,
          amount: amountInMinorUnits,
          currency,
          reference,
          idempotencyKey,
          description: options.description,
          redirectUrl: options.redirectUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const error: PaymentError = {
          message: data.error || 'Payment failed',
          code: data.code || 'PAYMENT_FAILED',
          details: data,
        };
        this.config.onError?.(error);
        throw error;
      }

      const payment = {
        reference,
        paymentId: data.paymentId,
        transactionId: data.transactionId,
        amount: options.amount,
        amountFormatted: data.amountFormatted,
        currency,
        status: data.status,
        cardLastFour: data.cardLastFour,
        completedAt: data.completedAt,
      };

      console.log('[Peeap] Card payment successful:', payment);
      this.config.onSuccess?.(payment as any);

      return payment;
    } catch (err: any) {
      if (err.code) {
        throw err;
      }

      const error: PaymentError = {
        message: err.message || 'Network error',
        code: 'NETWORK_ERROR',
      };
      this.config.onError?.(error);
      throw error;
    }
  }
}

// Create singleton instance for browser usage
const instance = new PeeapSDK();

// Export for different module systems
export default instance;
export { PeeapSDK };

// Browser global export
if (typeof window !== 'undefined') {
  (window as any).PeeapSDK = instance;
  (window as any).Peeap = instance;
}
