/**
 * Business Checkout Page
 *
 * Public checkout page for business payments via the Peeap SDK.
 * URL formats:
 * - /checkout/:businessId?amount=100&currency=SLE&reference=ORDER-123
 * - /checkout/:businessId (amount entered by customer)
 */

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  CreditCard,
  Smartphone,
  Building2,
  Wallet,
  QrCode,
  Check,
  X,
  Loader2,
  Shield,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Phone,
  Mail,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';

// Types
interface Business {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  is_live_mode: boolean;
  approval_status: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  available: boolean;
}

type CheckoutStep = 'loading' | 'amount' | 'details' | 'payment' | 'processing' | 'success' | 'error';

// Currency definitions
const CURRENCIES: Record<string, { symbol: string; name: string; decimals: number }> = {
  SLE: { symbol: 'Le', name: 'Sierra Leonean Leone', decimals: 2 },
  USD: { symbol: '$', name: 'US Dollar', decimals: 2 },
  EUR: { symbol: '€', name: 'Euro', decimals: 2 },
  GBP: { symbol: '£', name: 'British Pound', decimals: 2 },
  NGN: { symbol: '₦', name: 'Nigerian Naira', decimals: 2 },
  GHS: { symbol: '₵', name: 'Ghanaian Cedi', decimals: 2 },
};

