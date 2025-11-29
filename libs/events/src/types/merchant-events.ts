export interface MerchantOnboardedEvent {
  merchantId: string;
  businessName: string;
  mcc: string;
  onboardedAt: Date;
}

export interface MerchantActivatedEvent {
  merchantId: string;
  activatedAt: Date;
  activatedBy: string;
}

export interface MerchantSuspendedEvent {
  merchantId: string;
  reason: string;
  suspendedAt: Date;
  suspendedBy: string;
}

export interface CheckoutSessionCreatedEvent {
  sessionId: string;
  merchantId: string;
  amount: number;
  currency: string;
  expiresAt: Date;
}

export interface CheckoutSessionCompletedEvent {
  sessionId: string;
  merchantId: string;
  transactionId: string;
  amount: number;
  currency: string;
}

export interface CheckoutSessionExpiredEvent {
  sessionId: string;
  merchantId: string;
}

export interface SettlementBatchCreatedEvent {
  batchId: string;
  merchantId: string;
  transactionCount: number;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface SettlementBatchProcessedEvent {
  batchId: string;
  merchantId: string;
  payoutReference: string;
  processedAt: Date;
}

export interface SettlementBatchFailedEvent {
  batchId: string;
  merchantId: string;
  failureReason: string;
}

export interface TerminalRegisteredEvent {
  terminalId: string;
  merchantId: string;
  terminalType: string;
  location?: string;
}

export const MERCHANT_EVENT_TYPES = {
  MERCHANT_ONBOARDED: 'merchant.onboarded',
  MERCHANT_ACTIVATED: 'merchant.activated',
  MERCHANT_SUSPENDED: 'merchant.suspended',
  CHECKOUT_SESSION_CREATED: 'merchant.checkout.created',
  CHECKOUT_SESSION_COMPLETED: 'merchant.checkout.completed',
  CHECKOUT_SESSION_EXPIRED: 'merchant.checkout.expired',
  SETTLEMENT_BATCH_CREATED: 'settlement.batch.created',
  SETTLEMENT_BATCH_PROCESSED: 'settlement.batch.processed',
  SETTLEMENT_BATCH_FAILED: 'settlement.batch.failed',
  TERMINAL_REGISTERED: 'merchant.terminal.registered',
} as const;
