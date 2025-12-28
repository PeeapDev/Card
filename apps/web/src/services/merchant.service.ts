/**
 * Merchant Service
 *
 * Handles merchant-specific operations like payouts, transactions, and refunds
 */

import { supabase } from '@/lib/supabase';

export interface MerchantTransaction {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  type: string;
  customer_email?: string;
  customer_name?: string;
  reference?: string;
  payment_method?: string;
  created_at: string;
  completed_at?: string;
  description?: string;
  card_last4?: string;
  metadata?: Record<string, unknown>;
}

export interface MerchantPayout {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'in_transit' | 'paid';
  bank_account_last4?: string;
  bank_name?: string;
  arrival_date?: string;
  created_at: string;
  completed_at?: string;
  failure_reason?: string;
  metadata?: Record<string, unknown>;
}

export interface MerchantRefund {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  reason?: string;
  transaction_id: string;
  customer_email?: string;
  customer_name?: string;
  created_at: string;
  completed_at?: string;
  metadata?: Record<string, unknown>;
}

export interface MerchantStats {
  totalTransactions: number;
  totalVolume: number;
  completedTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
  availableBalance: number;
  pendingBalance: number;
  totalPayouts: number;
  totalRefunds: number;
}

class MerchantService {
  /**
   * Get merchant's wallet ID
   */
  async getMerchantWalletId(merchantId: string): Promise<string | null> {
    const { data } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', merchantId)
      .eq('wallet_type', 'primary')
      .single();

    return data?.id || null;
  }

  /**
   * Fetch merchant transactions via API (bypasses RLS)
   */
  async getTransactions(
    merchantId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{ transactions: MerchantTransaction[]; total: number }> {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.peeap.com';
      const params = new URLSearchParams({
        merchantId,
        limit: String(options?.limit || 100),
        offset: String(options?.offset || 0),
      });

      if (options?.status && options.status !== 'all') {
        params.append('status', options.status);
      }

      const response = await fetch(`${API_URL}/merchant/transactions?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();

      return {
        transactions: (data.transactions || []) as MerchantTransaction[],
        total: data.total || 0,
      };
    } catch (error) {
      console.error('Error fetching merchant transactions:', error);
      throw error;
    }
  }

  /**
   * Fetch merchant payouts
   */
  async getPayouts(
    merchantId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: string;
    }
  ): Promise<{ payouts: MerchantPayout[]; total: number }> {
    let query = supabase
      .from('payouts')
      .select('*', { count: 'exact' })
      .eq('user_id', merchantId)
      .order('created_at', { ascending: false });

    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, count, error } = await query;

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01') {
        return { payouts: [], total: 0 };
      }
      throw error;
    }

    return {
      payouts: (data || []) as MerchantPayout[],
      total: count || 0,
    };
  }

  /**
   * Fetch merchant refunds
   */
  async getRefunds(
    merchantId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: string;
    }
  ): Promise<{ refunds: MerchantRefund[]; total: number }> {
    let query = supabase
      .from('refunds')
      .select('*', { count: 'exact' })
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false });

    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, count, error } = await query;

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01') {
        return { refunds: [], total: 0 };
      }
      throw error;
    }

    return {
      refunds: (data || []) as MerchantRefund[],
      total: count || 0,
    };
  }

  /**
   * Get merchant statistics
   */
  async getStats(merchantId: string): Promise<MerchantStats> {
    // Get wallet balance
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance, pending_balance')
      .eq('user_id', merchantId)
      .eq('wallet_type', 'primary')
      .single();

    // Get checkout session counts (primary source for merchant transactions)
    const { data: sessions } = await supabase
      .from('checkout_sessions')
      .select('status, amount')
      .eq('merchant_id', merchantId);

    const allSessions = sessions || [];
    const stats: MerchantStats = {
      totalTransactions: allSessions.length,
      totalVolume: allSessions
        .filter(s => s.status === 'PAID')
        .reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0),
      completedTransactions: allSessions.filter(s => s.status === 'PAID').length,
      pendingTransactions: allSessions.filter(s => s.status === 'OPEN').length,
      failedTransactions: allSessions.filter(s => s.status === 'CANCELLED' || s.status === 'EXPIRED').length,
      availableBalance: wallet?.balance || 0,
      pendingBalance: wallet?.pending_balance || 0,
      totalPayouts: 0,
      totalRefunds: 0,
    };

    // Get payout count (ignore if table doesn't exist)
    try {
      const { count: payoutCount } = await supabase
        .from('payouts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', merchantId);
      stats.totalPayouts = payoutCount || 0;
    } catch {
      stats.totalPayouts = 0;
    }

    return stats;
  }

  /**
   * Request a payout
   */
  async requestPayout(
    merchantId: string,
    amount: number,
    currency: string,
    bankDetails: {
      accountNumber: string;
      bankCode: string;
      accountName: string;
    }
  ): Promise<MerchantPayout> {
    const { data, error } = await supabase
      .from('payouts')
      .insert({
        user_id: merchantId,
        amount,
        currency,
        status: 'pending',
        bank_account_last4: bankDetails.accountNumber.slice(-4),
        metadata: {
          bank_code: bankDetails.bankCode,
          account_name: bankDetails.accountName,
        },
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as MerchantPayout;
  }

  /**
   * Process a refund
   */
  async processRefund(
    merchantId: string,
    transactionId: string,
    amount: number,
    reason?: string
  ): Promise<MerchantRefund> {
    const { data, error } = await supabase
      .from('refunds')
      .insert({
        merchant_id: merchantId,
        transaction_id: transactionId,
        amount,
        status: 'pending',
        reason,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as MerchantRefund;
  }
}

export const merchantService = new MerchantService();
export default merchantService;
