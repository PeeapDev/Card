/**
 * Checkout Page
 *
 * Public checkout page for payment processing.
 * URL format: /checkout/:paymentId?amount=50000&currency=SLE
 *
 * Features:
 * - QR code display with embedded amount for scanning (no login needed if scanning)
 * - Payment method selection via radio buttons (QR Scan, Orange Money)
 * - Orange Money flow with login/register prompt
 * - Auto-trigger Monime checkout after login
 * - Success page with "Access My Transactions" button
 */

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Smartphone,
  QrCode,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Shield,
  LogIn,
  UserPlus,
  ArrowLeft,
  ExternalLink,
  DollarSign,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { BrandedQRCode } from '@/components/ui/BrandedQRCode';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { monimeService, toMinorUnits } from '@/services/monime.service';

// Types
interface PaymentDetails {
  id: string;
  amount: number;
  currency: string;
  description?: string;
  merchantName?: string;
  merchantId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
}

type CheckoutStep =
  | 'loading'
  | 'select_method'
  | 'login_prompt'
  | 'processing'
  | 'success'
  | 'error';

type PaymentMethod = 'qr_scan' | 'orange_money';

// Currency definitions
const CURRENCIES: Record<string, { symbol: string; name: string; decimals: number }> = {
  SLE: { symbol: 'Le', name: 'Sierra Leonean Leone', decimals: 2 },
  USD: { symbol: '$', name: 'US Dollar', decimals: 2 },
  EUR: { symbol: '€', name: 'Euro', decimals: 2 },
  GBP: { symbol: '£', name: 'British Pound', decimals: 2 },
  NGN: { symbol: '₦', name: 'Nigerian Naira', decimals: 2 },
  GHS: { symbol: '₵', name: 'Ghanaian Cedi', decimals: 2 },
};

