/**
 * Card Payment Tab
 *
 * Handles Peeap card payment with CVV and PIN verification
 */

import { useState } from 'react';
import { CreditCard, Lock, Eye, EyeOff, Loader2, AlertCircle, Wallet } from 'lucide-react';
import { cardService } from '@/services/card.service';
import { getApiEndpoint } from '@/config/urls';
import { cn } from '@/lib/utils';

interface CardPaymentTabProps {
  sessionId: string;
  amount: number;
  currency: string;
  onPaymentComplete: (result: any) => void;
  onError: (error: { message: string; code?: string }) => void;
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

interface ValidatedCard {
  cardId: string;
  walletId: string;
  cardholderName: string;
  walletBalance: number;
  currency: string;
  last4: string;
}

type Step = 'card_input' | 'pin_input' | 'processing';

export function CardPaymentTab({
  sessionId,
  amount,
  currency,
  onPaymentComplete,
  onError,
}: CardPaymentTabProps) {
  const [step, setStep] = useState<Step>('card_input');

  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cvv, setCvv] = useState('');
  const [validatedCard, setValidatedCard] = useState<ValidatedCard | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // PIN state
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const currencyInfo = CURRENCIES[currency] || CURRENCIES.SLE;

  const formatAmount = (amt: number): string => {
    return `${currencyInfo.symbol} ${amt.toLocaleString(undefined, {
      minimumFractionDigits: currencyInfo.decimals,
      maximumFractionDigits: currencyInfo.decimals,
    })}`;
  };

  // Format card number with spaces
  const formatCardNumber = (value: string): string => {
    const cleaned = value.replace(/\D/g, '').slice(0, 16);
    const groups = cleaned.match(/.{1,4}/g) || [];
    return groups.join(' ');
  };

  // Step 1: Validate card and CVV
  const handleCardValidation = async () => {
    setCardError(null);
    setIsValidating(true);

    try {
      const cleanCardNumber = cardNumber.replace(/\s/g, '');

      if (cleanCardNumber.length < 16) {
        setCardError('Please enter a valid 16-digit card number');
        setIsValidating(false);
        return;
      }

      if (cvv.length !== 3) {
        setCardError('Please enter a valid 3-digit CVV');
        setIsValidating(false);
        return;
      }

      // Call card validation service
      const result = await cardService.lookupCardForPayment(cleanCardNumber, cvv);

      if (!result) {
        setCardError('Card not found. Please check your card number and CVV.');
        setIsValidating(false);
        return;
      }

      // Check balance
      if (result.walletBalance < amount) {
        setCardError(`Insufficient balance. Your wallet has ${formatAmount(result.walletBalance)}`);
        setIsValidating(false);
        return;
      }

      // Map result to ValidatedCard, extracting last4 from maskedNumber
      setValidatedCard({
        cardId: result.cardId,
        walletId: result.walletId,
        cardholderName: result.cardholderName,
        walletBalance: result.walletBalance,
        currency: result.currency,
        last4: result.maskedNumber.slice(-4),
      });
      setStep('pin_input');
    } catch (err: any) {
      console.error('[CardPaymentTab] Validation error:', err);
      setCardError(err.message || 'Failed to validate card');
    } finally {
      setIsValidating(false);
    }
  };

  // Step 2: Process payment with PIN
  const handlePayment = async () => {
    if (!validatedCard || pin.length !== 4) return;

    setIsProcessing(true);
    setStep('processing');

    try {
      const response = await fetch(getApiEndpoint(`/checkout/sessions/${sessionId}/card-pay`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: validatedCard.cardId,
          walletId: validatedCard.walletId,
          pin: pin,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onPaymentComplete(data);
      } else {
        setStep('pin_input');
        setPin('');
        onError({
          message: data.error || 'Payment failed. Please try again.',
          code: data.code || 'PAYMENT_FAILED',
        });
      }
    } catch (err: any) {
      console.error('[CardPaymentTab] Payment error:', err);
      setStep('pin_input');
      setPin('');
      onError({
        message: 'Network error. Please try again.',
        code: 'NETWORK_ERROR',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Render card input form
  if (step === 'card_input') {
    return (
      <div className="py-6 px-4">
        <div className="max-w-sm mx-auto space-y-4">
          {/* Card Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Peeap Card Number
            </label>
            <div className="relative">
              <input
                type="text"
                value={formatCardNumber(cardNumber)}
                onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="1234 5678 9012 3456"
                className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg tracking-wider"
                maxLength={19}
              />
              <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>

          {/* CVV */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CVV
            </label>
            <div className="relative">
              <input
                type="password"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                placeholder="123"
                className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg tracking-wider"
                maxLength={3}
              />
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>

          {/* Error message */}
          {cardError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{cardError}</span>
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleCardValidation}
            disabled={isValidating || cardNumber.length < 16 || cvv.length < 3}
            className={cn(
              'w-full py-3 px-4 rounded-xl font-medium text-white transition-colors',
              isValidating || cardNumber.length < 16 || cvv.length < 3
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            )}
          >
            {isValidating ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Validating...
              </span>
            ) : (
              'Continue'
            )}
          </button>

          {/* Info text */}
          <p className="text-xs text-center text-gray-500">
            Use your Peeap virtual or physical card to pay
          </p>
        </div>
      </div>
    );
  }

  // Render PIN input form
  if (step === 'pin_input') {
    return (
      <div className="py-6 px-4">
        <div className="max-w-sm mx-auto space-y-4">
          {/* Card preview */}
          {validatedCard && (
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4 rounded-xl">
              <div className="flex justify-between items-start mb-6">
                <span className="text-sm opacity-80">Peeap Card</span>
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="text-lg tracking-widest mb-4">
                •••• •••• •••• {validatedCard.last4}
              </div>
              <div className="flex justify-between text-sm">
                <span>{validatedCard.cardholderName}</span>
                <div className="flex items-center gap-1">
                  <Wallet className="w-4 h-4" />
                  <span>{formatAmount(validatedCard.walletBalance)}</span>
                </div>
              </div>
            </div>
          )}

          {/* PIN Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Enter your 4-digit PIN
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-2xl tracking-[0.5em] text-center"
                maxLength={4}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Payment amount reminder */}
          <div className="text-center py-2">
            <span className="text-sm text-gray-600">You are paying </span>
            <span className="text-lg font-bold text-gray-900">{formatAmount(amount)}</span>
          </div>

          {/* Submit button */}
          <button
            onClick={handlePayment}
            disabled={pin.length !== 4}
            className={cn(
              'w-full py-3 px-4 rounded-xl font-medium text-white transition-colors',
              pin.length !== 4
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            )}
          >
            Pay {formatAmount(amount)}
          </button>

          {/* Back button */}
          <button
            onClick={() => {
              setStep('card_input');
              setValidatedCard(null);
              setPin('');
            }}
            className="w-full py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Use a different card
          </button>
        </div>
      </div>
    );
  }

  // Render processing state
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
      <p className="text-lg font-medium text-gray-900">Processing payment...</p>
      <p className="text-sm text-gray-500">Please wait, do not close this window</p>
    </div>
  );
}
