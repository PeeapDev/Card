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
 * Note: Using hardcoded defaults since currencies table may not exist
 */
export async function getCurrencies(): Promise<Currency[]> {
  // Check cache
  if (currencyCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return currencyCache;
  }

  // Use default currencies (currencies table doesn't exist yet)
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
 */
export async function formatCurrency(amount: number, currencyCode?: string): Promise<string> {
  const code = currencyCode || (await getDefaultCurrency()).code;
  const symbol = await getCurrencySymbol(code);
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format amount with currency symbol (sync version - uses cached data)
 */
export function formatCurrencySync(amount: number, currencyCode: string, currencies: Currency[]): string {
  const currency = currencies.find(c => c.code === currencyCode);
  const symbol = currency?.symbol || currencyCode;
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Set default currency (updates in-memory cache only - no database table)
 */
export async function setDefaultCurrency(code: string): Promise<boolean> {
  try {
    // Update in-memory cache only (currencies table doesn't exist)
    const currencies = await getCurrencies();
    const currency = currencies.find(c => c.code === code);

    if (!currency) {
      console.error('Currency not found:', code);
      return false;
    }

    // Update cache to set new default
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
 * Clear currency cache (call when currencies are updated)
 */
export function clearCurrencyCache(): void {
  currencyCache = null;
  defaultCurrencyCache = null;
  cacheTimestamp = 0;
}

/**
 * Default currencies (fallback when database is empty)
 */
function getDefaultCurrencies(): Currency[] {
  return [
    { code: 'SLE', name: 'Sierra Leone Leone', symbol: 'Le', isDefault: true, isActive: true },
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
  setDefaultCurrency,
  clearCurrencyCache,
};
