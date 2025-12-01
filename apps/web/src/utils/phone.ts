/**
 * Phone Number Normalization Utility
 *
 * Handles Sierra Leone phone numbers:
 * - Strips +232 or 232 country code
 * - Ensures 9 digits starting with 0
 *
 * Examples:
 * - +232771234567 -> 0771234567
 * - 232771234567 -> 0771234567
 * - 0771234567 -> 0771234567
 * - 771234567 -> 0771234567
 */

export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';

  // Remove all non-digit characters except + at the start
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Remove + if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Remove 232 country code if present at the start
  if (cleaned.startsWith('232')) {
    cleaned = cleaned.substring(3);
  }

  // If number doesn't start with 0, add it
  if (!cleaned.startsWith('0') && cleaned.length === 8) {
    cleaned = '0' + cleaned;
  }

  // If number is 8 digits (like 77123456), add leading 0
  if (cleaned.length === 8) {
    cleaned = '0' + cleaned;
  }

  return cleaned;
}

/**
 * Validate Sierra Leone phone number
 * Must be 9 digits starting with 0
 */
export function isValidPhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);

  // Must be exactly 9 digits
  if (normalized.length !== 9) {
    return false;
  }

  // Must start with 0
  if (!normalized.startsWith('0')) {
    return false;
  }

  // Must be all digits
  if (!/^\d+$/.test(normalized)) {
    return false;
  }

  return true;
}

/**
 * Format phone number for display
 * Example: 0771234567 -> 077 123 4567
 */
export function formatPhoneNumber(phone: string): string {
  const normalized = normalizePhoneNumber(phone);

  if (normalized.length !== 9) {
    return phone; // Return as-is if not valid
  }

  // Format as: 0XX XXX XXXX
  return `${normalized.slice(0, 3)} ${normalized.slice(3, 6)} ${normalized.slice(6)}`;
}

/**
 * Get phone number validation error message
 */
export function getPhoneValidationError(phone: string): string | null {
  if (!phone) {
    return 'Phone number is required';
  }

  const normalized = normalizePhoneNumber(phone);

  if (normalized.length < 9) {
    return 'Phone number is too short. Enter 9 digits (e.g., 077123456)';
  }

  if (normalized.length > 9) {
    return 'Phone number is too long. Enter 9 digits (e.g., 077123456)';
  }

  if (!normalized.startsWith('0')) {
    return 'Phone number must start with 0';
  }

  return null;
}
