/**
 * Merchant Subscription Management Page
 * Shows current subscription status, trial info, and billing history
 * All subscription management happens here on my.peeap.com
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Check,
  Clock,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Wallet,
  RefreshCw,
  FileText,
  History,
  Sparkles,
  Shield,
  XCircle,
  Loader2,
} from 'lucide-react';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { ssoService } from '@/services/sso.service';

interface MerchantSubscription {
  id: string;
  user_id: string;
  business_id?: string;
  tier: 'basic' | 'business' | 'business_plus';
  status: 'trialing' | 'active' | 'cancelled' | 'expired' | 'past_due';
  trial_started_at?: string;
  trial_ends_at?: string;
  current_period_start?: string;
  current_period_end?: string;
  price_monthly: number;
  currency: string;
  selected_addons?: string[];
  cancelled_at?: string;
  created_at: string;
}

interface SubscriptionInvoice {
  id: string;
  invoice_number?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  period_start?: string;
  period_end?: string;
  paid_at?: string;
  created_at: string;
}

export function MerchantSubscriptionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<MerchantSubscription | null>(null);
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchSubscription();
      fetchInvoices();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('merchant_subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        console.error('Error fetching subscription:', error);
      }

      setSubscription(data || null);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('merchant_subscription_invoices')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching invoices:', error);
      }

      setInvoices(data || []);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleUpgrade = async (tier: string) => {
    if (!user?.id) {
      navigate('/merchant/upgrade');
      return;
    }

    try {
      // Use SSO to redirect to Plus setup
      const redirectUrl = await ssoService.getRedirectUrl({
        user: user,
        targetApp: 'plus',
        tier: tier,
        redirectPath: `/setup?tier=${tier}`,
      });

      window.location.href = redirectUrl;
    } catch (err) {
      console.error('SSO redirect failed:', err);
      navigate('/merchant/upgrade');
    }
  };

  const handleCancelSubscription = async () => {
    setCancellingSubscription(true);
    try {
      const { error } = await supabase.rpc('cancel_merchant_subscription', {
        p_user_id: user?.id,
        p_reason: 'User requested cancellation'
      });

      if (error) {
        // Fallback to direct update
        await supabase
          .from('merchant_subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
          })
          .eq('user_id', user?.id);
      }

      // Refresh subscription data
      await fetchSubscription();
      setShowCancelConfirm(false);
    } catch (err) {
      console.error('Error cancelling subscription:', err);
    } finally {
      setCancellingSubscription(false);
    }
  };

  const getTrialDaysRemaining = () => {
    if (!subscription?.trial_ends_at) return 0;
    const end = new Date(subscription.trial_ends_at);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-SL').format(price);
  };

  const getTierName = (tier: string) => {
    switch (tier) {
      case 'business_plus':
        return 'Business++';
      case 'business':
        return 'Business';
      default:
        return 'Basic';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'trialing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <Clock className="w-3 h-3" />
            Free Trial
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <Check className="w-3 h-3" />
            Active
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <XCircle className="w-3 h-3" />
            Cancelled
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <AlertTriangle className="w-3 h-3" />
            Expired
          </span>
        );
      case 'past_due':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <AlertTriangle className="w-3 h-3" />
            Past Due
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </MerchantLayout>
    );
  }

  // No subscription - show upgrade options
  if (!subscription) {
    return (
      <MerchantLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
            <p className="text-gray-600 mt-1">Manage your PeeAP Plus subscription</p>
          </div>

          {/* Current Plan (Basic) */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-gray-900">Basic Plan</h2>
                  <p className="text-gray-500 text-sm">Free forever</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                Current Plan
              </span>
            </div>
          </Card>

          {/* Upgrade CTA */}
          <Card className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-gray-900">Upgrade to PeeAP Plus</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Unlock invoicing, recurring payments, employee cards, and more with a 7-day free trial.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleUpgrade('business')}
                    className="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition flex items-center gap-2"
                  >
                    Business - NLE 150/mo
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleUpgrade('business_plus')}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition flex items-center gap-2"
                  >
                    Business++ - NLE 500/mo
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Plan Comparison Link */}
          <div className="text-center">
            <button
              onClick={() => navigate('/merchant/upgrade')}
              className="text-amber-600 hover:text-amber-700 font-medium inline-flex items-center gap-1"
            >
              Compare all plans
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </MerchantLayout>
    );
  }

  const trialDays = getTrialDaysRemaining();

  return (
    <MerchantLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
          <p className="text-gray-600 mt-1">Manage your PeeAP Plus subscription</p>
        </div>

        {/* Trial Banner */}
        {subscription.status === 'trialing' && trialDays > 0 && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-blue-900">
                    {trialDays} day{trialDays !== 1 ? 's' : ''} remaining in your free trial
                  </p>
                  <p className="text-sm text-blue-700">
                    Trial ends on {formatDate(subscription.trial_ends_at)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleUpgrade(subscription.tier)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Subscribe Now
              </button>
            </div>
          </Card>
        )}

        {/* Current Plan Card */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                subscription.tier === 'business_plus'
                  ? 'bg-purple-100'
                  : subscription.tier === 'business'
                  ? 'bg-amber-100'
                  : 'bg-gray-100'
              }`}>
                <CreditCard className={`w-6 h-6 ${
                  subscription.tier === 'business_plus'
                    ? 'text-purple-600'
                    : subscription.tier === 'business'
                    ? 'text-amber-600'
                    : 'text-gray-600'
                }`} />
              </div>
              <div>
                <h2 className="font-bold text-lg text-gray-900">
                  {getTierName(subscription.tier)} Plan
                </h2>
                <p className="text-gray-500 text-sm">
                  {subscription.currency} {formatPrice(subscription.price_monthly)}/month
                </p>
              </div>
            </div>
            {getStatusBadge(subscription.status)}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Calendar className="w-4 h-4" />
                {subscription.status === 'trialing' ? 'Trial Started' : 'Current Period Start'}
              </div>
              <p className="font-medium text-gray-900">
                {formatDate(subscription.status === 'trialing'
                  ? subscription.trial_started_at
                  : subscription.current_period_start)}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <RefreshCw className="w-4 h-4" />
                {subscription.status === 'trialing' ? 'Trial Ends' : 'Next Billing Date'}
              </div>
              <p className="font-medium text-gray-900">
                {formatDate(subscription.status === 'trialing'
                  ? subscription.trial_ends_at
                  : subscription.current_period_end)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex gap-3">
              {subscription.tier === 'business' && (
                <button
                  onClick={() => handleUpgrade('business_plus')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition flex items-center gap-2"
                >
                  Upgrade to Business++
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              )}
              {subscription.status !== 'cancelled' && subscription.status !== 'expired' && (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition"
                >
                  Cancel Subscription
                </button>
              )}
            </div>
            <a
              href="https://plus.peeap.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-600 hover:text-amber-700 font-medium inline-flex items-center gap-1"
            >
              Go to Plus Dashboard
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </Card>

        {/* Payment Method */}
        <Card className="p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Payment Method
          </h3>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">PeeAP Wallet</p>
                <p className="text-sm text-gray-500">Auto-deducted monthly</p>
              </div>
            </div>
            <span className="text-sm text-green-600 font-medium flex items-center gap-1">
              <Check className="w-4 h-4" />
              Active
            </span>
          </div>
          <p className="mt-3 text-sm text-gray-500">
            Subscription payments are automatically deducted from your PeeAP wallet balance.
            Ensure sufficient balance to avoid service interruption.
          </p>
        </Card>

        {/* Billing History */}
        <Card className="p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <History className="w-5 h-5" />
            Billing History
          </h3>

          {invoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p>No billing history yet</p>
              {subscription.status === 'trialing' && (
                <p className="text-sm mt-1">Your first invoice will be generated after your trial ends</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {invoice.invoice_number || `Invoice #${invoice.id.slice(0, 8)}`}
                    </p>
                    <p className="text-sm text-gray-500">{formatDate(invoice.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {invoice.currency} {formatPrice(invoice.amount)}
                    </p>
                    <span className={`text-xs font-medium ${
                      invoice.status === 'paid'
                        ? 'text-green-600'
                        : invoice.status === 'pending'
                        ? 'text-amber-600'
                        : 'text-red-600'
                    }`}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Cancel Confirmation Modal */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="font-bold text-lg text-gray-900">Cancel Subscription?</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to cancel your subscription? You'll lose access to premium features at the end of your current billing period.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={handleCancelSubscription}
                  disabled={cancellingSubscription}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {cancellingSubscription ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    'Yes, Cancel'
                  )}
                </button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </MerchantLayout>
  );
}
