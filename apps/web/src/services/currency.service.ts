/**
 * Currency Service
 *
 * Provides system-wide currency management including:
 * - Default currency setting
 * - Currency formatting
 * - Currency symbols lookup
 */

import { supabase } from '@/lib/supabase';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  isDefault: boolean;
  isActive: boolean;
}

// Cache for currencies
let currencyCache: Currency[] | null = null;
let defaultCurrencyCache: Currency | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get all currencies
 */
export async function getCurrencies(): Promise<Currency[]> {
  if (currencyCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return currencyCache;
  }

  currencyCache = getDefaultCurrencies();
  cacheTimestamp = Date.now();
  defaultCurrencyCache = currencyCache.find(c => c.isDefault) || currencyCache[0];
  return currencyCache;
}

/**
 * Get the default currency
 */
export async function getDefaultCurrency(): Promise<Currency> {
  if (defaultCurrencyCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return defaultCurrencyCache;
  }

  const currencies = await getCurrencies();
  return currencies.find(c => c.isDefault) || currencies[0] || getDefaultCurrencies()[0];
}

/**
 * Get currency by code
 */
export async function getCurrencyByCode(code: string): Promise<Currency | null> {
  const currencies = await getCurrencies();
  return currencies.find(c => c.code === code) || null;
}

/**
 * Get currency symbol by code
 */
export async function getCurrencySymbol(code: string): Promise<string> {
  const currency = await getCurrencyByCode(code);
  return currency?.symbol || code;
}

/**
 * Format amount with currency symbol
 * Returns format: "Le 5.00" or "$ 5.00"
 * No conversion - shows amount as stored
 */
export async function formatCurrency(amount: number, currencyCode?: string): Promise<string> {
  const code = currencyCode || (await getDefaultCurrency()).code;
  const symbol = await getCurrencySymbol(code);

  const formattedAmount = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${symbol} ${formattedAmount}`;
}

/**
 * Format amount with currency symbol (sync version)
 * No conversion - shows amount as stored
 */
export function formatCurrencySync(amount: number, currencyCode: string, currencies: Currency[]): string {
  const currency = currencies.find(c => c.code === currencyCode);
  const symbol = currency?.symbol || currencyCode;

  const formattedAmount = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${symbol} ${formattedAmount}`;
}

/**
 * Format amount with currency symbol
 * Simple synchronous method - no conversion, just format
 * Returns format: "NLe 5.00" or "$ 5.00"
 */
export function formatAmount(amount: number, currencyCode: string = 'SLE'): string {
  const symbols: Record<string, string> = {
    SLE: 'NLe',
    USD: '$',
    EUR: '€',
    GBP: '£',
  };
  const symbol = symbols[currencyCode] || currencyCode;

  const formattedAmount = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${symbol} ${formattedAmount}`;
}

/**
 * Set default currency
 */
export async function setDefaultCurrency(code: string): Promise<boolean> {
  try {
    const currencies = await getCurrencies();
    const currency = currencies.find(c => c.code === code);

    if (!currency) {
      console.error('Currency not found:', code);
      return false;
    }

    currencyCache = currencies.map(c => ({
      ...c,
      isDefault: c.code === code,
    }));
    defaultCurrencyCache = currencyCache.find(c => c.isDefault) || null;
    cacheTimestamp = Date.now();

    return true;
  } catch (error) {
    console.error('Error setting default currency:', error);
    return false;
  }
}

/**
 * Clear currency cache
 */
export function clearCurrencyCache(): void {
  currencyCache = null;
  defaultCurrencyCache = null;
  cacheTimestamp = 0;
}

/**
 * Default currencies
 * Note: SLE uses New Leones (NLe) - 1 NLe = 1000 old Leones
 */
function getDefaultCurrencies(): Currency[] {
  return [
    { code: 'SLE', name: 'Sierra Leone New Leone', symbol: 'NLe', isDefault: true, isActive: true },
    { code: 'USD', name: 'US Dollar', symbol: '$', isDefault: false, isActive: true },
  ];
}

export const currencyService = {
  getCurrencies,
  getDefaultCurrency,
  getCurrencyByCode,
  getCurrencySymbol,
  formatCurrency,
  formatCurrencySync,
  formatAmount,
  setDefaultCurrency,
  clearCurrencyCache,
};
