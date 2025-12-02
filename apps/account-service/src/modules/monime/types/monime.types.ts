// Monime API Types based on https://docs.monime.io

export interface MonimeAmount {
  currency: string; // ISO 4217 (e.g., "SLE", "USD")
  value: number; // Amount in minor units (cents)
}

export interface MonimeCheckoutSession {
  id: string;
  url: string;
  status: 'open' | 'complete' | 'expired' | 'cancelled';
  amount: MonimeAmount;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  createTime: string;
  expireTime: string;
}

export interface MonimePayment {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  amount: MonimeAmount;
  channel: {
    type: 'bank' | 'card' | 'wallet' | 'mobile_money';
    provider?: string;
  };
  fees?: MonimeAmount;
  metadata?: Record<string, string>;
  createTime: string;
  updateTime: string;
}

export interface MonimeInternalTransfer {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  amount: MonimeAmount;
  sourceFinancialAccount: string;
  destinationFinancialAccount: string;
  description?: string;
  financialTransactionReference?: string;
  failureDetail?: {
    code: 'unknown' | 'fund_insufficient';
    message?: string;
  };
  metadata?: Record<string, string>;
  createTime: string;
  updateTime: string;
}

export interface MonimeFinancialAccount {
  id: string;
  uvan: string; // Universal Virtual Account Number
  name: string;
  currency: string;
  reference?: string;
  description?: string;
  balance: {
    available: MonimeAmount;
  };
  metadata?: Record<string, string>;
  createTime: string;
  updateTime: string;
}

export interface MonimePaymentCode {
  id: string;
  name: string;
  ussdCode: string;
  status: 'pending' | 'expired' | 'processed' | 'completed';
  mode: 'one_time' | 'recurrent';
  amount: MonimeAmount;
  authorizedProviders?: string[];
  authorizedPhoneNumber?: string;
  duration: string;
  enable: boolean;
  createTime: string;
  expireTime: string;
  metadata?: Record<string, string>;
}

export interface MonimeBank {
  providerId: string;
  name: string;
  country: string;
  status: string;
  featureSet: {
    payout: boolean;
    payment: boolean;
    kycVerification: boolean;
  };
  createTime: string;
  updateTime: string;
}

// Webhook Event Types
export type MonimeWebhookEventName =
  | 'payment_code.created'
  | 'payment_code.expired'
  | 'payment_code.processed'
  | 'payment_code.completed'
  | 'payout.failed'
  | 'payout.completed'
  | 'payout.delayed'
  | 'checkout_session.expired'
  | 'checkout_session.cancelled'
  | 'checkout_session.completed';

export interface MonimeWebhookEvent<T = any> {
  apiVersion: string;
  event: {
    id: string;
    name: MonimeWebhookEventName;
    timestamp: string;
  };
  object: {
    id: string;
    type: string;
  };
  data: T;
}

// API Response Types
export interface MonimeApiResponse<T> {
  success: boolean;
  messages: string[];
  result: T;
}

export interface MonimePaginatedResponse<T> extends MonimeApiResponse<T[]> {
  pagination: {
    count: number;
    next: string | null;
  };
}

// Request Types for API calls
export interface CreateCheckoutSessionRequest {
  amount: MonimeAmount;
  successUrl: string;
  cancelUrl: string;
  callbackUrl?: string;
  lineItems?: {
    name: string;
    description?: string;
    quantity: number;
    price: MonimeAmount;
  }[];
  metadata?: Record<string, string>;
}

export interface CreateInternalTransferRequest {
  amount: MonimeAmount;
  sourceFinancialAccount: string;
  destinationFinancialAccount: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentCodeRequest {
  name: string;
  amount: MonimeAmount;
  mode: 'one_time' | 'recurrent';
  authorizedProviders?: string[];
  authorizedPhoneNumber?: string;
  duration?: string;
  enable?: boolean;
  metadata?: Record<string, string>;
}

// Payout request for mobile money/bank cashout
export interface CreatePayoutRequest {
  amount: MonimeAmount;
  destination: {
    type: 'mobile_money' | 'bank';
    phoneNumber?: string; // For mobile money
    bankCode?: string; // For bank transfer
    accountNumber?: string; // For bank transfer
    accountName?: string;
  };
  description?: string;
  metadata?: Record<string, string>;
}
