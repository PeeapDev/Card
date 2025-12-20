/**
 * Currency Utilities for Sierra Leone New Leone (SLE/NLe)
 *
 * Sierra Leone redenominated its currency in 2022, removing 3 zeros:
 * - Old Le 1,000 (SLL) = NLe 1.00 (SLE)
 *
 * ISO 4217 code: SLE (New Leone)
 * Symbol: NLe (placed before the amount with a space)
 * Decimal places: 2 (the New Leone uses cents)
 *
 * Examples:
 * - NLe 1.00 = 1 New Leone
 * - NLe 5.50 = 5 New Leones and 50 cents
 * - NLe 100.00 = 100 New Leones
 *
 * Exchange rate: ~1 USD = 22.50 SLE (as of 2024)
 *
 * IMPORTANT: Only use SLE (New Leone). Old SLL is no longer supported.
 */

export const CURRENCY_CONFIG = {
  SLE: {
    code: 'SLE',
    symbol: 'NLe',
    name: 'Sierra Leonean New Leone',
    decimalPlaces: 2,
    minorUnit: 100, // 100 cents = 1 Leone
    minAmount: 0.01, // Minimum 1 cent
  },
  // USD for multi-currency support
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
  const { showSymbol = true, showCode = false, alwaysShowDecimals = true } = options || {};

  // Always show 2 decimal places for SLE (New Leone)
  const formattedAmount = amount.toLocaleString(undefined, {
    minimumFractionDigits: alwaysShowDecimals ? config.decimalPlaces : 0,
    maximumFractionDigits: config.decimalPlaces,
  });

  let result = formattedAmount;

  if (showSymbol) {
    result = `${config.symbol} ${result}`; // Space after symbol
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
