/**
 * Payment Intent Page
 *
 * Channel-agnostic payment page for Payment Intents
 * URL format: /i/:intentId
 *
 * Customer scans QR code from bus terminal/POS/website
 * and can pay using their Peeap Wallet, Card, or Mobile Money
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Wallet,
  CreditCard,
  Smartphone,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Shield,
  LogIn,
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  Bus,
  Store,
  QrCode,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { API_URL } from '@/config/urls';

// Types
interface PaymentIntent {
  id: string;
  external_id: string;
  amount: number;
  currency: string;
  status: string;
  description?: string;
  merchant_id?: string;
  merchant_name?: string;
  merchant_logo?: string;
  payment_methods_allowed: string[];
  return_url?: string;
  cancel_url?: string;
  expires_at: string;
  metadata?: Record<string, any>;
}

interface UserWallet {
  id: string;
  balance: number;
  currency: string;
}

type PaymentMethod = 'wallet' | 'card' | 'mobile_money';
type PageStep =
  | 'loading'
  | 'select_method'
  | 'wallet_confirm'
  | 'card_form'
  | 'mobile_form'
  | 'processing'
  | 'success'
  | 'error'
  | 'expired'
  | 'login_required';

// Currency definitions
const CURRENCIES: Record<string, { symbol: string; name: string; decimals: number }> = {
  SLE: { symbol: 'Le', name: 'Sierra Leonean New Leone', decimals: 2 },
  USD: { symbol: '$', name: 'US Dollar', decimals: 2 },
  EUR: { symbol: '€', name: 'Euro', decimals: 2 },
  GBP: { symbol: '£', name: 'British Pound', decimals: 2 },
  NGN: { symbol: '₦', name: 'Nigerian Naira', decimals: 2 },
  GHS: { symbol: '₵', name: 'Ghanaian Cedi', decimals: 2 },
};

export function PaymentIntentPage() {
  const { intentId } = useParams<{ intentId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // State
  const [step, setStep] = useState<PageStep>('loading');
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardPin, setCardPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Mobile money state
  const [mobilePhone, setMobilePhone] = useState('');
  const [mobileProvider, setMobileProvider] = useState<'orange_money' | 'africell_money'>('orange_money');

  // Wallet PIN
  const [walletPin, setWalletPin] = useState('');

  // Format amount with currency
  const formatAmount = (amt: number, curr: string): string => {
    const currency = CURRENCIES[curr] || CURRENCIES.SLE;
    // Amount is in cents, convert to main unit
    const mainAmount = amt / 100;
    return `${currency.symbol} ${mainAmount.toLocaleString(undefined, {
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals,
    })}`;
  };

  // Format expiry time
  const formatExpiry = (expiresAt: string): string => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} min left`;

    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m left`;
  };

  // Fetch payment intent
  const fetchIntent = useCallback(async () => {
    if (!intentId) {
      setError('Invalid payment link');
      setStep('error');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/v1/payment-intents/${intentId}`);

      if (!response.ok) {
        throw new Error('Payment not found');
      }

      const data = await response.json();

      // Check if expired
      if (new Date(data.expires_at * 1000) < new Date()) {
        setIntent(data);
        setStep('expired');
        return;
      }

      // Check status
      if (data.status === 'succeeded') {
        setIntent(data);
        setStep('success');
        return;
      }

      if (data.status === 'canceled' || data.status === 'failed') {
        setIntent(data);
        setStep('error');
        setError(data.last_payment_error?.message || 'Payment was canceled');
        return;
      }

      // Also fetch merchant info if merchant_id exists
      if (data.merchant_id) {
        const { data: merchant } = await supabase
          .from('merchant_businesses')
          .select('name, logo_url')
          .eq('id', data.merchant_id)
          .single();

        if (merchant) {
          data.merchant_name = merchant.name;
          data.merchant_logo = merchant.logo_url;
        }
      }

      setIntent({
        ...data,
        expires_at: new Date(data.expires_at * 1000).toISOString(),
      });
      setStep('select_method');
    } catch (err: any) {
      console.error('Error fetching payment intent:', err);
      setError(err.message || 'Failed to load payment');
      setStep('error');
    }
  }, [intentId]);

  // Fetch user wallet
  const fetchWallet = useCallback(async () => {
    if (!user) return;

    try {
      const { data: walletData } = await supabase
        .from('wallets')
        .select('id, balance, currency')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single();

      if (walletData) {
        setWallet(walletData);
      }
    } catch (err) {
      console.error('Error fetching wallet:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchIntent();
  }, [fetchIntent]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchWallet();
    }
  }, [isAuthenticated, user, fetchWallet]);

  // Confirm payment with wallet
  const confirmWithWallet = async () => {
    if (!intent || !wallet) return;

    setProcessing(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/payment-intents/${intent.id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_method: 'wallet',
          payer_wallet_id: wallet.id,
        }),
      });

      const result = await response.json();

      if (result.status === 'succeeded') {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setStep('success');

        // Redirect after success
        if (intent.return_url) {
          setTimeout(() => {
            window.location.href = intent.return_url!;
          }, 2000);
        }
      } else if (result.error) {
        setError(result.error.message || 'Payment failed');
        setStep('error');
      } else {
        setError('Payment failed');
        setStep('error');
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      setStep('error');
    } finally {
      setProcessing(false);
    }
  };

  // Confirm payment with card
  const confirmWithCard = async () => {
    if (!intent) return;

    setProcessing(true);
    setError(null);

    try {
      const [expMonth, expYear] = cardExpiry.split('/').map(s => parseInt(s.trim()));

      const response = await fetch(`${API_URL}/api/v1/payment-intents/${intent.id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_method: 'card',
          card: {
            number: cardNumber.replace(/\s/g, ''),
            exp_month: expMonth,
            exp_year: expYear < 100 ? 2000 + expYear : expYear,
            cvc: cardCvv,
          },
        }),
      });

      const result = await response.json();

      if (result.status === 'succeeded') {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setStep('success');

        if (intent.return_url) {
          setTimeout(() => {
            window.location.href = intent.return_url!;
          }, 2000);
        }
      } else if (result.error) {
        setError(result.error.message || 'Payment failed');
        setStep('error');
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      setStep('error');
    } finally {
      setProcessing(false);
    }
  };

  // Handle method selection
  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);

    if (method === 'wallet') {
      if (!isAuthenticated) {
        setStep('login_required');
      } else {
        setStep('wallet_confirm');
      }
    } else if (method === 'card') {
      setStep('card_form');
    } else if (method === 'mobile_money') {
      setStep('mobile_form');
    }
  };

  // Format card number input
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  // Render loading
  if (step === 'loading' || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
          <p className="text-white/70">Loading payment...</p>
        </div>
      </div>
    );
  }

  // Render expired
  if (step === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Expired</h1>
          <p className="text-gray-600 mb-6">This payment link has expired. Please request a new one.</p>
          {intent?.cancel_url && (
            <a
              href={intent.cancel_url}
              className="inline-block px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition"
            >
              Go Back
            </a>
          )}
        </div>
      </div>
    );
  }

  // Render error
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
          <p className="text-gray-600 mb-6">{error || 'Something went wrong'}</p>
          <button
            onClick={() => {
              setError(null);
              setStep('select_method');
            }}
            className="px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Render success
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-2">
            {intent?.description || 'Your payment has been processed'}
          </p>
          <p className="text-3xl font-bold text-green-600 mb-6">
            {intent && formatAmount(intent.amount, intent.currency)}
          </p>
          {intent?.return_url && (
            <p className="text-sm text-gray-500">Redirecting you back...</p>
          )}
        </div>
      </div>
    );
  }

  // Render login required
  if (step === 'login_required') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <button
            onClick={() => setStep('select_method')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Login Required</h1>
            <p className="text-gray-600">Sign in to pay with your Peeap Wallet</p>
          </div>

          <a
            href={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition mb-3"
          >
            <LogIn className="w-5 h-5" />
            Sign In
          </a>

          <a
            href={`/register?redirect=${encodeURIComponent(window.location.pathname)}`}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:border-gray-300 transition"
          >
            Create Account
          </a>
        </div>
      </div>
    );
  }

  // Main checkout UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            {intent?.merchant_logo ? (
              <img
                src={intent.merchant_logo}
                alt={intent.merchant_name || 'Merchant'}
                className="w-12 h-12 rounded-full bg-white object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                {intent?.metadata?.vehicle_id ? (
                  <Bus className="w-6 h-6 text-white" />
                ) : (
                  <Store className="w-6 h-6 text-white" />
                )}
              </div>
            )}
            <div>
              <p className="text-white/80 text-sm">Pay to</p>
              <p className="font-semibold text-lg">
                {intent?.merchant_name || intent?.metadata?.route || 'Merchant'}
              </p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-white/80 text-sm mb-1">{intent?.description || 'Payment'}</p>
            <p className="text-4xl font-bold">
              {intent && formatAmount(intent.amount, intent.currency)}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 mt-4 text-white/70 text-sm">
            <Clock className="w-4 h-4" />
            {intent && formatExpiry(intent.expires_at)}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Method Selection */}
          {step === 'select_method' && (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose payment method</h2>

              <div className="space-y-3">
                {/* Wallet Option */}
                {intent?.payment_methods_allowed?.includes('wallet') && (
                  <button
                    onClick={() => handleMethodSelect('wallet')}
                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition"
                  >
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">Peeap Wallet</p>
                      {wallet ? (
                        <p className="text-sm text-gray-500">
                          Balance: {formatAmount(wallet.balance * 100, wallet.currency)}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500">Pay from your wallet</p>
                      )}
                    </div>
                    {isAuthenticated && wallet && wallet.balance * 100 >= (intent?.amount || 0) && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Recommended
                      </span>
                    )}
                  </button>
                )}

                {/* Card Option */}
                {intent?.payment_methods_allowed?.includes('card') && (
                  <button
                    onClick={() => handleMethodSelect('card')}
                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition"
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">Card</p>
                      <p className="text-sm text-gray-500">Pay with Peeap Card</p>
                    </div>
                  </button>
                )}

                {/* Mobile Money Option */}
                {intent?.payment_methods_allowed?.includes('mobile_money') && (
                  <button
                    onClick={() => handleMethodSelect('mobile_money')}
                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition"
                  >
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <Smartphone className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">Mobile Money</p>
                      <p className="text-sm text-gray-500">Orange Money, Africell Money</p>
                    </div>
                  </button>
                )}
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 text-gray-400 text-sm">
                <Shield className="w-4 h-4" />
                Secured by Peeap
              </div>
            </>
          )}

          {/* Wallet Confirm */}
          {step === 'wallet_confirm' && (
            <>
              <button
                onClick={() => setStep('select_method')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Pay with Wallet</h2>
                <p className="text-gray-500">
                  Balance: {wallet && formatAmount(wallet.balance * 100, wallet.currency)}
                </p>
              </div>

              {wallet && wallet.balance * 100 < (intent?.amount || 0) ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-4">
                  <p className="text-red-700 text-sm">
                    Insufficient balance. Please top up your wallet or choose another payment method.
                  </p>
                </div>
              ) : (
                <button
                  onClick={confirmWithWallet}
                  disabled={processing}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Pay {intent && formatAmount(intent.amount, intent.currency)}
                    </>
                  )}
                </button>
              )}
            </>
          )}

          {/* Card Form */}
          {step === 'card_form' && (
            <>
              <button
                onClick={() => setStep('select_method')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <h2 className="text-lg font-semibold text-gray-900 mb-4">Card Details</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card Number
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry
                    </label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => {
                        let v = e.target.value.replace(/\D/g, '');
                        if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2, 4);
                        setCardExpiry(v);
                      }}
                      placeholder="MM/YY"
                      maxLength={5}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CVV
                    </label>
                    <input
                      type="password"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="123"
                      maxLength={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <button
                  onClick={confirmWithCard}
                  disabled={processing || !cardNumber || !cardExpiry || !cardCvv}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Pay {intent && formatAmount(intent.amount, intent.currency)}
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* Mobile Money Form */}
          {step === 'mobile_form' && (
            <>
              <button
                onClick={() => setStep('select_method')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <h2 className="text-lg font-semibold text-gray-900 mb-4">Mobile Money</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Provider
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setMobileProvider('orange_money')}
                      className={`p-4 border-2 rounded-xl text-center transition ${
                        mobileProvider === 'orange_money'
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl mb-1 block">🟠</span>
                      <span className="text-sm font-medium">Orange Money</span>
                    </button>
                    <button
                      onClick={() => setMobileProvider('africell_money')}
                      className={`p-4 border-2 rounded-xl text-center transition ${
                        mobileProvider === 'africell_money'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl mb-1 block">🟣</span>
                      <span className="text-sm font-medium">Africell Money</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={mobilePhone}
                    onChange={(e) => setMobilePhone(e.target.value)}
                    placeholder="+232 76 123 456"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <p className="text-sm text-yellow-800">
                    You will receive a payment request on your phone. Confirm to complete the payment.
                  </p>
                </div>

                <button
                  disabled={processing || !mobilePhone}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 transition disabled:opacity-50"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending Request...
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-5 h-5" />
                      Send Payment Request
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
