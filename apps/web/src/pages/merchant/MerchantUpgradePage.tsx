/**
 * Merchant Upgrade Page
 * Allows merchants to upgrade to Merchant+ for additional features
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
  Users,
  Clock,
  Star,
  ArrowRight,
  Loader2,
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
  shopLimit: number;
  popular?: boolean;
}

export function MerchantUpgradePage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  const plans: PricingPlan[] = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      currency: 'Le',
      period: 'forever',
      description: 'Perfect for getting started',
      shopLimit: 1,
      features: [
        '1 Business/Shop',
        'Unlimited test transactions',
        '2 trial live transactions',
        'Basic analytics',
        'Email support',
      ],
    },
    {
      id: 'merchant_plus',
      name: 'Merchant+',
      price: 150,
      currency: 'Le',
      period: 'month',
      description: 'For growing businesses',
      shopLimit: 3,
      popular: true,
      features: [
        'Up to 3 Businesses/Shops',
        'Unlimited live transactions',
        'Priority approval',
        'Advanced analytics',
        'Dispute management',
        'Priority support',
        'Custom branding',
        'Webhook notifications',
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 500,
      currency: 'Le',
      period: 'month',
      description: 'For large operations',
      shopLimit: 10,
      features: [
        'Up to 10 Businesses/Shops',
        'Unlimited live transactions',
        'Instant approval',
        'Real-time analytics',
        'Advanced dispute management',
        'Dedicated account manager',
        'White-label solution',
        'API priority access',
        'Custom integrations',
        'SLA guarantee',
      ],
    },
  ];

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free') {
      navigate('/merchant/shops');
      return;
    }

    setSelectedPlan(planId);
    setProcessing(true);

    // TODO: Integrate with Monime payment or internal wallet
    // For now, simulate processing
    setTimeout(() => {
      setProcessing(false);
      // Show success or payment modal
      alert('Upgrade feature coming soon! Contact support for early access.');
    }, 2000);
  };

  const formatPrice = (price: number) => {
    // SLE has 2 decimal places (100 cents = 1 Leone)
    if (price === 0) return '0';
    if (Number.isInteger(price)) return price.toString();
    return price.toFixed(2);
  };

  return (
    <MerchantLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-medium mb-4">
            <Crown className="w-4 h-4" />
            Upgrade Your Account
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Choose the Right Plan for Your Business
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Unlock more shops, faster approvals, and premium features to grow your business
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative p-6 ${
                plan.popular
                  ? 'border-2 border-amber-400 shadow-lg'
                  : 'border border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-sm text-gray-500">{plan.currency}</span>
                  <span className="text-4xl font-bold text-gray-900">
                    {formatPrice(plan.price)}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-500">/{plan.period}</span>
                  )}
                </div>
              </div>

              {/* Shop Limit Highlight */}
              <div className="flex items-center justify-center gap-2 mb-6 p-3 bg-gray-50 rounded-lg">
                <Building2 className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900">
                  {plan.shopLimit === 10 ? 'Up to 10' : plan.shopLimit} Shop{plan.shopLimit > 1 ? 's' : ''}
                </span>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={processing && selectedPlan === plan.id}
                className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                  plan.popular
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : plan.id === 'free'
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {processing && selectedPlan === plan.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : plan.id === 'free' ? (
                  'Current Plan'
                ) : (
                  <>
                    Upgrade Now
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </Card>
          ))}
        </div>

        {/* Features Comparison */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
            Why Upgrade to Merchant+?
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Building2 className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-1">Multiple Shops</h3>
              <p className="text-sm text-gray-500">
                Create up to 3 separate businesses with independent branding
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-1">Priority Approval</h3>
              <p className="text-sm text-gray-500">
                Get your businesses approved faster with priority review
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-1">Dispute Management</h3>
              <p className="text-sm text-gray-500">
                Handle customer disputes directly from your dashboard
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-1">Advanced Analytics</h3>
              <p className="text-sm text-gray-500">
                Deep insights into your business performance
              </p>
            </div>
          </div>
        </Card>

        {/* FAQ */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Can I downgrade later?</h3>
              <p className="text-sm text-gray-600">
                Yes, you can downgrade at any time. Your additional shops will become read-only until you upgrade again.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">What payment methods are accepted?</h3>
              <p className="text-sm text-gray-600">
                We accept Mobile Money (Orange Money, Africell), bank transfers, and Peeap wallet payments.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Is there a contract?</h3>
              <p className="text-sm text-gray-600">
                No long-term contracts. You can cancel anytime and your subscription will remain active until the end of the billing period.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">What happens to my data if I cancel?</h3>
              <p className="text-sm text-gray-600">
                Your data is retained for 30 days after cancellation. You can export all your transaction history before canceling.
              </p>
            </div>
          </div>
        </Card>

        {/* Contact */}
        <div className="text-center py-8">
          <p className="text-gray-600 mb-2">Need a custom plan for your business?</p>
          <a
            href="mailto:enterprise@peeap.com"
            className="text-amber-600 hover:text-amber-700 font-medium"
          >
            Contact our sales team
          </a>
        </div>
      </div>
    </MerchantLayout>
  );
}
