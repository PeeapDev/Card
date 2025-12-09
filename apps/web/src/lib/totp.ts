/**
 * Browser-native TOTP implementation using Web Crypto API
 * No external dependencies - works in all modern browsers
 */

// Base32 alphabet
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generate a random secret key (Base32 encoded)
 */
export function generateSecret(length: number = 20): string {
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);
  return base32Encode(randomBytes);
}

/**
 * Base32 encode bytes
 */
function base32Encode(data: Uint8Array): string {
  let result = '';
  let bits = 0;
  let value = 0;

  for (let i = 0; i < data.length; i++) {
    value = (value << 8) | data[i];
    bits += 8;

    while (bits >= 5) {
      result += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return result;
}

/**
 * Base32 decode string to bytes
 */
function base32Decode(encoded: string): Uint8Array {
  const cleaned = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const output = new Uint8Array(Math.floor((cleaned.length * 5) / 8));

  let bits = 0;
  let value = 0;
  let index = 0;

  for (let i = 0; i < cleaned.length; i++) {
    const charIndex = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (charIndex === -1) continue;

    value = (value << 5) | charIndex;
    bits += 5;

    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }

  return output.slice(0, index);
}

/**
 * Generate HMAC-SHA1 using Web Crypto API
 */
async function hmacSha1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data.buffer as ArrayBuffer);
  return new Uint8Array(signature);
}

/**
 * Convert number to 8-byte big-endian array
 */
function intToBytes(num: number): Uint8Array {
  const bytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    bytes[i] = num & 0xff;
    num = Math.floor(num / 256);
  }
  return bytes;
}

/**
 * Generate TOTP code
 */
export async function generateTOTP(secret: string, timeStep: number = 30): Promise<string> {
  const key = base32Decode(secret);
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  const counterBytes = intToBytes(counter);

  const hmac = await hmacSha1(key, counterBytes);

  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = code % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Verify TOTP code (allows 1 step drift in either direction)
 */
export async function verifyTOTP(
  secret: string,
  token: string,
  timeStep: number = 30,
  window: number = 1
): Promise<boolean> {
  const cleanToken = token.replace(/\s/g, '');

  for (let i = -window; i <= window; i++) {
    const counter = Math.floor(Date.now() / 1000 / timeStep) + i;
    const key = base32Decode(secret);
    const counterBytes = intToBytes(counter);

    const hmac = await hmacSha1(key, counterBytes);

    const offset = hmac[hmac.length - 1] & 0xf;
    const code =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    const otp = (code % 1000000).toString().padStart(6, '0');

    if (otp === cleanToken) {
      return true;
    }
  }

  return false;
}

/**
 * Generate OTPAuth URI for QR code
 */
export function generateOTPAuthURI(
  secret: string,
  email: string,
  issuer: string = 'Peeap'
): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}
