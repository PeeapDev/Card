/**
 * Hook for managing app subscriptions (hybrid subscription system)
 *
 * Use this hook to:
 * - Get available apps and bundles
 * - Check if user has access to specific apps
 * - Subscribe to apps or bundles
 * - Manage subscription lifecycle
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  appSubscriptionService,
  AppWithPricing,
  SubscriptionBundle,
  UserAppSubscription,
  UserActiveApp,
  AppTier,
} from '@/services/appSubscription.service';

export interface UseAppSubscriptionReturn {
  // Catalog data
  apps: AppWithPricing[];
  bundles: SubscriptionBundle[];

  // User subscriptions
  subscriptions: UserAppSubscription[];
  activeApps: UserActiveApp[];

  // Loading states
  isLoading: boolean;
  isCatalogLoading: boolean;
  isSubscriptionsLoading: boolean;
  error: string | null;

  // Quick access checks
  hasApp: (appSlug: string) => boolean;
  getAppTier: (appSlug: string) => AppTier | null;
  checkLimit: (appSlug: string, limitKey: string, currentCount: number) => Promise<{ allowed: boolean; limit: number }>;

  // Actions
  subscribeToApp: (appSlug: string, tier: AppTier, startTrial?: boolean) => Promise<UserAppSubscription | null>;
  subscribeToBundle: (bundleSlug: string, selectedAppIds?: string[], startTrial?: boolean) => Promise<UserAppSubscription | null>;
  cancelSubscription: (subscriptionId: string, reason?: string, immediately?: boolean) => Promise<UserAppSubscription | null>;
  upgradeAppTier: (subscriptionId: string, newTier: AppTier) => Promise<UserAppSubscription | null>;

  // Utilities
  calculateTotal: (appSlugs: string[], tier: AppTier) => Promise<number>;
  calculateBundleSavings: (bundleSlug: string, appSlugs: string[]) => Promise<{ savings: number; percentage: number }>;
  refresh: () => Promise<void>;
}

export function useAppSubscription(): UseAppSubscriptionReturn {
  const { user } = useAuth();

  // Catalog state
  const [apps, setApps] = useState<AppWithPricing[]>([]);
  const [bundles, setBundles] = useState<SubscriptionBundle[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);

  // User subscription state
  const [subscriptions, setSubscriptions] = useState<UserAppSubscription[]>([]);
  const [activeApps, setActiveApps] = useState<UserActiveApp[]>([]);
  const [isSubscriptionsLoading, setIsSubscriptionsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  // Combined loading state
  const isLoading = isCatalogLoading || isSubscriptionsLoading;

  // Load catalog (apps and bundles)
  const loadCatalog = useCallback(async () => {
    try {
      setIsCatalogLoading(true);
      const [appsData, bundlesData] = await Promise.all([
        appSubscriptionService.getApps(),
        appSubscriptionService.getBundles(),
      ]);
      setApps(appsData);
      setBundles(bundlesData);
    } catch (err) {
      console.error('Error loading catalog:', err);
      setError(err instanceof Error ? err.message : 'Failed to load catalog');
    } finally {
      setIsCatalogLoading(false);
    }
  }, []);

  // Load user subscriptions
  const loadSubscriptions = useCallback(async () => {
    if (!user?.id) {
      setIsSubscriptionsLoading(false);
      return;
    }

    try {
      setIsSubscriptionsLoading(true);
      const [subs, active] = await Promise.all([
        appSubscriptionService.getUserSubscriptions(user.id),
        appSubscriptionService.getUserActiveApps(user.id),
      ]);
      setSubscriptions(subs);
      setActiveApps(active);
    } catch (err) {
      console.error('Error loading subscriptions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscriptions');
    } finally {
      setIsSubscriptionsLoading(false);
    }
  }, [user?.id]);

  // Initial load
  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  // Quick access: check if user has access to app
  const hasApp = useCallback((appSlug: string): boolean => {
    return activeApps.some(a => a.app_slug === appSlug);
  }, [activeApps]);

  // Quick access: get user's tier for an app
  const getAppTier = useCallback((appSlug: string): AppTier | null => {
    const app = activeApps.find(a => a.app_slug === appSlug);
    return app?.tier || null;
  }, [activeApps]);

  // Check if within limit
  const checkLimit = useCallback(async (
    appSlug: string,
    limitKey: string,
    currentCount: number
  ): Promise<{ allowed: boolean; limit: number }> => {
    if (!user?.id) return { allowed: false, limit: 0 };

    const result = await appSubscriptionService.checkAppLimit(user.id, appSlug, limitKey, currentCount);
    return { allowed: result.allowed, limit: result.limit };
  }, [user?.id]);

  // Subscribe to an app
  const subscribeToApp = useCallback(async (
    appSlug: string,
    tier: AppTier,
    startTrial: boolean = true
  ): Promise<UserAppSubscription | null> => {
    if (!user?.id) return null;

    try {
      const subscription = await appSubscriptionService.subscribeToApp(user.id, appSlug, tier, startTrial);
      if (subscription) {
        await loadSubscriptions(); // Refresh subscriptions
      }
      return subscription;
    } catch (err) {
      console.error('Error subscribing to app:', err);
      setError(err instanceof Error ? err.message : 'Failed to subscribe');
      return null;
    }
  }, [user?.id, loadSubscriptions]);

  // Subscribe to a bundle
  const subscribeToBundle = useCallback(async (
    bundleSlug: string,
    selectedAppIds: string[] = [],
    startTrial: boolean = true
  ): Promise<UserAppSubscription | null> => {
    if (!user?.id) return null;

    try {
      const subscription = await appSubscriptionService.subscribeToBundle(user.id, bundleSlug, selectedAppIds, startTrial);
      if (subscription) {
        await loadSubscriptions(); // Refresh subscriptions
      }
      return subscription;
    } catch (err) {
      console.error('Error subscribing to bundle:', err);
      setError(err instanceof Error ? err.message : 'Failed to subscribe');
      return null;
    }
  }, [user?.id, loadSubscriptions]);

  // Cancel subscription
  const cancelSubscription = useCallback(async (
    subscriptionId: string,
    reason?: string,
    immediately: boolean = false
  ): Promise<UserAppSubscription | null> => {
    try {
      const subscription = await appSubscriptionService.cancelSubscription(subscriptionId, reason, immediately);
      if (subscription) {
        await loadSubscriptions(); // Refresh subscriptions
      }
      return subscription;
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel');
      return null;
    }
  }, [loadSubscriptions]);

  // Upgrade app tier
  const upgradeAppTier = useCallback(async (
    subscriptionId: string,
    newTier: AppTier
  ): Promise<UserAppSubscription | null> => {
    try {
      const subscription = await appSubscriptionService.upgradeAppTier(subscriptionId, newTier);
      if (subscription) {
        await loadSubscriptions(); // Refresh subscriptions
      }
      return subscription;
    } catch (err) {
      console.error('Error upgrading tier:', err);
      setError(err instanceof Error ? err.message : 'Failed to upgrade');
      return null;
    }
  }, [loadSubscriptions]);

  // Calculate total for apps
  const calculateTotal = useCallback(async (appSlugs: string[], tier: AppTier): Promise<number> => {
    return appSubscriptionService.calculateAppsTotalPrice(appSlugs, tier);
  }, []);

  // Calculate bundle savings
  const calculateBundleSavings = useCallback(async (
    bundleSlug: string,
    appSlugs: string[]
  ): Promise<{ savings: number; percentage: number }> => {
    return appSubscriptionService.calculateBundleSavings(bundleSlug, appSlugs);
  }, []);

  // Refresh all data
  const refresh = useCallback(async () => {
    appSubscriptionService.clearCache();
    await Promise.all([loadCatalog(), loadSubscriptions()]);
  }, [loadCatalog, loadSubscriptions]);

  return {
    // Catalog
    apps,
    bundles,

    // User data
    subscriptions,
    activeApps,

    // Loading states
    isLoading,
    isCatalogLoading,
    isSubscriptionsLoading,
    error,

    // Quick access
    hasApp,
    getAppTier,
    checkLimit,

    // Actions
    subscribeToApp,
    subscribeToBundle,
    cancelSubscription,
    upgradeAppTier,

    // Utilities
    calculateTotal,
    calculateBundleSavings,
    refresh,
  };
}

export default useAppSubscription;
