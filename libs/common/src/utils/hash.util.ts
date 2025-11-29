import * as argon2 from 'argon2';
import * as crypto from 'crypto';

/**
 * Hash a password using Argon2id
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return argon2.verify(hash, password);
}

/**
 * Hash an API key using SHA-256
 * Used for storing API keys securely
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Generate an API key with prefix
 */
export function generateApiKey(
  prefix: 'sk_live' | 'sk_test' | 'pk_live' | 'pk_test',
): string {
  const randomPart = crypto.randomBytes(24).toString('base64url');
  return `${prefix}_${randomPart}`;
}

/**
 * HMAC-SHA256 signature generation for webhooks
 */
export function generateHmacSignature(
  payload: string,
  secret: string,
  timestamp: number,
): string {
  const signaturePayload = `${timestamp}.${payload}`;
  return crypto
    .createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');
}

/**
 * Verify HMAC signature with timing-safe comparison
 */
export function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
  timestamp: number,
  toleranceSeconds: number = 300,
): boolean {
  // Check timestamp tolerance
  const now = Date.now();
  if (Math.abs(now - timestamp) > toleranceSeconds * 1000) {
    return false;
  }

  const expectedSignature = generateHmacSignature(payload, secret, timestamp);

  // Timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}
