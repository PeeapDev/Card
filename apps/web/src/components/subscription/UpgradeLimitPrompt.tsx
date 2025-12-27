/**
 * Upgrade Limit Prompt Component
 *
 * Shows when a user hits their tier limit and prompts them to upgrade
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  X,
  Crown,
  Package,
  Users,
  MapPin,
  FolderOpen,
  Calendar,
  Zap,
  Star,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { MerchantTier } from '@/services/subscription.service';

export type LimitType = 'products' | 'staff' | 'locations' | 'categories' | 'eventStaff';

interface UpgradeLimitPromptProps {
  limitType: LimitType;
  currentCount: number;
  limit: number;
  currentTier: MerchantTier;
  onClose?: () => void;
  variant?: 'modal' | 'inline' | 'banner';
}

const limitIcons: Record<LimitType, React.ReactNode> = {
  products: <Package className="w-5 h-5" />,
  staff: <Users className="w-5 h-5" />,
  locations: <MapPin className="w-5 h-5" />,
  categories: <FolderOpen className="w-5 h-5" />,
  eventStaff: <Calendar className="w-5 h-5" />,
};

const limitLabels: Record<LimitType, string> = {
  products: 'products',
  staff: 'staff members',
  locations: 'locations',
  categories: 'categories',
  eventStaff: 'event staff',
};

const tierInfo: Record<MerchantTier, { name: string; icon: React.ReactNode; color: string }> = {
  basic: { name: 'Basic', icon: <Crown className="w-5 h-5" />, color: 'gray' },
  business: { name: 'Business', icon: <Zap className="w-5 h-5" />, color: 'amber' },
  business_plus: { name: 'Business++', icon: <Star className="w-5 h-5" />, color: 'purple' },
};

const getUpgradeTier = (currentTier: MerchantTier): MerchantTier | null => {
  if (currentTier === 'basic') return 'business';
  if (currentTier === 'business') return 'business_plus';
  return null;
};

export function UpgradeLimitPrompt({
  limitType,
  currentCount,
  limit,
  currentTier,
  onClose,
  variant = 'modal',
}: UpgradeLimitPromptProps) {
  const navigate = useNavigate();
  const upgradeTier = getUpgradeTier(currentTier);

  const handleUpgrade = () => {
    navigate('/merchant/subscriptions?tab=my-plan');
  };

  // Banner variant (inline notification)
  if (variant === 'banner') {
    return (
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
            {limitIcons[limitType]}
          </div>
          <div>
            <p className="font-medium text-amber-900">
              {limitType.charAt(0).toUpperCase() + limitType.slice(1)} limit reached
            </p>
            <p className="text-sm text-amber-700">
              You've used {currentCount} of {limit} {limitLabels[limitType]} on your {tierInfo[currentTier].name} plan.
            </p>
          </div>
        </div>
        {upgradeTier && (
          <button
            onClick={handleUpgrade}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 flex items-center gap-2 whitespace-nowrap"
          >
            Upgrade
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  // Inline variant (smaller, embedded in forms)
  if (variant === 'inline') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-red-800 text-sm">
            Cannot add more {limitLabels[limitType]}
          </p>
          <p className="text-xs text-red-600 mt-1">
            Your {tierInfo[currentTier].name} plan is limited to {limit} {limitLabels[limitType]}.
            {upgradeTier && (
              <button
                onClick={handleUpgrade}
                className="ml-1 text-red-800 underline hover:no-underline font-medium"
              >
                Upgrade to {tierInfo[upgradeTier].name}
              </button>
            )}
          </p>
        </div>
      </div>
    );
  }

  // Modal variant (full prompt)
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white relative">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold">Limit Reached</h2>
          <p className="text-white/90 mt-1">
            You've reached the maximum {limitLabels[limitType]} for your plan
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Current Usage */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 flex items-center gap-2">
                {limitIcons[limitType]}
                {limitType.charAt(0).toUpperCase() + limitType.slice(1)}
              </span>
              <span className="font-bold text-gray-900">
                {currentCount} / {limit}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full"
                style={{ width: '100%' }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Current plan: {tierInfo[currentTier].name}
            </p>
          </div>

          {/* Upgrade Options */}
          {upgradeTier && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 text-center">
                Upgrade to unlock more {limitLabels[limitType]}
              </p>

              <button
                onClick={handleUpgrade}
                className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                  upgradeTier === 'business'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/20'
                    : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 shadow-lg shadow-purple-500/20'
                }`}
              >
                {tierInfo[upgradeTier].icon}
                Upgrade to {tierInfo[upgradeTier].name}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {!upgradeTier && (
            <p className="text-sm text-gray-500 text-center">
              You're on the highest tier. Contact support for custom limits.
            </p>
          )}
        </div>

        {/* Footer */}
        {onClose && (
          <div className="px-6 pb-6">
            <button
              onClick={onClose}
              className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm"
            >
              Maybe later
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}

// Hook to check limits and show prompt
export function useLimitCheck() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptProps, setPromptProps] = useState<Omit<UpgradeLimitPromptProps, 'onClose' | 'variant'> | null>(null);

  const checkLimit = (
    limitType: LimitType,
    currentCount: number,
    limit: number,
    currentTier: MerchantTier
  ): boolean => {
    // -1 means unlimited
    if (limit === -1) return true;

    if (currentCount >= limit) {
      setPromptProps({ limitType, currentCount, limit, currentTier });
      setShowPrompt(true);
      return false;
    }
    return true;
  };

  const closePrompt = () => {
    setShowPrompt(false);
    setPromptProps(null);
  };

  const LimitPrompt = () => {
    if (!showPrompt || !promptProps) return null;
    return <UpgradeLimitPrompt {...promptProps} onClose={closePrompt} variant="modal" />;
  };

  return { checkLimit, showPrompt, closePrompt, LimitPrompt };
}
