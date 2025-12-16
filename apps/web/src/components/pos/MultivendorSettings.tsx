/**
 * Multivendor Settings Component
 *
 * Allows merchants to enable/disable multivendor marketplace listing
 * with subscription management and free trial
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import multivendorService, {
  MultivendorSettings as Settings,
  MULTIVENDOR_PLANS,
} from '@/services/multivendor.service';
import { monimeService } from '@/services/monime.service';
import { walletService } from '@/services/wallet.service';
import {
  Globe,
  ShoppingBag,
  Loader2,
  Check,
  AlertCircle,
  Clock,
  Star,
  Zap,
  Eye,
  TrendingUp,
  Users,
  CreditCard,
  Sparkles,
  Gift,
  ChevronRight,
  X,
  Wallet,
} from 'lucide-react';

// Format currency
const formatCurrency = (amount: number) => {
  return `Le ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

interface Props {
  merchantId: string;
}

export function MultivendorSettings({ merchantId }: Props) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    loadWalletBalance();
  }, [merchantId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await multivendorService.getSettings(merchantId);
      setSettings(data);
    } catch (error) {
      console.error('Error loading multivendor settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWalletBalance = async () => {
    if (!user?.id) return;
    try {
      const wallet = await walletService.getWalletByUserId(user.id);
      setWalletBalance(wallet?.balance || 0);
    } catch (error) {
      console.error('Error loading wallet:', error);
    }
  };

  const handleToggle = async () => {
    if (!settings) {
      // First time enabling - start free trial
      setToggling(true);
      try {
        const newSettings = await multivendorService.startTrial(merchantId);
        setSettings(newSettings);
      } catch (error: any) {
        setError(error.message);
      } finally {
        setToggling(false);
      }
      return;
    }

    // If trial expired or no subscription, show subscription modal
    if (
      !settings.is_enabled &&
      (settings.subscription_status === 'expired' ||
        settings.subscription_status === 'none' ||
        settings.subscription_status === 'cancelled')
    ) {
      if (settings.has_used_trial) {
        setShowSubscriptionModal(true);
        return;
      } else {
        // Start trial
        setToggling(true);
        try {
          const newSettings = await multivendorService.startTrial(merchantId);
          setSettings(newSettings);
        } catch (error: any) {
          setError(error.message);
        } finally {
          setToggling(false);
        }
        return;
      }
    }

    // Just toggle
    setToggling(true);
    try {
      const newSettings = await multivendorService.toggle(merchantId, !settings.is_enabled);
      setSettings(newSettings);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setToggling(false);
    }
  };

  const handleSubscribe = async () => {
    const plan = MULTIVENDOR_PLANS.find(p => p.id === selectedPlan);
    if (!plan) return;

    setProcessingPayment(true);
    setError(null);

    try {
      // Check wallet balance
      if (walletBalance < plan.price) {
        // Redirect to deposit
        const wallet = await walletService.getWalletByUserId(user!.id);
        if (!wallet) throw new Error('Wallet not found');

        const response = await monimeService.initiateDeposit({
          walletId: wallet.id,
          amount: plan.price,
          successUrl: `${window.location.origin}/merchant/pos/settings?tab=multivendor&subscribed=true&plan=${selectedPlan}`,
          cancelUrl: `${window.location.origin}/merchant/pos/settings?tab=multivendor&cancelled=true`,
          description: `Multivendor ${plan.name} Subscription`,
        });

        if (response.paymentUrl) {
          window.location.href = response.paymentUrl;
        }
        return;
      }

      // Pay from wallet and activate subscription
      const wallet = await walletService.getWalletByUserId(user!.id);
      if (!wallet) throw new Error('Wallet not found');

      // Deduct from wallet (transfer to platform wallet)
      // For now, we'll just activate the subscription
      // In production, you'd transfer funds to platform wallet

      const newSettings = await multivendorService.activateSubscription(
        merchantId,
        selectedPlan,
        `SUB-${Date.now()}`,
        plan.price
      );

      setSettings(newSettings);
      setShowSubscriptionModal(false);
    } catch (error: any) {
      setError(error.message || 'Failed to process subscription');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Check for subscription callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscribed') === 'true') {
      const plan = params.get('plan') as 'monthly' | 'yearly';
      if (plan) {
        // Activate subscription after successful payment
        const activateAfterPayment = async () => {
          try {
            const newSettings = await multivendorService.activateSubscription(
              merchantId,
              plan,
              `SUB-${Date.now()}`,
              MULTIVENDOR_PLANS.find(p => p.id === plan)?.price || 0
            );
            setSettings(newSettings);
          } catch (error) {
            console.error('Error activating subscription:', error);
          }
        };
        activateAfterPayment();
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname + '?tab=multivendor');
      }
    }
  }, [merchantId]);

  const isActive = settings?.is_enabled &&
    (settings.subscription_status === 'trial' || settings.subscription_status === 'active');

  const remainingDays = settings ? multivendorService.getRemainingTrialDays(settings) : 0;

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card className="p-6 bg-gradient-to-br from-purple-600 to-indigo-700 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-6 h-6" />
                <h2 className="text-xl font-bold">POS Multivendor Marketplace</h2>
              </div>
              <p className="text-purple-100 max-w-lg">
                List your products on the Peeap marketplace and reach thousands of customers.
                Your products will appear on user dashboards and the shop page.
              </p>
            </div>

            {/* Toggle */}
            <div className="flex flex-col items-end gap-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive || false}
                  onChange={handleToggle}
                  disabled={toggling}
                  className="sr-only peer"
                />
                <div className={`w-14 h-8 rounded-full peer transition-colors ${
                  isActive ? 'bg-green-500' : 'bg-white/30'
                } peer-focus:ring-4 peer-focus:ring-white/20 after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all ${
                  isActive ? 'after:translate-x-6' : ''
                }`} />
              </label>
              <span className="text-sm text-purple-100">
                {toggling ? 'Processing...' : isActive ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          {/* Status Badge */}
          {settings && (
            <div className="mt-4 flex items-center gap-3">
              {settings.subscription_status === 'trial' && remainingDays > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400 text-yellow-900 rounded-full text-sm font-medium">
                  <Gift className="w-4 h-4" />
                  Free Trial - {remainingDays} days left
                </span>
              )}
              {settings.subscription_status === 'active' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-400 text-green-900 rounded-full text-sm font-medium">
                  <Check className="w-4 h-4" />
                  Active Subscription
                </span>
              )}
              {(settings.subscription_status === 'expired' ||
                (settings.subscription_status === 'trial' && remainingDays === 0)) && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-400 text-red-900 rounded-full text-sm font-medium">
                  <AlertCircle className="w-4 h-4" />
                  {settings.subscription_status === 'trial' ? 'Trial Expired' : 'Subscription Expired'}
                </span>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-sm text-red-600 hover:text-red-800 mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Features */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">What You Get</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Eye className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Dashboard Visibility</p>
              <p className="text-sm text-gray-500">Products appear on user dashboards</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Shop Listing</p>
              <p className="text-sm text-gray-500">Listed in the marketplace shop</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Reach Customers</p>
              <p className="text-sm text-gray-500">Access to thousands of users</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Analytics</p>
              <p className="text-sm text-gray-500">Track views, orders & revenue</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Instant Orders</p>
              <p className="text-sm text-gray-500">Real-time order notifications</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Star className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Build Reputation</p>
              <p className="text-sm text-gray-500">Collect reviews and ratings</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Statistics (if active) */}
      {settings && isActive && (
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Your Performance</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {settings.total_views.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">Total Views</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {settings.total_orders}
              </p>
              <p className="text-sm text-gray-500">Orders</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(settings.total_revenue)}
              </p>
              <p className="text-sm text-gray-500">Revenue</p>
            </div>
          </div>
        </Card>
      )}

      {/* Subscription Plans */}
      {(!settings || !isActive || settings.subscription_status === 'trial') && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Subscription Plans</h3>
            {!settings?.has_used_trial && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                <Gift className="w-3 h-3" />
                7 days free trial available
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MULTIVENDOR_PLANS.map(plan => (
              <div
                key={plan.id}
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  selectedPlan === plan.id
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setSelectedPlan(plan.id as 'monthly' | 'yearly')}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{plan.name}</h4>
                    <p className="text-2xl font-bold text-purple-600 mt-1">
                      {formatCurrency(plan.price)}
                      <span className="text-sm font-normal text-gray-500">
                        /{plan.interval === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    </p>
                  </div>
                  {plan.id === 'yearly' && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                      Save Le 100,000
                    </span>
                  )}
                </div>

                <ul className="space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {settings?.has_used_trial && settings.subscription_status !== 'active' && (
            <Button
              onClick={() => setShowSubscriptionModal(true)}
              className="w-full mt-4 bg-gradient-to-r from-purple-600 to-indigo-600"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Subscribe Now
            </Button>
          )}
        </Card>
      )}

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !processingPayment && setShowSubscriptionModal(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <button
              onClick={() => !processingPayment && setShowSubscriptionModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Subscribe to Multivendor
            </h3>

            <div className="space-y-4 mt-4">
              {/* Plan Selection */}
              {MULTIVENDOR_PLANS.map(plan => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id as 'monthly' | 'yearly')}
                  className={`w-full p-4 border-2 rounded-xl text-left transition-all ${
                    selectedPlan === plan.id
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{plan.name}</p>
                      <p className="text-lg font-bold text-purple-600">{formatCurrency(plan.price)}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      selectedPlan === plan.id
                        ? 'border-purple-500 bg-purple-500'
                        : 'border-gray-300'
                    } flex items-center justify-center`}>
                      {selectedPlan === plan.id && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </button>
              ))}

              {/* Wallet Balance */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Wallet Balance</span>
                  <span className={`font-medium ${
                    walletBalance >= MULTIVENDOR_PLANS.find(p => p.id === selectedPlan)!.price
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {formatCurrency(walletBalance)}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleSubscribe}
                disabled={processingPayment}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600"
              >
                {processingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : walletBalance >= MULTIVENDOR_PLANS.find(p => p.id === selectedPlan)!.price ? (
                  <>
                    <Wallet className="w-4 h-4 mr-2" />
                    Pay {formatCurrency(MULTIVENDOR_PLANS.find(p => p.id === selectedPlan)!.price)}
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Deposit & Pay
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-gray-500">
                By subscribing, you agree to our terms of service
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MultivendorSettings;
