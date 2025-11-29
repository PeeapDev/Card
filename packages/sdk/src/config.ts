/**
 * SDK Configuration
 */

import { SDKConfig } from './types';

export const DEFAULT_CONFIG: Required<Omit<SDKConfig, 'apiKey'>> = {
  environment: 'sandbox',
  baseUrl: '',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
};

export const ENVIRONMENTS = {
  sandbox: 'https://api.sandbox.softtouch.io/v1',
  production: 'https://api.softtouch.io/v1',
};

export const API_VERSION = 'v1';

export const WEBHOOK_EVENTS = [
  // Payment events
  'payment.created',
  'payment.completed',
  'payment.failed',
  'payment.refunded',

  // Card events
  'card.created',
  'card.activated',
  'card.frozen',
  'card.unfrozen',
  'card.blocked',
  'card.transaction.completed',
  'card.transaction.declined',

  // Wallet events
  'wallet.credited',
  'wallet.debited',
  'wallet.topup.completed',
  'wallet.withdrawal.completed',

  // Transfer events
  'transfer.created',
  'transfer.completed',
  'transfer.failed',

  // Settlement events
  'settlement.initiated',
  'settlement.completed',
  'settlement.failed',

  // Merchant events
  'merchant.created',
  'merchant.activated',
  'merchant.suspended',

  // QR events
  'qr.scanned',
  'qr.payment.completed',

  // NFC events
  'nfc.tap.detected',
  'nfc.payment.completed',
];

export const ERROR_CODES = {
  // Authentication errors
  INVALID_API_KEY: 'INVALID_API_KEY',
  API_KEY_EXPIRED: 'API_KEY_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_PARAMETER: 'INVALID_PARAMETER',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',

  // Wallet errors
  WALLET_INSUFFICIENT_FUNDS: 'WALLET_INSUFFICIENT_FUNDS',
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  WALLET_FROZEN: 'WALLET_FROZEN',

  // Card errors
  CARD_NOT_FOUND: 'CARD_NOT_FOUND',
  CARD_FROZEN: 'CARD_FROZEN',
  CARD_BLOCKED: 'CARD_BLOCKED',
  CARD_EXPIRED: 'CARD_EXPIRED',
  CARD_LIMIT_EXCEEDED: 'CARD_LIMIT_EXCEEDED',

  // Payment errors
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_ALREADY_REFUNDED: 'PAYMENT_ALREADY_REFUNDED',
  REFUND_AMOUNT_EXCEEDED: 'REFUND_AMOUNT_EXCEEDED',

  // Transfer errors
  TRANSFER_FAILED: 'TRANSFER_FAILED',
  INVALID_RECIPIENT: 'INVALID_RECIPIENT',
  SELF_TRANSFER_NOT_ALLOWED: 'SELF_TRANSFER_NOT_ALLOWED',

  // QR errors
  QR_EXPIRED: 'QR_EXPIRED',
  QR_ALREADY_USED: 'QR_ALREADY_USED',
  INVALID_QR_CODE: 'INVALID_QR_CODE',

  // NFC errors
  NFC_TAG_NOT_FOUND: 'NFC_TAG_NOT_FOUND',
  NFC_TAG_DISABLED: 'NFC_TAG_DISABLED',
  NFC_PAYMENT_FAILED: 'NFC_PAYMENT_FAILED',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
};
