/**
 * Mobile Money Float Service
 *
 * Uses the existing system_float tables to track mobile money transactions.
 * Shows deposits (money coming in via mobile money) and payouts (money going out).
 */

import { supabase } from '@/lib/supabase';

// API base URL - uses the same domain as the current page in production
const getApiUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return `${window.location.origin}/api`;
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
};

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
   * Get float summary from system_float table via API
   * Uses service role to bypass RLS
   */
  async getFloatSummary(): Promise<MobileMoneyFloatSummary[]> {
    try {
      // Use API endpoint which uses service role (bypasses RLS)
      const response = await fetch(`${getApiUrl()}/float/summary`);

      if (!response.ok) {
        console.error('API error fetching float summary:', response.status);
        return [];
      }

      const result = await response.json();
      const floats = result.floats || [];

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
    } catch (error) {
      console.error('Error fetching float summary:', error);
      return [];
    }
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
   * Get today's movements via API (bypasses RLS)
   */
  async getTodayMovements(): Promise<{ deposits: number; payouts: number; fees: number }> {
    try {
      // Use API endpoint which uses service role (bypasses RLS)
      const response = await fetch(`${getApiUrl()}/float/today`);

      if (!response.ok) {
        console.error('API error fetching today movements:', response.status);
        return { deposits: 0, payouts: 0, fees: 0 };
      }

      const result = await response.json();
      return {
        deposits: result.deposits || 0,
        payouts: result.payouts || 0,
        fees: result.fees || 0,
      };
    } catch (error) {
      console.error('Error fetching today movements:', error);
      return { deposits: 0, payouts: 0, fees: 0 };
    }
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
