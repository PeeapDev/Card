/**
 * Merchant Subscriptions Page
 *
 * Combined page with tabs:
 * - My Plan: Shows merchant's own PeeAP Plus subscription
 * - Subscription Plans: Create and manage plans for customers
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Repeat,
  Users,
  DollarSign,
  TrendingUp,
  Copy,
  ExternalLink,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Check,
  Clock,
  XCircle,
  AlertCircle,
  Store,
  ChevronDown,
  CreditCard,
  Calendar,
  Wallet,
  RefreshCw,
  FileText,
  Crown,
  Zap,
  Star,
  ArrowRight,
  ArrowUpRight,
  Receipt,
  Building2,
  Settings,
} from 'lucide-react';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card, CardHeader, CardTitle, Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { TierManagement } from '@/components/subscription/TierManagement';
import {
  subscriptionService,
  SubscriptionPlan,
  Subscription,
  CreatePlanRequest,
} from '@/services/subscription.service';
import { businessService, MerchantBusiness } from '@/services/business.service';
import { supabase } from '@/lib/supabase';
import { ssoService } from '@/services/sso.service';

// My Plan interfaces
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

const INTERVAL_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  trialing: 'bg-blue-100 text-blue-800',
  past_due: 'bg-red-100 text-red-800',
  canceled: 'bg-gray-100 text-gray-800',
  paused: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-orange-100 text-orange-800',
};

export function MerchantSubscriptionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Check if user is admin
  const isAdmin = user?.roles?.includes('admin') || false;

  // Main tab: 'my-plan', 'customer-plans', or 'tier-config' (admin only)
  const getInitialTab = (): 'my-plan' | 'customer-plans' | 'tier-config' => {
    const tab = searchParams.get('tab');
    if (tab === 'customer-plans') return 'customer-plans';
    if (tab === 'tier-config' && isAdmin) return 'tier-config';
    return 'my-plan';
  };

  const [mainTab, setMainTab] = useState<'my-plan' | 'customer-plans' | 'tier-config'>(getInitialTab());
  const [activeTab, setActiveTab] = useState<'plans' | 'subscribers'>('plans');

  // Business selection (for customer plans)
  const [businesses, setBusinesses] = useState<MerchantBusiness[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<MerchantBusiness | null>(null);
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);

  // Plans state (for customer plans)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Subscribers state (for customer plans)
  const [subscribers, setSubscribers] = useState<Subscription[]>([]);
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);

  // Stats (for customer plans)
  const [stats, setStats] = useState({
    total_subscriptions: 0,
    active_subscriptions: 0,
    trialing_subscriptions: 0,
    canceled_subscriptions: 0,
    mrr: 0,
    currency: 'SLE',
  });

  // Form state (for customer plans)
  const [formData, setFormData] = useState<CreatePlanRequest>({
    name: '',
    description: '',
    features: [],
    amount: 0,
    currency: 'SLE',
    interval: 'monthly',
    interval_count: 1,
    trial_days: 0,
  });
  const [featureInput, setFeatureInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // My Plan state
  const [mySubscription, setMySubscription] = useState<MerchantSubscription | null>(null);
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [loadingMyPlan, setLoadingMyPlan] = useState(true);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Update URL when tab changes
  const handleMainTabChange = (tab: 'my-plan' | 'customer-plans' | 'tier-config') => {
    setMainTab(tab);
    setSearchParams({ tab });
  };

  // Load businesses on mount
  useEffect(() => {
    loadBusinesses();
  }, []);

  // Load My Plan data
  useEffect(() => {
    if (user?.id) {
      fetchMySubscription();
      fetchInvoices();
    } else {
      setLoadingMyPlan(false);
    }
  }, [user?.id]);

  // Load plans when business is selected
  useEffect(() => {
    if (selectedBusiness?.id) {
      loadPlans();
      loadStats();
    }
  }, [selectedBusiness?.id]);

  useEffect(() => {
    if (activeTab === 'subscribers' && selectedBusiness?.id) {
      loadSubscribers();
    }
  }, [activeTab, selectedBusiness?.id]);

  const loadBusinesses = async () => {
    try {
      setLoadingBusinesses(true);
      const data = await businessService.getMyBusinesses();
      setBusinesses(data);
      // Auto-select first business with subscriptions enabled, or just first business
      const subscriptionEnabled = data.find(b => b.enabled_features?.includes('subscriptions'));
      setSelectedBusiness(subscriptionEnabled || data[0] || null);
    } catch (err) {
      console.error('Failed to load businesses:', err);
    } finally {
      setLoadingBusinesses(false);
    }
  };

  const loadPlans = async () => {
    if (!selectedBusiness) return;
    try {
      setLoadingPlans(true);
      const data = await subscriptionService.getMerchantPlans(selectedBusiness.id);
      setPlans(data);
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setLoadingPlans(false);
    }
  };

  const loadSubscribers = async () => {
    if (!selectedBusiness) return;
    try {
      setLoadingSubscribers(true);
      const data = await subscriptionService.getMerchantSubscriptions(selectedBusiness.id);
      setSubscribers(data);
    } catch (err) {
      console.error('Failed to load subscribers:', err);
    } finally {
      setLoadingSubscribers(false);
    }
  };

  const loadStats = async () => {
    if (!selectedBusiness) return;
    try {
      const data = await subscriptionService.getMerchantStats(selectedBusiness.id);
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  // My Plan functions
  const fetchMySubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('merchant_subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', error);
      }

      setMySubscription(data || null);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoadingMyPlan(false);
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

  const handleOpenPlusDashboard = async () => {
    if (!user) return;

    try {
      const redirectUrl = await ssoService.getRedirectUrl({
        user: user,
        targetApp: 'plus',
        redirectPath: '/dashboard',
      });

      window.open(redirectUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('SSO redirect failed:', err);
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
        await supabase
          .from('merchant_subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
          })
          .eq('user_id', user?.id);
      }

      await fetchMySubscription();
      setShowCancelConfirm(false);
    } catch (err) {
      console.error('Error cancelling subscription:', err);
    } finally {
      setCancellingSubscription(false);
    }
  };

  const getTrialDaysRemaining = () => {
    if (!mySubscription?.trial_ends_at) return 0;
    const end = new Date(mySubscription.trial_ends_at);
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
            <AlertCircle className="w-3 h-3" />
            Expired
          </span>
        );
      case 'past_due':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <AlertCircle className="w-3 h-3" />
            Past Due
          </span>
        );
      default:
        return null;
    }
  };

  const handleCreatePlan = async () => {
    if (!selectedBusiness) {
      setError('Please select a business first');
      return;
    }
    if (!formData.name || formData.amount <= 0) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      await subscriptionService.createPlan(selectedBusiness.id, formData);
      setShowCreateModal(false);
      setFormData({
        name: '',
        description: '',
        features: [],
        amount: 0,
        currency: 'SLE',
        interval: 'monthly',
        interval_count: 1,
        trial_days: 0,
      });
      await loadPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create plan');
    } finally {
      setCreating(false);
    }
  };

  const handleTogglePlanStatus = async (plan: SubscriptionPlan) => {
    try {
      if (plan.is_active) {
        await subscriptionService.deactivatePlan(plan.id);
      } else {
        await subscriptionService.updatePlan(plan.id, { name: plan.name }); // Just to trigger update
      }
      await loadPlans();
    } catch (err) {
      console.error('Failed to toggle plan status:', err);
    }
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setFormData({
        ...formData,
        features: [...(formData.features || []), featureInput.trim()],
      });
      setFeatureInput('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features?.filter((_, i) => i !== index),
    });
  };

  const copySubscriptionLink = (planId: string) => {
    const link = `${window.location.origin}/subscribe/${planId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(planId);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const formatAmount = (amount: number, currency: string) => {
    const symbols: Record<string, string> = { SLE: 'Le', USD: '$', EUR: '€', GBP: '£' };
    return `${symbols[currency] || currency} ${amount.toLocaleString()}`;
  };

  const trialDays = getTrialDaysRemaining();

  // Render My Plan Tab content
  const renderMyPlanTab = () => {
    if (loadingMyPlan) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      );
    }

    // No subscription - show upgrade options
    if (!mySubscription) {
      return (
        <div className="max-w-5xl mx-auto space-y-8">
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
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Free forever - Basic payment acceptance</p>
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

              {/* Business++ Plan - Locked until Business tier */}
              <Card className="p-6 border-2 border-gray-200 dark:border-gray-700 relative overflow-hidden opacity-75">
                <div className="absolute -top-1 -right-1">
                  <div className="bg-gray-400 dark:bg-gray-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    NEXT TIER
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
                  </ul>
                  <button
                    disabled
                    className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-xl font-medium cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Requires Business Plan
                  </button>
                  <p className="text-xs text-center text-amber-600 dark:text-amber-400 mt-2">
                    Upgrade to Business first to unlock
                  </p>
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
      );
    }

    // Has subscription - show subscription details
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Open Plus Dashboard Button */}
        <div className="flex justify-end">
          <button
            onClick={handleOpenPlusDashboard}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-indigo-600 transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2"
          >
            <Building2 className="w-4 h-4" />
            Open Plus Dashboard
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* Trial Banner */}
        {(mySubscription.status === 'trialing' || (mySubscription.trial_ends_at && trialDays > 0)) && (
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
                    {mySubscription.trial_ends_at ? (
                      <>Started {formatDate(mySubscription.trial_started_at)} - Ends {formatDate(mySubscription.trial_ends_at)}</>
                    ) : (
                      <>Subscription started {formatDate(mySubscription.created_at)}</>
                    )}
                  </p>
                </div>
              </div>
              {trialDays > 0 && mySubscription.status === 'trialing' && (
                <button
                  onClick={() => handleUpgrade(mySubscription.tier)}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition flex items-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  Subscribe Now
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </Card>
        )}

        {/* Current Plan Card */}
        <Card className={`p-6 border-2 ${
          mySubscription.tier === 'business_plus'
            ? 'border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/50 to-indigo-50/50 dark:from-purple-900/10 dark:to-indigo-900/10'
            : mySubscription.tier === 'business'
            ? 'border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10'
            : 'border-gray-200 dark:border-gray-700'
        }`}>
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                mySubscription.tier === 'business_plus'
                  ? 'bg-gradient-to-br from-purple-500 to-indigo-500 shadow-purple-500/30'
                  : mySubscription.tier === 'business'
                  ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/30'
                  : 'bg-gray-100'
              }`}>
                {mySubscription.tier === 'business_plus' ? (
                  <Star className="w-7 h-7 text-white" />
                ) : mySubscription.tier === 'business' ? (
                  <Zap className="w-7 h-7 text-white" />
                ) : (
                  <CreditCard className="w-7 h-7 text-gray-600" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-xl text-gray-900 dark:text-white">
                    {getTierName(mySubscription.tier)} Plan
                  </h2>
                  {getStatusBadge(mySubscription.status)}
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  {mySubscription.currency} {formatPrice(mySubscription.price_monthly)}/month
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {mySubscription.currency} {formatPrice(mySubscription.price_monthly)}
              </p>
              <p className="text-gray-500 text-sm">/month</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-xl">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <Calendar className="w-3.5 h-3.5" />
                {mySubscription.status === 'trialing' ? 'Trial Started' : 'Period Start'}
              </div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                {formatDate(mySubscription.status === 'trialing'
                  ? mySubscription.trial_started_at
                  : mySubscription.current_period_start)}
              </p>
            </div>
            <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-xl">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <RefreshCw className="w-3.5 h-3.5" />
                {mySubscription.status === 'trialing' ? 'Trial Ends' : 'Next Billing'}
              </div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                {formatDate(mySubscription.status === 'trialing'
                  ? mySubscription.trial_ends_at
                  : mySubscription.current_period_end)}
              </p>
            </div>
            <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-xl">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                Status
              </div>
              <p className="font-semibold text-green-600 dark:text-green-400 text-sm capitalize">
                {mySubscription.status === 'trialing' ? 'Free Trial' : mySubscription.status}
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
              {mySubscription.tier === 'business' && (
                <button
                  onClick={() => handleUpgrade('business_plus')}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-indigo-600 transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2"
                >
                  <Star className="w-4 h-4" />
                  Upgrade to Business++
                </button>
              )}
            </div>
            {mySubscription.status !== 'cancelled' && mySubscription.status !== 'expired' && (
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
                  {mySubscription.currency} {formatPrice(
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
              {mySubscription.status === 'trialing' && (
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
                  <AlertCircle className="w-5 h-5 text-red-600" />
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
    );
  };

  // Render Customer Plans Tab content
  const renderCustomerPlansTab = () => {
    // Show loading state while fetching businesses
    if (loadingBusinesses) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      );
    }

    // Show message if no businesses
    if (businesses.length === 0) {
      return (
        <div className="text-center py-12">
          <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Business Found</h2>
          <p className="text-gray-500 mb-4">Create a business first to offer subscription plans</p>
          <Button onClick={() => window.location.href = '/merchant/developer/new'}>
            Create Business
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header with Business Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Business Selector */}
            <div className="relative">
              <button
                onClick={() => setShowBusinessDropdown(!showBusinessDropdown)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Store className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{selectedBusiness?.name || 'Select Business'}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {showBusinessDropdown && (
                <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {businesses.map((biz) => (
                    <button
                      key={biz.id}
                      onClick={() => {
                        setSelectedBusiness(biz);
                        setShowBusinessDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between ${
                        selectedBusiness?.id === biz.id ? 'bg-primary-50' : ''
                      }`}
                    >
                      <div>
                        <p className="font-medium text-gray-900">{biz.name}</p>
                        {biz.enabled_features?.includes('subscriptions') ? (
                          <span className="text-xs text-green-600">Subscriptions enabled</span>
                        ) : (
                          <span className="text-xs text-gray-400">Subscriptions not enabled</span>
                        )}
                      </div>
                      {selectedBusiness?.id === biz.id && (
                        <Check className="w-4 h-4 text-primary-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={() => setShowCreateModal(true)} disabled={!selectedBusiness?.enabled_features?.includes('subscriptions')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Plan
            </Button>
          </div>
        </div>

        {/* Warning if subscriptions not enabled */}
        {selectedBusiness && !selectedBusiness.enabled_features?.includes('subscriptions') && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">Subscriptions not enabled</p>
              <p className="text-sm text-yellow-700">
                Contact admin to enable subscription billing for "{selectedBusiness.name}".
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Users className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active_subscriptions}</p>
                <p className="text-sm text-gray-500">Active Subscribers</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.trialing_subscriptions}</p>
                <p className="text-sm text-gray-500">In Trial</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatAmount(stats.mrr, stats.currency)}</p>
                <p className="text-sm text-gray-500">Monthly Revenue</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Repeat className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{plans.filter(p => p.is_active).length}</p>
                <p className="text-sm text-gray-500">Active Plans</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('plans')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'plans'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Subscription Plans
            </button>
            <button
              onClick={() => setActiveTab('subscribers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'subscribers'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Subscribers
            </button>
          </nav>
        </div>

        {/* Plans Tab */}
        {activeTab === 'plans' && (
          <div className="space-y-4">
            {loadingPlans ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Loading plans...</p>
              </div>
            ) : plans.length === 0 ? (
              <Card className="p-12 text-center">
                <Repeat className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No subscription plans yet</h3>
                <p className="text-gray-500 mb-6">Create your first plan to start accepting recurring payments</p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Plan
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map((plan) => (
                  <Card key={plan.id} className={`overflow-hidden ${!plan.is_active ? 'opacity-60' : ''}`}>
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                          <p className="text-sm text-gray-500">{plan.description || 'No description'}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${plan.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {plan.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="mb-4">
                        <span className="text-3xl font-bold text-gray-900">
                          {formatAmount(plan.amount, plan.currency)}
                        </span>
                        <span className="text-gray-500 ml-1">
                          / {plan.interval_count > 1 ? `${plan.interval_count} ` : ''}{plan.interval}
                        </span>
                      </div>

                      {plan.trial_days > 0 && (
                        <div className="mb-4 inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">
                          <Clock className="w-3 h-3" />
                          {plan.trial_days}-day trial
                        </div>
                      )}

                      {plan.features && plan.features.length > 0 && (
                        <ul className="space-y-2 mb-4">
                          {plan.features.slice(0, 3).map((feature, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                              <Check className="w-4 h-4 text-green-500" />
                              {feature}
                            </li>
                          ))}
                          {plan.features.length > 3 && (
                            <li className="text-sm text-gray-400">+{plan.features.length - 3} more</li>
                          )}
                        </ul>
                      )}

                      <div className="flex items-center gap-2 pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => copySubscriptionLink(plan.id)}
                        >
                          {copiedLink === plan.id ? (
                            <><Check className="w-4 h-4 mr-1" /> Copied!</>
                          ) : (
                            <><Copy className="w-4 h-4 mr-1" /> Copy Link</>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/subscribe/${plan.id}`, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePlanStatus(plan)}
                        >
                          {plan.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Subscribers Tab */}
        {activeTab === 'subscribers' && (
          <Card>
            <CardHeader>
              <CardTitle>All Subscribers</CardTitle>
            </CardHeader>
            {loadingSubscribers ? (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Loading subscribers...</p>
              </div>
            ) : subscribers.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No subscribers yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Billing</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {subscribers.map((sub) => (
                      <tr key={sub.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{sub.customer_name || 'Unknown'}</p>
                            <p className="text-sm text-gray-500">{sub.customer_email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900">{sub.plan?.name || 'Unknown Plan'}</p>
                          <p className="text-sm text-gray-500">
                            {sub.plan && formatAmount(sub.plan.amount, sub.plan.currency)}/{sub.plan?.interval}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[sub.status] || 'bg-gray-100'}`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {sub.next_billing_date
                            ? new Date(sub.next_billing_date).toLocaleDateString()
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(sub.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Create Plan Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">Create Subscription Plan</h2>
                <p className="text-gray-500 text-sm mt-1">Set up a recurring payment plan for your customers</p>
              </div>

              <div className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Premium Membership"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what's included in this plan..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                    <input
                      type="number"
                      value={formData.amount || ''}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                      placeholder="50000"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="SLE">SLE (Leone)</option>
                      <option value="USD">USD (Dollar)</option>
                      <option value="EUR">EUR (Euro)</option>
                      <option value="GBP">GBP (Pound)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Billing Interval</label>
                    <select
                      value={formData.interval}
                      onChange={(e) => setFormData({ ...formData, interval: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {INTERVAL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trial Days</label>
                    <input
                      type="number"
                      value={formData.trial_days || ''}
                      onChange={(e) => setFormData({ ...formData, trial_days: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Features</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={featureInput}
                      onChange={(e) => setFeatureInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                      placeholder="Add a feature..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <Button type="button" variant="outline" onClick={addFeature}>Add</Button>
                  </div>
                  {formData.features && formData.features.length > 0 && (
                    <ul className="space-y-2">
                      {formData.features.map((feature, index) => (
                        <li key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm">{feature}</span>
                          <button
                            type="button"
                            onClick={() => removeFeature(index)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="p-6 border-t flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={creating}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePlan} disabled={creating}>
                  {creating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                  ) : (
                    'Create Plan'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscriptions</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your plan and create subscription plans for customers</p>
        </div>

        {/* Main Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-8">
            <button
              onClick={() => handleMainTabChange('my-plan')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                mainTab === 'my-plan'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              My Plan
            </button>
            <button
              onClick={() => handleMainTabChange('customer-plans')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                mainTab === 'customer-plans'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Repeat className="w-4 h-4" />
              Plans for Customers
            </button>
            {/* Admin-only Tier Configuration Tab */}
            {isAdmin && (
              <button
                onClick={() => handleMainTabChange('tier-config')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  mainTab === 'tier-config'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Settings className="w-4 h-4" />
                Tier Configuration
              </button>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        {mainTab === 'my-plan' && renderMyPlanTab()}
        {mainTab === 'customer-plans' && renderCustomerPlansTab()}
        {mainTab === 'tier-config' && isAdmin && <TierManagement />}
      </div>
    </MerchantLayout>
  );
}
