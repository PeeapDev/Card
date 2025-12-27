/**
 * Merchant Upgrade Page
 * Allows merchants to upgrade to Business or Business++ (Corporate) tiers
 * Business and Business++ redirect to plus.peeap.com via database-backed SSO
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  ArrowRight,
  Loader2,
  CreditCard,
  FileText,
  RefreshCw,
  Users,
  Code2,
  Sparkles,
  Zap,
  Shield,
  BarChart3,
  Lock,
  Star,
} from 'lucide-react';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card } from '@/components/ui/Card';
import { ssoService } from '@/services/sso.service';
import { useAuth } from '@/context/AuthContext';
import { UPGRADE_URL, isDevelopment } from '@/config/urls';
import { supabase } from '@/lib/supabase';

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  period: string;
  description: string;
  features: string[];
  highlight?: string;
  popular?: boolean;
  redirectToPlus?: boolean;
}

type MerchantTier = 'basic' | 'business' | 'business_plus';

export function MerchantUpgradePage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<MerchantTier>('basic');
  const [loadingTier, setLoadingTier] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch current subscription tier
  useEffect(() => {
    const fetchCurrentTier = async () => {
      if (!user?.id) {
        setLoadingTier(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('merchant_subscriptions')
          .select('tier, status')
          .eq('user_id', user.id)
          .single();

        if (data && (data.status === 'active' || data.status === 'trialing')) {
          setCurrentTier(data.tier as MerchantTier);
        }
      } catch (err) {
        console.error('Error fetching subscription:', err);
      } finally {
        setLoadingTier(false);
      }
    };

    fetchCurrentTier();
  }, [user?.id]);

  // Check if a plan is available for upgrade based on current tier
  const canUpgradeTo = (planId: string): boolean => {
    if (planId === 'basic') return false; // Can't "upgrade" to basic
    if (planId === currentTier) return false; // Already on this tier

    // Tier progression: basic -> business -> business_plus
    if (currentTier === 'basic') {
      return planId === 'business'; // Basic can only go to Business
    }
    if (currentTier === 'business') {
      return planId === 'business_plus'; // Business can only go to Business++
    }
    // business_plus users are at max tier
    return false;
  };

  const getNextTier = (): string | null => {
    if (currentTier === 'basic') return 'business';
    if (currentTier === 'business') return 'business_plus';
    return null; // Already at max
  };

  const plans: PricingPlan[] = [
    {
      id: 'basic',
      name: 'Basic',
      price: 0,
      currency: 'NLE',
      period: 'forever',
      description: 'For small businesses getting started',
      features: [
        'Checkout links',
        'QR code payments',
        'Single wallet',
        'Mobile money payouts',
        'Basic transaction history (30 days)',
        'Email support',
      ],
    },
    {
      id: 'business',
      name: 'Business',
      price: 150,
      currency: 'NLE',
      period: 'month',
      description: 'For growing businesses that need more tools',
      popular: currentTier === 'basic', // Only show as popular if user is on basic
      redirectToPlus: true,
      features: [
        'Everything in Basic',
        'Invoice generator',
        'Recurring payments & subscriptions',
        'Subscription links',
        'Basic API access',
        'Webhook notifications',
        '90-day transaction history',
        'Priority support',
      ],
    },
    {
      id: 'business_plus',
      name: 'Business++',
      price: 500,
      currency: 'NLE',
      period: 'month',
      description: 'For enterprises needing full control',
      popular: currentTier === 'business', // Show as popular/recommended if on Business
      highlight: currentTier !== 'business' ? 'Corporate' : undefined,
      redirectToPlus: true,
      features: [
        'Everything in Business',
        'Issue employee expense cards',
        'Spending controls & limits',
        'Real-time authorization webhooks',
        'Expense management',
        'Multi-user team access',
        'Department budgets',
        'Advanced analytics & reports',
        'Unlimited transaction history',
        'Dedicated account manager',
      ],
    },
  ];

  const handleUpgrade = async (plan: PricingPlan) => {
    if (plan.id === 'basic') {
      navigate('/merchant');
      return;
    }

    setSelectedPlan(plan.id);
    setProcessing(true);
    setError(null);

    if (plan.redirectToPlus) {
      try {
        if (!user?.id) {
          // User not logged in - redirect to Plus upgrade page to login there
          const baseUrl = isDevelopment ? 'http://localhost:3000/upgrade' : UPGRADE_URL;
          const upgradeUrl = new URL(baseUrl);
          upgradeUrl.searchParams.set('tier', plan.id);
          window.location.href = upgradeUrl.toString();
          return;
        }

        // Sync user to Supabase and generate SSO token
        const redirectUrl = await ssoService.getRedirectUrl({
          user: user,
          targetApp: 'plus',
          tier: plan.id,
          redirectPath: `/setup?tier=${plan.id}`,
        });

        // Redirect to Plus with the SSO token
        window.location.href = redirectUrl;
      } catch (err) {
        console.error('SSO redirect failed:', err);
        setError('Failed to redirect. Please try again.');
        setProcessing(false);
      }
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-SL').format(price);
  };

  const getFeatureIcon = (feature: string) => {
    if (feature.includes('Invoice')) return <FileText className="w-4 h-4" />;
    if (feature.includes('Recurring') || feature.includes('Subscription')) return <RefreshCw className="w-4 h-4" />;
    if (feature.includes('card')) return <CreditCard className="w-4 h-4" />;
    if (feature.includes('API') || feature.includes('Webhook')) return <Code2 className="w-4 h-4" />;
    if (feature.includes('team') || feature.includes('Multi-user')) return <Users className="w-4 h-4" />;
    return <Check className="w-4 h-4" />;
  };

  return (
    <MerchantLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Upgrade to PeeAP Plus
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Unlock Powerful Business Tools
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Invoicing, recurring payments, employee cards, and more. Choose the plan that fits your business.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative p-6 transition-all ${
                plan.popular
                  ? 'border-2 border-amber-400 dark:border-amber-600 shadow-xl scale-105 z-10'
                  : 'border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
                    MOST POPULAR
                  </span>
                </div>
              )}

              {plan.highlight && !plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                    plan.id === 'basic'
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                  }`}>
                    {plan.highlight}
                  </span>
                </div>
              )}

              <div className="text-center mb-6 pt-2">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  {plan.price === 0 ? (
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">Free</span>
                  ) : (
                    <>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{plan.currency}</span>
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">
                        {formatPrice(plan.price)}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">/{plan.period}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className={`flex-shrink-0 mt-0.5 ${
                      plan.popular ? 'text-amber-500' : 'text-green-500'
                    }`}>
                      {getFeatureIcon(feature)}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleUpgrade(plan)}
                disabled={(processing && selectedPlan === plan.id) || !canUpgradeTo(plan.id) || loadingTier}
                className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                  plan.id === currentTier
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-default'
                    : canUpgradeTo(plan.id)
                    ? plan.id === 'business'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-lg hover:shadow-xl'
                      : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 shadow-lg hover:shadow-xl'
                    : plan.id === 'basic'
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-default'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
              >
                {loadingTier ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : processing && selectedPlan === plan.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Redirecting to Plus...
                  </>
                ) : plan.id === currentTier ? (
                  <>
                    <Check className="w-4 h-4" />
                    Current Plan
                  </>
                ) : plan.id === 'basic' ? (
                  'Free Plan'
                ) : canUpgradeTo(plan.id) ? (
                  <>
                    Start 7-Day Free Trial
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : plan.id === 'business_plus' && currentTier === 'basic' ? (
                  <>
                    <Lock className="w-4 h-4" />
                    Requires Business Plan
                  </>
                ) : (
                  <>
                    <Star className="w-4 h-4" />
                    Max Tier
                  </>
                )}
              </button>

              {canUpgradeTo(plan.id) && (
                <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-2">
                  7-day free trial, then {plan.currency} {plan.price}/month
                </p>
              )}

              {plan.id === 'business_plus' && currentTier === 'basic' && (
                <p className="text-xs text-center text-amber-600 dark:text-amber-400 mt-2">
                  Upgrade to Business first to unlock Business++
                </p>
              )}
            </Card>
          ))}
        </div>

        {/* Feature Highlights */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Business Tier Features */}
          <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Business Features</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">NLE 150/month</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Invoice Generator</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Recurring Payments</span>
              </div>
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">API Access</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Webhooks</span>
              </div>
            </div>
          </Card>

          {/* Business++ Features */}
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Business++ (Corporate)</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">NLE 500/month</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Employee Cards</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Spending Controls</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Team Access</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Expense Reports</span>
              </div>
            </div>
          </Card>
        </div>

        {/* FAQ */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">What is PeeAP Plus?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                PeeAP Plus is our premium business platform at plus.peeap.com with advanced tools like invoicing, subscriptions, and employee cards.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">Can I use my existing account?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Yes! Your existing PeeAP merchant account works on Plus. Just upgrade and you'll have access to all new features.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">Can I downgrade later?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Yes, you can downgrade anytime. Premium features will become read-only until you upgrade again.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">What payment methods are accepted?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Mobile Money (Orange Money, Afrimoney), bank transfers, and PeeAP wallet balance.
              </p>
            </div>
          </div>
        </Card>

        {/* Contact */}
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400 mb-2">Need a custom enterprise plan?</p>
          <a
            href="mailto:enterprise@peeap.com"
            className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium"
          >
            Contact our sales team →
          </a>
        </div>
      </div>
    </MerchantLayout>
  );
}
