/**
 * Upgrade Prompt Component
 * Shows when user tries to access a feature not available in their tier
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import {
  Lock,
  Sparkles,
  Check,
  ArrowRight,
  X,
  Crown,
  Rocket,
  Building2,
  Store,
  Zap,
} from 'lucide-react';
import {
  MerchantTier,
  TierLimits,
  TIER_INFO,
  TIER_PRICING,
  TIER_LIMITS,
} from '@/services/subscription.service';
import { useMerchantSubscription } from '@/hooks/useMerchantSubscription';

interface UpgradePromptProps {
  feature: keyof TierLimits;
  featureName: string;
  description?: string;
  requiredTier?: MerchantTier;
  onClose?: () => void;
  variant?: 'modal' | 'inline' | 'banner';
}

// Feature descriptions
const FEATURE_DESCRIPTIONS: Partial<Record<keyof TierLimits, string>> = {
  kitchenDisplay: 'Display orders in your kitchen for seamless communication',
  tableManagement: 'Manage restaurant tables, reservations, and floor plans',
  loyaltyProgram: 'Reward customers with points and track their engagement',
  customersCredit: 'Extend credit to trusted customers and track balances',
  advancedReports: 'Get detailed analytics and insights about your business',
  multiPayment: 'Accept split payments with multiple methods',
  discountCodes: 'Create promotional discount codes for your customers',
  onlineOrdering: 'Let customers order online for pickup or delivery',
  exportReports: 'Export your reports to CSV and PDF formats',
  customReceipts: 'Customize receipts with your branding and messages',
  apiAccess: 'Integrate with other systems using our API',
  prioritySupport: 'Get faster responses from our support team',
};

// Icons for tiers
const TIER_ICONS: Record<MerchantTier, typeof Store> = {
  basic: Store,
  business: Building2,
  business_plus: Rocket,
};

export function UpgradePrompt({
  feature,
  featureName,
  description,
  requiredTier,
  onClose,
  variant = 'modal',
}: UpgradePromptProps) {
  const navigate = useNavigate();
  const { tier, startTrial, isTrialing, trialDaysRemaining } = useMerchantSubscription();
  const [loading, setLoading] = useState(false);

  // Determine the minimum tier that has this feature
  const minimumTier = requiredTier || ((): MerchantTier => {
    if (TIER_LIMITS.business[feature]) return 'business';
    if (TIER_LIMITS.business_plus[feature]) return 'business_plus';
    return 'business';
  })();

  const tierInfo = TIER_INFO[minimumTier];
  const TierIcon = TIER_ICONS[minimumTier];

  // Get features for the required tier
  const tierFeatures = Object.entries(TIER_LIMITS[minimumTier])
    .filter(([_, value]) => value === true || (typeof value === 'number' && value !== 0))
    .slice(0, 5);

  // Handle start trial
  const handleStartTrial = async () => {
    setLoading(true);
    try {
      await startTrial(minimumTier, 7);
      onClose?.();
      // Refresh the page to apply new tier
      window.location.reload();
    } catch (error) {
      console.error('Error starting trial:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle upgrade click
  const handleUpgrade = () => {
    navigate('/merchant/subscriptions');
    onClose?.();
  };

  // Banner variant
  if (variant === 'banner') {
    return (
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium">{featureName} requires {tierInfo.name}</p>
            <p className="text-sm text-white/80">
              {description || FEATURE_DESCRIPTIONS[feature]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isTrialing && (
            <Button
              variant="outline"
              size="sm"
              className="border-white text-white hover:bg-white/10"
              onClick={handleStartTrial}
              disabled={loading}
            >
              Start 7-Day Trial
            </Button>
          )}
          <Button
            size="sm"
            className="bg-white text-purple-600 hover:bg-white/90"
            onClick={handleUpgrade}
          >
            Upgrade Now
          </Button>
        </div>
      </div>
    );
  }

  // Inline variant
  if (variant === 'inline') {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6 text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {featureName}
        </h3>
        <p className="text-gray-600 mb-4 max-w-sm mx-auto">
          {description || FEATURE_DESCRIPTIONS[feature]}
        </p>
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-sm text-gray-500">Available with</span>
          <span
            className="px-3 py-1 rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: tierInfo.color }}
          >
            {tierInfo.name}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          {!isTrialing && (
            <Button
              variant="outline"
              onClick={handleStartTrial}
              disabled={loading}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Start Free Trial
            </Button>
          )}
          <Button onClick={handleUpgrade}>
            <Crown className="w-4 h-4 mr-2" />
            Upgrade to {tierInfo.name}
          </Button>
        </div>
      </div>
    );
  }

  // Modal variant (default)
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-purple-600 to-blue-600 p-6 text-white">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{featureName}</h2>
              <p className="text-white/80 text-sm mt-1">
                Premium feature
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {description || FEATURE_DESCRIPTIONS[feature] || `This feature is available with ${tierInfo.name} plan.`}
          </p>

          {/* Required Tier Card */}
          <div
            className="border-2 rounded-xl p-4 mb-6"
            style={{ borderColor: tierInfo.color }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${tierInfo.color}20` }}
                >
                  <TierIcon className="w-5 h-5" style={{ color: tierInfo.color }} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {tierInfo.name}
                  </h3>
                  <p className="text-xs text-gray-500">{tierInfo.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold" style={{ color: tierInfo.color }}>
                  Le {TIER_PRICING[minimumTier].monthly.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">per month</p>
              </div>
            </div>

            {/* Key features */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t">
              {tierFeatures.map(([key, _]) => (
                <div key={key} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trial banner */}
          {!isTrialing && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <Zap className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-amber-900">Try it free for 7 days</p>
                  <p className="text-sm text-amber-700">
                    No credit card required. Cancel anytime.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isTrialing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-blue-900">You're on a trial</p>
                  <p className="text-sm text-blue-700">
                    {trialDaysRemaining} days remaining. Upgrade to keep access.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex gap-3">
          {onClose && (
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Maybe Later
            </Button>
          )}
          {!isTrialing && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleStartTrial}
              disabled={loading}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Start Trial
            </Button>
          )}
          <Button className="flex-1" onClick={handleUpgrade}>
            <ArrowRight className="w-4 h-4 mr-2" />
            View Plans
          </Button>
        </div>
      </div>
    </div>
  );
}

// Feature Gate component - wraps content and shows upgrade prompt if feature not available
interface FeatureGateProps {
  feature: keyof TierLimits;
  featureName: string;
  description?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({
  feature,
  featureName,
  description,
  children,
  fallback,
}: FeatureGateProps) {
  const { hasFeature, isLoading } = useMerchantSubscription();

  if (isLoading) {
    return null;
  }

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <UpgradePrompt
      feature={feature}
      featureName={featureName}
      description={description}
      variant="inline"
    />
  );
}

export default UpgradePrompt;
