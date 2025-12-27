/**
 * Tier Limits Hook
 *
 * Provides easy access to check subscription tier limits
 * and show upgrade prompts when limits are reached
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  tierConfigService,
  merchantTierService,
  MerchantTier,
  TierLimits,
  TIER_LIMITS,
  DEFAULT_TIER_LIMITS,
} from '@/services/subscription.service';

export type LimitType = 'products' | 'staff' | 'locations' | 'categories' | 'eventStaff';

interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  tier: MerchantTier;
  remaining: number;
  unlimited: boolean;
}

interface UseTierLimitsResult {
  tier: MerchantTier;
  limits: TierLimits;
  loading: boolean;
  error: string | null;
  checkLimit: (limitType: LimitType, currentCount: number) => LimitCheckResult;
  canAdd: (limitType: LimitType, currentCount: number) => boolean;
  getRemaining: (limitType: LimitType, currentCount: number) => number;
  hasFeature: (feature: keyof TierLimits) => boolean;
  refresh: () => Promise<void>;
}

export function useTierLimits(): UseTierLimitsResult {
  const { user } = useAuth();
  const [tier, setTier] = useState<MerchantTier>('basic');
  const [limits, setLimits] = useState<TierLimits>(DEFAULT_TIER_LIMITS.basic);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLimits = useCallback(async () => {
    if (!user?.id) {
      setTier('basic');
      setLimits(DEFAULT_TIER_LIMITS.basic);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get user's subscription
      const subscription = await merchantTierService.getSubscription(user.id);
      const userTier = subscription?.tier || 'basic';
      setTier(userTier);

      // Get limits from database
      const tierLimits = await tierConfigService.getLimits(userTier);
      setLimits(tierLimits);
    } catch (err) {
      console.error('Error loading tier limits:', err);
      setError('Failed to load subscription limits');
      // Use default limits as fallback
      setLimits(DEFAULT_TIER_LIMITS[tier]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, tier]);

  useEffect(() => {
    loadLimits();
  }, [loadLimits]);

  /**
   * Check if adding an item is within the limit
   */
  const checkLimit = useCallback((limitType: LimitType, currentCount: number): LimitCheckResult => {
    const limit = limits[limitType] as number;

    // -1 means unlimited
    if (limit === -1) {
      return {
        allowed: true,
        current: currentCount,
        limit: -1,
        tier,
        remaining: -1,
        unlimited: true,
      };
    }

    const allowed = currentCount < limit;
    return {
      allowed,
      current: currentCount,
      limit,
      tier,
      remaining: Math.max(0, limit - currentCount),
      unlimited: false,
    };
  }, [limits, tier]);

  /**
   * Simple check if can add another item
   */
  const canAdd = useCallback((limitType: LimitType, currentCount: number): boolean => {
    const limit = limits[limitType] as number;
    if (limit === -1) return true;
    return currentCount < limit;
  }, [limits]);

  /**
   * Get remaining slots for a limit type
   */
  const getRemaining = useCallback((limitType: LimitType, currentCount: number): number => {
    const limit = limits[limitType] as number;
    if (limit === -1) return -1; // Unlimited
    return Math.max(0, limit - currentCount);
  }, [limits]);

  /**
   * Check if a feature is enabled for the current tier
   */
  const hasFeature = useCallback((feature: keyof TierLimits): boolean => {
    const value = limits[feature];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    return false;
  }, [limits]);

  /**
   * Refresh limits from database
   */
  const refresh = useCallback(async () => {
    await tierConfigService.refresh();
    await loadLimits();
  }, [loadLimits]);

  return {
    tier,
    limits,
    loading,
    error,
    checkLimit,
    canAdd,
    getRemaining,
    hasFeature,
    refresh,
  };
}

/**
 * Hook for checking a specific limit with prompt support
 */
export function useLimitCheck(limitType: LimitType) {
  const { tier, limits, loading, checkLimit, canAdd, getRemaining } = useTierLimits();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [lastCheckResult, setLastCheckResult] = useState<LimitCheckResult | null>(null);

  const check = useCallback((currentCount: number): LimitCheckResult => {
    const result = checkLimit(limitType, currentCount);
    setLastCheckResult(result);

    if (!result.allowed) {
      setShowUpgradePrompt(true);
    }

    return result;
  }, [checkLimit, limitType]);

  const tryAdd = useCallback((currentCount: number): boolean => {
    const result = check(currentCount);
    return result.allowed;
  }, [check]);

  const closePrompt = useCallback(() => {
    setShowUpgradePrompt(false);
  }, []);

  return {
    tier,
    limit: limits[limitType] as number,
    loading,
    check,
    tryAdd,
    canAdd: (currentCount: number) => canAdd(limitType, currentCount),
    getRemaining: (currentCount: number) => getRemaining(limitType, currentCount),
    showUpgradePrompt,
    closePrompt,
    lastCheckResult,
  };
}
