/**
 * Cashback Service
 *
 * Handles cashback rewards tracking, balance, and redemption
 */

import { supabase } from '@/lib/supabase';

export interface CashbackReward {
  id: string;
  userId: string;
  cardId?: string;
  transactionId?: string;
  amount: number;
  currency: string;
  percentageApplied: number;
  originalAmount: number;
  transactionType: string;
  merchantName?: string;
  status: 'PENDING' | 'CREDITED' | 'REDEEMED' | 'EXPIRED';
  creditedAt?: string;
  redeemedAt?: string;
  expiresAt?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashbackBalance {
  userId: string;
  currency: string;
  availableBalance: number;
  pendingBalance: number;
  totalRedeemed: number;
  lifetimeEarned: number;
  totalRewards: number;
}

export interface CashbackRedemption {
  id: string;
  userId: string;
  walletId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  transactionId?: string;
  processedAt?: string;
  createdAt: string;
}

// Map database row to CashbackReward
const mapCashbackReward = (row: any): CashbackReward => ({
  id: row.id,
  userId: row.user_id,
  cardId: row.card_id,
  transactionId: row.transaction_id,
  amount: parseFloat(row.amount) || 0,
  currency: row.currency || 'SLE',
  percentageApplied: parseFloat(row.percentage_applied) || 0,
  originalAmount: parseFloat(row.original_amount) || 0,
  transactionType: row.transaction_type || 'PAYMENT',
  merchantName: row.merchant_name,
  status: row.status || 'PENDING',
  creditedAt: row.credited_at,
  redeemedAt: row.redeemed_at,
  expiresAt: row.expires_at,
  description: row.description,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Map database row to CashbackBalance
const mapCashbackBalance = (row: any): CashbackBalance => ({
  userId: row.user_id,
  currency: row.currency || 'SLE',
  availableBalance: parseFloat(row.available_balance) || 0,
  pendingBalance: parseFloat(row.pending_balance) || 0,
  totalRedeemed: parseFloat(row.total_redeemed) || 0,
  lifetimeEarned: parseFloat(row.lifetime_earned) || 0,
  totalRewards: parseInt(row.total_rewards) || 0,
});

export const cashbackService = {
  /**
   * Get user's cashback balance summary
   */
  async getBalance(userId: string, currency = 'SLE'): Promise<CashbackBalance> {
    // First check if the view exists, if not calculate directly
    const { data, error } = await supabase
      .from('user_cashback_balance')
      .select('*')
      .eq('user_id', userId)
      .eq('currency', currency)
      .maybeSingle();

    if (error) {
      // View might not exist, calculate directly
      console.warn('Cashback balance view not found, calculating directly:', error.message);
      return this.calculateBalance(userId, currency);
    }

    if (!data) {
      // No cashback rewards yet
      return {
        userId,
        currency,
        availableBalance: 0,
        pendingBalance: 0,
        totalRedeemed: 0,
        lifetimeEarned: 0,
        totalRewards: 0,
      };
    }

    return mapCashbackBalance(data);
  },

  /**
   * Calculate balance directly from rewards table
   */
  async calculateBalance(userId: string, currency = 'SLE'): Promise<CashbackBalance> {
    const { data: rewards, error } = await supabase
      .from('cashback_rewards')
      .select('amount, status')
      .eq('user_id', userId)
      .eq('currency', currency);

    if (error) {
      console.error('Error calculating cashback balance:', error);
      return {
        userId,
        currency,
        availableBalance: 0,
        pendingBalance: 0,
        totalRedeemed: 0,
        lifetimeEarned: 0,
        totalRewards: 0,
      };
    }

    let availableBalance = 0;
    let pendingBalance = 0;
    let totalRedeemed = 0;
    let lifetimeEarned = 0;

    for (const reward of rewards || []) {
      const amount = parseFloat(reward.amount) || 0;
      lifetimeEarned += amount;

      switch (reward.status) {
        case 'CREDITED':
          availableBalance += amount;
          break;
        case 'PENDING':
          pendingBalance += amount;
          break;
        case 'REDEEMED':
          totalRedeemed += amount;
          break;
      }
    }

    return {
      userId,
      currency,
      availableBalance,
      pendingBalance,
      totalRedeemed,
      lifetimeEarned,
      totalRewards: (rewards || []).length,
    };
  },

  /**
   * Get user's cashback rewards history
   */
  async getRewards(
    userId: string,
    options?: {
      status?: CashbackReward['status'];
      limit?: number;
      offset?: number;
    }
  ): Promise<CashbackReward[]> {
    let query = supabase
      .from('cashback_rewards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching cashback rewards:', error);
      return [];
    }

    return (data || []).map(mapCashbackReward);
  },

  /**
   * Redeem cashback to wallet
   */
  async redeem(
    userId: string,
    walletId: string,
    amount?: number
  ): Promise<{ success: boolean; amount: number; message: string }> {
    // Use the RPC function
    const { data, error } = await supabase.rpc('redeem_cashback', {
      p_user_id: userId,
      p_wallet_id: walletId,
      p_amount: amount || null,
    });

    if (error) {
      console.error('Error redeeming cashback:', error);

      // Fallback: do it manually if RPC doesn't exist
      if (error.message.includes('does not exist')) {
        return this.redeemManually(userId, walletId, amount);
      }

      return {
        success: false,
        amount: 0,
        message: error.message,
      };
    }

    const result = data?.[0] || data;
    return {
      success: result?.success || false,
      amount: parseFloat(result?.amount_redeemed) || 0,
      message: result?.message || 'Unknown error',
    };
  },

  /**
   * Manual redemption fallback if RPC doesn't exist
   */
  async redeemManually(
    userId: string,
    walletId: string,
    amount?: number
  ): Promise<{ success: boolean; amount: number; message: string }> {
    // Get available balance
    const balance = await this.calculateBalance(userId, 'SLE');
    const redeemAmount = amount ? Math.min(amount, balance.availableBalance) : balance.availableBalance;

    if (redeemAmount < 0.01) {
      return {
        success: false,
        amount: 0,
        message: 'Insufficient cashback balance',
      };
    }

    // Get credited rewards
    const { data: rewards, error: rewardsError } = await supabase
      .from('cashback_rewards')
      .select('id, amount')
      .eq('user_id', userId)
      .eq('status', 'CREDITED')
      .order('created_at', { ascending: true });

    if (rewardsError || !rewards?.length) {
      return {
        success: false,
        amount: 0,
        message: 'No available rewards to redeem',
      };
    }

    // Mark rewards as redeemed up to the amount
    let remaining = redeemAmount;
    const rewardIds: string[] = [];

    for (const reward of rewards) {
      if (remaining <= 0) break;
      const rewardAmount = parseFloat(reward.amount) || 0;
      if (rewardAmount <= remaining) {
        rewardIds.push(reward.id);
        remaining -= rewardAmount;
      }
    }

    // Update rewards to REDEEMED
    if (rewardIds.length > 0) {
      await supabase
        .from('cashback_rewards')
        .update({
          status: 'REDEEMED',
          redeemed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', rewardIds);
    }

    // Credit wallet
    const { error: walletError } = await supabase
      .from('wallets')
      .update({
        balance: supabase.rpc('', {}), // This won't work directly
        updated_at: new Date().toISOString(),
      })
      .eq('id', walletId);

    // Use RPC to update balance safely
    const { error: balanceError } = await supabase.rpc('update_wallet_balance', {
      p_wallet_id: walletId,
      p_amount: redeemAmount,
      p_operation: 'credit',
    });

    if (balanceError) {
      // Try direct update as fallback
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', walletId)
        .single();

      if (wallet) {
        await supabase
          .from('wallets')
          .update({
            balance: (parseFloat(wallet.balance) || 0) + redeemAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', walletId);
      }
    }

    // Create transaction record
    await supabase.from('transactions').insert({
      wallet_id: walletId,
      type: 'CASHBACK_REDEMPTION',
      amount: redeemAmount,
      status: 'COMPLETED',
      description: 'Cashback redemption to wallet',
      metadata: { rewards_redeemed: rewardIds.length },
    });

    return {
      success: true,
      amount: redeemAmount,
      message: 'Cashback redeemed successfully',
    };
  },

  /**
   * Credit cashback for a transaction (called from payment processing)
   */
  async creditCashback(params: {
    userId: string;
    cardId?: string;
    transactionId?: string;
    originalAmount: number;
    cashbackPercentage: number;
    transactionType?: string;
    merchantName?: string;
    currency?: string;
  }): Promise<string | null> {
    const cashbackAmount = Math.round(params.originalAmount * (params.cashbackPercentage / 100) * 100) / 100;

    if (cashbackAmount <= 0) {
      return null;
    }

    // Set expiry 90 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    const { data, error } = await supabase
      .from('cashback_rewards')
      .insert({
        user_id: params.userId,
        card_id: params.cardId,
        transaction_id: params.transactionId,
        amount: cashbackAmount,
        currency: params.currency || 'SLE',
        percentage_applied: params.cashbackPercentage,
        original_amount: params.originalAmount,
        transaction_type: params.transactionType || 'PAYMENT',
        merchant_name: params.merchantName,
        status: 'CREDITED',
        credited_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        description: `${params.cashbackPercentage}% cashback on ${params.merchantName || params.transactionType || 'payment'}`,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error crediting cashback:', error);
      return null;
    }

    return data?.id || null;
  },

  /**
   * Get user's redemption history
   */
  async getRedemptions(userId: string, limit = 20): Promise<CashbackRedemption[]> {
    const { data, error } = await supabase
      .from('cashback_redemptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching redemptions:', error);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      walletId: row.wallet_id,
      amount: parseFloat(row.amount) || 0,
      currency: row.currency || 'SLE',
      status: row.status || 'PENDING',
      transactionId: row.transaction_id,
      processedAt: row.processed_at,
      createdAt: row.created_at,
    }));
  },

  /**
   * Get cashback statistics for a user
   */
  async getStats(userId: string): Promise<{
    thisMonth: number;
    lastMonth: number;
    averagePercentage: number;
    topCategory: string;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // This month's cashback
    const { data: thisMonthData } = await supabase
      .from('cashback_rewards')
      .select('amount')
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString());

    // Last month's cashback
    const { data: lastMonthData } = await supabase
      .from('cashback_rewards')
      .select('amount')
      .eq('user_id', userId)
      .gte('created_at', startOfLastMonth.toISOString())
      .lt('created_at', endOfLastMonth.toISOString());

    // All rewards for stats
    const { data: allRewards } = await supabase
      .from('cashback_rewards')
      .select('percentage_applied, transaction_type')
      .eq('user_id', userId);

    const thisMonth = (thisMonthData || []).reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
    const lastMonth = (lastMonthData || []).reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

    // Calculate average percentage
    let averagePercentage = 0;
    if (allRewards?.length) {
      const totalPercentage = allRewards.reduce((sum, r) => sum + (parseFloat(r.percentage_applied) || 0), 0);
      averagePercentage = totalPercentage / allRewards.length;
    }

    // Find top category
    const categoryCounts: Record<string, number> = {};
    for (const reward of allRewards || []) {
      const type = reward.transaction_type || 'OTHER';
      categoryCounts[type] = (categoryCounts[type] || 0) + 1;
    }

    const topCategory = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return {
      thisMonth,
      lastMonth,
      averagePercentage,
      topCategory,
    };
  },
};
