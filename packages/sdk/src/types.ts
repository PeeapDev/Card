/**
 * SoftTouch SDK Types
 */

// Configuration
export interface SDKConfig {
  apiKey: string;
  environment?: 'sandbox' | 'production';
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

// Common Types
export type Currency = 'SLE' | 'USD' | 'EUR' | 'GBP' | 'NGN';

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
    cursor?: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  requestId: string;
  timestamp: string;
}

// Error Types
export interface SDKError {
  error: true;
  message: string;
  status: number;
  code: string;
  requestId: string;
  details?: Record<string, any>;
}

// Wallet Types
export interface WalletBalance {
  balance: number;
  available: number;
  pending: number;
  currency: Currency;
  lastUpdated: string;
}

export interface TopUpParams {
  amount: number;
  method: 'card' | 'bank_transfer' | 'mobile_money';
  sourceId?: string;
  metadata?: Record<string, any>;
}

export interface TopUpResult {
  id: string;
  amount: number;
  currency: Currency;
  status: 'pending' | 'completed' | 'failed';
  method: string;
  reference: string;
  createdAt: string;
}

export interface WithdrawParams {
  amount: number;
  bankCode: string;
  accountNumber: string;
  accountName?: string;
  narration?: string;
  metadata?: Record<string, any>;
}

export interface WithdrawResult {
  id: string;
  amount: number;
  currency: Currency;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  reference: string;
  bankCode: string;
  accountNumber: string;
  createdAt: string;
}

export interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  currency: Currency;
  description: string;
  reference: string;
  balanceAfter: number;
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  createdAt: string;
  metadata?: Record<string, any>;
}

// Card Types
export type CardStatus = 'active' | 'frozen' | 'blocked' | 'expired' | 'cancelled';
export type CardType = 'virtual' | 'physical';

export interface Card {
  id: string;
  type: CardType;
  last4: string;
  brand: 'visa' | 'mastercard';
  expiryMonth: string;
  expiryYear: string;
  status: CardStatus;
  spendingLimit: number;
  currentSpend: number;
  currency: Currency;
  createdAt: string;
  cardholderName: string;
}

export interface CreateVirtualCardParams {
  spendingLimit: number;
  currency?: Currency;
  cardholderName?: string;
  metadata?: Record<string, any>;
}

export interface CreatePhysicalCardParams {
  spendingLimit: number;
  currency?: Currency;
  cardholderName?: string;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  metadata?: Record<string, any>;
}

