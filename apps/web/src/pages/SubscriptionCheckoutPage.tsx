/**
 * Subscription Checkout Page
 *
 * Allows customers to subscribe to merchant plans
 * URL format: /subscribe/:planId
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import {
  CreditCard,
  Smartphone,
  QrCode,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Shield,
  Calendar,
  Repeat,
  Clock,
  Check,
} from 'lucide-react';
import { subscriptionService, SubscriptionPlan, PaymentMethodType } from '@/services/subscription.service';
import { supabase } from '@/lib/supabase';

// Types
type CheckoutStep =
  | 'loading'
  | 'details'
  | 'payment'
  | 'processing'
  | 'success'
  | 'error';

// Currency definitions
const CURRENCIES: Record<string, { symbol: string; name: string; decimals: number }> = {
  SLE: { symbol: 'Le', name: 'Sierra Leonean New Leone', decimals: 2 },
  USD: { symbol: '$', name: 'US Dollar', decimals: 2 },
  EUR: { symbol: '€', name: 'Euro', decimals: 2 },
  GBP: { symbol: '£', name: 'British Pound', decimals: 2 },
  NGN: { symbol: '₦', name: 'Nigerian Naira', decimals: 2 },
  GHS: { symbol: '₵', name: 'Ghanaian Cedi', decimals: 2 },
};

const INTERVAL_LABELS: Record<string, string> = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
  yearly: 'year',
};

interface MerchantInfo {
  business_name: string;
  logo_url?: string;
  brand_color?: string;
}

export function SubscriptionCheckoutPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();

  // State
  const [step, setStep] = useState<CheckoutStep>('loading');
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Payment method
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | null>(null);

  // Card form
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Mobile money
  const [mobileNetwork, setMobileNetwork] = useState('orange');
  const [mobileNumber, setMobileNumber] = useState('');

  // Consent
  const [consentChecked, setConsentChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);

  // Processing
  const [processing, setProcessing] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  // Load plan on mount
  useEffect(() => {
    if (planId) {
      loadPlan();
    }
  }, [planId]);

  const loadPlan = async () => {
    try {
      setStep('loading');
      const planData = await subscriptionService.getPlan(planId!);

      if (!planData) {
        setError('Subscription plan not found');
        setStep('error');
        return;
      }

      if (!planData.is_active) {
        setError('This subscription plan is no longer available');
        setStep('error');
        return;
      }

      setPlan(planData);

      // Load merchant info
      const { data: merchantData } = await supabase
        .from('merchant_businesses')
        .select('business_name, logo_url, brand_color')
        .eq('user_id', planData.merchant_id)
        .single();

      if (merchantData) {
        setMerchant(merchantData);
      }

      setStep('details');
    } catch (err) {
      console.error('Failed to load plan:', err);
      setError('Failed to load subscription details');
      setStep('error');
    }
  };

  // Format amount with currency
  const formatAmount = (amount: number, currency: string): string => {
    const curr = CURRENCIES[currency] || CURRENCIES.SLE;
    return `${curr.symbol} ${amount.toLocaleString(undefined, {
      minimumFractionDigits: curr.decimals,
      maximumFractionDigits: curr.decimals,
    })}`;
  };

  // Format interval
  const formatInterval = (interval: string, count: number): string => {
    const label = INTERVAL_LABELS[interval] || interval;
    return count === 1 ? label : `${count} ${label}s`;
  };

  // Format card number
  const formatCardNumber = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    const groups = numbers.match(/.{1,4}/g) || [];
    return groups.join(' ').substring(0, 19);
  };

  // Format expiry
  const formatExpiry = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length >= 2) {
      return `${numbers.substring(0, 2)}/${numbers.substring(2, 4)}`;
    }
    return numbers;
  };

  // Validate customer info
  const isCustomerInfoValid = (): boolean => {
    return (
      customerName.trim().length >= 2 &&
      customerEmail.includes('@') &&
      customerPhone.length >= 8
    );
  };

  // Validate payment method
  const isPaymentMethodValid = (): boolean => {
    if (!selectedMethod) return false;

    switch (selectedMethod) {
      case 'card':
        return (
          cardNumber.replace(/\s/g, '').length >= 16 &&
          cardExpiry.length === 5 &&
          cardCvv.length >= 3
        );
      case 'mobile_money':
        return mobileNumber.length >= 8 && mobileNetwork.length > 0;
      case 'wallet':
        return true; // QR code flow
      default:
        return false;
    }
  };

  // Handle subscription
  const handleSubscribe = async () => {
    if (!plan || !selectedMethod || !consentChecked || !termsChecked) return;

    try {
      setProcessing(true);
      setStep('processing');

      // Build payment method data
      const paymentMethodData: Record<string, unknown> = {
        type: selectedMethod,
      };

      if (selectedMethod === 'card') {
        // In production, tokenize card first
        const numbers = cardNumber.replace(/\s/g, '');
        paymentMethodData.card_token = `tok_${Date.now()}`; // Placeholder - use real tokenization
        paymentMethodData.card_last_four = numbers.slice(-4);
        paymentMethodData.card_brand = numbers.startsWith('4') ? 'visa' : 'mastercard';
        const [expMonth, expYear] = cardExpiry.split('/');
        paymentMethodData.card_exp_month = parseInt(expMonth);
        paymentMethodData.card_exp_year = 2000 + parseInt(expYear);
      } else if (selectedMethod === 'mobile_money') {
        paymentMethodData.mobile_network = mobileNetwork;
        paymentMethodData.mobile_number = mobileNumber;
      }

      // Create subscription
      const subscription = await subscriptionService.createSubscription({
        plan_id: plan.id,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        customer_name: customerName,
        payment_method: paymentMethodData as any,
        consent_text: `I authorize PeeAP to charge ${formatAmount(plan.amount, plan.currency)} ${formatInterval(plan.interval, plan.interval_count)}ly until I cancel.`,
        consent_ip: '', // Would get from server
        start_trial: plan.trial_days > 0,
      });

      setSubscriptionId(subscription.id);
      setStep('success');
    } catch (err) {
      console.error('Subscription failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to create subscription');
      setStep('error');
    } finally {
      setProcessing(false);
    }
  };

  // Render loading
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  // Render error
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-500 mb-6">{error || 'Unable to load subscription'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Subscription Active!</h1>
          <p className="text-gray-500 mb-6">
            {plan?.trial_days && plan.trial_days > 0
              ? `Your ${plan.trial_days}-day free trial has started. You'll be charged ${formatAmount(plan.amount, plan.currency)} after the trial ends.`
              : `You're now subscribed to ${plan?.name}. Your first payment has been processed.`}
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-medium text-gray-900 mb-2">Subscription Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Plan</span>
                <span className="font-medium">{plan?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount</span>
                <span className="font-medium">
                  {formatAmount(plan?.amount || 0, plan?.currency || 'SLE')} / {formatInterval(plan?.interval || 'monthly', plan?.interval_count || 1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="font-medium">{customerEmail}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            A confirmation email has been sent to {customerEmail}
          </p>
        </div>
      </div>
    );
  }

  // Render processing
  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <Loader2 className="w-16 h-16 text-primary-500 animate-spin mx-auto mb-6" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Processing your subscription...</h1>
          <p className="text-gray-500">Please wait while we set up your subscription</p>
        </div>
      </div>
    );
  }

  // Main checkout UI
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {merchant?.logo_url ? (
              <img src={merchant.logo_url} alt={merchant.business_name} className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <Repeat className="w-5 h-5 text-primary-600" />
              </div>
            )}
            <div>
              <h1 className="font-semibold text-gray-900">{merchant?.business_name || 'Subscribe'}</h1>
              <p className="text-sm text-gray-500">Subscription Checkout</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Plan Details */}
          <div className="p-6 border-b bg-gradient-to-br from-primary-50 to-white">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{plan?.name}</h2>
                <p className="text-gray-500 mt-1">{plan?.description}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">
                  {formatAmount(plan?.amount || 0, plan?.currency || 'SLE')}
                </div>
                <div className="text-sm text-gray-500">
                  per {formatInterval(plan?.interval || 'monthly', plan?.interval_count || 1)}
                </div>
              </div>
            </div>

            {/* Features */}
            {plan?.features && plan.features.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">What's included:</h3>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Trial Badge */}
            {plan?.trial_days && plan.trial_days > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                <Clock className="w-4 h-4" />
                {plan.trial_days}-day free trial
              </div>
            )}
          </div>

          {/* Subscription Info Box */}
          <div className="p-4 bg-blue-50 border-b">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">How subscriptions work:</p>
                <ul className="space-y-1 text-blue-700">
                  <li>• {plan?.trial_days && plan.trial_days > 0 ? `Start with a ${plan.trial_days}-day free trial` : 'Your subscription starts immediately'}</li>
                  <li>• You'll be billed {formatAmount(plan?.amount || 0, plan?.currency || 'SLE')} every {formatInterval(plan?.interval || 'monthly', plan?.interval_count || 1)}</li>
                  <li>• Cancel or pause anytime from your account</li>
                  <li>• Payments are processed automatically using your selected payment method</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Customer Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+232 76 123456"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setSelectedMethod('card')}
                  className={`p-4 border-2 rounded-xl text-center transition-all ${
                    selectedMethod === 'card'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <CreditCard className={`w-6 h-6 mx-auto mb-2 ${selectedMethod === 'card' ? 'text-primary-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${selectedMethod === 'card' ? 'text-primary-600' : 'text-gray-600'}`}>
                    Card
                  </span>
                </button>
                <button
                  onClick={() => setSelectedMethod('mobile_money')}
                  className={`p-4 border-2 rounded-xl text-center transition-all ${
                    selectedMethod === 'mobile_money'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Smartphone className={`w-6 h-6 mx-auto mb-2 ${selectedMethod === 'mobile_money' ? 'text-primary-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${selectedMethod === 'mobile_money' ? 'text-primary-600' : 'text-gray-600'}`}>
                    Mobile Money
                  </span>
                </button>
                <button
                  onClick={() => setSelectedMethod('wallet')}
                  className={`p-4 border-2 rounded-xl text-center transition-all ${
                    selectedMethod === 'wallet'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <QrCode className={`w-6 h-6 mx-auto mb-2 ${selectedMethod === 'wallet' ? 'text-primary-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${selectedMethod === 'wallet' ? 'text-primary-600' : 'text-gray-600'}`}>
                    QR / Wallet
                  </span>
                </button>
              </div>

              {/* Card Form */}
              {selectedMethod === 'card' && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="4242 4242 4242 4242"
                      maxLength={19}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Expiry</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                      <input
                        type="text"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
                        placeholder="123"
                        maxLength={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Your card will be charged automatically each billing cycle
                  </p>
                </div>
              )}

              {/* Mobile Money Form */}
              {selectedMethod === 'mobile_money' && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Network</label>
                    <select
                      value={mobileNetwork}
                      onChange={(e) => setMobileNetwork(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="orange">Orange Money</option>
                      <option value="africell">Africell Money</option>
                      <option value="qmoney">QMoney</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="+232 76 123456"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <AlertCircle className="w-4 h-4 inline mr-1" />
                      You'll receive a payment request on your phone each billing cycle. Approve it to continue your subscription.
                    </p>
                  </div>
                </div>
              )}

              {/* Wallet/QR Info */}
              {selectedMethod === 'wallet' && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-4">
                    Link your PeeAP wallet for automatic payments. You'll scan a QR code to authorize the subscription.
                  </p>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <Shield className="w-4 h-4 inline mr-1" />
                      Payments will be automatically deducted from your PeeAP wallet each billing cycle.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Consent Checkboxes */}
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-600">
                  I authorize PeeAP to charge {formatAmount(plan?.amount || 0, plan?.currency || 'SLE')} every {formatInterval(plan?.interval || 'monthly', plan?.interval_count || 1)} using my selected payment method until I cancel.
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsChecked}
                  onChange={(e) => setTermsChecked(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-600">
                  I agree to the <a href="#" className="text-primary-600 underline">Terms of Service</a> and <a href="#" className="text-primary-600 underline">Privacy Policy</a>
                </span>
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            {/* Subscribe Button */}
            <button
              onClick={handleSubscribe}
              disabled={!isCustomerInfoValid() || !isPaymentMethodValid() || !consentChecked || !termsChecked || processing}
              className={`w-full py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 ${
                isCustomerInfoValid() && isPaymentMethodValid() && consentChecked && termsChecked && !processing
                  ? 'bg-primary-500 text-white hover:bg-primary-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Repeat className="w-5 h-5" />
                  {plan?.trial_days && plan.trial_days > 0
                    ? `Start ${plan.trial_days}-Day Free Trial`
                    : `Subscribe - ${formatAmount(plan?.amount || 0, plan?.currency || 'SLE')}/${formatInterval(plan?.interval || 'monthly', plan?.interval_count || 1)}`
                  }
                </>
              )}
            </button>

            {/* Security Footer */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
              <Shield className="w-4 h-4" />
              Secured by PeeAP
            </div>
          </div>
        </div>

        {/* Cancellation Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>You can cancel your subscription at any time.</p>
          <p>No long-term contracts, cancel whenever you want.</p>
        </div>
      </div>
    </div>
  );
}
