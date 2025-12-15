/**
 * Business Service
 * Manages merchant businesses/shops with API keys and approval workflow
 */

import { supabase } from '@/lib/supabase';
import { sessionService } from './session.service';

export interface MerchantBusiness {
  id: string;
  merchant_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  business_category_id: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  callback_url?: string | null;

  // API Keys
  api_key?: string | null;
  live_public_key: string;
  live_secret_key: string;
  test_public_key: string;
  test_secret_key: string;

  // Mode & Approval
  is_live_mode: boolean;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  approval_notes: string | null;
  approved_by: string | null;
  approved_at: string | null;

  // Live Transaction Trial (before approval)
  // Unapproved businesses get 2 free live transactions as a trial
  // After approval, unlimited live transactions are allowed
  trial_live_transaction_limit: number;  // Default: 2
  trial_live_transactions_used: number;  // Count of live transactions used before approval

  // Legacy sandbox fields (for backwards compatibility)
  sandbox_transaction_limit?: number;
  sandbox_transactions_used?: number;

  // Webhook
  webhook_url: string | null;
  webhook_secret: string;
  webhook_events: string[] | null;

  // Settings
  settlement_schedule: 'INSTANT' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  auto_settlement: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

  // Features
  enabled_features?: string[];  // e.g., ['subscriptions', 'payment_links', 'invoices']

  created_at: string;
  updated_at: string;

  // Joined data
  business_category?: {
    id: string;
    name: string;
    icon: string | null;
  };
  merchant?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface CreateBusinessDto {
  name: string;
  description?: string;
  business_category_id?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  website_url?: string;
  logo_url?: string;
}

export interface UpdateBusinessDto {
  name?: string;
  description?: string;
  business_category_id?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  website_url?: string;
  logo_url?: string;
  webhook_url?: string;
  webhook_events?: string[];
  settlement_schedule?: 'INSTANT' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  auto_settlement?: boolean;
}

export const businessService = {
  /**
   * Get all businesses for the current merchant
   */
  async getMyBusinesses(): Promise<MerchantBusiness[]> {
    // Validate session and get user
    const user = await sessionService.validateSession();
    if (!user) {
      throw new Error('Not authenticated');
    }
    const merchantId = user.id;

    const { data, error } = await supabase
      .from('merchant_businesses')
      .select(`
        *,
        business_category:business_categories(id, name, icon)
      `)
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching businesses:', error);
      throw new Error(error.message);
    }

    return data || [];
  },

