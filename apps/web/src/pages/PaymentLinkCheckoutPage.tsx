/**
 * Payment Link Checkout Page
 * Public page for customers to pay via a merchant's payment link
 * Route: /pay/:businessSlug/:linkSlug
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Store, Loader2, AlertCircle, CreditCard, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { paymentLinkService, PaymentLink } from '@/services/paymentLink.service';
import { createHostedCheckoutSession } from '@/lib/hostedCheckout';
import { currencyService, Currency } from '@/services/currency.service';

export function PaymentLinkCheckoutPage() {
  const { businessSlug, linkSlug } = useParams<{ businessSlug: string; linkSlug: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<PaymentLink | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
    fetchPaymentLink();
  }, [businessSlug, linkSlug]);

  const fetchPaymentLink = async () => {
    if (!businessSlug || !linkSlug) {
      setError('Invalid payment link');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const link = await paymentLinkService.getPaymentLinkBySlug(businessSlug, linkSlug);
      if (!link) {
        setError('Payment link not found or expired');
      } else {
        setPaymentLink(link);
        // Increment view count
        paymentLinkService.incrementViewCount(link.id).catch(() => {});
      }
    } catch (err: any) {
      console.error('Error fetching payment link:', err);
      setError('Failed to load payment link');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!paymentLink) return;

    // Validate amount for custom amount links
    let amount = paymentLink.amount;
    if (paymentLink.allow_custom_amount) {
      const parsed = parseFloat(customAmount);
      if (isNaN(parsed) || parsed <= 0) {
        setError('Please enter a valid amount');
        return;
      }
      if (paymentLink.min_amount && parsed < paymentLink.min_amount) {
        setError(`Minimum amount is ${currencySymbol} ${paymentLink.min_amount}`);
        return;
      }
      if (paymentLink.max_amount && parsed > paymentLink.max_amount) {
        setError(`Maximum amount is ${currencySymbol} ${paymentLink.max_amount}`);
        return;
      }
      amount = parsed;
    }

    if (!amount) {
      setError('Invalid amount');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Get the business's public key
      const business = (paymentLink as any).business;
      const publicKey = business?.is_live_mode
        ? business?.live_public_key
        : business?.test_public_key;

      if (!publicKey) {
        throw new Error('Business payment configuration not found');
      }

      // Create hosted checkout session
      const result = await createHostedCheckoutSession({
        publicKey,
        amount: amount * 100, // Convert to minor units
        currency: paymentLink.currency || 'SLE',
        description: paymentLink.description || paymentLink.name,
        reference: `plink_${paymentLink.id}_${Date.now()}`,
        redirectUrl: paymentLink.success_url || `${window.location.origin}/payment/success`,
        metadata: {
          payment_link_id: paymentLink.id,
          payment_link_name: paymentLink.name,
          business_id: paymentLink.business_id,
        },
      });

      // Redirect to hosted checkout
      window.location.href = result.paymentUrl;
    } catch (err: any) {
      console.error('Error creating checkout:', err);
      setError(err.message || 'Failed to initiate payment');
      setProcessing(false);
    }
  };

  const currencySymbol = defaultCurrency?.symbol || 'Le';

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error && !paymentLink) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Payment Link Unavailable</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Go Home
          </button>
        </Card>
      </div>
    );
  }

  const business = (paymentLink as any)?.business;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 p-6 text-white">
          <div className="flex items-center gap-4 mb-4">
            {business?.logo_url ? (
              <img
                src={business.logo_url}
                alt={business.name}
                className="w-16 h-16 rounded-xl bg-white object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center">
                <Store className="w-8 h-8 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold">{business?.name || 'Business'}</h1>
              <p className="text-white/80 text-sm">{paymentLink?.name}</p>
            </div>
          </div>
          {paymentLink?.description && (
            <p className="text-white/90 text-sm">{paymentLink.description}</p>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Amount Display */}
          <div className="text-center">
            {paymentLink?.allow_custom_amount ? (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Enter Amount</p>
                <div className="relative max-w-xs mx-auto">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400">{currencySymbol}</span>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="0.00"
                    min={paymentLink.min_amount || 0}
                    max={paymentLink.max_amount || undefined}
                    className="w-full text-center text-3xl font-bold py-4 pl-12 pr-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-800"
                  />
                </div>
                {(paymentLink.min_amount || paymentLink.max_amount) && (
                  <p className="text-xs text-gray-400 mt-2">
                    {paymentLink.min_amount && `Min: ${formatCurrency(paymentLink.min_amount)}`}
                    {paymentLink.min_amount && paymentLink.max_amount && ' • '}
                    {paymentLink.max_amount && `Max: ${formatCurrency(paymentLink.max_amount)}`}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Amount to Pay</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(paymentLink?.amount || 0)}
                </p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Pay Button */}
          <button
            onClick={handlePay}
            disabled={processing || (paymentLink?.allow_custom_amount && !customAmount)}
            className="w-full py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl font-semibold text-lg hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02]"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Pay {paymentLink?.allow_custom_amount && customAmount
                  ? formatCurrency(parseFloat(customAmount) || 0)
                  : formatCurrency(paymentLink?.amount || 0)}
              </>
            )}
          </button>

          {/* Secure Payment Badge */}
          <div className="text-center">
            <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Secured by Peeap
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <span>Powered by</span>
            <span className="font-semibold text-green-600">Peeap</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
