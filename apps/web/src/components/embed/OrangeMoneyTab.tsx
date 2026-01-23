/**
 * Orange Money Payment Tab
 *
 * Handles Orange Money payments via wallet top-up and pay from wallet
 */

import { useState, useEffect } from 'react';
import { Smartphone, Wallet, Loader2, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getApiEndpoint } from '@/config/urls';
import { cn } from '@/lib/utils';

interface OrangeMoneyTabProps {
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

type Step = 'check_balance' | 'topup' | 'ready_to_pay' | 'processing';

export function OrangeMoneyTab({
  sessionId,
  amount,
  currency,
  onPaymentComplete,
  onError,
}: OrangeMoneyTabProps) {
  const { user, isAuthenticated } = useAuth();
  const [step, setStep] = useState<Step>('check_balance');
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [topupCode, setTopupCode] = useState<string | null>(null);

  const currencyInfo = CURRENCIES[currency] || CURRENCIES.SLE;

  const formatAmount = (amt: number): string => {
    return `${currencyInfo.symbol} ${amt.toLocaleString(undefined, {
      minimumFractionDigits: currencyInfo.decimals,
      maximumFractionDigits: currencyInfo.decimals,
    })}`;
  };

  // Check wallet balance on mount
  useEffect(() => {
    if (user && isAuthenticated) {
      checkWalletBalance();
    } else {
      setIsLoading(false);
    }
  }, [user, isAuthenticated]);

  const checkWalletBalance = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data: wallet, error } = await supabase
        .from('wallets')
        .select('id, balance, currency')
        .eq('user_id', user.id)
        .eq('wallet_type', 'primary')
        .single();

      if (error) {
        console.error('[OrangeMoneyTab] Wallet fetch error:', error);
        setWalletBalance(0);
      } else {
        setWalletBalance(wallet?.balance || 0);
        setWalletId(wallet?.id || null);

        // If balance is sufficient, go to ready to pay
        if ((wallet?.balance || 0) >= amount) {
          setStep('ready_to_pay');
        } else {
          setStep('topup');
        }
      }
    } catch (err) {
      console.error('[OrangeMoneyTab] Error:', err);
      setWalletBalance(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate topup code
  const generateTopupCode = async () => {
    const topupAmount = amount - walletBalance + 100; // Add small buffer

    // Generate a reference code for the deposit
    const code = `PEE${Date.now().toString(36).toUpperCase()}`;
    setTopupCode(code);

    // In a real implementation, this would call Monime API to create a deposit session
    // For now, we show USSD instructions
  };

  // Process payment from wallet
  const processPayment = async () => {
    if (!walletId || !user) return;

    setIsProcessing(true);
    setStep('processing');

    try {
      const response = await fetch(getApiEndpoint(`/checkout/sessions/${sessionId}/scan-pay`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payerUserId: user.id,
          payerWalletId: walletId,
          payerName: `${user.firstName} ${user.lastName}`.trim() || user.email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onPaymentComplete(data);
      } else {
        setStep('ready_to_pay');
        onError({
          message: data.error || 'Payment failed. Please try again.',
          code: data.code || 'PAYMENT_FAILED',
        });
      }
    } catch (err: any) {
      console.error('[OrangeMoneyTab] Payment error:', err);
      setStep('ready_to_pay');
      onError({
        message: 'Network error. Please try again.',
        code: 'NETWORK_ERROR',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="py-8 px-4 text-center">
        <Smartphone className="w-12 h-12 text-orange-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Login Required</h3>
        <p className="text-sm text-gray-600 mb-6">
          Please log in to your Peeap account to pay with Orange Money
        </p>
        <a
          href={`/login?redirect=${encodeURIComponent(window.location.href)}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
        >
          Log in to Peeap
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="py-12 px-4 text-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Checking wallet balance...</p>
      </div>
    );
  }

  // Top-up needed
  if (step === 'topup') {
    const shortfall = amount - walletBalance;

    return (
      <div className="py-6 px-4">
        <div className="max-w-sm mx-auto">
          {/* Balance warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Insufficient Balance</p>
                <p className="text-sm text-amber-700 mt-1">
                  Your wallet has {formatAmount(walletBalance)}. You need {formatAmount(shortfall)} more.
                </p>
              </div>
            </div>
          </div>

          {/* Top-up instructions */}
          <div className="bg-orange-50 rounded-xl p-4 mb-6">
            <h4 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Add Money via Orange Money
            </h4>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orange-200 text-orange-700 flex items-center justify-center flex-shrink-0 text-xs font-medium">1</span>
                <span className="text-orange-800">Dial <code className="bg-orange-100 px-1 rounded">*144#</code> on your phone</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orange-200 text-orange-700 flex items-center justify-center flex-shrink-0 text-xs font-medium">2</span>
                <span className="text-orange-800">Select "Transfer Money" → "To Merchant"</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orange-200 text-orange-700 flex items-center justify-center flex-shrink-0 text-xs font-medium">3</span>
                <span className="text-orange-800">Enter Peeap Merchant ID: <code className="bg-orange-100 px-1 rounded font-bold">123456</code></span>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orange-200 text-orange-700 flex items-center justify-center flex-shrink-0 text-xs font-medium">4</span>
                <span className="text-orange-800">Enter amount: <code className="bg-orange-100 px-1 rounded font-bold">{formatAmount(shortfall + 100)}</code></span>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orange-200 text-orange-700 flex items-center justify-center flex-shrink-0 text-xs font-medium">5</span>
                <span className="text-orange-800">Confirm with your Orange Money PIN</span>
              </div>
            </div>
          </div>

          {/* Check balance again */}
          <button
            onClick={checkWalletBalance}
            className="w-full py-3 px-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            <Wallet className="w-5 h-5" />
            I've added money - Check balance
          </button>
        </div>
      </div>
    );
  }

  // Ready to pay
  if (step === 'ready_to_pay') {
    return (
      <div className="py-6 px-4">
        <div className="max-w-sm mx-auto">
          {/* Wallet balance */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-700">Peeap Wallet Balance</p>
                <p className="text-xl font-bold text-green-800">{formatAmount(walletBalance)}</p>
              </div>
              <CheckCircle className="w-6 h-6 text-green-600 ml-auto" />
            </div>
          </div>

          {/* Payment summary */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Payment Amount</span>
              <span className="font-medium">{formatAmount(amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Balance After</span>
              <span className="font-medium">{formatAmount(walletBalance - amount)}</span>
            </div>
          </div>

          {/* Pay button */}
          <button
            onClick={processPayment}
            className="w-full py-4 px-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors text-lg"
          >
            Pay {formatAmount(amount)} from Wallet
          </button>
        </div>
      </div>
    );
  }

  // Processing
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
      <p className="text-lg font-medium text-gray-900">Processing payment...</p>
      <p className="text-sm text-gray-500">Please wait, do not close this window</p>
    </div>
  );
}
