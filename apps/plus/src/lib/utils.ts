import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format currency for Sierra Leone
 * Uses NLe (New Leone) - the redenominated currency since July 2022
 * ISO code is SLE, but local abbreviation is NLe
 *
 * @param amount - The amount to format
 * @param options - Formatting options
 * @returns Formatted currency string like "NLe 1,500.00"
 */
export function formatCurrency(
  amount: number,
  options: {
    currency?: string;
    decimals?: number;
    showSymbol?: boolean;
  } = {}
): string {
  const { currency = "SLE", decimals = 2, showSymbol = true } = options;

  // Format the number
  const formatted = new Intl.NumberFormat("en", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

  // Use NLe as the local symbol for Sierra Leone Leone
  if (showSymbol) {
    if (currency === "SLE" || currency === "NLE") {
      return `NLe ${formatted}`;
    }
    // For other currencies, use the standard symbol
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  }

  return formatted;
}

/**
 * Format currency in compact notation for large numbers
 * @param amount - The amount to format
 * @returns Formatted string like "NLe 1.5M" or "NLe 500K"
 */
export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1000000) {
    return `NLe ${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `NLe ${(amount / 1000).toFixed(1)}K`;
  }
  return `NLe ${amount.toFixed(2)}`;
}