  /**
   * Get a single business by ID
   */
  async getBusiness(businessId: string): Promise<MerchantBusiness> {
    const { data, error } = await supabase
      .from('merchant_businesses')
      .select(`
        *,
        business_category:business_categories(id, name, icon)
      `)
      .eq('id', businessId)
      .single();

    if (error) {
      console.error('Error fetching business:', error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Create a new business
   */
  async createBusiness(dto: CreateBusinessDto): Promise<MerchantBusiness> {
    // Validate session and get user
    const user = await sessionService.validateSession();
    if (!user) {
      throw new Error('Not authenticated');
    }
    const userId = user.id;

    const { data, error } = await supabase
      .from('merchant_businesses')
      .insert({
        merchant_id: userId,
        name: dto.name,
        description: dto.description || null,
        business_category_id: dto.business_category_id || null,
        email: dto.email || null,
        phone: dto.phone || null,
        address: dto.address || null,
        city: dto.city || null,
        website_url: dto.website_url || null,
        logo_url: dto.logo_url || null,
      })
      .select(`
        *,
        business_category:business_categories(id, name, icon)
      `)
      .single();

    if (error) {
      console.error('Error creating business:', error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Update a business
   */
  async updateBusiness(businessId: string, dto: UpdateBusinessDto): Promise<MerchantBusiness> {
    const { data, error } = await supabase
      .from('merchant_businesses')
      .update(dto)
      .eq('id', businessId)
      .select(`
        *,
        business_category:business_categories(id, name, icon)
      `)
      .single();

    if (error) {
      console.error('Error updating business:', error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Toggle live/test mode for a business
   * - Test mode: Always available, unlimited test transactions
   * - Live mode: Available if approved OR has remaining trial transactions (for PENDING)
   */
  async toggleLiveMode(businessId: string, isLive: boolean): Promise<MerchantBusiness> {
    const business = await this.getBusiness(businessId);

    if (isLive) {
      // Approved businesses can always switch to live
      if (business.approval_status === 'APPROVED') {
        // Allow
      }
      // Rejected/Suspended cannot switch to live
      else if (business.approval_status === 'REJECTED') {
        throw new Error('Business has been rejected. Please contact support.');
      }
      else if (business.approval_status === 'SUSPENDED') {
        throw new Error('Business has been suspended. Please contact support.');
      }
      // Pending businesses can switch to live if they have remaining trial transactions
      else if (business.approval_status === 'PENDING') {
        const limit = business.trial_live_transaction_limit || 2;
        const used = business.trial_live_transactions_used || 0;
        const remaining = limit - used;

        if (remaining <= 0) {
          throw new Error(`You have used all ${limit} trial live transactions. Please wait for admin approval to continue processing live payments.`);
        }
        // Allow switching - they have trial transactions remaining
      }
    }

    const { data, error } = await supabase
      .from('merchant_businesses')
      .update({ is_live_mode: isLive })
      .eq('id', businessId)
      .select()
      .single();

    if (error) {
      console.error('Error toggling live mode:', error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Check if a business can process a live transaction
   * Rules:
   * - APPROVED businesses: Unlimited live transactions
   * - PENDING businesses: Limited to trial_live_transaction_limit (default 2)
   * - REJECTED/SUSPENDED businesses: No live transactions
   * - Test/sandbox transactions: Always unlimited
   */
  canProcessLiveTransaction(business: MerchantBusiness): { allowed: boolean; reason?: string; remaining?: number } {
    // Approved businesses can always process live transactions
    if (business.approval_status === 'APPROVED') {
      return { allowed: true };
    }

    // Rejected or suspended businesses cannot process live transactions
    if (business.approval_status === 'REJECTED') {
      return {
        allowed: false,
        reason: 'Business has been rejected. Please contact support.'
      };
    }

    if (business.approval_status === 'SUSPENDED') {
      return {
        allowed: false,
        reason: 'Business has been suspended. Please contact support.'
      };
    }

    // Pending businesses have limited trial live transactions
    const limit = business.trial_live_transaction_limit || 2;
    const used = business.trial_live_transactions_used || 0;
    const remaining = limit - used;

    if (remaining <= 0) {
      return {
        allowed: false,
        reason: `You have used all ${limit} trial live transactions. Please wait for admin approval to continue processing live payments.`,
        remaining: 0
      };
    }

    return {
      allowed: true,
      remaining,
      reason: `${remaining} trial live transaction(s) remaining before approval required`
    };
  },

  /**
   * Increment the trial live transaction count (call this after a successful live transaction)
   * Only increments for unapproved businesses
   */
  async incrementTrialTransactionCount(businessId: string): Promise<MerchantBusiness | null> {
    const business = await this.getBusiness(businessId);

    // Only increment for pending (unapproved) businesses
    if (business.approval_status !== 'PENDING') {
      return null;
    }

    const { data, error } = await supabase
      .from('merchant_businesses')
      .update({
        trial_live_transactions_used: (business.trial_live_transactions_used || 0) + 1
      })
      .eq('id', businessId)
      .select()
      .single();

    if (error) {
      console.error('Error incrementing trial transaction count:', error);
      return null;
    }

    return data;
  },

  /**
   * Get transaction limits info for display
   */
  getTransactionLimitsInfo(business: MerchantBusiness): {
    testTransactions: string;
    liveTransactions: string;
    status: 'unlimited' | 'trial' | 'blocked';
  } {
    if (business.approval_status === 'APPROVED') {
      return {
        testTransactions: 'Unlimited',
        liveTransactions: 'Unlimited',
        status: 'unlimited'
      };
    }

    if (business.approval_status === 'REJECTED' || business.approval_status === 'SUSPENDED') {
      return {
        testTransactions: 'Unlimited',
        liveTransactions: 'Blocked',
        status: 'blocked'
      };
    }

    // Pending
    const limit = business.trial_live_transaction_limit || 2;
    const used = business.trial_live_transactions_used || 0;
    const remaining = Math.max(0, limit - used);

    return {
      testTransactions: 'Unlimited',
      liveTransactions: `${remaining} of ${limit} trial remaining`,
      status: 'trial'
    };
  },

  /**
   * Regenerate API keys for a business
   */
  async regenerateApiKeys(businessId: string, keyType: 'live' | 'test'): Promise<MerchantBusiness> {
    // Generate new keys (will be done by database trigger on actual implementation)
    // For now, we'll do a simple update that triggers the database function
    const updateData = keyType === 'live'
      ? { live_public_key: null, live_secret_key: null }
      : { test_public_key: null, test_secret_key: null };

    const { data, error } = await supabase
      .from('merchant_businesses')
      .update(updateData)
      .eq('id', businessId)
      .select()
      .single();

    if (error) {
      console.error('Error regenerating API keys:', error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Delete a business
   */
  async deleteBusiness(businessId: string): Promise<void> {
    const { error } = await supabase
      .from('merchant_businesses')
      .delete()
      .eq('id', businessId);

    if (error) {
      console.error('Error deleting business:', error);
      throw new Error(error.message);
    }
  },

  // ==========================================
  // Admin Functions
  // ==========================================

  /**
   * Get all businesses for admin (with merchant info)
   */
  async getAllBusinesses(filters?: {
    approval_status?: string;
    status?: string;
    search?: string;
  }): Promise<MerchantBusiness[]> {
    let query = supabase
      .from('merchant_businesses')
      .select(`
        *,
        business_category:business_categories(id, name, icon),
        merchant:users!merchant_id(id, first_name, last_name, email)
      `)
      .order('created_at', { ascending: false });

    if (filters?.approval_status && filters.approval_status !== 'all') {
      query = query.eq('approval_status', filters.approval_status);
    }

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching all businesses:', error);
      throw new Error(error.message);
    }

    // Filter by search if provided
    let result = data || [];
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(b =>
        b.name.toLowerCase().includes(searchLower) ||
        b.email?.toLowerCase().includes(searchLower) ||
        b.merchant?.email?.toLowerCase().includes(searchLower) ||
        `${b.merchant?.first_name} ${b.merchant?.last_name}`.toLowerCase().includes(searchLower)
      );
    }

    return result;
  },

  /**
   * Approve a business
   */
  async approveBusiness(businessId: string, adminId: string, notes?: string): Promise<MerchantBusiness> {
    const { data, error } = await supabase
      .from('merchant_businesses')
      .update({
        approval_status: 'APPROVED',
        approved_by: adminId,
        approved_at: new Date().toISOString(),
        approval_notes: notes || 'Approved by admin',
      })
      .eq('id', businessId)
      .select()
      .single();

    if (error) {
      console.error('Error approving business:', error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Reject a business
   */
  async rejectBusiness(businessId: string, adminId: string, notes: string): Promise<MerchantBusiness> {
    const { data, error } = await supabase
      .from('merchant_businesses')
      .update({
        approval_status: 'REJECTED',
        approved_by: adminId,
        approved_at: new Date().toISOString(),
        approval_notes: notes,
      })
      .eq('id', businessId)
      .select()
      .single();

    if (error) {
      console.error('Error rejecting business:', error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Suspend a business
   */
  async suspendBusiness(businessId: string, adminId: string, notes: string): Promise<MerchantBusiness> {
    const { data, error } = await supabase
      .from('merchant_businesses')
      .update({
        approval_status: 'SUSPENDED',
        status: 'SUSPENDED',
        approved_by: adminId,
        approval_notes: notes,
        is_live_mode: false, // Force back to test mode
      })
      .eq('id', businessId)
      .select()
      .single();

    if (error) {
      console.error('Error suspending business:', error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Reactivate a suspended business
   */
  async reactivateBusiness(businessId: string, adminId: string): Promise<MerchantBusiness> {
    const { data, error } = await supabase
      .from('merchant_businesses')
      .update({
        approval_status: 'APPROVED',
        status: 'ACTIVE',
        approved_by: adminId,
        approval_notes: 'Reactivated by admin',
      })
      .eq('id', businessId)
      .select()
      .single();

    if (error) {
      console.error('Error reactivating business:', error);
      throw new Error(error.message);
    }

    return data;
  },
};
