/**
 * Payment Links Service
 * Manages merchant payment links for shareable checkout URLs
 */

import { supabase, supabaseAdmin } from '@/lib/supabase';
import { sessionService } from './session.service';

export interface PaymentLink {
  id: string;
  business_id: string;
  merchant_id: string;
  name: string;
  description: string | null;
  slug: string;
  amount: number | null;
  currency: string;
  allow_custom_amount: boolean;
  min_amount: number | null;
  max_amount: number | null;
  success_url: string | null;
  cancel_url: string | null;
  status: 'active' | 'inactive' | 'expired';
  expires_at: string | null;
  view_count: number;
  payment_count: number;
  total_collected: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined data
  business?: {
    name: string;
    slug: string;
    logo_url: string | null;
  };
}

export interface CreatePaymentLinkDto {
  business_id: string;
  name: string;
  description?: string;
  amount?: number;
  currency?: string;
  allow_custom_amount?: boolean;
  min_amount?: number;
  max_amount?: number;
  success_url?: string;
  cancel_url?: string;
  expires_at?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdatePaymentLinkDto {
  name?: string;
  description?: string;
  amount?: number;
  allow_custom_amount?: boolean;
  min_amount?: number;
  max_amount?: number;
  success_url?: string;
  cancel_url?: string;
  status?: 'active' | 'inactive';
  expires_at?: string;
  metadata?: Record<string, unknown>;
}

export const paymentLinkService = {
  /**
   * Get all payment links for a business
   */
  async getPaymentLinks(businessId: string): Promise<PaymentLink[]> {
    const { data, error } = await supabaseAdmin
      .from('merchant_payment_links')
      .select(`
        *,
        business:merchant_businesses(name, slug, logo_url)
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payment links:', error);
      throw new Error(error.message);
    }

    return data || [];
  },

  /**
   * Get all payment links for the current merchant (across all businesses)
   */
  async getMyPaymentLinks(): Promise<PaymentLink[]> {
    const user = await sessionService.validateSession();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabaseAdmin
      .from('merchant_payment_links')
      .select(`
        *,
        business:merchant_businesses(name, slug, logo_url)
      `)
      .eq('merchant_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payment links:', error);
      throw new Error(error.message);
    }

    return data || [];
  },

  /**
   * Get a single payment link by ID
   */
  async getPaymentLink(id: string): Promise<PaymentLink> {
    const { data, error } = await supabaseAdmin
      .from('merchant_payment_links')
      .select(`
        *,
        business:merchant_businesses(name, slug, logo_url)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching payment link:', error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Get a payment link by slug (for public checkout)
   */
  async getPaymentLinkBySlug(businessSlug: string, linkSlug: string): Promise<PaymentLink | null> {
    const { data, error } = await supabaseAdmin
      .from('merchant_payment_links')
      .select(`
        *,
        business:merchant_businesses!inner(id, name, slug, logo_url, merchant_id, live_public_key, test_public_key, is_live_mode)
      `)
      .eq('slug', linkSlug)
      .eq('business.slug', businessSlug)
      .eq('status', 'active')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Error fetching payment link:', error);
      return null;
    }

    return data;
  },

  /**
   * Create a new payment link
   */
  async createPaymentLink(dto: CreatePaymentLinkDto): Promise<PaymentLink> {
    const user = await sessionService.validateSession();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabaseAdmin
      .from('merchant_payment_links')
      .insert({
        business_id: dto.business_id,
        merchant_id: user.id,
        name: dto.name,
        description: dto.description || null,
        amount: dto.amount || null,
        currency: dto.currency || 'SLE',
        allow_custom_amount: dto.allow_custom_amount || false,
        min_amount: dto.min_amount || null,
        max_amount: dto.max_amount || null,
        success_url: dto.success_url || null,
        cancel_url: dto.cancel_url || null,
        expires_at: dto.expires_at || null,
        metadata: dto.metadata || {},
      })
      .select(`
        *,
        business:merchant_businesses(name, slug, logo_url)
      `)
      .single();

    if (error) {
      console.error('Error creating payment link:', error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Update a payment link
   */
  async updatePaymentLink(id: string, dto: UpdatePaymentLinkDto): Promise<PaymentLink> {
    const { data, error } = await supabaseAdmin
      .from('merchant_payment_links')
      .update({
        ...dto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        business:merchant_businesses(name, slug, logo_url)
      `)
      .single();

    if (error) {
      console.error('Error updating payment link:', error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Delete a payment link
   */
  async deletePaymentLink(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('merchant_payment_links')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting payment link:', error);
      throw new Error(error.message);
    }
  },

  /**
   * Increment view count (for analytics)
   */
  async incrementViewCount(id: string): Promise<void> {
    await supabase.rpc('increment_payment_link_views', { link_id: id });
  },

  /**
   * Record a successful payment
   */
  async recordPayment(id: string, amount: number): Promise<void> {
    const { data: link } = await supabase
      .from('merchant_payment_links')
      .select('payment_count, total_collected')
      .eq('id', id)
      .single();

    if (link) {
      await supabase
        .from('merchant_payment_links')
        .update({
          payment_count: (link.payment_count || 0) + 1,
          total_collected: (link.total_collected || 0) + amount,
        })
        .eq('id', id);
    }
  },

  /**
   * Get the full payment link URL
   */
  getPaymentLinkUrl(businessSlug: string, linkSlug: string): string {
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : 'https://my.peeap.com';
    return `${baseUrl}/pay/${businessSlug}/${linkSlug}`;
  },
};