export function CheckoutPage() {
  const { id: paymentId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, login, register, isLoading: authLoading } = useAuth();

  // URL params
  const urlAmount = searchParams.get('amount');
  const urlCurrency = searchParams.get('currency') || 'SLE';
  const urlDescription = searchParams.get('description');
  const urlMerchant = searchParams.get('merchant');

  // State
  const [step, setStep] = useState<CheckoutStep>('loading');
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [monimeReference, setMonimeReference] = useState<string | null>(null);

  // Login form state
  const [loginMode, setLoginMode] = useState<'login' | 'register'>('login');
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Parse amount from URL
  const amount = urlAmount ? parseFloat(urlAmount) : 0;
  const currency = urlCurrency;

  // Format amount with currency
  const formatAmount = (amt: number): string => {
    const curr = CURRENCIES[currency] || CURRENCIES.SLE;
    return `${curr.symbol} ${amt.toLocaleString(undefined, {
      minimumFractionDigits: curr.decimals,
      maximumFractionDigits: curr.decimals,
    })}`;
  };

  // Smart redirect URL for QR code - handles app detection and download
  // When scanned with phone camera, this URL will:
  // 1. Try to open the Peeap app if installed
  // 2. Redirect to app store if not installed
  // 3. After install, app opens with payment context (deferred deep link)
  const getAppPaymentUrl = (): string => {
    const params = new URLSearchParams();
    params.set('amount', amount.toString());
    params.set('currency', currency);
    if (urlDescription) params.set('description', urlDescription);
    if (urlMerchant) params.set('merchant', urlMerchant);
    return `${window.location.origin}/app/pay/${paymentId}?${params.toString()}`;
  };

  // Direct deep link for mobile app (used when app is confirmed installed)
  const deepLink = `peeappay://checkout/${paymentId}?amount=${amount}&currency=${currency}`;

  // QR code URL - uses smart redirect for camera scans
  const qrCodeUrl = getAppPaymentUrl();

  // Initialize checkout
  useEffect(() => {
    initializeCheckout();
  }, [paymentId, urlAmount]);

  // Auto-trigger Monime payment when user logs in and Orange Money is selected
  useEffect(() => {
    if (isAuthenticated && user && selectedMethod === 'orange_money' && step === 'login_prompt') {
      triggerMonimePayment();
    }
  }, [isAuthenticated, user, selectedMethod, step]);

  const initializeCheckout = async () => {
    if (!paymentId || !urlAmount || parseFloat(urlAmount) <= 0) {
      setError('Invalid payment details. Please check the URL.');
      setStep('error');
      return;
    }

    // Create payment details from URL params
    setPaymentDetails({
      id: paymentId,
      amount: parseFloat(urlAmount),
      currency: urlCurrency,
      description: urlDescription || undefined,
      merchantName: urlMerchant || 'Merchant',
      status: 'pending',
    });

    setStep('select_method');
  };

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
  };

  const handleContinue = () => {
    if (!selectedMethod) return;

    if (selectedMethod === 'qr_scan') {
      // QR scan - no action needed, user scans with phone
      // The scanning device handles the payment flow
      return;
    }

    if (selectedMethod === 'orange_money') {
      if (isAuthenticated) {
        // User already logged in, trigger Monime payment directly
        triggerMonimePayment();
      } else {
        // Show login/register prompt
        setStep('login_prompt');
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      // LoginRequest uses 'email' field for both phone and email login
      await login({ email: phoneOrEmail, password });
      // The useEffect will trigger Monime payment after login
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      await register({
        email,
        phone,
        password,
        firstName,
        lastName,
      });
      // The useEffect will trigger Monime payment after registration
    } catch (err: any) {
      setLoginError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const triggerMonimePayment = async () => {
    if (!user || !paymentDetails) return;

    setStep('processing');
    setError(null);

    try {
      // Get user's wallet
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user.id)
        .eq('wallet_type', 'primary')
        .single();

      if (walletError) {
        console.error('Wallet fetch error:', walletError);
        throw new Error(`Failed to get wallet: ${walletError.message}`);
      }

      if (!wallet) {
        throw new Error('No wallet found. Please contact support.');
      }


      // Initiate Monime deposit/payment
      const response = await monimeService.initiateDeposit({
        walletId: wallet.id,
        amount: toMinorUnits(paymentDetails.amount),
        currency: paymentDetails.currency,
        method: 'CHECKOUT_SESSION',
        successUrl: `${window.location.origin}/checkout/${paymentId}?amount=${amount}&currency=${currency}&status=success`,
        cancelUrl: `${window.location.origin}/checkout/${paymentId}?amount=${amount}&currency=${currency}&status=cancelled`,
        description: paymentDetails.description || `Payment ${paymentId}`,
      });


      setTransactionId(response.id);
      setMonimeReference(response.monimeReference);

      // Open Monime checkout
      if (response.paymentUrl) {
        monimeService.openCheckout(response.paymentUrl, { target: '_self' });
      } else {
        throw new Error('No payment URL received from Monime');
      }
    } catch (err: any) {
      console.error('Monime payment error:', err);
      // Show more detailed error message
      let errorMessage = 'Payment initiation failed. ';
      if (err.message?.includes('Internal Server Error')) {
        errorMessage += 'The payment service is temporarily unavailable. Please try again later or contact support.';
      } else {
        errorMessage += err.message || 'Please try again.';
      }
      setError(errorMessage);
      setStep('error');
    }
  };

  // Check for payment status from URL (after redirect from Monime)
  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'success') {
      setStep('success');
    } else if (status === 'cancelled') {
      setError('Payment was cancelled.');
      setStep('error');
    }
  }, [searchParams]);

  // Loading state
  if (step === 'loading' || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p>Loading checkout...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Payment Error</h1>
          <p className="text-gray-600 mb-6">{error || 'Something went wrong'}</p>
          <div className="space-y-3">
            <button
              onClick={() => {
                setError(null);
                setStep('select_method');
              }}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
            >
              Go Home
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // Success state
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-2">
            You paid {formatAmount(amount)}
          </p>
          {transactionId && (
            <p className="text-xs text-gray-400 mb-6 font-mono">
              Reference: {monimeReference || transactionId}
            </p>
          )}

          <div className="space-y-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-5 h-5" />
              Access My Transactions
            </button>
            <p className="text-sm text-gray-500">
              View your transaction history in the Peeap dashboard
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Processing state
  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-indigo-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Processing Payment</h1>
          <p className="text-gray-600">Redirecting to payment gateway...</p>
          <p className="text-xs text-gray-400 mt-4">Please do not close this window</p>
        </Card>
      </div>
    );
  }

  // Login/Register prompt for Orange Money
  if (step === 'login_prompt') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep('select_method')}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <p className="font-semibold text-gray-900">Orange Money Payment</p>
                  <p className="text-sm text-gray-500">Sign in to complete payment</p>
                </div>
              </div>
            </div>

            {/* Amount Display */}
            <div className="p-6 text-center bg-gray-50 border-b border-gray-100">
              <p className="text-sm text-gray-500">Amount to pay</p>
              <p className="text-3xl font-bold text-gray-900">{formatAmount(amount)}</p>
            </div>

            {/* Login/Register Toggle */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setLoginMode('login')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    loginMode === 'login'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setLoginMode('register')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    loginMode === 'register'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Create Account
                </button>
              </div>
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {loginError}
              </div>
            )}

            {/* Login Form */}
            {loginMode === 'login' && (
              <form onSubmit={handleLogin} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number or Email
                  </label>
                  <input
                    type="text"
                    value={phoneOrEmail}
                    onChange={(e) => setPhoneOrEmail(e.target.value)}
                    placeholder="+232 76 123456 or email@example.com"
                    className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-indigo-700 flex items-center justify-center gap-2"
                >
                  {loginLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      Sign In & Pay {formatAmount(amount)}
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Register Form */}
            {loginMode === 'register' && (
              <form onSubmit={handleRegister} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+232 76 123456"
                    className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-indigo-700 flex items-center justify-center gap-2"
                >
                  {loginLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Create Account & Pay {formatAmount(amount)}
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Security Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center justify-center gap-2 text-gray-500">
                <Shield className="w-4 h-4" />
                <span className="text-xs">Secured by Peeap</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Main checkout page - Payment method selection
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b border-gray-100 p-6 text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
            {paymentDetails?.merchantName && (
              <p className="text-sm text-gray-500">{paymentDetails.merchantName}</p>
            )}
          </div>

          {/* Amount Display */}
          <div className="p-6 text-center bg-gray-50 border-b border-gray-100">
            <p className="text-sm text-gray-500">Amount to pay</p>
            <p className="text-4xl font-bold text-gray-900">{formatAmount(amount)}</p>
            {paymentDetails?.description && (
              <p className="text-sm text-gray-500 mt-2">{paymentDetails.description}</p>
            )}
          </div>

          {/* QR Code Section */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-center gap-2 mb-4">
              <QrCode className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Scan to Pay with Peeap App</span>
            </div>
            <div className="bg-white p-4 rounded-xl inline-block shadow-sm border mx-auto block text-center">
              <div className="flex justify-center">
                <BrandedQRCode value={qrCodeUrl} size={180} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              Already logged in on your phone? Just scan to complete payment instantly
            </p>
          </div>

          {/* Divider */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-sm text-gray-500">or choose a payment method</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>

            <div className="space-y-3">
              {/* QR Scan Option */}
              <label
                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedMethod === 'qr_scan'
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value="qr_scan"
                  checked={selectedMethod === 'qr_scan'}
                  onChange={() => handleMethodSelect('qr_scan')}
                  className="sr-only"
                />
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedMethod === 'qr_scan'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <QrCode className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Scan QR Code</p>
                  <p className="text-sm text-gray-500">Use Peeap app to scan and pay</p>
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedMethod === 'qr_scan'
                      ? 'border-indigo-600 bg-indigo-600'
                      : 'border-gray-300'
                  }`}
                >
                  {selectedMethod === 'qr_scan' && (
                    <CheckCircle className="w-4 h-4 text-white" />
                  )}
                </div>
              </label>

              {/* Orange Money Option */}
              <label
                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedMethod === 'orange_money'
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value="orange_money"
                  checked={selectedMethod === 'orange_money'}
                  onChange={() => handleMethodSelect('orange_money')}
                  className="sr-only"
                />
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedMethod === 'orange_money'
                      ? 'bg-orange-500 text-white'
                      : 'bg-orange-100 text-orange-600'
                  }`}
                >
                  <Smartphone className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Orange Money</p>
                  <p className="text-sm text-gray-500">Pay with your mobile money account</p>
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedMethod === 'orange_money'
                      ? 'border-indigo-600 bg-indigo-600'
                      : 'border-gray-300'
                  }`}
                >
                  {selectedMethod === 'orange_money' && (
                    <CheckCircle className="w-4 h-4 text-white" />
                  )}
                </div>
              </label>
            </div>

            {/* Continue Button */}
            {selectedMethod === 'orange_money' && (
              <button
                onClick={handleContinue}
                className="w-full mt-6 py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
              >
                Continue with Orange Money
              </button>
            )}

            {selectedMethod === 'qr_scan' && (
              <div className="mt-6 p-4 bg-blue-50 rounded-xl text-center">
                <p className="text-sm text-blue-700">
                  Scan the QR code above with your Peeap app to complete the payment.
                  No additional steps needed if you're already logged in.
                </p>
              </div>
            )}
          </div>

          {/* Security Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <Shield className="w-4 h-4" />
              <span className="text-xs">Secured by Peeap</span>
            </div>
          </div>
        </Card>

        {/* Powered by */}
        <div className="text-center mt-4">
          <a
            href="https://peeap.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/70 hover:text-white"
          >
            Powered by Peeap
          </a>
        </div>
      </div>
    </div>
  );
}
