/**
 * Agent+ Upgrade Modal
 * Shows benefits and allows agents to upgrade to Agent+ tier
 */

import { useState } from 'react';
import {
  X,
  Check,
  Zap,
  Users,
  CreditCard,
  BarChart3,
  Shield,
  Clock,
  Wallet,
  FileText,
  Building2,
  ArrowRight,
  Star,
  Infinity,
} from 'lucide-react';

interface AgentPlusUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  currentTier?: 'basic' | 'standard' | 'agent_plus';
}

const benefits = [
  {
    icon: Infinity,
    title: 'Unlimited Transactions',
    description: 'No daily or monthly transaction limits. Handle high-volume cash-in/cash-out operations.',
  },
  {
    icon: Wallet,
    title: 'Bulk Digital Cash Purchase',
    description: 'Buy digital cash in bulk at wholesale rates. Instant account crediting.',
  },
  {
    icon: Users,
    title: 'Staff Management',
    description: 'Add unlimited staff members with role-based permissions for cash operations.',
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description: 'Real-time dashboards, transaction insights, and revenue tracking.',
  },
  {
    icon: FileText,
    title: 'Batch Payments',
    description: 'Process multiple payments at once. Perfect for payroll and bulk disbursements.',
  },
  {
    icon: Building2,
    title: 'Accounting & Finance',
    description: 'Built-in reconciliation reports, invoicing, and tax-ready statements.',
  },
  {
    icon: Shield,
    title: 'Priority Support',
    description: '24/7 dedicated support with priority response times.',
  },
  {
    icon: Clock,
    title: 'Instant Settlements',
    description: 'Same-day settlements for all transactions. No waiting periods.',
  },
];

const pricingTiers = [
  {
    name: 'Basic Agent',
    price: 'Free',
    limits: '100K/month limit',
    features: ['Basic transactions', 'Standard fees', 'Email support'],
    current: true,
  },
  {
    name: 'Agent+',
    price: '$49',
    period: '/month',
    limits: 'Unlimited',
    features: [
      'Unlimited transactions',
      'Reduced fees (0.2%)',
      'Staff management',
      'Batch payments',
      'Priority support',
      'API access',
    ],
    recommended: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    limits: 'Unlimited+',
    features: [
      'Everything in Agent+',
      'Custom fee structure',
      'Dedicated account manager',
      'White-label options',
      'SLA guarantee',
    ],
  },
];

export function AgentPlusUpgradeModal({
  isOpen,
  onClose,
  onUpgrade,
  currentTier = 'basic',
}: AgentPlusUpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>('Agent+');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    setIsProcessing(true);
    try {
      await onUpgrade();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-orange-500 text-white p-6 rounded-t-2xl">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl">
                <Zap className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Upgrade to Agent+</h2>
                <p className="text-orange-100">
                  Unlock unlimited potential for your business
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-8">
            {/* Benefits Grid */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Agent+ Benefits
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl hover:bg-orange-50 transition-colors"
                  >
                    <div className="p-2 bg-orange-100 text-orange-600 rounded-lg shrink-0">
                      <benefit.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {benefit.title}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing Comparison */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Choose Your Plan
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {pricingTiers.map((tier) => (
                  <div
                    key={tier.name}
                    onClick={() => setSelectedPlan(tier.name)}
                    className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedPlan === tier.name
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${tier.current ? 'opacity-60' : ''}`}
                  >
                    {tier.recommended && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="px-3 py-1 bg-orange-600 text-white text-xs font-medium rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3" /> Recommended
                        </span>
                      </div>
                    )}
                    {tier.current && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="px-3 py-1 bg-gray-600 text-white text-xs font-medium rounded-full">
                          Current Plan
                        </span>
                      </div>
                    )}
                    <div className="text-center mb-4 pt-2">
                      <h4 className="font-semibold text-gray-900">
                        {tier.name}
                      </h4>
                      <div className="mt-2">
                        <span className="text-3xl font-bold text-gray-900">
                          {tier.price}
                        </span>
                        {tier.period && (
                          <span className="text-gray-500">{tier.period}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{tier.limits}</p>
                    </div>
                    <ul className="space-y-2">
                      {tier.features.map((feature, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-2 text-sm text-gray-600"
                        >
                          <Check className="w-4 h-4 text-green-500 shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                <p>Questions? Contact our sales team</p>
                <a
                  href="mailto:sales@peeap.com"
                  className="text-orange-600 hover:text-orange-700"
                >
                  sales@peeap.com
                </a>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Maybe Later
                </button>
                <button
                  onClick={handleUpgrade}
                  disabled={isProcessing || selectedPlan === 'Basic Agent'}
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Upgrade to {selectedPlan}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
