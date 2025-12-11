/**
 * Merchant Upgrade Page
 * Allows merchants to upgrade to Business or Business++ (Corporate) tiers
 * Business and Business++ redirect to plus.peeap.com
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Crown,
  Check,
  Building2,
  Zap,
  Shield,
  BarChart3,
  ArrowRight,
  Loader2,
  CreditCard,
  FileText,
  RefreshCw,
  Users,
  Code2,
  Sparkles,
} from 'lucide-react';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card } from '@/components/ui/Card';

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

export function MerchantUpgradePage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  const plans: PricingPlan[] = [
    {
      id: 'basic',
      name: 'Basic',
      price: 0,
      currency: 'NLE',
      period: 'forever',
      description: 'For small businesses getting started',
      highlight: 'Current Plan',
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
      popular: true,
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
      highlight: 'Corporate',
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

    // Get auth token for cross-domain authentication
    // Note: my.peeap.com stores token as 'accessToken', not 'token'
    const token = localStorage.getItem('accessToken');

    // Debug: log token status (remove in production)
    console.log('SSO Upgrade - Token found:', !!token, 'Token length:', token?.length || 0);

    if (plan.redirectToPlus) {
      let redirectUrl: string;

      if (token) {
        // User is logged in - redirect to Plus callback with token for instant login
        // The callback page will validate the token against shared Supabase DB
        const callbackUrl = new URL('https://plus.peeap.com/auth/callback');
        callbackUrl.searchParams.set('tier', plan.id);
        callbackUrl.searchParams.set('redirect', `/setup?tier=${plan.id}`);
        callbackUrl.searchParams.set('token', token);
        redirectUrl = callbackUrl.toString();
        console.log('SSO Upgrade - Redirecting to callback with token');
      } else {
        // User is not logged in - redirect to Plus upgrade page
        const upgradeUrl = new URL('https://plus.peeap.com/upgrade');
        upgradeUrl.searchParams.set('tier', plan.id);
        redirectUrl = upgradeUrl.toString();
        console.log('SSO Upgrade - No token, redirecting to upgrade page');
      }

      // Small delay for UX
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 500);
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
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Upgrade to PeeAP Plus
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Unlock Powerful Business Tools
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
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
                  ? 'border-2 border-amber-400 shadow-xl scale-105 z-10'
                  : 'border border-gray-200 hover:border-gray-300 hover:shadow-lg'
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
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {plan.highlight}
                  </span>
                </div>
              )}

              <div className="text-center mb-6 pt-2">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  {plan.price === 0 ? (
                    <span className="text-4xl font-bold text-gray-900">Free</span>
                  ) : (
                    <>
                      <span className="text-sm text-gray-500">{plan.currency}</span>
                      <span className="text-4xl font-bold text-gray-900">
                        {formatPrice(plan.price)}
                      </span>
                      <span className="text-gray-500">/{plan.period}</span>
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
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleUpgrade(plan)}
                disabled={processing && selectedPlan === plan.id}
                className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                  plan.popular
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-lg hover:shadow-xl'
                    : plan.id === 'basic'
                    ? 'bg-gray-100 text-gray-500 cursor-default'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {processing && selectedPlan === plan.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Redirecting to Plus...
                  </>
                ) : plan.id === 'basic' ? (
                  'Current Plan'
                ) : (
                  <>
                    Upgrade to {plan.name}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {plan.redirectToPlus && (
                <p className="text-xs text-center text-gray-400 mt-2">
                  You'll be redirected to plus.peeap.com
                </p>
              )}
            </Card>
          ))}
        </div>

        {/* Feature Highlights */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Business Tier Features */}
          <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Business Features</h3>
                <p className="text-sm text-gray-600">NLE 150/month</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <span className="text-sm">Invoice Generator</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-600" />
                <span className="text-sm">Recurring Payments</span>
              </div>
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-amber-600" />
                <span className="text-sm">API Access</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600" />
                <span className="text-sm">Webhooks</span>
              </div>
            </div>
          </Card>

          {/* Business++ Features */}
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Business++ (Corporate)</h3>
                <p className="text-sm text-gray-600">NLE 500/month</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-600" />
                <span className="text-sm">Employee Cards</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-600" />
                <span className="text-sm">Spending Controls</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span className="text-sm">Team Access</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                <span className="text-sm">Expense Reports</span>
              </div>
            </div>
          </Card>
        </div>

        {/* FAQ */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-1">What is PeeAP Plus?</h3>
              <p className="text-sm text-gray-600">
                PeeAP Plus is our premium business platform at plus.peeap.com with advanced tools like invoicing, subscriptions, and employee cards.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Can I use my existing account?</h3>
              <p className="text-sm text-gray-600">
                Yes! Your existing PeeAP merchant account works on Plus. Just upgrade and you'll have access to all new features.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Can I downgrade later?</h3>
              <p className="text-sm text-gray-600">
                Yes, you can downgrade anytime. Premium features will become read-only until you upgrade again.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">What payment methods are accepted?</h3>
              <p className="text-sm text-gray-600">
                Mobile Money (Orange Money, Afrimoney), bank transfers, and PeeAP wallet balance.
              </p>
            </div>
          </div>
        </Card>

        {/* Contact */}
        <div className="text-center py-8">
          <p className="text-gray-600 mb-2">Need a custom enterprise plan?</p>
          <a
            href="mailto:enterprise@peeap.com"
            className="text-amber-600 hover:text-amber-700 font-medium"
          >
            Contact our sales team →
          </a>
        </div>
      </div>
    </MerchantLayout>
  );
}
