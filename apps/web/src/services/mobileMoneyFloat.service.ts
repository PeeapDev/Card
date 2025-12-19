/**
 * Mobile Money Float Service
 *
 * Uses the existing system_float tables to track mobile money transactions.
 * Shows deposits (money coming in via mobile money) and payouts (money going out).
 */

import { supabase } from '@/lib/supabase';

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

export interface MobileMoneyFloatHistory {
  id: string;
  floatId: string;
  providerId: string;
  currency: string;
  transactionType: string;
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

// Provider display info
export const PROVIDER_INFO: Record<string, { name: string; color: string; bgColor: string; icon: string }> = {
  'm17': { name: 'Orange Money', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: 'OM' },
  'm18': { name: 'Africell Money', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: 'AF' },
  'mobile_money': { name: 'Mobile Money', color: 'text-green-600', bgColor: 'bg-green-100', icon: 'MM' },
};

// Map database row from system_float_history to MobileMoneyFloatHistory
const mapHistory = (row: any): MobileMoneyFloatHistory => {
  // Try to extract provider from description
  let providerId = 'mobile_money';
  const desc = (row.description || '').toLowerCase();
  if (desc.includes('orange')) providerId = 'm17';
  else if (desc.includes('africell')) providerId = 'm18';

  return {
    id: row.id,
    floatId: row.float_id,
    providerId,
    currency: row.currency || 'SLE',
    transactionType: row.type || row.transaction_type, // Column is 'type' not 'transaction_type'
    amount: parseFloat(row.amount) || 0,
    fee: 0,
    previousBalance: parseFloat(row.previous_balance) || 0,
    newBalance: parseFloat(row.new_balance) || 0,
    reference: row.reference,
    description: row.description,
    transactionId: row.transaction_id,
    userId: row.created_by || row.performed_by,
    metadata: {},
    createdAt: row.created_at,
  };
};

export const mobileMoneyFloatService = {
  /**
   * Get float summary from system_float table
   * Shows current balances by currency
   */
  async getFloatSummary(): Promise<MobileMoneyFloatSummary[]> {
    // Get from system_float via RPC
    const { data, error } = await supabase.rpc('get_float_summary');

    if (error) {
      console.error('Error fetching float summary:', error);
      // Fallback: try direct query
      const { data: floats, error: directError } = await supabase
        .from('system_float')
        .select('*')
        .order('currency');

      if (directError || !floats) {
        return [];
      }

      return floats.map((f: any) => ({
        providerId: 'mobile_money',
        providerName: 'System Float',
        currency: f.currency,
        currentBalance: parseFloat(f.current_balance) || 0,
        totalDeposits: parseFloat(f.total_inflows) || parseFloat(f.total_credits) || 0,
        totalPayouts: parseFloat(f.total_outflows) || parseFloat(f.total_debits) || 0,
        totalFeesCollected: 0,
        netFlow: (parseFloat(f.total_inflows) || 0) - (parseFloat(f.total_outflows) || 0),
        lastDepositAt: f.updated_at,
        lastPayoutAt: null,
        status: f.status || 'active',
      }));
    }

    return (data || []).map((row: any) => ({
      providerId: 'mobile_money',
      providerName: 'System Float',
      currency: row.currency,
      currentBalance: parseFloat(row.current_balance) || 0,
      totalDeposits: parseFloat(row.total_inflows) || parseFloat(row.total_credits) || 0,
      totalPayouts: parseFloat(row.total_outflows) || parseFloat(row.total_debits) || 0,
      totalFeesCollected: 0,
      netFlow: (parseFloat(row.total_inflows) || 0) - (parseFloat(row.total_outflows) || 0),
      lastDepositAt: row.updated_at,
      lastPayoutAt: null,
      status: row.status || 'active',
    }));
  },

  /**
   * Get recent transactions from system_float_history
   * Filters to show mobile money related transactions
   */
  async getRecentTransactions(limit: number = 20): Promise<MobileMoneyFloatHistory[]> {
    const { data, error } = await supabase
      .from('system_float_history')
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
   * Get today's movements from system_float_history
   */
  async getTodayMovements(): Promise<{ deposits: number; payouts: number; fees: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('system_float_history')
      .select('type, amount')
      .gte('created_at', today.toISOString());

    if (error) {
      console.error('Error fetching today movements:', error);
      return { deposits: 0, payouts: 0, fees: 0 };
    }

    let deposits = 0;
    let payouts = 0;

    (data || []).forEach((item: any) => {
      const amount = parseFloat(item.amount) || 0;
      const txType = item.type || item.transaction_type;

      if (txType === 'credit' || txType === 'replenish' || txType === 'opening') {
        deposits += amount;
      } else if (txType === 'debit' || txType === 'close') {
        payouts += amount;
      }
    });

    return { deposits, payouts, fees: 0 };
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
