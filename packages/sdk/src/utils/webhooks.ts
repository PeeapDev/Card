/**
 * Webhook Utilities
 * Helper functions for webhook signature verification and parsing
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { WebhookVerificationParams } from '../types';

/**
 * Verify webhook signature using HMAC-SHA256
 * @param params - Verification parameters
 * @returns Whether the signature is valid
 */
export function verifyWebhookSignature(params: WebhookVerificationParams): boolean {
  const { payload, signature, secret } = params;

  // Convert payload to string if it's an object
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

  // Create expected signature
  const expectedSignature = createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');

  // Parse signature header
  const signatureParts = signature.split(',');
  let receivedSignature = '';
  let timestamp = '';

  for (const part of signatureParts) {
    const [key, value] = part.trim().split('=');
    if (key === 'v1') {
      receivedSignature = value;
    } else if (key === 't') {
      timestamp = value;
    }
  }

  // If simple signature format (just the hash)
  if (!receivedSignature && !timestamp) {
    receivedSignature = signature;
  }

  // Verify signature using timing-safe comparison
  try {
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const receivedBuffer = Buffer.from(receivedSignature, 'hex');

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch {
    return false;
  }
}

/**
 * Compute webhook signature for testing
 * @param payload - The payload to sign
 * @param secret - The webhook secret
 * @returns Computed signature
 */
export function computeWebhookSignature(payload: string | Record<string, any>, secret: string): string {
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');

  return `t=${timestamp},v1=${signature}`;
}

/**
 * Parse webhook event from request body
 * @param body - Raw request body
 * @returns Parsed webhook event
 */
export function parseWebhookEvent<T = Record<string, any>>(body: string | Buffer): {
  id: string;
  type: string;
  data: T;
  createdAt: string;
  apiVersion: string;
} {
  const bodyString = Buffer.isBuffer(body) ? body.toString('utf-8') : body;
  const event = JSON.parse(bodyString);

  return {
    id: event.id,
    type: event.type,
    data: event.data,
    createdAt: event.created_at || event.createdAt,
    apiVersion: event.api_version || event.apiVersion,
  };
}

/**
 * Construct webhook event for testing
 * @param type - Event type
 * @param data - Event data
 * @returns Webhook event object
 */
export function constructWebhookEvent(type: string, data: Record<string, any>): {
  id: string;
  type: string;
  data: Record<string, any>;
  createdAt: string;
  apiVersion: string;
} {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type,
    data,
    createdAt: new Date().toISOString(),
    apiVersion: 'v1',
  };
}
