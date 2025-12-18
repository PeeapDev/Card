/**
 * Mobile Money Float Service
 *
 * Tracks the balance held with mobile money providers (Orange Money, Africell, etc.)
 * This represents actual money held with providers that can be used for payouts.
 */

import { supabase } from '@/lib/supabase';

export interface MobileMoneyFloat {
  id: string;
  providerId: string;
  providerName: string;
  currency: string;
  currentBalance: number;
  totalDeposits: number;
  totalPayouts: number;
  totalFeesCollected: number;
  status: 'active' | 'suspended';
  lastDepositAt: string | null;
  lastPayoutAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MobileMoneyFloatHistory {
  id: string;
  floatId: string;
  providerId: string;
  currency: string;
  transactionType: 'deposit' | 'payout' | 'fee' | 'adjustment' | 'replenishment';
  amount: number;
  fee: number;
  previousBalance: number;
  newBalance: number;
  reference: string | null;
  description: string | null;
  transactionId: string | null;
  userId: string | null;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface MobileMoneyFloatSummary {
  providerId: string;
  providerName: string;
  currency: string;
  currentBalance: number;
  totalDeposits: number;
  totalPayouts: number;
  totalFeesCollected: number;
  netFlow: number;
  lastDepositAt: string | null;
  lastPayoutAt: string | null;
  status: string;
}

// Provider display info
export const PROVIDER_INFO: Record<string, { name: string; color: string; bgColor: string; icon: string }> = {
  'm17': { name: 'Orange Money', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: 'OM' },
  'm18': { name: 'Africell Money', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: 'AF' },
};

// Map database row to MobileMoneyFloat
const mapFloat = (row: any): MobileMoneyFloat => ({
  id: row.id,
  providerId: row.provider_id,
  providerName: row.provider_name,
  currency: row.currency,
  currentBalance: parseFloat(row.current_balance) || 0,
  totalDeposits: parseFloat(row.total_deposits) || 0,
  totalPayouts: parseFloat(row.total_payouts) || 0,
  totalFeesCollected: parseFloat(row.total_fees_collected) || 0,
  status: row.status,
  lastDepositAt: row.last_deposit_at,
  lastPayoutAt: row.last_payout_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Map database row to MobileMoneyFloatHistory
const mapHistory = (row: any): MobileMoneyFloatHistory => ({
  id: row.id,
  floatId: row.float_id,
  providerId: row.provider_id,
  currency: row.currency,
  transactionType: row.transaction_type,
  amount: parseFloat(row.amount) || 0,
  fee: parseFloat(row.fee) || 0,
  previousBalance: parseFloat(row.previous_balance) || 0,
  newBalance: parseFloat(row.new_balance) || 0,
  reference: row.reference,
  description: row.description,
  transactionId: row.transaction_id,
  userId: row.user_id,
  metadata: row.metadata || {},
  createdAt: row.created_at,
});

// Map summary row
const mapSummary = (row: any): MobileMoneyFloatSummary => ({
  providerId: row.provider_id,
  providerName: row.provider_name,
  currency: row.currency,
  currentBalance: parseFloat(row.current_balance) || 0,
  totalDeposits: parseFloat(row.total_deposits) || 0,
  totalPayouts: parseFloat(row.total_payouts) || 0,
  totalFeesCollected: parseFloat(row.total_fees_collected) || 0,
  netFlow: parseFloat(row.net_flow) || 0,
  lastDepositAt: row.last_deposit_at,
  lastPayoutAt: row.last_payout_at,
  status: row.status,
});

export const mobileMoneyFloatService = {
  /**
   * Get all mobile money floats
   */
  async getAllFloats(): Promise<MobileMoneyFloat[]> {
    const { data, error } = await supabase
      .from('mobile_money_float')
      .select('*')
      .order('provider_name', { ascending: true });

    if (error) {
      console.error('Error fetching mobile money floats:', error);
      return [];
    }

    return (data || []).map(mapFloat);
  },

  /**
   * Get float summary for dashboard
   */
  async getFloatSummary(): Promise<MobileMoneyFloatSummary[]> {
    const { data, error } = await supabase.rpc('get_mobile_money_float_summary');

    if (error) {
      console.error('Error fetching float summary, falling back to direct query:', error);
      // Fallback to direct query
      const floats = await this.getAllFloats();
      return floats.map(f => ({
        providerId: f.providerId,
        providerName: f.providerName,
        currency: f.currency,
        currentBalance: f.currentBalance,
        totalDeposits: f.totalDeposits,
        totalPayouts: f.totalPayouts,
        totalFeesCollected: f.totalFeesCollected,
        netFlow: f.totalDeposits - f.totalPayouts,
        lastDepositAt: f.lastDepositAt,
        lastPayoutAt: f.lastPayoutAt,
        status: f.status,
      }));
    }

    return (data || []).map(mapSummary);
  },

  /**
   * Get float by provider ID
   */
  async getFloatByProvider(providerId: string, currency: string = 'SLE'): Promise<MobileMoneyFloat | null> {
    const { data, error } = await supabase
      .from('mobile_money_float')
      .select('*')
      .eq('provider_id', providerId)
      .eq('currency', currency)
      .single();

    if (error) {
      console.error('Error fetching float by provider:', error);
      return null;
    }

    return mapFloat(data);
  },

  /**
   * Get float history
   */
  async getFloatHistory(providerId: string, limit: number = 50): Promise<MobileMoneyFloatHistory[]> {
    const { data, error } = await supabase
      .from('mobile_money_float_history')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching float history:', error);
      return [];
    }

    return (data || []).map(mapHistory);
  },

  /**
   * Get recent transactions across all providers
   */
  async getRecentTransactions(limit: number = 20): Promise<MobileMoneyFloatHistory[]> {
    const { data, error } = await supabase
      .from('mobile_money_float_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent transactions:', error);
      return [];
    }

    return (data || []).map(mapHistory);
  },

  /**
   * Get today's movements
   */
  async getTodayMovements(): Promise<{ deposits: number; payouts: number; fees: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('mobile_money_float_history')
      .select('transaction_type, amount, fee')
      .gte('created_at', today.toISOString());

    if (error) {
      console.error('Error fetching today movements:', error);
      return { deposits: 0, payouts: 0, fees: 0 };
    }

    let deposits = 0;
    let payouts = 0;
    let fees = 0;

    (data || []).forEach((item: any) => {
      const amount = parseFloat(item.amount) || 0;
      const fee = parseFloat(item.fee) || 0;

      if (item.transaction_type === 'deposit' || item.transaction_type === 'replenishment') {
        deposits += amount;
      } else if (item.transaction_type === 'payout') {
        payouts += amount;
      }
      fees += fee;
    });

    return { deposits, payouts, fees };
  },

  /**
   * Get consolidated totals
   */
  async getConsolidatedTotals(): Promise<{
    totalBalance: number;
    totalDeposits: number;
    totalPayouts: number;
    totalFees: number;
    floatsByProvider: Record<string, MobileMoneyFloat>;
  }> {
    const floats = await this.getAllFloats();

    let totalBalance = 0;
    let totalDeposits = 0;
    let totalPayouts = 0;
    let totalFees = 0;
    const floatsByProvider: Record<string, MobileMoneyFloat> = {};

    floats.forEach((f) => {
      totalBalance += f.currentBalance;
      totalDeposits += f.totalDeposits;
      totalPayouts += f.totalPayouts;
      totalFees += f.totalFeesCollected;
      floatsByProvider[f.providerId] = f;
    });

    return {
      totalBalance,
      totalDeposits,
      totalPayouts,
      totalFees,
      floatsByProvider,
    };
  },

  /**
   * Manually replenish float (superadmin only)
   */
  async replenishFloat(
    providerId: string,
    amount: number,
    description?: string
  ): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase.rpc('credit_mobile_money_float', {
      p_provider_id: providerId,
      p_amount: amount,
      p_fee: 0,
      p_reference: `replenish_${Date.now()}`,
      p_description: description || 'Manual replenishment',
      p_transaction_id: null,
      p_user_id: null,
      p_currency: 'SLE',
    });

    if (error) {
      console.error('Error replenishing float:', error);
      return { success: false, error: error.message };
    }

    return { success: data?.success || true };
  },

  /**
   * Get provider display info
   */
  getProviderInfo(providerId: string) {
    return PROVIDER_INFO[providerId] || {
      name: providerId,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      icon: '??',
    };
  },
};
