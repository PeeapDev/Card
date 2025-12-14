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
   * Fetch merchant transactions
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
    const walletId = await this.getMerchantWalletId(merchantId);
    if (!walletId) {
      return { transactions: [], total: 0 };
    }

    let query = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .or(`wallet_id.eq.${walletId},recipient_id.eq.${merchantId}`)
      .order('created_at', { ascending: false });

    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    if (options?.startDate) {
      query = query.gte('created_at', options.startDate);
    }

    if (options?.endDate) {
      query = query.lte('created_at', options.endDate);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, count, error } = await query;

    if (error) {
      throw error;
    }

    return {
      transactions: (data || []) as MerchantTransaction[],
      total: count || 0,
    };
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
    const walletId = await this.getMerchantWalletId(merchantId);

    // Get wallet balance
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance, pending_balance')
      .eq('user_id', merchantId)
      .eq('wallet_type', 'primary')
      .single();

    // Get transaction counts
    const { data: transactions } = await supabase
      .from('transactions')
      .select('status, amount')
      .or(`wallet_id.eq.${walletId},recipient_id.eq.${merchantId}`);

    const stats: MerchantStats = {
      totalTransactions: transactions?.length || 0,
      totalVolume: transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0,
      completedTransactions: transactions?.filter(t => t.status === 'completed').length || 0,
      pendingTransactions: transactions?.filter(t => t.status === 'pending').length || 0,
      failedTransactions: transactions?.filter(t => t.status === 'failed').length || 0,
      availableBalance: wallet?.balance || 0,
      pendingBalance: wallet?.pending_balance || 0,
      totalPayouts: 0,
      totalRefunds: 0,
    };

    // Get payout count
    const { count: payoutCount } = await supabase
      .from('payouts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', merchantId);

    stats.totalPayouts = payoutCount || 0;

    // Get refund count
    const { count: refundCount } = await supabase
      .from('refunds')
      .select('*', { count: 'exact', head: true })
      .eq('merchant_id', merchantId);

    stats.totalRefunds = refundCount || 0;

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
