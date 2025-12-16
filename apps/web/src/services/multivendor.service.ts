/**
 * Multivendor Service
 *
 * Handles POS multivendor marketplace settings and subscription
 */

import { supabase } from '@/lib/supabase';

export interface MultivendorSettings {
  id: string;
  merchant_id: string;
  is_enabled: boolean;
  subscription_status: 'none' | 'trial' | 'active' | 'expired' | 'cancelled';
  subscription_plan: 'monthly' | 'yearly' | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  has_used_trial: boolean;
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
  total_views: number;
  total_orders: number;
  total_revenue: number;
  created_at: string;
  updated_at: string;
}

export interface MultivendorSubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'monthly' | 'yearly';
  features: string[];
}

// Subscription pricing (in SLE)
export const MULTIVENDOR_PLANS: MultivendorSubscriptionPlan[] = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: 50000, // Le 50,000/month
    interval: 'monthly',
    features: [
      'List all your products on marketplace',
      'Appear on user dashboard carousel',
      'Reach thousands of customers',
      'Order notifications',
      'Analytics dashboard',
    ],
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: 500000, // Le 500,000/year (2 months free)
    interval: 'yearly',
    features: [
      'All monthly features',
      '2 months FREE (save Le 100,000)',
      'Priority listing',
      'Featured badge',
      'Priority support',
    ],
  },
];

export const multivendorService = {
  /**
   * Get multivendor settings for a merchant
   */
  async getSettings(merchantId: string): Promise<MultivendorSettings | null> {
    const { data, error } = await supabase
      .from('pos_multivendor_settings')
      .select('*')
      .eq('merchant_id', merchantId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching multivendor settings:', error);
    }

    return data;
  },

  /**
   * Check if multivendor is active (trial or paid)
   */
  async isActive(merchantId: string): Promise<boolean> {
    const settings = await this.getSettings(merchantId);

    if (!settings || !settings.is_enabled) {
      return false;
    }

    const now = new Date();

    // Check trial
    if (settings.subscription_status === 'trial' && settings.trial_ends_at) {
      return new Date(settings.trial_ends_at) > now;
    }

    // Check active subscription
    if (settings.subscription_status === 'active' && settings.subscription_expires_at) {
      return new Date(settings.subscription_expires_at) > now;
    }

    return false;
  },

  /**
   * Get remaining trial days
   */
  getRemainingTrialDays(settings: MultivendorSettings): number {
    if (settings.subscription_status !== 'trial' || !settings.trial_ends_at) {
      return 0;
    }

    const now = new Date();
    const trialEnd = new Date(settings.trial_ends_at);
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  },

  /**
   * Start free trial (7 days)
   */
  async startTrial(merchantId: string): Promise<MultivendorSettings> {
    // Check if settings exist
    const existing = await this.getSettings(merchantId);

    if (existing?.has_used_trial) {
      throw new Error('Free trial has already been used');
    }

    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const settingsData = {
      merchant_id: merchantId,
      is_enabled: true,
      subscription_status: 'trial',
      trial_started_at: now.toISOString(),
      trial_ends_at: trialEnd.toISOString(),
      has_used_trial: true,
    };

    if (existing) {
      const { data, error } = await supabase
        .from('pos_multivendor_settings')
        .update(settingsData)
        .eq('merchant_id', merchantId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    } else {
      const { data, error } = await supabase
        .from('pos_multivendor_settings')
        .insert(settingsData)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }
  },

  /**
   * Toggle multivendor on/off
   */
  async toggle(merchantId: string, enabled: boolean): Promise<MultivendorSettings> {
    const existing = await this.getSettings(merchantId);

    if (!existing) {
      // Create new settings
      const { data, error } = await supabase
        .from('pos_multivendor_settings')
        .insert({
          merchant_id: merchantId,
          is_enabled: enabled,
          subscription_status: 'none',
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }

    // If enabling and no active subscription/trial, prompt for trial
    if (enabled && existing.subscription_status === 'none' && !existing.has_used_trial) {
      return this.startTrial(merchantId);
    }

    // Just toggle
    const { data, error } = await supabase
      .from('pos_multivendor_settings')
      .update({ is_enabled: enabled })
      .eq('merchant_id', merchantId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Disable multivendor
   */
  async disable(merchantId: string): Promise<void> {
    const { error } = await supabase
      .from('pos_multivendor_settings')
      .update({ is_enabled: false })
      .eq('merchant_id', merchantId);

    if (error) throw new Error(error.message);
  },

  /**
   * Activate subscription after payment
   */
  async activateSubscription(
    merchantId: string,
    plan: 'monthly' | 'yearly',
    paymentReference: string,
    paymentAmount: number
  ): Promise<MultivendorSettings> {
    const now = new Date();
    const expiresAt = new Date(now);

    if (plan === 'monthly') {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    const existing = await this.getSettings(merchantId);

    const updateData = {
      merchant_id: merchantId,
      is_enabled: true,
      subscription_status: 'active',
      subscription_plan: plan,
      subscription_started_at: now.toISOString(),
      subscription_expires_at: expiresAt.toISOString(),
      last_payment_at: now.toISOString(),
      last_payment_amount: paymentAmount,
      payment_reference: paymentReference,
    };

    if (existing) {
      const { data, error } = await supabase
        .from('pos_multivendor_settings')
        .update(updateData)
        .eq('merchant_id', merchantId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    } else {
      const { data, error } = await supabase
        .from('pos_multivendor_settings')
        .insert(updateData)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }
  },

  /**
   * Get all active multivendor merchant IDs (for product queries)
   */
  async getActiveMultivendorMerchants(): Promise<string[]> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('pos_multivendor_settings')
      .select('merchant_id')
      .eq('is_enabled', true)
      .or(`subscription_status.eq.trial,subscription_status.eq.active`)
      .or(`trial_ends_at.gt.${now},subscription_expires_at.gt.${now}`);

    if (error) {
      console.error('Error fetching active multivendor merchants:', error);
      return [];
    }

    return (data || []).map(d => d.merchant_id);
  },

  /**
   * Increment view count
   */
  async incrementViews(merchantId: string): Promise<void> {
    await supabase.rpc('increment_multivendor_views', { p_merchant_id: merchantId });
  },

  /**
   * Update statistics after an order
   */
  async recordOrder(merchantId: string, orderAmount: number): Promise<void> {
    const { error } = await supabase
      .from('pos_multivendor_settings')
      .update({
        total_orders: supabase.rpc('increment', { x: 1 }),
        total_revenue: supabase.rpc('increment', { x: orderAmount }),
      })
      .eq('merchant_id', merchantId);

    if (error) {
      console.error('Error recording multivendor order:', error);
    }
  },
};

export default multivendorService;
