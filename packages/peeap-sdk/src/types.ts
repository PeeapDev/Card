/**
 * Peeap SDK Types
 */

export type PaymentMethod = 'mobile_money' | 'card' | 'bank_transfer' | 'wallet';
export type Currency = 'SLE' | 'USD' | 'EUR' | 'GBP' | 'NGN' | 'GHS' | 'KES' | 'ZAR';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface PeeapConfig {
  /** Your Peeap public key (pk_live_xxx or pk_test_xxx) - safe to expose in frontend */
  publicKey: string;
  /** @deprecated Use publicKey instead. Business ID for backwards compatibility */
  businessId?: string;
  /** Payment mode: 'live' or 'test' (default: 'live') */
  mode?: 'live' | 'test';
  /** Default currency (default: 'SLE') */
  currency?: Currency;
  /** UI theme (default: 'light') */
  theme?: 'light' | 'dark';
  /** API base URL (default: 'https://my.peeap.com') */
  baseUrl?: string;
  /** Called when payment succeeds */
  onSuccess?: (payment: PaymentResult) => void;
  /** Called when payment fails */
  onError?: (error: PaymentError) => void;
  /** Called when user cancels */
  onCancel?: () => void;
  /** Called when checkout closes */
  onClose?: () => void;
}

export interface PaymentOptions {
  /** Amount to charge (required) */
  amount: number;
  /** Currency code (default: config currency) */
  currency?: Currency;
  /** Your unique order reference */
  reference?: string;
  /** Payment description shown to customer */
  description?: string;
  /** Customer information */
  customer?: CustomerInfo;
  /** Payment method to use */
  paymentMethod?: PaymentMethod;
  /** Custom metadata to attach to payment */
  metadata?: Record<string, any>;
  /** URL to redirect after payment */
  redirectUrl?: string;
}

export interface CustomerInfo {
  /** Customer email address */
  email?: string;
  /** Customer phone number */
  phone?: string;
  /** Customer name */
  name?: string;
}

export interface PaymentResult {
  /** Peeap payment ID */
  id: string;
  /** Your order reference */
  reference: string;
  /** Amount charged */
  amount: number;
  /** Currency code */
  currency: Currency;
  /** Payment status */
  status: PaymentStatus;
  /** Monime session ID (if applicable) */
  sessionId?: string;
  /** Payment URL for redirect (if applicable) */
  paymentUrl?: string;
}

export interface PaymentError {
  /** Error message */
  message: string;
  /** Error code */
  code: string;
  /** Additional details */
  details?: any;
}

export interface CheckoutSession {
  /** Session reference */
  reference: string;
  /** Checkout URL */
  checkoutUrl: string;
  /** Payment URL (Monime hosted page) */
  paymentUrl?: string;
  /** Session status */
  status: PaymentStatus;
  /** Expiration time */
  expiresAt?: string;
}

export interface ButtonOptions extends PaymentOptions {
  /** Button text (default: 'Pay with Peeap') */
  text?: string;
  /** Button style: 'primary', 'secondary', 'minimal' */
  style?: 'primary' | 'secondary' | 'minimal';
  /** Button size: 'small', 'medium', 'large' */
  size?: 'small' | 'medium' | 'large';
}

// Global window type extension for browser usage
declare global {
  interface Window {
    PeeapSDK: typeof import('./index').default;
    Peeap: typeof import('./index').default;
  }
}
