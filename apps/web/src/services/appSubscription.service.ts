/**
 * App Subscription Service
 *
 * Hybrid subscription system that allows:
 * 1. Individual app subscriptions (pay for what you use)
 * 2. Bundle subscriptions (discounted packages)
 * 3. All Access (unlimited apps)
 */

import { supabase, supabaseAdmin } from '@/lib/supabase';

// =====================================================
// TYPES
// =====================================================

export type AppTier = 'starter' | 'pro';
export type BundleType = 'fixed' | 'pick_n' | 'all_access';
export type AppSubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';
export type SubscriptionType = 'app' | 'bundle';

export interface App {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface AppPricing {
  id: string;
  app_id: string;
  tier: AppTier;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  trial_days: number;
  is_active: boolean;
}

export interface AppFeatureLimit {
  id: string;
  app_id: string;
  tier: AppTier;
  limit_key: string;
  limit_value: number; // -1 = unlimited
  description?: string;
}

export interface SubscriptionBundle {
  id: string;
  slug: string;
  name: string;
  description: string;
  bundle_type: BundleType;
  max_apps: number | null;
  app_tier: AppTier;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  trial_days: number;
  discount_percentage: number;
  is_active: boolean;
  sort_order: number;
}

export interface UserAppSubscription {
  id: string;
  user_id: string;
  business_id?: string;
  subscription_type: SubscriptionType;
  app_id?: string;
  app_tier?: AppTier;
  bundle_id?: string;
  selected_apps?: string[];
  price_monthly: number;
  currency: string;
  status: AppSubscriptionStatus;
  trial_started_at?: string;
  trial_ends_at?: string;
  current_period_start?: string;
  current_period_end?: string;
  next_billing_date?: string;
  cancelled_at?: string;
  cancel_reason?: string;
  cancel_at_period_end: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined data
  app?: App;
  bundle?: SubscriptionBundle;
}

export interface AppWithPricing extends App {
  pricing: {
    starter: AppPricing;
    pro: AppPricing;
  };
  limits: {
    starter: Record<string, number>;
    pro: Record<string, number>;
  };
}

export interface UserActiveApp {
  app_slug: string;
  app_name: string;
  tier: AppTier;
  subscription_type: SubscriptionType;
  status: AppSubscriptionStatus;
  expires_at?: string;
}

// =====================================================
// APP SUBSCRIPTION SERVICE
// =====================================================

class AppSubscriptionService {
  private appCache: Map<string, AppWithPricing> = new Map();
  private bundleCache: SubscriptionBundle[] = [];
  private lastCacheFetch: number = 0;
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  // =====================================================
  // CATALOG (Public Read)
  // =====================================================

  /**
   * Get all available apps with their pricing
   */
  async getApps(): Promise<AppWithPricing[]> {
    // Check cache
    if (this.appCache.size > 0 && Date.now() - this.lastCacheFetch < this.cacheTTL) {
      return Array.from(this.appCache.values());
    }

    try {
      // Fetch apps
      const { data: apps, error: appsError } = await supabase
        .from('apps')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (appsError) throw new Error(appsError.message);

      // Fetch pricing
      const { data: pricing, error: pricingError } = await supabase
        .from('app_pricing')
        .select('*')
        .eq('is_active', true);

      if (pricingError) throw new Error(pricingError.message);

      // Fetch limits
      const { data: limits, error: limitsError } = await supabase
        .from('app_feature_limits')
        .select('*');

      if (limitsError) throw new Error(limitsError.message);

      // Build app map
      const result: AppWithPricing[] = [];
      for (const app of apps || []) {
        const appPricing = (pricing || []).filter(p => p.app_id === app.id);
        const appLimits = (limits || []).filter(l => l.app_id === app.id);

        const starterPricing = appPricing.find(p => p.tier === 'starter');
        const proPricing = appPricing.find(p => p.tier === 'pro');

        const starterLimits: Record<string, number> = {};
        const proLimits: Record<string, number> = {};
        for (const limit of appLimits) {
          if (limit.tier === 'starter') starterLimits[limit.limit_key] = limit.limit_value;
          if (limit.tier === 'pro') proLimits[limit.limit_key] = limit.limit_value;
        }

        const appWithPricing: AppWithPricing = {
          ...app,
          pricing: {
            starter: starterPricing || { tier: 'starter', price_monthly: 0, price_yearly: 0, currency: 'NLE', trial_days: 7 } as AppPricing,
            pro: proPricing || { tier: 'pro', price_monthly: 0, price_yearly: 0, currency: 'NLE', trial_days: 7 } as AppPricing,
          },
          limits: {
            starter: starterLimits,
            pro: proLimits,
          },
        };

        result.push(appWithPricing);
        this.appCache.set(app.slug, appWithPricing);
      }

      this.lastCacheFetch = Date.now();
      return result;
    } catch (error) {
      console.error('Error fetching apps:', error);
      return [];
    }
  }

