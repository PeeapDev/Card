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
  Crown,
  Zap,
  Star,
  ExternalLink,
  Receipt,
  TrendingUp,
  Users,
  Building2,
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

  // Open Plus dashboard in new tab with SSO auto-login
  const handleOpenPlusDashboard = async () => {
    if (!user) return;

    try {
      // Use SSO to get redirect URL
      const redirectUrl = await ssoService.getRedirectUrl({
        user: user,
        targetApp: 'plus',
        redirectPath: '/dashboard',
      });

      // Open in new tab
      window.open(redirectUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('SSO redirect failed:', err);
      // Fallback to direct link
      window.open('https://plus.peeap.com/dashboard', '_blank', 'noopener,noreferrer');
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

  // No subscription - show upgrade options with pricing
  if (!subscription) {
    return (
      <MerchantLayout>
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Plan</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Choose the right plan for your business</p>
          </div>

          {/* Current Plan Banner */}
          <Card className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white dark:bg-gray-700 rounded-2xl shadow-sm flex items-center justify-center">
                  <Wallet className="w-7 h-7 text-gray-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-xl text-gray-900 dark:text-white">Basic Plan</h2>
                    <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded text-xs font-medium">
                      Current
                    </span>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Free forever • Basic payment acceptance</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">NLE 0</p>
                <p className="text-gray-500 text-sm">/month</p>
              </div>
            </div>
          </Card>

          {/* Upgrade Section */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Upgrade to Peeap Plus</h2>
                <p className="text-gray-500 text-sm">Start with 7 days free trial</p>
              </div>
            </div>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Business Plan */}
              <Card className="p-6 border-2 border-amber-200 dark:border-amber-800 hover:border-amber-400 dark:hover:border-amber-600 transition-colors relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-bl-full" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                      <Zap className="w-5 h-5 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Business</h3>
                  </div>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">NLE 150</span>
                    <span className="text-gray-500">/month</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>Professional invoicing</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>Recurring payments</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>Customer management</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>Priority support</span>
                    </li>
                  </ul>
                  <button
                    onClick={() => handleUpgrade('business')}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                  >
                    Start Free Trial
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </Card>

              {/* Business++ Plan */}
              <Card className="p-6 border-2 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 transition-colors relative overflow-hidden">
                <div className="absolute -top-1 -right-1">
                  <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    POPULAR
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-bl-full" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                      <Star className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Business++</h3>
                  </div>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">NLE 500</span>
                    <span className="text-gray-500">/month</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>Everything in Business</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>Employee expense cards</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>Multi-user access</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>Advanced analytics</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>Dedicated account manager</span>
                    </li>
                  </ul>
                  <button
                    onClick={() => handleUpgrade('business_plus')}
                    className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-indigo-600 transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                  >
                    Start Free Trial
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            </div>
          </div>

          {/* Compare Plans Link */}
          <div className="text-center">
            <button
              onClick={() => navigate('/merchant/upgrade')}
              className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium inline-flex items-center gap-1"
            >
              Compare all plans and features
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
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Plan</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your PeeAP Plus subscription</p>
          </div>
          <button
            onClick={handleOpenPlusDashboard}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-indigo-600 transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2"
          >
            <Building2 className="w-4 h-4" />
            Open Plus Dashboard
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* Trial Banner - Show when trial is active OR when trial_ends_at exists and hasn't passed */}
        {(subscription.status === 'trialing' || (subscription.trial_ends_at && trialDays > 0)) && (
          <Card className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-bold text-lg text-blue-900 dark:text-blue-100">
                    {trialDays > 0 ? (
                      <>{trialDays} day{trialDays !== 1 ? 's' : ''} remaining in trial</>
                    ) : (
                      <>Trial period</>
                    )}
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {subscription.trial_ends_at ? (
                      <>Started {formatDate(subscription.trial_started_at)} • Ends {formatDate(subscription.trial_ends_at)}</>
                    ) : (
                      <>Subscription started {formatDate(subscription.created_at)}</>
                    )}
                  </p>
                </div>
              </div>
              {trialDays > 0 && subscription.status === 'trialing' && (
                <button
                  onClick={() => handleUpgrade(subscription.tier)}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition flex items-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  Subscribe Now
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </Card>
        )}

        {/* Current Plan Card - Improved */}
        <Card className={`p-6 border-2 ${
          subscription.tier === 'business_plus'
            ? 'border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/50 to-indigo-50/50 dark:from-purple-900/10 dark:to-indigo-900/10'
            : subscription.tier === 'business'
            ? 'border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10'
            : 'border-gray-200 dark:border-gray-700'
        }`}>
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                subscription.tier === 'business_plus'
                  ? 'bg-gradient-to-br from-purple-500 to-indigo-500 shadow-purple-500/30'
                  : subscription.tier === 'business'
                  ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/30'
                  : 'bg-gray-100'
              }`}>
                {subscription.tier === 'business_plus' ? (
                  <Star className="w-7 h-7 text-white" />
                ) : subscription.tier === 'business' ? (
                  <Zap className="w-7 h-7 text-white" />
                ) : (
                  <CreditCard className="w-7 h-7 text-gray-600" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-xl text-gray-900 dark:text-white">
                    {getTierName(subscription.tier)} Plan
                  </h2>
                  {getStatusBadge(subscription.status)}
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  {subscription.currency} {formatPrice(subscription.price_monthly)}/month
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {subscription.currency} {formatPrice(subscription.price_monthly)}
              </p>
              <p className="text-gray-500 text-sm">/month</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-xl">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <Calendar className="w-3.5 h-3.5" />
                {subscription.status === 'trialing' ? 'Trial Started' : 'Period Start'}
              </div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                {formatDate(subscription.status === 'trialing'
                  ? subscription.trial_started_at
                  : subscription.current_period_start)}
              </p>
            </div>
            <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-xl">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <RefreshCw className="w-3.5 h-3.5" />
                {subscription.status === 'trialing' ? 'Trial Ends' : 'Next Billing'}
              </div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                {formatDate(subscription.status === 'trialing'
                  ? subscription.trial_ends_at
                  : subscription.current_period_end)}
              </p>
            </div>
            <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-xl">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                Status
              </div>
              <p className="font-semibold text-green-600 dark:text-green-400 text-sm capitalize">
                {subscription.status === 'trialing' ? 'Free Trial' : subscription.status}
              </p>
            </div>
            <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-xl">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <Wallet className="w-3.5 h-3.5" />
                Payment
              </div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Wallet</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-3">
              {subscription.tier === 'business' && (
                <button
                  onClick={() => handleUpgrade('business_plus')}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-indigo-600 transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2"
                >
                  <Star className="w-4 h-4" />
                  Upgrade to Business++
                </button>
              )}
            </div>
            {subscription.status !== 'cancelled' && subscription.status !== 'expired' && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="px-4 py-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 font-medium transition text-sm"
              >
                Cancel Subscription
              </button>
            )}
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Payment Method */}
          <Card className="p-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-green-600" />
              Payment Method
            </h3>
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">PeeAP Wallet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Auto-deducted monthly</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full text-xs font-medium flex items-center gap-1">
                <Check className="w-3 h-3" />
                Active
              </span>
            </div>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Ensure sufficient wallet balance to avoid service interruption.
            </p>
          </Card>

          {/* Quick Stats */}
          <Card className="p-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Subscription Stats
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {invoices.filter(i => i.status === 'paid').length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Payments Made</p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-center">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {subscription.currency} {formatPrice(
                    invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0)
                  )}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Paid</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Billing History */}
        <Card className="p-6">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            Billing History
          </h3>

          {invoices.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <p className="font-medium text-gray-900 dark:text-white">No billing history yet</p>
              {subscription.status === 'trialing' && (
                <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">Your first invoice will be generated after your trial ends</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      invoice.status === 'paid'
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : invoice.status === 'pending'
                        ? 'bg-amber-100 dark:bg-amber-900/30'
                        : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      <Receipt className={`w-5 h-5 ${
                        invoice.status === 'paid'
                          ? 'text-green-600 dark:text-green-400'
                          : invoice.status === 'pending'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {invoice.invoice_number || `Invoice #${invoice.id.slice(0, 8)}`}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(invoice.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {invoice.currency} {formatPrice(invoice.amount)}
                    </p>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                      invoice.status === 'paid'
                        ? 'text-green-600 dark:text-green-400'
                        : invoice.status === 'pending'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {invoice.status === 'paid' && <Check className="w-3 h-3" />}
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
