/**
 * Currency Utilities for Sierra Leone Leone (SLE)
 *
 * The Sierra Leone Leone (SLE) is subdivided into 100 cents.
 * ISO 4217 code: SLE (as of July 2022, replacing old SLL)
 * Symbol: Le (placed before the amount)
 * Decimal places: 2
 *
 * Examples:
 * - Le 1.00 = 100 cents
 * - Le 0.50 = 50 cents
 * - Le 0.01 = 1 cent (minimum)
 */

export const CURRENCY_CONFIG = {
  SLE: {
    code: 'SLE',
    symbol: 'Le',
    name: 'Sierra Leonean Leone',
    decimalPlaces: 2,
    minorUnit: 100, // 100 cents = 1 Leone
    minAmount: 0.01, // 1 cent
  },
  // Old Leone (for backwards compatibility)
  SLL: {
    code: 'SLL',
    symbol: 'Le',
    name: 'Sierra Leonean Leone (old)',
    decimalPlaces: 2,
    minorUnit: 100,
    minAmount: 0.01,
  },
  // USD for reference
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimalPlaces: 2,
    minorUnit: 100,
    minAmount: 0.01,
  },
};

export type CurrencyCode = keyof typeof CURRENCY_CONFIG;

/**
 * Get currency config, falling back to SLE if unknown
 */
function getCurrencyConfig(currency: string | undefined): typeof CURRENCY_CONFIG.SLE {
  if (!currency) return CURRENCY_CONFIG.SLE;
  const upper = currency.toUpperCase();
  if (upper in CURRENCY_CONFIG) {
    return CURRENCY_CONFIG[upper as CurrencyCode];
  }
  return CURRENCY_CONFIG.SLE;
}

/**
 * Format amount for display
 * @param amount - Amount in major units (e.g., 10.50 for 10 Leones and 50 cents)
 * @param currency - Currency code (default: SLE)
 * @param options - Formatting options
 */
export function formatCurrency(
  amount: number,
  currency?: string,
  options?: {
    showSymbol?: boolean;
    showCode?: boolean;
    alwaysShowDecimals?: boolean;
  }
): string {
  const config = getCurrencyConfig(currency);
  const { showSymbol = true, showCode = false, alwaysShowDecimals = false } = options || {};

  let formattedAmount: string;

  if (alwaysShowDecimals || !Number.isInteger(amount)) {
    formattedAmount = amount.toFixed(config.decimalPlaces);
  } else {
    formattedAmount = amount.toString();
  }

  let result = formattedAmount;

  if (showSymbol) {
    result = `${config.symbol} ${result}`;
  }

  if (showCode) {
    result = `${result} ${config.code}`;
  }

  return result;
}

/**
 * Convert from minor units (cents) to major units (Leones)
 * @param minorUnits - Amount in minor units (e.g., 1050 cents)
 * @returns Amount in major units (e.g., 10.50 Leones)
 */
export function fromMinorUnits(minorUnits: number, currency?: string): number {
  const config = getCurrencyConfig(currency);
  return minorUnits / config.minorUnit;
}

/**
 * Convert from major units (Leones) to minor units (cents)
 * @param majorUnits - Amount in major units (e.g., 10.50 Leones)
 * @returns Amount in minor units (e.g., 1050 cents)
 */
export function toMinorUnits(majorUnits: number, currency?: string): number {
  const config = getCurrencyConfig(currency);
  return Math.round(majorUnits * config.minorUnit);
}

/**
 * Parse a currency string to a number
 * @param value - String value like "Le 10.50" or "10.50"
 * @returns Numeric value (e.g., 10.50)
 */
export function parseCurrency(value: string): number {
  // Remove currency symbols and non-numeric characters except decimal point
  const cleaned = value.replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Validate if an amount is valid for the currency
 * @param amount - Amount to validate
 * @param currency - Currency code
 */
export function isValidAmount(amount: number, currency?: string): boolean {
  const config = getCurrencyConfig(currency);

  if (amount < 0) return false;
  if (amount < config.minAmount && amount !== 0) return false;

  // Check decimal places
  const decimalStr = amount.toString().split('.')[1] || '';
  if (decimalStr.length > config.decimalPlaces) return false;

  return true;
}

/**
 * Round amount to valid currency precision
 * @param amount - Amount to round
 * @param currency - Currency code
 */
export function roundToCurrency(amount: number, currency?: string): number {
  const config = getCurrencyConfig(currency);
  const factor = Math.pow(10, config.decimalPlaces);
  return Math.round(amount * factor) / factor;
}

/**
 * Get the minimum transaction amount for display
 */
export function getMinAmount(currency?: string): string {
  const config = getCurrencyConfig(currency);
  return formatCurrency(config.minAmount, currency, { alwaysShowDecimals: true });
}
