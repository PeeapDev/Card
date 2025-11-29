import { TransactionState, TransactionType } from '@payment-system/database';

export interface TransactionInitiatedEvent {
  transactionId: string;
  transactionType: TransactionType;
  amount: number;
  currency: string;
  cardToken: string;
  merchantId: string;
  terminalId?: string;
  entryMode: string;
}

export interface TransactionAuthorizedEvent {
  transactionId: string;
  authorizationCode: string;
  amount: number;
  currency: string;
  cardToken: string;
  merchantId: string;
  riskScore?: number;
  decision: 'APPROVED' | 'DECLINED' | 'REVIEW';
}

export interface TransactionCapturedEvent {
  transactionId: string;
  capturedAmount: number;
  currency: string;
  merchantId: string;
}

export interface TransactionSettledEvent {
  transactionId: string;
  settlementBatchId: string;
  settledAmount: number;
  feeAmount: number;
  netAmount: number;
  merchantId: string;
}

export interface TransactionVoidedEvent {
  transactionId: string;
  reason: string;
  merchantId: string;
}

export interface TransactionRefundedEvent {
  transactionId: string;
  refundId: string;
  refundAmount: number;
  reason?: string;
  merchantId: string;
}

export interface TransactionFailedEvent {
  transactionId: string;
  previousState: TransactionState;
  failureReason: string;
  errorCode: string;
  merchantId: string;
}

export interface AuthorizationHoldCreatedEvent {
  transactionId: string;
  walletId: string;
  amount: number;
  expiresAt: Date;
}

export interface AuthorizationHoldReleasedEvent {
  transactionId: string;
  walletId: string;
  releasedAmount: number;
  reason: 'CAPTURED' | 'VOIDED' | 'EXPIRED';
}

export interface BalanceUpdatedEvent {
  walletId: string;
  userId: string;
  previousBalance: number;
  newBalance: number;
  previousHeldBalance: number;
  newHeldBalance: number;
  transactionId?: string;
  reason: string;
}

export const PAYMENT_EVENT_TYPES = {
  TRANSACTION_INITIATED: 'payment.transaction.initiated',
  TRANSACTION_AUTHORIZED: 'payment.transaction.authorized',
  TRANSACTION_CAPTURED: 'payment.transaction.captured',
  TRANSACTION_SETTLED: 'payment.transaction.settled',
  TRANSACTION_VOIDED: 'payment.transaction.voided',
  TRANSACTION_REFUNDED: 'payment.transaction.refunded',
  TRANSACTION_FAILED: 'payment.transaction.failed',
  AUTHORIZATION_HOLD_CREATED: 'payment.authorization.hold_created',
  AUTHORIZATION_HOLD_RELEASED: 'payment.authorization.hold_released',
  BALANCE_UPDATED: 'payment.balance.updated',
} as const;
