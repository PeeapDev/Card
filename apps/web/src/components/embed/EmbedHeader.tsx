/**
 * Embed Checkout Header
 *
 * Displays merchant info, amount, and close button for embedded checkout
 */

import { X, BadgeCheck, Shield } from 'lucide-react';

interface EmbedHeaderProps {
  merchantName: string;
  merchantLogo?: string;
  isVerified?: boolean;
  amount: number;
  currency: string;
  description?: string;
  onClose?: () => void;
}

// Currency definitions
const CURRENCIES: Record<string, { symbol: string; decimals: number }> = {
  SLE: { symbol: 'Le', decimals: 2 },
  USD: { symbol: '$', decimals: 2 },
  EUR: { symbol: '€', decimals: 2 },
  GBP: { symbol: '£', decimals: 2 },
  NGN: { symbol: '₦', decimals: 2 },
  GHS: { symbol: '₵', decimals: 2 },
};

export function EmbedHeader({
  merchantName,
  merchantLogo,
  isVerified,
  amount,
  currency,
  description,
  onClose,
}: EmbedHeaderProps) {
  const currencyInfo = CURRENCIES[currency] || CURRENCIES.SLE;

  const formatAmount = (amt: number): string => {
    return `${currencyInfo.symbol} ${amt.toLocaleString(undefined, {
      minimumFractionDigits: currencyInfo.decimals,
      maximumFractionDigits: currencyInfo.decimals,
    })}`;
  };

  return (
    <div className="relative bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-6 rounded-t-2xl">
      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Close checkout"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Merchant info */}
      <div className="flex items-center gap-3 mb-4">
        {merchantLogo ? (
          <img
            src={merchantLogo}
            alt={merchantName}
            className="w-12 h-12 rounded-xl object-cover bg-white"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <span className="text-xl font-bold">{merchantName.charAt(0)}</span>
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg">{merchantName}</span>
            {isVerified && (
              <BadgeCheck className="w-5 h-5 text-green-300" />
            )}
          </div>
          {description && (
            <p className="text-sm text-white/80 line-clamp-1">{description}</p>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="text-center">
        <p className="text-sm text-white/70 mb-1">Amount to pay</p>
        <p className="text-4xl font-bold tracking-tight">{formatAmount(amount)}</p>
      </div>

      {/* Security badge */}
      <div className="flex items-center justify-center gap-1 mt-4 text-xs text-white/60">
        <Shield className="w-3 h-3" />
        <span>Secured by Peeap</span>
      </div>
    </div>
  );
}
