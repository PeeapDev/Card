/**
 * Secure NFC Payment Page
 *
 * Production-grade payment page with:
 * - Cryptographic token validation
 * - PIN verification for high-value transactions
 * - Fraud prevention
 * - Complete audit trail
 *
 * URL format: /pay/nfc/:shortCode
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Wifi,
  User,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Shield,
  Smartphone,
  QrCode,
  LogIn,
  Copy,
  CreditCard,
  Send,
  Lock,
  Clock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useWallets } from '@/hooks/useWallets';
import {
  useValidatePaymentLink,
  useGeneratePaymentToken,
  useProcessNFCPayment,
} from '@/hooks/useNFCPayments';
import { currencyService, Currency } from '@/services/currency.service';
import { clsx } from 'clsx';

type PaymentStep = 'loading' | 'checkout' | 'confirm' | 'pin' | 'processing' | 'success' | 'error';

export function NFCPaymentPage() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { data: wallets } = useWallets();

  // State
  const [step, setStep] = useState<PaymentStep>('loading');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [tokenExpiry, setTokenExpiry] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [currentToken, setCurrentToken] = useState<string | null>(null);

  // Currency
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  // Hooks
  const { data: linkValidation, isLoading: validating, error: validationError } = useValidatePaymentLink(shortCode || '');
  const generateToken = useGeneratePaymentToken();
  const processPayment = useProcessNFCPayment();

  // Get primary wallet (use first wallet as default)
  const primaryWallet = wallets?.[0];

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (!validating && linkValidation !== undefined) {
      if (!linkValidation?.valid) {
        setError('Invalid or inactive payment link');
        setStep('error');
      } else {
        setStep('checkout');
      }
    }
    if (validationError) {
      setError('Failed to load payment information');
      setStep('error');
    }
  }, [linkValidation, validating, validationError]);

  // Token expiry countdown
  useEffect(() => {
    if (!tokenExpiry) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.max(0, Math.floor((tokenExpiry.getTime() - now.getTime()) / 1000));
      setTimeLeft(diff);

      if (diff === 0) {
        setCurrentToken(null);
        setTokenExpiry(null);
        if (step === 'confirm' || step === 'pin') {
          setError('Payment session expired. Please try again.');
          setStep('checkout');
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [tokenExpiry, step]);

  const currencySymbol = defaultCurrency?.symbol || 'SLE';
  const numAmount = parseFloat(amount) || 0;
  const fee = numAmount > 0 ? Math.max(numAmount * 0.01, 0.10) : 0;
  const paymentUrl = window.location.href;
  const deepLink = `peeappay://pay/nfc/${shortCode}`;

  const formatCurrency = (amt: number): string => {
    return `${currencySymbol} ${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProceedToConfirm = async () => {
    if (numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (numAmount > (linkValidation?.single_limit || 1000)) {
      setError(`Amount exceeds the limit of ${formatCurrency(linkValidation?.single_limit || 1000)}`);
      return;
    }

    if (!isAuthenticated) {
      // Redirect to login
      const currentUrl = window.location.pathname + window.location.search;
      navigate(`/login?redirect=${encodeURIComponent(currentUrl)}&amount=${amount}`);
      return;
    }

    // Generate a secure payment token
    try {
      setError(null);
      const tokenResult = await generateToken.mutateAsync({
        short_code: shortCode!,
        amount: numAmount,
        expiry_minutes: 5,
      });

      setCurrentToken(tokenResult.token);
      setTokenExpiry(new Date(tokenResult.expires_at));

      // Check if PIN is required
      if (linkValidation?.requires_pin_above && numAmount >= linkValidation.requires_pin_above) {
        setStep('pin');
      } else {
        setStep('confirm');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize payment');
    }
  };

  const handleProcessPayment = async (paymentPin?: string) => {
    if (!currentToken || !primaryWallet) {
      setError('Payment session invalid. Please try again.');
      setStep('checkout');
      return;
    }

    if (primaryWallet.balance < numAmount) {
      setError('Insufficient balance');
      return;
    }

    setStep('processing');
    setError(null);

    try {
      const result = await processPayment.mutateAsync({
        token: currentToken,
        amount: numAmount,
        wallet_id: primaryWallet.id,
        pin: paymentPin,
      });

      setTransactionId(result.transaction_id);
      setStep('success');
    } catch (err: any) {
      if (err.code === 'INVALID_PIN') {
        setError('Incorrect PIN. Please try again.');
        setStep('pin');
      } else if (err.code === 'PIN_REQUIRED') {
        setStep('pin');
      } else if (err.code === 'TOKEN_EXPIRED') {
        setError('Payment session expired. Please try again.');
        setCurrentToken(null);
        setStep('checkout');
      } else {
        setError(err.message || 'Payment failed');
        setStep('error');
      }
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(paymentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Loading state
  if (step === 'loading' || validating) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-600 to-purple-800 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-10 h-10" />
          </div>
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Verifying payment link...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-600 to-purple-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Payment Error</h1>
          <p className="text-gray-600 mb-6">{error || 'Something went wrong'}</p>
          <div className="space-y-3">
            <Button onClick={() => { setError(null); setStep('checkout'); }} className="w-full">
              Try Again
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="w-full">
              Go Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Success state
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-600 to-emerald-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-2">
            You sent {formatCurrency(numAmount)} to {linkValidation?.recipient_name}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Fee: {formatCurrency(fee)}
          </p>
          {transactionId && (
            <div className="bg-gray-50 rounded-lg p-3 mb-6">
              <p className="text-xs text-gray-400">Transaction ID</p>
              <p className="text-sm font-mono text-gray-600 break-all">{transactionId}</p>
            </div>
          )}
          <Button onClick={() => navigate('/dashboard')} className="w-full">
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  // Processing state
  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-600 to-purple-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Processing Payment</h1>
          <p className="text-gray-600">Verifying and completing your payment...</p>
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-indigo-600">
            <Shield className="w-4 h-4" />
            <span>Secured by cryptographic verification</span>
          </div>
        </Card>
      </div>
    );
  }

  // PIN entry state
  if (step === 'pin') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-600 to-purple-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 text-center">
            <Lock className="w-12 h-12 mx-auto mb-3" />
            <h1 className="text-xl font-bold">PIN Required</h1>
            <p className="text-indigo-200 text-sm">
              Enter PIN to complete payment of {formatCurrency(numAmount)}
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Timer */}
            {timeLeft > 0 && (
              <div className={clsx(
                'flex items-center justify-center gap-2 p-2 rounded-lg text-sm',
                timeLeft < 60 ? 'bg-red-50 text-red-700' : 'bg-indigo-50 text-indigo-700'
              )}>
                <Clock className="w-4 h-4" />
                Session expires in {formatTime(timeLeft)}
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter 6-digit PIN
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="------"
                  className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-center text-2xl tracking-widest font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  maxLength={6}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setPin('');
                  setStep('checkout');
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => handleProcessPayment(pin)}
                disabled={pin.length !== 6}
              >
                Verify & Pay
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Confirm payment (logged in user)
  if (step === 'confirm' && isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-600 to-purple-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold">Confirm Payment</h1>
          </div>

          <div className="p-6 space-y-4">
            {/* Timer */}
            {timeLeft > 0 && (
              <div className={clsx(
                'flex items-center justify-center gap-2 p-2 rounded-lg text-sm',
                timeLeft < 60 ? 'bg-red-50 text-red-700' : 'bg-indigo-50 text-indigo-700'
              )}>
                <Clock className="w-4 h-4" />
                Complete within {formatTime(timeLeft)}
              </div>
            )}

            {/* Recipient */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Paying to</p>
                <p className="font-semibold text-gray-900">{linkValidation?.recipient_name}</p>
              </div>
            </div>

            {/* Amount */}
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-gray-900">{formatCurrency(numAmount)}</p>
              <p className="text-sm text-gray-500 mt-1">Fee: {formatCurrency(fee)}</p>
            </div>

            {/* Balance */}
            <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
              <span className="text-sm text-indigo-700">Your balance</span>
              <span className="font-semibold text-indigo-700">
                {formatCurrency(primaryWallet?.balance || 0)}
              </span>
            </div>

            {numAmount > (primaryWallet?.balance || 0) && (
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">Insufficient balance</span>
              </div>
            )}

            {/* Security notice */}
            <div className="flex items-center gap-2 text-sm text-gray-500 justify-center">
              <Shield className="w-4 h-4" />
              <span>Cryptographically secured payment</span>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setCurrentToken(null);
                  setStep('checkout');
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600"
                onClick={() => handleProcessPayment()}
                disabled={numAmount > (primaryWallet?.balance || 0)}
              >
                <Send className="w-4 h-4 mr-2" />
                Pay Now
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Public Checkout Page (default)
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-600 to-purple-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wifi className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold">NFC Payment</h1>
            <p className="text-indigo-200 text-sm">Secure Tap-to-Pay</p>
          </div>

          {/* Recipient Info */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center">
                <User className="w-7 h-7 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pay to</p>
                <p className="font-bold text-gray-900 text-lg">{linkValidation?.recipient_name}</p>
                <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                  <Shield className="w-3 h-3" />
                  <span>Verified recipient</span>
                </div>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-6 mt-4 flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Amount Input */}
          <div className="p-6 border-b border-gray-100 bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
              Enter Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-xl">
                {currencySymbol}
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError(null);
                }}
                placeholder="0.00"
                className="w-full pl-16 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-2xl font-bold text-center"
              />
            </div>
            {linkValidation?.single_limit && (
              <p className="text-xs text-gray-500 text-center mt-2">
                Maximum: {formatCurrency(linkValidation.single_limit)}
              </p>
            )}

            {/* Quick amounts */}
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {[10, 25, 50, 100, 200].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setAmount(String(amt))}
                  className={clsx(
                    'px-4 py-2 text-sm rounded-lg border transition-colors',
                    amount === String(amt)
                      ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {currencySymbol}{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-6 space-y-3">
            {isAuthenticated ? (
              <Button
                onClick={handleProceedToConfirm}
                disabled={numAmount <= 0}
                isLoading={generateToken.isPending}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600"
              >
                <Send className="w-5 h-5 mr-2" />
                Continue to Pay
              </Button>
            ) : (
              <>
                {isMobile && (
                  <Button
                    onClick={() => window.location.href = deepLink}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600"
                  >
                    <Smartphone className="w-5 h-5 mr-2" />
                    Open in App
                  </Button>
                )}
                <Button
                  onClick={handleProceedToConfirm}
                  variant={isMobile ? 'outline' : 'primary'}
                  className={!isMobile ? 'w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600' : 'w-full'}
                  disabled={numAmount <= 0}
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Sign In to Pay
                </Button>
              </>
            )}

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-200"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy Payment Link
                </>
              )}
            </button>
          </div>

          {/* Security Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <Shield className="w-4 h-4" />
              <span className="text-xs">Bank-grade security with cryptographic verification</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default NFCPaymentPage;