export interface CardDetails extends Card {
  cardNumber: string;
  cvv: string;
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface CardTransaction {
  id: string;
  cardId: string;
  amount: number;
  currency: Currency;
  merchantName: string;
  merchantCategory: string;
  status: 'pending' | 'completed' | 'declined' | 'reversed';
  type: 'purchase' | 'refund' | 'atm_withdrawal';
  createdAt: string;
}

export interface UpdateCardParams {
  spendingLimit?: number;
  status?: 'active' | 'frozen';
  metadata?: Record<string, any>;
}

// Payment Types
export interface ChargeParams {
  amount: number;
  currency?: Currency;
  customerId?: string;
  customerEmail?: string;
  description?: string;
  reference?: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

export interface ChargeResult {
  id: string;
  amount: number;
  currency: Currency;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  reference: string;
  customerId?: string;
  paymentUrl?: string;
  createdAt: string;
}

export interface RefundParams {
  paymentId: string;
  amount?: number;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface RefundResult {
  id: string;
  paymentId: string;
  amount: number;
  currency: Currency;
  status: 'pending' | 'completed' | 'failed';
  reason?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  amount: number;
  currency: Currency;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';
  reference: string;
  customerId?: string;
  customerEmail?: string;
  description?: string;
  paymentMethod?: string;
  refundedAmount: number;
  createdAt: string;
  completedAt?: string;
  metadata?: Record<string, any>;
}

// Transfer Types
export interface TransferParams {
  amount: number;
  currency?: Currency;
  recipientId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientWalletId?: string;
  narration?: string;
  reference?: string;
  metadata?: Record<string, any>;
}

export interface TransferResult {
  id: string;
  amount: number;
  currency: Currency;
  status: 'pending' | 'completed' | 'failed';
  reference: string;
  recipientId: string;
  narration?: string;
  createdAt: string;
}

export interface Transfer {
  id: string;
  amount: number;
  currency: Currency;
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  reference: string;
  senderId: string;
  recipientId: string;
  narration?: string;
  createdAt: string;
  completedAt?: string;
}

// Merchant Types
export interface Merchant {
  id: string;
  name: string;
  email: string;
  businessType: string;
  status: 'active' | 'pending' | 'suspended';
  settlementAccount?: {
    bankCode: string;
    accountNumber: string;
    accountName: string;
  };
  createdAt: string;
}

export interface CreateMerchantParams {
  name: string;
  email: string;
  businessType: string;
  phone?: string;
  address?: string;
  metadata?: Record<string, any>;
}

export interface MerchantStats {
  totalTransactions: number;
  totalVolume: number;
  pendingPayouts: number;
  successRate: number;
  averageTicketSize: number;
}

// Developer Types
export interface ApiKey {
  id: string;
  name: string;
  type: 'live' | 'test';
  publicKey: string;
  secretKeyLast4: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface CreateApiKeyParams {
  name: string;
  type: 'live' | 'test';
}

export interface CreateApiKeyResult {
  id: string;
  name: string;
  type: 'live' | 'test';
  publicKey: string;
  secretKey: string;
  createdAt: string;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  status: 'active' | 'disabled';
  secret: string;
  createdAt: string;
  lastTriggeredAt?: string;
}

export interface CreateWebhookParams {
  url: string;
  events: string[];
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: Record<string, any>;
  createdAt: string;
}

// Settlement Types
export interface Settlement {
  id: string;
  amount: number;
  currency: Currency;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  reference: string;
  bankCode: string;
  accountNumber: string;
  transactionCount: number;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  completedAt?: string;
}

export interface SettlementSummary {
  pendingAmount: number;
  nextSettlementDate: string;
  lastSettlementAmount: number;
  lastSettlementDate: string;
  currency: Currency;
}

// QR Code Types
export interface QRCode {
  id: string;
  code: string;
  type: 'static' | 'dynamic';
  amount?: number;
  currency: Currency;
  status: 'active' | 'used' | 'expired';
  expiresAt?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface GenerateQRParams {
  amount?: number;
  currency?: Currency;
  type?: 'static' | 'dynamic';
  expiresIn?: number;
  reference?: string;
  metadata?: Record<string, any>;
}

export interface ScanQRResult {
  id: string;
  amount: number;
  currency: Currency;
  merchantName: string;
  merchantId: string;
  status: 'pending' | 'completed' | 'failed';
  reference: string;
  createdAt: string;
}

// NFC Types
export interface NFCTag {
  id: string;
  tagId: string;
  type: 'payment' | 'identification';
  status: 'active' | 'disabled';
  linkedCardId?: string;
  linkedWalletId?: string;
  createdAt: string;
}

export interface RegisterNFCParams {
  tagId: string;
  type: 'payment' | 'identification';
  linkedCardId?: string;
  linkedWalletId?: string;
  metadata?: Record<string, any>;
}

export interface NFCPaymentParams {
  tagId: string;
  amount: number;
  currency?: Currency;
  merchantId?: string;
  metadata?: Record<string, any>;
}

export interface NFCPaymentResult {
  id: string;
  amount: number;
  currency: Currency;
  status: 'completed' | 'failed';
  tagId: string;
  reference: string;
  createdAt: string;
}

// Webhook Verification
export interface WebhookVerificationParams {
  payload: string | Record<string, any>;
  signature: string;
  secret: string;
}
