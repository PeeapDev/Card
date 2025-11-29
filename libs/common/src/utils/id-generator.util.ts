import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

/**
 * Generate a UUID v4
 */
export function generateUuid(): string {
  return uuidv4();
}

/**
 * Generate a short unique ID (URL-safe)
 */
export function generateShortId(length: number = 12): string {
  return crypto.randomBytes(Math.ceil(length * 0.75)).toString('base64url').slice(0, length);
}

/**
 * Generate a transaction ID with prefix
 */
export function generateTransactionId(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString('base64url');
  return `txn_${timestamp}${random}`;
}

/**
 * Generate a card token
 */
export function generateCardToken(): string {
  return `tok_${crypto.randomBytes(16).toString('base64url')}`;
}

/**
 * Generate an authorization code
 */
export function generateAuthCode(): string {
  return crypto.randomBytes(6).toString('hex').toUpperCase();
}

/**
 * Generate a settlement batch number
 */
export function generateBatchNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `SETTLE-${date}-${random}`;
}

/**
 * Generate a session ID
 */
export function generateSessionId(): string {
  return `ses_${crypto.randomBytes(24).toString('base64url')}`;
}

/**
 * Generate a checkout session ID
 */
export function generateCheckoutSessionId(): string {
  return `cs_${crypto.randomBytes(20).toString('base64url')}`;
}

/**
 * Generate a webhook endpoint ID
 */
export function generateWebhookEndpointId(): string {
  return `we_${crypto.randomBytes(16).toString('base64url')}`;
}

/**
 * Generate an idempotency key if not provided
 */
export function generateIdempotencyKey(): string {
  return `idem_${crypto.randomBytes(16).toString('base64url')}`;
}

/**
 * Generate a user-facing external ID
 */
export function generateExternalId(prefix: string): string {
  const random = crypto.randomBytes(12).toString('base64url');
  return `${prefix}_${random}`;
}
