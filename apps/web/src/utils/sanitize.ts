/**
 * Input Sanitization Utilities
 *
 * Provides functions to sanitize user input and prevent XSS attacks
 */

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Safely decode URI component with fallback
 */
export function safeDecodeURIComponent(str: string | null | undefined): string {
  if (!str) return '';
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

/**
 * Sanitize and decode URL parameter
 */
export function sanitizeUrlParam(param: string | null | undefined): string {
  const decoded = safeDecodeURIComponent(param);
  return escapeHtml(decoded);
}

/**
 * Sanitize string for display (removes dangerous characters but preserves readability)
 */
export function sanitizeForDisplay(str: string | null | undefined): string {
  if (!str) return '';
  // Remove null bytes and control characters
  return str
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Sanitize phone number (only allow digits, +, -, spaces)
 */
export function sanitizePhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/[^\d+\-\s()]/g, '').trim();
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  // Basic email sanitization - remove dangerous characters
  return email
    .toLowerCase()
    .replace(/[<>'"]/g, '')
    .trim();
}

/**
 * Sanitize amount (only allow digits and decimal point)
 */
export function sanitizeAmount(amount: string | null | undefined): string {
  if (!amount) return '';
  return amount.replace(/[^\d.]/g, '');
}

/**
 * Sanitize URL (validate and return safe URL or empty string)
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Strip all HTML tags from a string
 */
export function stripHtmlTags(str: string | null | undefined): string {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize object keys and string values recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = escapeHtml(key);

    if (typeof value === 'string') {
      result[sanitizedKey] = sanitizeForDisplay(value);
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[sanitizedKey] = sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[sanitizedKey] = value.map(item =>
        typeof item === 'string' ? sanitizeForDisplay(item) :
        typeof item === 'object' && item !== null ? sanitizeObject(item as Record<string, unknown>) :
        item
      );
    } else {
      result[sanitizedKey] = value;
    }
  }

  return result as T;
}

/**
 * Validate and sanitize card number (Luhn algorithm)
 */
export function validateCardNumber(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');

  if (digits.length < 13 || digits.length > 19) {
    return false;
  }

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Sanitize card number for display (mask middle digits)
 */
export function maskCardNumber(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 8) return digits;

  const first = digits.slice(0, 4);
  const last = digits.slice(-4);
  const middle = '*'.repeat(digits.length - 8);

  return `${first}${middle}${last}`;
}

export default {
  escapeHtml,
  safeDecodeURIComponent,
  sanitizeUrlParam,
  sanitizeForDisplay,
  sanitizePhoneNumber,
  sanitizeEmail,
  sanitizeAmount,
  sanitizeUrl,
  stripHtmlTags,
  sanitizeObject,
  validateCardNumber,
  maskCardNumber,
};
