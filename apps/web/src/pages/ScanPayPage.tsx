/**
 * Scan Pay Page
 *
 * This page handles QR code scans from the checkout page.
 * When a user scans the QR code with their Peeap app or phone camera,
 * they are redirected here to complete the payment.
 *
 * URL format: /scan-pay/:sessionId
 *
 * Flow:
 * 1. User on checkout page displays QR code
 * 2. Another user scans QR with their phone
 * 3. If logged in: Show payment confirmation
 * 4. If not logged in: Prompt to login/register
 * 5. After payment: Update checkout session and notify original page
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Shield,
  Wallet,
  User,
  LogIn,
  ArrowLeft,
  Smartphone,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface CheckoutSession {
  id: string;
  externalId: string;
  merchantId: string;
  status: string;
  amount: number;
  currencyCode: string;
  description?: string;
  merchantName?: string;
  merchantLogoUrl?: string;
  successUrl?: string;
  cancelUrl?: string;
  expiresAt: string;
  isTestMode?: boolean;
}

type PaymentStep = 'loading' | 'login' | 'confirm' | 'pin' | 'processing' | 'success' | 'error' | 'expired' | 'already_paid';

// Currency definitions
const CURRENCIES: Record<string, { symbol: string; name: string }> = {
  SLE: { symbol: 'Le', name: 'Sierra Leonean New Leone' },
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
};

export function ScanPayPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [step, setStep] = useState<PaymentStep>('loading');
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Format amount with currency
  const formatAmount = (amt: number, curr: string): string => {
    const currency = CURRENCIES[curr] || CURRENCIES.SLE;
    return `${currency.symbol} ${amt.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Load checkout session
  useEffect(() => {
    loadSession();
  }, [sessionId]);

  // Check wallet when user authenticates
  useEffect(() => {
    if (isAuthenticated && user?.id && session) {
      fetchWallet();
      setStep('confirm');
    }
  }, [isAuthenticated, user?.id, session]);

  const loadSession = async () => {
    if (!sessionId) {
      setError('Invalid payment session');
      setStep('error');
      return;
    }

    try {
      const baseApiUrl = import.meta.env.VITE_API_URL || 'https://api.peeap.com';
      const apiUrl = baseApiUrl.endsWith('/api') ? baseApiUrl : `${baseApiUrl}/api`;
      const response = await fetch(`${apiUrl}/checkout/sessions/${sessionId}`);

      if (!response.ok) {
        throw new Error('Payment session not found');
      }

      const rawData = await response.json();
      const metadata = rawData.metadata || {};

      const data: CheckoutSession = {
        id: rawData.id,
        externalId: rawData.external_id || rawData.externalId,
        merchantId: rawData.merchant_id || rawData.merchantId,
        amount: rawData.amount,
        currencyCode: rawData.currency_code || rawData.currencyCode || 'SLE',
        description: rawData.description,
        status: rawData.status,
        expiresAt: rawData.expires_at || rawData.expiresAt,
        merchantName: rawData.merchant_name || rawData.merchantName,
        merchantLogoUrl: rawData.merchant_logo_url || rawData.merchantLogoUrl,
        successUrl: rawData.success_url || rawData.successUrl,
        cancelUrl: rawData.cancel_url || rawData.cancelUrl,
        isTestMode: metadata.isTestMode === true,
      };

      // Check if expired
      if (new Date(data.expiresAt) < new Date()) {
        setSession(data);
        setStep('expired');
        return;
      }

      // Check if already paid
      if (data.status === 'COMPLETE') {
        setSession(data);
        setStep('already_paid');
        return;
      }

      if (data.status === 'CANCELLED') {
        setError('This payment was cancelled');
        setStep('error');
        return;
      }

      setSession(data);

      // If user is already logged in, go to confirm
      if (isAuthenticated && user?.id) {
        fetchWallet();
        setStep('confirm');
      } else {
        setStep('login');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load payment');
      setStep('error');
    }
  };

  const fetchWallet = async () => {
    if (!user?.id) return;

    const { data: wallet } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', user.id)
      .eq('wallet_type', 'primary')
      .single();

    if (wallet) {
      setWalletId(wallet.id);
      setWalletBalance(wallet.balance);
    }
  };

  // Proceed to PIN entry step
  const handleProceedToPin = () => {
    if (!session || !user?.id || !walletId) {
      setError('Missing payment information');
      return;
    }

    if (walletBalance < session.amount) {
      setError('Insufficient balance in your wallet');
      return;
    }

    setPin('');
    setPinError(null);
    setStep('pin');
  };

  // Verify PIN and process payment
  const handlePayment = async () => {
    if (!session || !user?.id || !walletId) {
      setError('Missing payment information');
      setStep('error');
      return;
    }

    if (pin.length !== 4) {
      setPinError('Please enter your 4-digit PIN');
      return;
    }

    // Verify PIN first
    setPinError(null);
    setStep('processing');

    try {
      // Get user's primary card and verify PIN against it
      const { data: primaryCard } = await supabase
        .from('cards')
        .select('id, transaction_pin')
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (primaryCard?.transaction_pin) {
        // Verify PIN matches
        if (primaryCard.transaction_pin !== pin) {
          setPinError('Invalid PIN. Please try again.');
          setStep('pin');
          return;
        }
      }
      // If no card or no PIN set, proceed without PIN verification (for new users)

      // PIN verified, proceed with payment
      const baseApiUrl = import.meta.env.VITE_API_URL || 'https://api.peeap.com';
      const apiUrl = baseApiUrl.endsWith('/api') ? baseApiUrl : `${baseApiUrl}/api`;

      // Call the scan-pay endpoint to process the payment
      const response = await fetch(`${apiUrl}/checkout/sessions/${sessionId}/scan-pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payerUserId: user.id,
          payerWalletId: walletId,
          payerName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          pin: pin, // Include PIN for additional server-side verification
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment failed');
      }

      setStep('success');

      // The original checkout page will be notified via polling

    } catch (err: any) {
      setError(err.message || 'Payment failed');
      setStep('error');
    }
  };

  const handleLogin = () => {
    // Store the return URL
    const returnUrl = `/scan-pay/${sessionId}`;
    navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
  };

  const handleRegister = () => {
    const returnUrl = `/scan-pay/${sessionId}`;
    navigate(`/register?redirect=${encodeURIComponent(returnUrl)}`);
  };

  // Loading state
  if (step === 'loading' || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-600 to-purple-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading payment...</p>
        </div>
      </div>
    );
  }

  // Expired state
  if (step === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-500 to-red-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Payment Expired</h1>
          <p className="text-gray-600 mb-6">This payment session has expired. Please ask for a new payment link.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Already paid state
  if (step === 'already_paid') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-500 to-emerald-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Already Paid</h1>
          <p className="text-gray-600 mb-6">This payment has already been completed.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-500 to-red-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Payment Error</h1>
          <p className="text-gray-600 mb-6">{error || 'Something went wrong'}</p>
          <div className="space-y-3">
            <button
              onClick={() => loadSession()}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success state - auto redirect to merchant's successUrl or my.peeap.com dashboard
  if (step === 'success') {
    // Auto redirect after 3 seconds
    setTimeout(() => {
      if (session?.successUrl) {
        // Redirect to merchant's success URL with payment info
        const url = new URL(session.successUrl);
        url.searchParams.set('status', 'success');
        url.searchParams.set('peeap_status', 'success');
        url.searchParams.set('session_id', session.externalId || sessionId || '');
        url.searchParams.set('amount', String(session.amount));
        url.searchParams.set('currency', session.currencyCode);
        url.searchParams.set('payment_method', 'scan_to_pay');
        window.location.href = url.toString();
      } else {
        // No success URL - redirect to my.peeap.com dashboard
        window.location.href = 'https://my.peeap.com/dashboard';
      }
    }, 3000);

    return (
      <div className="min-h-screen bg-gradient-to-b from-green-500 to-emerald-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          {session && (
            <p className="text-3xl font-bold text-green-600 mb-2">
              {formatAmount(session.amount, session.currencyCode)}
            </p>
          )}
          {session?.merchantName && (
            <p className="text-gray-500 mb-4">Paid to {session.merchantName}</p>
          )}
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{session?.successUrl ? 'Redirecting to merchant...' : 'Redirecting to dashboard...'}</span>
          </div>
        </div>
      </div>
    );
  }

  // Processing state
  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-600 to-purple-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Processing Payment</h1>
          <p className="text-gray-500">Please wait...</p>
        </div>
      </div>
    );
  }

  // PIN Entry step
  if (step === 'pin' && session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-600 to-purple-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
          {/* Header */}
          <div className="bg-indigo-600 text-white p-6">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setStep('confirm')}
                className="p-2 hover:bg-white/10 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold">Enter PIN</h1>
            </div>
            <div className="text-center">
              <p className="text-indigo-200 text-sm mb-1">Confirm payment of</p>
              <p className="text-3xl font-bold">
                {formatAmount(session.amount, session.currencyCode)}
              </p>
              {session.merchantName && (
                <p className="text-indigo-200 text-sm mt-1">to {session.merchantName}</p>
              )}
            </div>
          </div>

          {/* PIN Input */}
          <div className="p-6">
            <div className="text-center mb-6">
              <Lock className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
              <p className="text-gray-600">Enter your 4-digit PIN to authorize this payment</p>
            </div>

            {pinError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {pinError}
              </div>
            )}

            <div className="relative mb-6">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').substring(0, 4);
                  setPin(value);
                  setPinError(null);
                }}
                placeholder="••••"
                className="w-full py-4 px-6 text-center text-3xl font-mono tracking-[1em] border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                maxLength={4}
                autoFocus
                inputMode="numeric"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <button
              onClick={handlePayment}
              disabled={pin.length !== 4}
              className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-6 h-6" />
              Confirm Payment
            </button>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
              <Shield className="w-4 h-4" />
              <span>Your PIN is encrypted and secure</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Login prompt
  if (step === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-600 to-purple-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
          {/* Header */}
          <div className="bg-indigo-600 text-white p-6 text-center">
            <Smartphone className="w-12 h-12 mx-auto mb-3" />
            <h1 className="text-xl font-bold">Scan to Pay</h1>
            <p className="text-indigo-200 text-sm">Complete this payment with your Peeap account</p>
          </div>

          {/* Payment Details */}
          {session && (
            <div className="p-6 border-b border-gray-100">
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Amount to pay</p>
                <p className="text-4xl font-bold text-gray-900">
                  {formatAmount(session.amount, session.currencyCode)}
                </p>
                {session.merchantName && (
                  <p className="text-gray-600 mt-2">to {session.merchantName}</p>
                )}
                {session.description && (
                  <p className="text-sm text-gray-500 mt-1">{session.description}</p>
                )}
              </div>
            </div>
          )}

          {/* Login/Register Buttons */}
          <div className="p-6 space-y-3">
            <button
              onClick={handleLogin}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-indigo-700"
            >
              <LogIn className="w-5 h-5" />
              Sign In to Pay
            </button>
            <button
              onClick={handleRegister}
              className="w-full py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-200"
            >
              <User className="w-5 h-5" />
              Create Account
            </button>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
              <Shield className="w-4 h-4" />
              <span>Secured by Peeap</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Confirm payment (logged in)
  if (step === 'confirm' && session) {
    const insufficientBalance = walletBalance < session.amount;

    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-600 to-purple-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
          {/* Header */}
          <div className="bg-indigo-600 text-white p-6">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-white/10 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold">Confirm Payment</h1>
            </div>
            <div className="text-center">
              <p className="text-indigo-200 text-sm mb-1">You're paying</p>
              <p className="text-4xl font-bold">
                {formatAmount(session.amount, session.currencyCode)}
              </p>
            </div>
          </div>

          {/* Merchant Info */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              {session.merchantLogoUrl ? (
                <img
                  src={session.merchantLogoUrl}
                  alt={session.merchantName}
                  className="w-14 h-14 rounded-xl object-cover"
                />
              ) : (
                <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <User className="w-7 h-7 text-indigo-600" />
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Paying to</p>
                <p className="font-bold text-gray-900">{session.merchantName || 'Merchant'}</p>
                {session.description && (
                  <p className="text-sm text-gray-500">{session.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Your Wallet */}
          <div className="p-4 bg-blue-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-700">Your wallet balance</span>
            </div>
            <span className={`font-bold ${insufficientBalance ? 'text-red-600' : 'text-blue-700'}`}>
              {formatAmount(walletBalance, session.currencyCode)}
            </span>
          </div>

          {/* Insufficient balance warning */}
          {insufficientBalance && (
            <div className="p-4 bg-red-50 flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">Insufficient balance. Please top up your wallet first.</span>
            </div>
          )}

          {/* Pay Button */}
          <div className="p-6">
            <button
              onClick={handleProceedToPin}
              disabled={insufficientBalance}
              className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Lock className="w-6 h-6" />
              Continue to Pay
            </button>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
              <Shield className="w-4 h-4" />
              <span>Your payment is secure</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