export function BusinessCheckoutPage() {
  const { businessId } = useParams();
  const [searchParams] = useSearchParams();

  // URL params
  const urlAmount = searchParams.get('amount');
  const urlCurrency = searchParams.get('currency') || 'SLE';
  const urlReference = searchParams.get('reference');
  const urlDescription = searchParams.get('description');
  const urlMode = searchParams.get('mode') || 'live';
  const urlRedirect = searchParams.get('redirect');

  // State
  const [step, setStep] = useState<CheckoutStep>('loading');
  const [business, setBusiness] = useState<Business | null>(null);
  const [amount, setAmount] = useState<string>(urlAmount || '');
  const [currency, setCurrency] = useState(urlCurrency);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  // Payment methods
  const paymentMethods: PaymentMethod[] = [
    {
      id: 'mobile_money',
      name: 'Mobile Money',
      icon: <Smartphone className="w-6 h-6" />,
      description: 'Orange Money, Africell Money',
      available: true,
    },
    {
      id: 'card',
      name: 'Card Payment',
      icon: <CreditCard className="w-6 h-6" />,
      description: 'Visa, Mastercard',
      available: true,
    },
    {
      id: 'bank_transfer',
      name: 'Bank Transfer',
      icon: <Building2 className="w-6 h-6" />,
      description: 'Direct bank payment',
      available: true,
    },
    {
      id: 'wallet',
      name: 'Peeap Wallet',
      icon: <Wallet className="w-6 h-6" />,
      description: 'Pay with your balance',
      available: true,
    },
  ];

  // Format currency
  const formatAmount = (amt: number): string => {
    const curr = CURRENCIES[currency] || CURRENCIES.SLE;
    return `${curr.symbol} ${amt.toLocaleString(undefined, {
      minimumFractionDigits: curr.decimals,
      maximumFractionDigits: curr.decimals,
    })}`;
  };

  // Load business info
  useEffect(() => {
    if (businessId) {
      loadBusiness();
    }
  }, [businessId]);

  const loadBusiness = async () => {
    try {
      const { data, error } = await supabase
        .from('merchant_businesses')
        .select('id, name, logo_url, description, is_live_mode, approval_status')
        .eq('id', businessId)
        .single();

      if (error || !data) {
        setError('Business not found');
        setStep('error');
        return;
      }

      setBusiness(data);

      // If amount is pre-filled, go to details step
      if (urlAmount && parseFloat(urlAmount) > 0) {
        setStep('details');
      } else {
        setStep('amount');
      }
    } catch (err) {
      console.error('Error loading business:', err);
      setError('Failed to load business');
      setStep('error');
    }
  };

  // Handle amount submit
  const handleAmountSubmit = () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    setError(null);
    setStep('details');
  };

  // Handle details submit
  const handleDetailsSubmit = () => {
    if (!email && !phone) {
      setError('Please enter your email or phone number');
      return;
    }
    setError(null);
    setStep('payment');
  };

  // Handle payment method select
  const handlePaymentMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
  };

  // Process payment
  const processPayment = async () => {
    if (!selectedMethod || !business) return;

    setStep('processing');
    setError(null);

    try {
      // For Mobile Money, Card, or Bank Transfer - use Monime
      if (['mobile_money', 'card', 'bank_transfer'].includes(selectedMethod)) {
        // Convert amount to minor units (cents)
        const amountInMinorUnits = Math.round(parseFloat(amount) * 100);

        // Create checkout session via our API
        const response = await fetch('/api/checkout/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            businessId: business.id,
            amount: amountInMinorUnits,
            currency,
            reference: urlReference,
            description: urlDescription || `Payment to ${business.name}`,
            customerEmail: email,
            customerPhone: phone,
            paymentMethod: selectedMethod,
            redirectUrl: urlRedirect,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create checkout session');
        }

        if (data.paymentUrl) {
          // Redirect to Monime checkout
          window.location.href = data.paymentUrl;
          return;
        } else {
          throw new Error('No payment URL returned');
        }
      }

      // For Peeap Wallet - handle internally (mock for now)
      const newPaymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setPaymentId(newPaymentId);

      // Simulate wallet payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Success
      setStep('success');

      // Post message to parent (for iframe/popup usage)
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'peeap_payment',
          status: 'success',
          payment: {
            id: newPaymentId,
            reference: urlReference || newPaymentId,
            amount: parseFloat(amount),
            currency: currency,
            status: 'completed',
          },
        }, '*');
      }

      // Redirect if specified
      if (urlRedirect) {
        setTimeout(() => {
          window.location.href = `${urlRedirect}?payment_id=${newPaymentId}&status=success`;
        }, 3000);
      }

    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed');
      setStep('error');

      // Post error to parent
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'peeap_payment',
          status: 'error',
          error: { message: err.message || 'Payment failed' },
        }, '*');
      }
    }
  };

  // Go back
  const goBack = () => {
    if (step === 'details') setStep('amount');
    else if (step === 'payment') setStep('details');
  };

  // Close/cancel
  const handleClose = () => {
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'peeap_payment',
        status: 'cancel',
      }, '*');
    }
    window.close();
  };

  // Loading state
  if (step === 'loading') {
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
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Payment Error</h1>
          <p className="text-gray-600 mb-6">{error || 'Something went wrong'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
          >
            Try Again
          </button>
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
            You paid {formatAmount(parseFloat(amount))} to {business?.name}
          </p>
          {paymentId && (
            <p className="text-xs text-gray-400 mb-6 font-mono">
              Reference: {urlReference || paymentId}
            </p>
          )}
          {urlRedirect && (
            <p className="text-sm text-gray-500">Redirecting back...</p>
          )}
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
          <p className="text-gray-600">Please wait while we process your payment...</p>
          <p className="text-xs text-gray-400 mt-4">Do not close this window</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b border-gray-100 p-4">
            <div className="flex items-center justify-between">
              {step !== 'amount' ? (
                <button onClick={goBack} className="p-2 hover:bg-gray-100 rounded-lg">
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              ) : (
                <div className="w-9"></div>
              )}
              <div className="flex items-center gap-3">
                {business?.logo_url ? (
                  <img
                    src={business.logo_url}
                    alt={business.name}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900">{business?.name}</p>
                  <p className="text-xs text-gray-500">
                    {urlMode === 'test' && (
                      <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                        TEST MODE
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="px-6 pt-4">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span className={step === 'amount' ? 'text-indigo-600 font-medium' : ''}>Amount</span>
              <span className={step === 'details' ? 'text-indigo-600 font-medium' : ''}>Details</span>
              <span className={step === 'payment' ? 'text-indigo-600 font-medium' : ''}>Pay</span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{
                  width: step === 'amount' ? '33%' : step === 'details' ? '66%' : '100%',
                }}
              ></div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Step: Amount */}
          {step === 'amount' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Enter Amount</h2>
              <p className="text-sm text-gray-500 mb-6">
                {urlDescription || `Payment to ${business?.name}`}
              </p>

              <div className="mb-6">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400">
                    {CURRENCIES[currency]?.symbol || 'Le'}
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-4xl font-bold text-center py-6 px-16 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-0 outline-none"
                    autoFocus
                  />
                </div>

                {/* Currency selector */}
                <div className="mt-4">
                  <label className="text-sm text-gray-500 mb-2 block">Currency</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(CURRENCIES).slice(0, 6).map(([code, curr]) => (
                      <button
                        key={code}
                        onClick={() => setCurrency(code)}
                        className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                          currency === code
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {curr.symbol} {code}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleAmountSubmit}
                disabled={!amount || parseFloat(amount) <= 0}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                Continue
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Step: Details */}
          {step === 'details' && (
            <div className="p-6">
              <div className="text-center mb-6 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">You're paying</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatAmount(parseFloat(amount))}
                </p>
              </div>

              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Details</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full py-3 pl-12 pr-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+232 76 123456"
                      className="w-full py-3 pl-12 pr-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleDetailsSubmit}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                Choose Payment Method
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Step: Payment */}
          {step === 'payment' && (
            <div className="p-6">
              <div className="text-center mb-6 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatAmount(parseFloat(amount))}
                </p>
              </div>

              <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Payment Method</h2>

              <div className="space-y-3 mb-6">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => handlePaymentMethodSelect(method.id)}
                    disabled={!method.available}
                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                      selectedMethod === method.id
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        selectedMethod === method.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {method.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">{method.name}</p>
                      <p className="text-sm text-gray-500">{method.description}</p>
                    </div>
                    {selectedMethod === method.id && (
                      <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={processPayment}
                disabled={!selectedMethod}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
              >
                Pay {formatAmount(parseFloat(amount))}
              </button>
            </div>
          )}

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
