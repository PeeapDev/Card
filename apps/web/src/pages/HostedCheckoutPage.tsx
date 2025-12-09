/**
 * Hosted Checkout Page
 *
 * Universal checkout page for developers/merchants similar to Stripe/PayPal
 * URL format: /checkout/pay/:sessionId
 *
 * Features:
 * - Loads checkout session from API
 * - Merchant branding (logo, colors, name)
 * - Three payment methods: QR Code, Card, Mobile Money
 * - Dynamic QR code generation
 * - PEEAP Card payment processing
 * - Login/Register flow for mobile payments with Monime
 * - Success/cancel redirects
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import {
  Smartphone,
  QrCode,
  CreditCard,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Shield,
  LogIn,
  UserPlus,
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { cardService } from '@/services/card.service';

// Types
interface CheckoutSession {
  id: string;
  externalId: string;
  merchantId: string;
  status: 'OPEN' | 'COMPLETE' | 'EXPIRED' | 'CANCELLED';
  amount: number;
  currencyCode: string;
  description?: string;
  merchantName?: string;
  merchantLogoUrl?: string;
  brandColor?: string;
  paymentMethods: {
    qr?: boolean;
    card?: boolean;
    mobile?: boolean;
  };
  successUrl?: string;
  cancelUrl?: string;
  expiresAt: string;
  createdAt: string;
  isTestMode?: boolean; // True when using test key (pk_test_xxx)
}

type PaymentMethod = 'qr' | 'card' | 'mobile';
type CheckoutStep =
  | 'loading'
  | 'select_method'
  | 'qr_display'
  | 'card_form'
  | 'login_prompt'
  | 'processing'
  | 'success'
  | 'error'
  | 'expired';

// Currency definitions - SLE uses 2 decimals after redenomination (Old Le 1,000 = New Le 1.00)
const CURRENCIES: Record<string, { symbol: string; name: string; decimals: number }> = {
  SLE: { symbol: 'Le', name: 'Sierra Leonean New Leone', decimals: 2 },
  USD: { symbol: '$', name: 'US Dollar', decimals: 2 },
  EUR: { symbol: '€', name: 'Euro', decimals: 2 },
  GBP: { symbol: '£', name: 'British Pound', decimals: 2 },
  NGN: { symbol: '₦', name: 'Nigerian Naira', decimals: 2 },
  GHS: { symbol: '₵', name: 'Ghanaian Cedi', decimals: 2 },
};

export function HostedCheckoutPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, login, register, isLoading: authLoading } = useAuth();

  // State
  const [step, setStep] = useState<CheckoutStep>('loading');
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Card form state (similar to Visa/Mastercard checkout)
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardPin, setCardPin] = useState(''); // PIN instead of CVV
  const [showPin, setShowPin] = useState(false);

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

  const [paymentLoading, setPaymentLoading] = useState(false);

  // Format amount with currency
  const formatAmount = (amt: number, curr: string): string => {
    const currency = CURRENCIES[curr] || CURRENCIES.SLE;
    return `${currency.symbol} ${amt.toLocaleString(undefined, {
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals,
    })}`;
  };

  // State for retry message
  const [retryMessage, setRetryMessage] = useState<string | null>(null);

  // Handle Monime redirect with ?status=success or retry message
  useEffect(() => {
    const status = searchParams.get('status');
    const retry = searchParams.get('retry');
    const message = searchParams.get('message');

    if (status === 'success') {
      // Payment successful from Monime - complete the session
      completeSession();
    } else if (retry === 'true' && message) {
      // User cancelled payment - show message and let them try again
      setRetryMessage(decodeURIComponent(message));
      // Clear the URL params without reloading
      window.history.replaceState({}, '', `/checkout/pay/${sessionId}`);
    }

    // Also check for global message set by the HTML template
    const globalMessage = (window as any).__CHECKOUT_MESSAGE__;
    if (globalMessage) {
      setRetryMessage(globalMessage);
      delete (window as any).__CHECKOUT_MESSAGE__;
    }
  }, [searchParams, sessionId]);

  // Complete checkout session after successful payment
  const completeSession = async () => {
    if (!sessionId) return;
    
    setStep('processing');
    try {
      // Always use the production API URL for checkout
      const baseApiUrl = import.meta.env.VITE_API_URL || 'https://api.peeap.com';
      const apiUrl = baseApiUrl.endsWith('/api') ? baseApiUrl : `${baseApiUrl}/api`;
      const response = await fetch(`${apiUrl}/checkout/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: 'mobile_money' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to complete session');
      }

      // Load session to get success URL
      const sessionResponse = await fetch(`${apiUrl}/checkout/sessions/${sessionId}`);
      const sessionData = await sessionResponse.json();
      
      setSession({
        ...sessionData,
        successUrl: sessionData.success_url || sessionData.successUrl,
        merchantName: sessionData.merchant_name || sessionData.merchantName,
        amount: sessionData.amount,
        currencyCode: sessionData.currency_code || sessionData.currencyCode || 'SLE',
      });
      setStep('success');

      // Auto-redirect to merchant after 3 seconds
      if (sessionData.success_url || sessionData.successUrl) {
        setTimeout(() => {
          window.location.href = sessionData.success_url || sessionData.successUrl;
        }, 3000);
      }
    } catch (err: any) {
      console.error('Complete session error:', err);
      setError(err.message || 'Failed to complete payment');
      setStep('error');
    }
  };

  // Load checkout session
  useEffect(() => {
    // Don't load if we're handling a redirect
    if (!searchParams.get('status')) {
      loadSession();
    }
  }, [sessionId]);

  // Auto-trigger Monime when user logs in for mobile payment
  useEffect(() => {
    if (isAuthenticated && user && selectedMethod === 'mobile' && step === 'login_prompt') {
      triggerMonimePayment();
    }
  }, [isAuthenticated, user, selectedMethod, step]);

  const loadSession = async () => {
    if (!sessionId) {
      setError('Invalid checkout session');
      setStep('error');
      return;
    }

    try {
      // Call API to get session - ensure /api prefix is included
      const baseApiUrl = import.meta.env.VITE_API_URL || 'https://api.peeap.com';
      const apiUrl = baseApiUrl.endsWith('/api') ? baseApiUrl : `${baseApiUrl}/api`;
      const response = await fetch(`${apiUrl}/checkout/sessions/${sessionId}`);

      if (!response.ok) {
        throw new Error('Session not found');
      }

      const rawData = await response.json();
      
      // Transform snake_case to camelCase
      // Check if test mode from metadata
      const metadata = rawData.metadata || {};
      const isTestMode = metadata.isTestMode === true;

      const data: CheckoutSession = {
        id: rawData.id,
        externalId: rawData.external_id || rawData.externalId,
        merchantId: rawData.merchant_id || rawData.merchantId,
        amount: rawData.amount,
        currencyCode: rawData.currency_code || rawData.currencyCode || 'SLE',
        description: rawData.description,
        status: rawData.status,
        expiresAt: rawData.expires_at || rawData.expiresAt,
        createdAt: rawData.created_at || rawData.createdAt,
        merchantName: rawData.merchant_name || rawData.merchantName,
        merchantLogoUrl: rawData.merchant_logo_url || rawData.merchantLogoUrl,
        brandColor: rawData.brand_color || rawData.brandColor || '#4F46E5',
        successUrl: rawData.success_url || rawData.successUrl,
        cancelUrl: rawData.cancel_url || rawData.cancelUrl,
        paymentMethods: (rawData.payment_methods && typeof rawData.payment_methods === 'object')
          ? rawData.payment_methods
          : (rawData.paymentMethods && typeof rawData.paymentMethods === 'object')
            ? rawData.paymentMethods
            : { qr: true, card: true, mobile: true },
        isTestMode: isTestMode,
      };

      // Check if expired
      if (new Date(data.expiresAt) < new Date()) {
        setSession(data);
        setStep('expired');
        return;
      }

      // Check if already completed
      if (data.status === 'COMPLETE') {
        setError('This checkout session has already been completed');
        setStep('error');
        return;
      }

      if (data.status === 'CANCELLED') {
        setError('This checkout session was cancelled');
        setStep('error');
        return;
      }

      setSession(data);
      setStep('select_method');
    } catch (err: any) {
      console.error('Failed to load session:', err);
      setError(err.message || 'Failed to load checkout session');
      setStep('error');
    }
  };

  const handleMethodSelect = async (method: PaymentMethod) => {
    setSelectedMethod(method);

    if (method === 'qr') {
      setStep('qr_display');
    } else if (method === 'card') {
      setStep('card_form');
    } else if (method === 'mobile') {
      // For mobile money, user must login first to use Monime
      if (isAuthenticated && user) {
        // Already logged in - trigger Monime payment immediately
        triggerMonimePayment();
      } else {
        // Show login/register form
        setStep('login_prompt');
      }
    }
  };

  const handleBackToMethods = () => {
    setSelectedMethod(null);
    setStep('select_method');
    setError(null);
    // Reset card form state
    setCardNumber('');
    setCardholderName('');
    setCardExpiry('');
    setCardPin('');
    setShowPin(false);
  };

  // QR Code URL - contains sessionId for payment
  const getQRCodeData = (): string => {
    return `${window.location.origin}/pay/${sessionId}`;
  };

  // Card payment - Single form like Visa/Mastercard checkout
  const handleCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    setPaymentLoading(true);
    setError(null);

    try {
      // Step 1: Look up the card by number
      const cardResult = await cardService.lookupCardForPayment(cardNumber);

      if (!cardResult) {
        throw new Error('Card not found. Please check your card number and try again.');
      }

      // Step 2: Validate cardholder name (case-insensitive partial match)
      const enteredName = cardholderName.trim().toLowerCase();
      const actualName = cardResult.cardholderName.toLowerCase();
      if (!actualName.includes(enteredName) && !enteredName.includes(actualName.split(' ')[0])) {
        throw new Error('Cardholder name does not match card records.');
      }

      // Step 3: Validate expiry date
      const [expiryMonth, expiryYear] = cardExpiry.split('/').map(s => parseInt(s.trim(), 10));
      if (!expiryMonth || !expiryYear || expiryMonth < 1 || expiryMonth > 12) {
        throw new Error('Invalid expiry date format. Use MM/YY.');
      }

      // Check if card is expired (compare with current date)
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear() % 100; // Get last 2 digits
      const currentMonth = currentDate.getMonth() + 1;

      if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
        throw new Error('This card has expired.');
      }

      // Step 4: Check wallet balance
      if (cardResult.walletBalance < session.amount) {
        throw new Error(`Insufficient funds. Available balance: ${formatAmount(cardResult.walletBalance, cardResult.currency)}`);
      }

      // Step 5: Process the payment via API (validates PIN server-side)
      const baseApiUrl = import.meta.env.VITE_API_URL || 'https://api.peeap.com';
      const apiUrl = baseApiUrl.endsWith('/api') ? baseApiUrl : `${baseApiUrl}/api`;

      const response = await fetch(`${apiUrl}/checkout/sessions/${sessionId}/card-pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: cardResult.cardId,
          walletId: cardResult.walletId,
          pin: cardPin,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Payment failed');
      }

      const result = await response.json();

      if (result.status === 'COMPLETE' || result.success) {
        // Redirect to success URL if provided
        if (session.successUrl) {
          window.location.href = session.successUrl;
        } else {
          setStep('success');
        }
      } else {
        throw new Error('Payment was not successful');
      }
    } catch (err: any) {
      console.error('Card payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Format expiry MM/YY
  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
    }
    return cleaned;
  };

  // Mobile payment flow
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      await login({ email: phoneOrEmail, password });
      // useEffect will trigger Monime payment
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
      await register({ email, phone, password, firstName, lastName });
      // useEffect will trigger Monime payment
    } catch (err: any) {
      setLoginError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const triggerMonimePayment = async () => {
    if (!session) return;

    setStep('processing');
    setError(null);

    try {
      const baseApiUrl = import.meta.env.VITE_API_URL || 'https://api.peeap.com';
      const apiUrl = baseApiUrl.endsWith('/api') ? baseApiUrl : `${baseApiUrl}/api`;

      // Call backend to create Monime checkout session
      const response = await fetch(`${apiUrl}/checkout/sessions/${sessionId}/mobile-pay`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // Include user ID if available for tracking
          ...(user?.id ? { 'X-User-Id': user.id } : {}),
        },
        body: JSON.stringify({
          userId: user?.id,
          userEmail: user?.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment session');
      }

      // Redirect to Monime checkout page
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        throw new Error('No payment URL received from Monime');
      }
    } catch (err: any) {
      console.error('Mobile payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
      setStep('error');
    }
  };

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.substring(0, 19); // Max 16 digits + 3 spaces
  };

  // Brand color or default
  const brandColor = session?.brandColor || '#4F46E5';

  // Loading state
  if (step === 'loading' || authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: '#f8fafc' }}
      >
        <div className="text-center text-gray-600">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-indigo-600" />
          <p>Loading checkout...</p>
        </div>
      </div>
    );
  }

  // Expired state
  if (step === 'expired') {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: '#f8fafc' }}
      >
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Session Expired</h1>
          <p className="text-gray-600 mb-6">
            This checkout session has expired. Please contact the merchant to get a new payment link.
          </p>
          {session?.cancelUrl && (
            <button
              onClick={() => window.location.href = session.cancelUrl!}
              className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
            >
              Return to Merchant
            </button>
          )}
        </Card>
      </div>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: '#f8fafc' }}
      >
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Payment Error</h1>
          <p className="text-gray-600 mb-6">{error || 'Something went wrong'}</p>
          <div className="space-y-3">
            <button
              onClick={handleBackToMethods}
              className="w-full px-6 py-3 text-white rounded-xl font-medium hover:opacity-90"
              style={{ backgroundColor: brandColor }}
            >
              Try Again
            </button>
            {session?.cancelUrl && (
              <button
                onClick={() => window.location.href = session.cancelUrl!}
                className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
              >
                Cancel & Return to Merchant
              </button>
            )}
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
          {session && (
            <p className="text-gray-600 mb-2">
              You paid {formatAmount(session.amount, session.currencyCode)}
            </p>
          )}
          {session?.merchantName && (
            <p className="text-sm text-gray-500 mb-6">to {session.merchantName}</p>
          )}
          {session?.successUrl && (
            <button
              onClick={() => window.location.href = session.successUrl!}
              className="w-full py-4 text-white rounded-xl font-semibold hover:opacity-90"
              style={{ backgroundColor: brandColor }}
            >
              Return to {session.merchantName || 'Merchant'}
            </button>
          )}
        </Card>
      </div>
    );
  }

  // Processing state
  if (step === 'processing') {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: '#f8fafc' }}
      >
        <Card className="max-w-md w-full p-8 text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-indigo-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 rounded-full border-t-transparent animate-spin" style={{ borderColor: `${brandColor} transparent transparent transparent` }}></div>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Processing Payment</h1>
          <p className="text-gray-600">Please wait...</p>
          <p className="text-xs text-gray-400 mt-4">Do not close this window</p>
        </Card>
      </div>
    );
  }

  // Login/Register prompt for mobile payment
  if (step === 'login_prompt') {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: '#f8fafc' }}
      >
        <div className="max-w-md w-full">
          <Card className="overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBackToMethods}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex-1">
                  {session?.merchantLogoUrl && (
                    <img src={session.merchantLogoUrl} alt={session.merchantName} className="h-8 mb-1" />
                  )}
                  <p className="font-semibold text-gray-900">{session?.merchantName || 'Merchant'}</p>
                  <p className="text-sm text-gray-500">Sign in to complete payment</p>
                </div>
              </div>
            </div>

            {/* Amount Display */}
            {session && (
              <div className="p-6 text-center bg-gray-50 border-b border-gray-100">
                <p className="text-sm text-gray-500">Amount to pay</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatAmount(session.amount, session.currencyCode)}
                </p>
              </div>
            )}

            {/* Login/Register Toggle */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setLoginMode('login')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    loginMode === 'login'
                      ? 'bg-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  style={loginMode === 'login' ? { color: brandColor } : {}}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setLoginMode('register')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    loginMode === 'register'
                      ? 'bg-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  style={loginMode === 'register' ? { color: brandColor } : {}}
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
                    className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl focus:outline-none"
                    style={{ borderColor: `${brandColor}40` }}
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
                    className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl focus:outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-4 text-white rounded-xl font-semibold disabled:opacity-50 hover:opacity-90 flex items-center justify-center gap-2"
                  style={{ backgroundColor: brandColor }}
                >
                  {loginLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      Sign In & Pay {session && formatAmount(session.amount, session.currencyCode)}
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
                      className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl focus:outline-none"
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
                      className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl focus:outline-none"
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
                    className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl focus:outline-none"
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
                    className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl focus:outline-none"
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
                    className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl focus:outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-4 text-white rounded-xl font-semibold disabled:opacity-50 hover:opacity-90 flex items-center justify-center gap-2"
                  style={{ backgroundColor: brandColor }}
                >
                  {loginLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Create Account & Pay {session && formatAmount(session.amount, session.currencyCode)}
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

  // QR Display
  if (step === 'qr_display') {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: '#f8fafc' }}
      >
        <div className="max-w-md w-full">
          <Card className="overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBackToMethods}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex-1 text-center">
                  {session?.merchantLogoUrl && (
                    <img src={session.merchantLogoUrl} alt={session.merchantName} className="h-8 mx-auto mb-1" />
                  )}
                  <p className="font-semibold text-gray-900">{session?.merchantName || 'Merchant'}</p>
                </div>
              </div>
            </div>

            {/* Amount */}
            {session && (
              <div className="p-6 text-center bg-gray-50 border-b border-gray-100">
                <p className="text-sm text-gray-500">Amount to pay</p>
                <p className="text-4xl font-bold text-gray-900">
                  {formatAmount(session.amount, session.currencyCode)}
                </p>
                {session.description && (
                  <p className="text-sm text-gray-500 mt-2">{session.description}</p>
                )}
              </div>
            )}

            {/* QR Code */}
            <div className="p-8 text-center">
              <div className="bg-white p-6 rounded-xl inline-block shadow-md border-2" style={{ borderColor: `${brandColor}40` }}>
                <QRCode value={getQRCodeData()} size={200} level="M" />
              </div>
              <p className="text-sm text-gray-600 mt-4">
                Scan this QR code with your Peeap app to complete payment
              </p>
            </div>

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

  // Card Form - Similar to Visa/Mastercard checkout
  if (step === 'card_form') {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: '#f8fafc' }}
      >
        <div className="max-w-md w-full">
          <Card className="overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBackToMethods}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex-1">
                  {session?.merchantLogoUrl && (
                    <img src={session.merchantLogoUrl} alt={session.merchantName} className="h-8 mb-1" />
                  )}
                  <p className="font-semibold text-gray-900">{session?.merchantName || 'Merchant'}</p>
                  <p className="text-sm text-gray-500">Pay with Peeap Card</p>
                </div>
              </div>
            </div>

            {/* Amount */}
            {session && (
              <div className="p-6 text-center bg-gray-50 border-b border-gray-100">
                <p className="text-sm text-gray-500">Amount to pay</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatAmount(session.amount, session.currencyCode)}
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Card Payment Form - Like Visa/Mastercard */}
            <form onSubmit={handleCardPayment} className="p-6 space-y-4">
              {/* Card Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Card Number
                </label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="1234 5678 9012 3456"
                  className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 font-mono text-lg tracking-wider"
                  maxLength={19}
                  required
                  autoFocus
                />
              </div>

              {/* Cardholder Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                  placeholder="JOHN DOE"
                  className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 uppercase"
                  required
                />
              </div>

              {/* Expiry Date and PIN (like Expiry + CVV) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    placeholder="MM/YY"
                    className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 font-mono text-center"
                    maxLength={5}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PIN
                  </label>
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      value={cardPin}
                      onChange={(e) => setCardPin(e.target.value.replace(/\D/g, '').substring(0, 4))}
                      placeholder="****"
                      className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 font-mono text-center tracking-widest"
                      maxLength={4}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={paymentLoading || cardNumber.replace(/\s/g, '').length < 16 || !cardholderName || cardExpiry.length < 5 || cardPin.length !== 4}
                className="w-full py-4 text-white rounded-xl font-semibold disabled:opacity-50 hover:opacity-90 flex items-center justify-center gap-2 mt-6"
                style={{ backgroundColor: brandColor }}
              >
                {paymentLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    Pay {session && formatAmount(session.amount, session.currencyCode)}
                  </>
                )}
              </button>
            </form>

            {/* Security Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center justify-center gap-2 text-gray-500">
                <Shield className="w-4 h-4" />
                <span className="text-xs">Your payment is secure and encrypted</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Main page - Payment method selection
  if (!session) return null;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#f8fafc' }}
    >
      <div className="max-w-md w-full">
        {/* Test Mode Banner */}
        {session.isTestMode && (
          <div className="mb-3 px-4 py-2 bg-amber-500 text-amber-950 text-center text-sm font-medium rounded-xl flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>SANDBOX MODE - No real payments will be processed</span>
          </div>
        )}

        <Card className="overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b border-gray-100 p-6 text-center">
            {session.merchantLogoUrl ? (
              <img
                src={session.merchantLogoUrl}
                alt={session.merchantName}
                className="h-16 mx-auto mb-3"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: `${brandColor}20` }}
              >
                <CreditCard className="w-8 h-8" style={{ color: brandColor }} />
              </div>
            )}
            <h1 className="text-xl font-bold text-gray-900">Secure Checkout</h1>
            <p className="text-sm text-gray-500">{session.merchantName || 'Merchant'}</p>
          </div>

          {/* Amount Display */}
          <div className="p-6 text-center bg-gray-50 border-b border-gray-100">
            <p className="text-sm text-gray-500">Amount to pay</p>
            <p className="text-4xl font-bold text-gray-900">
              {formatAmount(session.amount, session.currencyCode)}
            </p>
            {session.description && (
              <p className="text-sm text-gray-500 mt-2">{session.description}</p>
            )}
          </div>

          {/* Payment Methods */}
          <div className="p-6">
            {/* Retry Message Banner */}
            {retryMessage && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-800 font-medium">{retryMessage}</p>
                  <button
                    onClick={() => setRetryMessage(null)}
                    className="text-xs text-amber-600 hover:text-amber-800 mt-1 underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose Payment Method</h2>

            <div className="space-y-3">
              {/* QR Code Option */}
              {session.paymentMethods?.qr !== false && (
                <button
                  onClick={() => handleMethodSelect('qr')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${brandColor}20`, color: brandColor }}
                  >
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">QR Code</p>
                    <p className="text-sm text-gray-500">Scan with Peeap app</p>
                  </div>
                </button>
              )}

              {/* Card Option */}
              {session.paymentMethods?.card !== false && (
                <button
                  onClick={() => handleMethodSelect('card')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${brandColor}20`, color: brandColor }}
                  >
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">PEEAP Card</p>
                    <p className="text-sm text-gray-500">Pay with your card</p>
                  </div>
                </button>
              )}

              {/* Mobile Money Option - Disabled in Test/Sandbox Mode */}
              {session.paymentMethods?.mobile !== false && (
                <button
                  onClick={() => !session.isTestMode && handleMethodSelect('mobile')}
                  disabled={session.isTestMode}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all relative ${
                    session.isTestMode
                      ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    session.isTestMode ? 'bg-gray-200 text-gray-400' : 'bg-orange-100 text-orange-600'
                  }`}>
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-medium ${session.isTestMode ? 'text-gray-400' : 'text-gray-900'}`}>
                      Mobile Money
                    </p>
                    <p className={`text-sm ${session.isTestMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {session.isTestMode ? 'Not available in sandbox mode' : 'Orange Money & more'}
                    </p>
                  </div>
                  {session.isTestMode && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                      Live Only
                    </span>
                  )}
                </button>
              )}
            </div>
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

// Helper function to adjust color brightness
function adjustColor(color: string, amount: number): string {
  const clamp = (num: number) => Math.min(Math.max(num, 0), 255);

  const num = parseInt(color.replace('#', ''), 16);
  const r = clamp((num >> 16) + amount);
  const g = clamp(((num >> 8) & 0x00FF) + amount);
  const b = clamp((num & 0x0000FF) + amount);

  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
