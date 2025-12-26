/**
 * Payment Link Page
 * Shows product/payment info and redirects to hosted checkout
 * Route: /pay/:businessSlug/:linkSlug
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Store, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { paymentLinkService, PaymentLink } from '@/services/paymentLink.service';
import { createHostedCheckoutSession } from '@/lib/hostedCheckout';

export function PaymentLinkCheckoutPage() {
  const { businessSlug, linkSlug } = useParams<{ businessSlug: string; linkSlug: string }>();
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<PaymentLink | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');

  useEffect(() => {
    fetchPaymentLink();
  }, [businessSlug, linkSlug]);

  const fetchPaymentLink = async () => {
    if (!businessSlug || !linkSlug) {
      setError('Invalid payment link');
      setLoading(false);
      return;
    }

    try {
      const link = await paymentLinkService.getPaymentLinkBySlug(businessSlug, linkSlug);
      if (!link) {
        setError('Payment link not found or expired');
      } else {
        setPaymentLink(link);
        paymentLinkService.incrementViewCount(link.id).catch(() => {});
      }
    } catch (err) {
      console.error('Error fetching payment link:', err);
      setError('Failed to load payment link');
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async () => {
    if (!paymentLink) return;

    let amount = paymentLink.amount;

    // Validate custom amount if allowed
    if (paymentLink.allow_custom_amount) {
      const parsed = parseFloat(customAmount);
      if (isNaN(parsed) || parsed <= 0) {
        setError('Please enter a valid amount');
        return;
      }
      if (paymentLink.min_amount && parsed < paymentLink.min_amount) {
        setError(`Minimum amount is Le ${paymentLink.min_amount.toLocaleString()}`);
        return;
      }
      if (paymentLink.max_amount && parsed > paymentLink.max_amount) {
        setError(`Maximum amount is Le ${paymentLink.max_amount.toLocaleString()}`);
        return;
      }
      amount = parsed;
    }

    if (!amount) {
      setError('Invalid amount');
      return;
    }

    setRedirecting(true);
    setError(null);

    try {
      const business = (paymentLink as any).business;
      const publicKey = business?.is_live_mode
        ? business?.live_public_key
        : business?.test_public_key;

      if (!publicKey) {
        throw new Error('Business payment configuration not found');
      }

      // Create hosted checkout session and redirect
      const result = await createHostedCheckoutSession({
        publicKey,
        amount: amount * 100,
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

      window.location.href = result.paymentUrl;
    } catch (err: any) {
      console.error('Error creating checkout:', err);
      setError(err.message || 'Failed to initiate payment');
      setRedirecting(false);
    }
  };

  const business = (paymentLink as any)?.business;
  const formatAmount = (amt: number) => `Le ${amt.toLocaleString()}`;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  // Error state
  if (error && !paymentLink) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Payment Link Unavailable</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full overflow-hidden">
        <div className="grid md:grid-cols-2">
          {/* Left - Product Info */}
          <div className="p-8 bg-gradient-to-br from-green-600 to-green-700 text-white">
            <div className="flex items-center gap-3 mb-6">
              {business?.logo_url ? (
                <img src={business.logo_url} alt="" className="w-12 h-12 rounded-xl bg-white object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Store className="w-6 h-6" />
                </div>
              )}
              <div>
                <h2 className="font-bold text-lg">{business?.name || 'Business'}</h2>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-white/70 text-sm">Payment for</p>
                <h1 className="text-2xl font-bold">{paymentLink?.name}</h1>
              </div>

              {paymentLink?.description && (
                <p className="text-white/80">{paymentLink.description}</p>
              )}

              {!paymentLink?.allow_custom_amount && paymentLink?.amount && (
                <div className="pt-4 border-t border-white/20">
                  <p className="text-white/70 text-sm">Amount</p>
                  <p className="text-3xl font-bold">{formatAmount(paymentLink.amount)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right - Pay Now */}
          <div className="p-8 flex flex-col justify-center">
            <div className="space-y-6">
              {paymentLink?.allow_custom_amount && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Le</span>
                    <input
                      type="number"
                      value={customAmount}
                      onChange={(e) => { setCustomAmount(e.target.value); setError(null); }}
                      placeholder="0.00"
                      className="w-full pl-12 pr-4 py-4 text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-0"
                    />
                  </div>
                  {(paymentLink.min_amount || paymentLink.max_amount) && (
                    <p className="text-xs text-gray-400 mt-2">
                      {paymentLink.min_amount && `Min: ${formatAmount(paymentLink.min_amount)}`}
                      {paymentLink.min_amount && paymentLink.max_amount && ' • '}
                      {paymentLink.max_amount && `Max: ${formatAmount(paymentLink.max_amount)}`}
                    </p>
                  )}
                </div>
              )}

              {error && (
                <p className="text-red-600 text-sm">{error}</p>
              )}

              <button
                onClick={handlePayNow}
                disabled={redirecting || (paymentLink?.allow_custom_amount && !customAmount)}
                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {redirecting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    Pay Now
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <p className="text-center text-xs text-gray-400">
                Secured by PeeAP • Card, Mobile Money, QR
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
