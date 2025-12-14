/**
 * Hook for managing merchant subscription and tier features
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  merchantTierService,
  MerchantSubscription,
  MerchantTier,
  TierLimits,
  TIER_LIMITS,
  TIER_INFO,
  TIER_PRICING,
} from '@/services/subscription.service';

export interface UseMerchantSubscriptionReturn {
  // Data
  subscription: MerchantSubscription | null;
  tier: MerchantTier;
  limits: TierLimits;
  isLoading: boolean;
  error: string | null;

  // Status
  isActive: boolean;
  isTrialing: boolean;
  trialDaysRemaining: number;

  // Feature checks
  hasFeature: (feature: keyof TierLimits) => boolean;
  isWithinLimit: (feature: keyof TierLimits, currentCount: number) => boolean;
  canUseFeature: (feature: keyof TierLimits) => boolean;

  // Info
  tierInfo: typeof TIER_INFO[MerchantTier];
  pricing: typeof TIER_PRICING[MerchantTier];

  // Actions
  refresh: () => Promise<void>;
  startTrial: (tier?: MerchantTier, days?: number) => Promise<MerchantSubscription | null>;
  upgradeTier: (newTier: MerchantTier) => Promise<MerchantSubscription | null>;
}

export function useMerchantSubscription(): UseMerchantSubscriptionReturn {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<MerchantSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get effective tier
  const tier = useMemo(() => {
    return merchantTierService.getEffectiveTier(subscription);
  }, [subscription]);

  // Get limits for current tier
  const limits = useMemo(() => {
    return TIER_LIMITS[tier];
  }, [tier]);

  // Get tier info
  const tierInfo = useMemo(() => {
    return TIER_INFO[tier];
  }, [tier]);

  // Get pricing
  const pricing = useMemo(() => {
    return TIER_PRICING[tier];
  }, [tier]);

  // Check if subscription is active
  const isActive = useMemo(() => {
    return merchantTierService.isActive(subscription);
  }, [subscription]);

  // Check if in trial
  const isTrialing = useMemo(() => {
    return subscription?.status === 'trialing';
  }, [subscription]);

  // Get trial days remaining
  const trialDaysRemaining = useMemo(() => {
    return merchantTierService.getDaysRemaining(subscription);
  }, [subscription]);

  // Load subscription
  const loadSubscription = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const sub = await merchantTierService.ensureSubscription(user.id);
      setSubscription(sub);
    } catch (err) {
      console.error('Error loading subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Initial load
  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  // Refresh subscription
  const refresh = useCallback(async () => {
    await loadSubscription();
  }, [loadSubscription]);

  // Check if feature is available
  const hasFeature = useCallback((feature: keyof TierLimits) => {
    return merchantTierService.hasFeature(tier, feature);
  }, [tier]);

  // Check if within limit
  const isWithinLimit = useCallback((feature: keyof TierLimits, currentCount: number) => {
    return merchantTierService.isWithinLimit(tier, feature, currentCount);
  }, [tier]);

  // Combined check: has feature AND (if numeric) within limit
  const canUseFeature = useCallback((feature: keyof TierLimits) => {
    return hasFeature(feature);
  }, [hasFeature]);

  // Start trial
  const startTrial = useCallback(async (
    trialTier: MerchantTier = 'business_plus',
    days: number = 7
  ) => {
    if (!user?.id) return null;

    try {
      const sub = await merchantTierService.startTrial(user.id, undefined, trialTier, days);
      if (sub) {
        setSubscription(sub);
      }
      return sub;
    } catch (err) {
      console.error('Error starting trial:', err);
      return null;
    }
  }, [user?.id]);

  // Upgrade tier
  const upgradeTier = useCallback(async (newTier: MerchantTier) => {
    if (!user?.id) return null;

    try {
      const sub = await merchantTierService.updateTier(user.id, newTier);
      if (sub) {
        setSubscription(sub);
      }
      return sub;
    } catch (err) {
      console.error('Error upgrading tier:', err);
      return null;
    }
  }, [user?.id]);

  return {
    subscription,
    tier,
    limits,
    isLoading,
    error,
    isActive,
    isTrialing,
    trialDaysRemaining,
    hasFeature,
    isWithinLimit,
    canUseFeature,
    tierInfo,
    pricing,
    refresh,
    startTrial,
    upgradeTier,
  };
}

export default useMerchantSubscription;