  /**
   * Get a single app by slug
   */
  async getApp(slug: string): Promise<AppWithPricing | null> {
    // Check cache first
    if (this.appCache.has(slug) && Date.now() - this.lastCacheFetch < this.cacheTTL) {
      return this.appCache.get(slug) || null;
    }

    // Fetch all apps (will populate cache)
    await this.getApps();
    return this.appCache.get(slug) || null;
  }

  /**
   * Get all available bundles
   */
  async getBundles(): Promise<SubscriptionBundle[]> {
    // Check cache
    if (this.bundleCache.length > 0 && Date.now() - this.lastCacheFetch < this.cacheTTL) {
      return this.bundleCache;
    }

    try {
      const { data, error } = await supabase
        .from('subscription_bundles')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw new Error(error.message);

      this.bundleCache = data || [];
      return this.bundleCache;
    } catch (error) {
      console.error('Error fetching bundles:', error);
      return [];
    }
  }

  /**
   * Get a single bundle by slug
   */
  async getBundle(slug: string): Promise<SubscriptionBundle | null> {
    const bundles = await this.getBundles();
    return bundles.find(b => b.slug === slug) || null;
  }

  // =====================================================
  // USER SUBSCRIPTIONS
  // =====================================================

  /**
   * Get user's subscriptions
   */
  async getUserSubscriptions(userId: string): Promise<UserAppSubscription[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_app_subscriptions')
        .select(`
          *,
          app:apps(*),
          bundle:subscription_bundles(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    } catch (error) {
      console.error('Error fetching user subscriptions:', error);
      return [];
    }
  }

  /**
   * Get user's active subscriptions only
   */
  async getActiveSubscriptions(userId: string): Promise<UserAppSubscription[]> {
    const subscriptions = await this.getUserSubscriptions(userId);
    return subscriptions.filter(s => ['trialing', 'active'].includes(s.status));
  }

  /**
   * Get list of apps user has access to
   */
  async getUserActiveApps(userId: string): Promise<UserActiveApp[]> {
    try {
      const subscriptions = await this.getActiveSubscriptions(userId);
      const apps = await this.getApps();
      const bundles = await this.getBundles();

      const activeApps: UserActiveApp[] = [];

      for (const sub of subscriptions) {
        if (sub.subscription_type === 'app' && sub.app_id) {
          // Individual app subscription
          const app = apps.find(a => a.id === sub.app_id);
          if (app) {
            activeApps.push({
              app_slug: app.slug,
              app_name: app.name,
              tier: sub.app_tier || 'starter',
              subscription_type: 'app',
              status: sub.status,
              expires_at: sub.current_period_end || sub.trial_ends_at,
            });
          }
        } else if (sub.subscription_type === 'bundle' && sub.bundle_id) {
          // Bundle subscription
          const bundle = bundles.find(b => b.id === sub.bundle_id);
          if (bundle) {
            if (bundle.bundle_type === 'all_access') {
              // All apps included
              for (const app of apps) {
                activeApps.push({
                  app_slug: app.slug,
                  app_name: app.name,
                  tier: bundle.app_tier,
                  subscription_type: 'bundle',
                  status: sub.status,
                  expires_at: sub.current_period_end || sub.trial_ends_at,
                });
              }
            } else if (bundle.bundle_type === 'pick_n' && sub.selected_apps) {
              // Selected apps
              for (const appId of sub.selected_apps) {
                const app = apps.find(a => a.id === appId);
                if (app) {
                  activeApps.push({
                    app_slug: app.slug,
                    app_name: app.name,
                    tier: bundle.app_tier,
                    subscription_type: 'bundle',
                    status: sub.status,
                    expires_at: sub.current_period_end || sub.trial_ends_at,
                  });
                }
              }
            }
          }
        }
      }

      return activeApps;
    } catch (error) {
      console.error('Error getting user active apps:', error);
      return [];
    }
  }

  /**
   * Check if user has access to a specific app
   */
  async hasAppAccess(userId: string, appSlug: string): Promise<boolean> {
    const activeApps = await this.getUserActiveApps(userId);
    return activeApps.some(a => a.app_slug === appSlug);
  }

  /**
   * Get user's tier for a specific app
   */
  async getUserAppTier(userId: string, appSlug: string): Promise<AppTier | null> {
    const activeApps = await this.getUserActiveApps(userId);
    const app = activeApps.find(a => a.app_slug === appSlug);
    return app?.tier || null;
  }

  /**
   * Check if user is within a limit for an app
   */
  async checkAppLimit(
    userId: string,
    appSlug: string,
    limitKey: string,
    currentCount: number
  ): Promise<{ allowed: boolean; limit: number; tier: AppTier | null }> {
    const tier = await this.getUserAppTier(userId, appSlug);
    if (!tier) {
      return { allowed: false, limit: 0, tier: null };
    }

    const app = await this.getApp(appSlug);
    if (!app) {
      return { allowed: false, limit: 0, tier };
    }

    const limit = app.limits[tier][limitKey];
    if (limit === undefined) {
      // No limit defined, allow unlimited
      return { allowed: true, limit: -1, tier };
    }
    if (limit === -1) {
      // Explicitly unlimited
      return { allowed: true, limit: -1, tier };
    }

    return { allowed: currentCount < limit, limit, tier };
  }

  // =====================================================
  // SUBSCRIPTION MANAGEMENT
  // =====================================================

  /**
   * Subscribe to an individual app
   */
  async subscribeToApp(
    userId: string,
    appSlug: string,
    tier: AppTier,
    startTrial: boolean = true,
    businessId?: string
  ): Promise<UserAppSubscription | null> {
    try {
      const app = await this.getApp(appSlug);
      if (!app) throw new Error('App not found');

      const pricing = app.pricing[tier];
      const now = new Date();
      const trialDays = startTrial ? pricing.trial_days : 0;

      let trialEndsAt: Date | null = null;
      let periodStart = now;
      let periodEnd: Date;
      let status: AppSubscriptionStatus = 'active';

      if (trialDays > 0) {
        trialEndsAt = new Date(now);
        trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
        periodEnd = trialEndsAt;
        status = 'trialing';
      } else {
        periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      const { data, error } = await supabaseAdmin
        .from('user_app_subscriptions')
        .insert({
          user_id: userId,
          business_id: businessId,
          subscription_type: 'app',
          app_id: app.id,
          app_tier: tier,
          price_monthly: pricing.price_monthly,
          currency: pricing.currency,
          status,
          trial_started_at: trialDays > 0 ? now.toISOString() : null,
          trial_ends_at: trialEndsAt?.toISOString(),
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          next_billing_date: periodEnd.toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (error) {
      console.error('Error subscribing to app:', error);
      return null;
    }
  }

  /**
   * Subscribe to a bundle
   */
  async subscribeToBundle(
    userId: string,
    bundleSlug: string,
    selectedAppIds: string[] = [],
    startTrial: boolean = true,
    businessId?: string
  ): Promise<UserAppSubscription | null> {
    try {
      const bundle = await this.getBundle(bundleSlug);
      if (!bundle) throw new Error('Bundle not found');

      // Validate selected apps for pick_n bundles
      if (bundle.bundle_type === 'pick_n') {
        if (selectedAppIds.length !== bundle.max_apps) {
          throw new Error(`Please select exactly ${bundle.max_apps} apps`);
        }
      }

      const now = new Date();
      const trialDays = startTrial ? bundle.trial_days : 0;

      let trialEndsAt: Date | null = null;
      let periodStart = now;
      let periodEnd: Date;
      let status: AppSubscriptionStatus = 'active';

      if (trialDays > 0) {
        trialEndsAt = new Date(now);
        trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
        periodEnd = trialEndsAt;
        status = 'trialing';
      } else {
        periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      const { data, error } = await supabaseAdmin
        .from('user_app_subscriptions')
        .insert({
          user_id: userId,
          business_id: businessId,
          subscription_type: 'bundle',
          bundle_id: bundle.id,
          selected_apps: bundle.bundle_type === 'pick_n' ? selectedAppIds : null,
          price_monthly: bundle.price_monthly,
          currency: bundle.currency,
          status,
          trial_started_at: trialDays > 0 ? now.toISOString() : null,
          trial_ends_at: trialEndsAt?.toISOString(),
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          next_billing_date: periodEnd.toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (error) {
      console.error('Error subscribing to bundle:', error);
      return null;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    reason?: string,
    cancelImmediately: boolean = false
  ): Promise<UserAppSubscription | null> {
    try {
      const updates: Record<string, unknown> = {
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason,
        cancel_at_period_end: !cancelImmediately,
        updated_at: new Date().toISOString(),
      };

      if (cancelImmediately) {
        updates.status = 'cancelled';
      }

      const { data, error } = await supabaseAdmin
        .from('user_app_subscriptions')
        .update(updates)
        .eq('id', subscriptionId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return null;
    }
  }

  /**
   * Upgrade app subscription tier
   */
  async upgradeAppTier(subscriptionId: string, newTier: AppTier): Promise<UserAppSubscription | null> {
    try {
      // Get current subscription
      const { data: current, error: fetchError } = await supabaseAdmin
        .from('user_app_subscriptions')
        .select('*, app:apps(*)')
        .eq('id', subscriptionId)
        .single();

      if (fetchError || !current) throw new Error('Subscription not found');

      // Get new pricing
      const app = await this.getApp(current.app?.slug);
      if (!app) throw new Error('App not found');

      const newPricing = app.pricing[newTier];

      const { data, error } = await supabaseAdmin
        .from('user_app_subscriptions')
        .update({
          app_tier: newTier,
          price_monthly: newPricing.price_monthly,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (error) {
      console.error('Error upgrading tier:', error);
      return null;
    }
  }

  /**
   * Activate subscription after payment
   */
  async activateSubscription(subscriptionId: string, periodMonths: number = 1): Promise<UserAppSubscription | null> {
    try {
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + periodMonths);

      const { data, error } = await supabaseAdmin
        .from('user_app_subscriptions')
        .update({
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
          next_billing_date: periodEnd.toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    } catch (error) {
      console.error('Error activating subscription:', error);
      return null;
    }
  }

  // =====================================================
  // UTILITIES
  // =====================================================

  /**
   * Calculate total price for selected apps
   */
  async calculateAppsTotalPrice(appSlugs: string[], tier: AppTier): Promise<number> {
    let total = 0;
    for (const slug of appSlugs) {
      const app = await this.getApp(slug);
      if (app) {
        total += app.pricing[tier].price_monthly;
      }
    }
    return total;
  }

  /**
   * Calculate savings for a bundle vs individual apps
   */
  async calculateBundleSavings(bundleSlug: string, appSlugs: string[]): Promise<{ savings: number; percentage: number }> {
    const bundle = await this.getBundle(bundleSlug);
    if (!bundle) return { savings: 0, percentage: 0 };

    const individualTotal = await this.calculateAppsTotalPrice(appSlugs, bundle.app_tier);
    const savings = individualTotal - bundle.price_monthly;
    const percentage = individualTotal > 0 ? Math.round((savings / individualTotal) * 100) : 0;

    return { savings, percentage };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.appCache.clear();
    this.bundleCache = [];
    this.lastCacheFetch = 0;
  }
}

export const appSubscriptionService = new AppSubscriptionService();
