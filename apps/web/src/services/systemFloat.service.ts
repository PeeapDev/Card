/**
 * System Float Service
 *
 * Manages the controlled "System Float" (master balance) to prevent corruption and overspending.
 * The platform must not allow any transaction that exceeds the available system float.
 * Only superadmin can inject funds, close float, or reset opening balances.
 */

import { supabase } from '@/lib/supabase';

// API base URL - uses the same domain as the current page in production
const getApiUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return `${window.location.origin}/api`;
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
};

export interface SystemFloat {
  id: string;
  currency: string;
  openingBalance: number;
  currentBalance: number;
  closingBalance: number | null;
  totalInflows: number;
  totalOutflows: number;
  cycleStartDate: string;
  cycleEndDate: string | null;
  status: 'active' | 'closed' | 'suspended';
  financialYear: string | null;
  description: string | null;
  updatedBy: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FloatHistory {
  id: string;
  floatId: string;
  currency: string;
  amount: number;
  type: 'opening' | 'replenishment' | 'closing' | 'adjustment' | 'debit' | 'credit';
  previousBalance: number;
  newBalance: number;
  description: string | null;
  reference: string | null;
  transactionId: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface FloatSummary {
  id: string;
  currency: string;
  openingBalance: number;
  currentBalance: number;
  closingBalance: number | null;
  totalInflows: number;
  totalOutflows: number;
  netChange: number;
  utilizationPercentage: number;
  status: string;
  financialYear: string | null;
  cycleStartDate: string;
  cycleEndDate: string | null;
}

export interface OpenFloatRequest {
  currency: string;
  openingBalance: number;
  financialYear: string;
  description?: string;
}

export interface ReplenishFloatRequest {
  currency: string;
  amount: number;
  description?: string;
}

export interface CloseFloatRequest {
  currency: string;
  description?: string;
}

// Map database row to SystemFloat
const mapFloat = (row: any): SystemFloat => ({
  id: row.id,
  currency: row.currency,
  openingBalance: parseFloat(row.opening_balance) || 0,
  currentBalance: parseFloat(row.current_balance) || 0,
  closingBalance: row.closing_balance ? parseFloat(row.closing_balance) : null,
  totalInflows: parseFloat(row.total_inflows) || 0,
  totalOutflows: parseFloat(row.total_outflows) || 0,
  cycleStartDate: row.cycle_start_date,
  cycleEndDate: row.cycle_end_date,
  status: row.status,
  financialYear: row.financial_year,
  description: row.description,
  updatedBy: row.updated_by,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Map database row to FloatHistory
const mapHistory = (row: any): FloatHistory => ({
  id: row.id,
  floatId: row.float_id,
  currency: row.currency,
  amount: parseFloat(row.amount) || 0,
  type: row.type,
  previousBalance: parseFloat(row.previous_balance) || 0,
  newBalance: parseFloat(row.new_balance) || 0,
  description: row.description,
  reference: row.reference,
  transactionId: row.transaction_id,
  createdBy: row.created_by,
  createdAt: row.created_at,
});

// Map summary row
const mapSummary = (row: any): FloatSummary => ({
  id: row.id,
  currency: row.currency,
  openingBalance: parseFloat(row.opening_balance) || 0,
  currentBalance: parseFloat(row.current_balance) || 0,
  closingBalance: row.closing_balance ? parseFloat(row.closing_balance) : null,
  totalInflows: parseFloat(row.total_inflows) || 0,
  totalOutflows: parseFloat(row.total_outflows) || 0,
  netChange: parseFloat(row.net_change) || 0,
  utilizationPercentage: parseFloat(row.utilization_percentage) || 0,
  status: row.status,
  financialYear: row.financial_year,
  cycleStartDate: row.cycle_start_date,
  cycleEndDate: row.cycle_end_date,
});

export const systemFloatService = {
  /**
   * Get all floats (active and closed)
   */
  async getAllFloats(): Promise<SystemFloat[]> {
    const { data, error } = await supabase
      .from('system_float')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching floats:', error);
      throw new Error(error.message);
    }

    return (data || []).map(mapFloat);
  },

  /**
   * Get active floats (one per currency)
   */
  async getActiveFloats(): Promise<SystemFloat[]> {
    const { data, error } = await supabase
      .from('system_float')
      .select('*')
      .eq('status', 'active')
      .order('currency', { ascending: true });

    if (error) {
      console.error('Error fetching active floats:', error);
      throw new Error(error.message);
    }

    return (data || []).map(mapFloat);
  },

  /**
   * Get active float for a specific currency
   */
  async getActiveFloatByCurrency(currency: string): Promise<SystemFloat | null> {
    const { data, error } = await supabase
      .from('system_float')
      .select('*')
      .eq('currency', currency)
      .eq('status', 'active')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No active float
      }
      console.error('Error fetching float:', error);
      throw new Error(error.message);
    }

    return mapFloat(data);
  },

  /**
   * Get float summary for dashboard via API (bypasses RLS)
   */
  async getFloatSummary(): Promise<FloatSummary[]> {
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
        id: f.id,
        currency: f.currency,
        openingBalance: parseFloat(f.opening_balance) || 0,
        currentBalance: parseFloat(f.current_balance) || 0,
        closingBalance: f.closing_balance ? parseFloat(f.closing_balance) : null,
        totalInflows: parseFloat(f.total_inflows) || 0,
        totalOutflows: parseFloat(f.total_outflows) || 0,
        netChange: (parseFloat(f.total_inflows) || 0) - (parseFloat(f.total_outflows) || 0),
        utilizationPercentage: f.opening_balance > 0
          ? Math.round(((f.opening_balance - f.current_balance) / f.opening_balance) * 100 * 100) / 100
          : 0,
        status: f.status,
        financialYear: f.financial_year,
        cycleStartDate: f.cycle_start_date,
        cycleEndDate: f.cycle_end_date,
      }));
    } catch (error) {
      console.error('Error fetching float summary:', error);
      return [];
    }
  },

  /**
   * Open a new float (Superadmin only)
   */
  async openFloat(request: OpenFloatRequest, adminId: string): Promise<SystemFloat> {
    const { data, error } = await supabase.rpc('open_system_float', {
      p_currency: request.currency,
      p_opening_balance: request.openingBalance,
      p_financial_year: request.financialYear,
      p_description: request.description || `Opening balance for ${request.financialYear}`,
      p_admin_id: adminId,
    });

    if (error) {
      console.error('Error opening float:', error);
      throw new Error(error.message);
    }

    return mapFloat(data);
  },

  /**
   * Replenish float (Superadmin only)
   */
  async replenishFloat(request: ReplenishFloatRequest, adminId: string): Promise<SystemFloat> {
    const { data, error } = await supabase.rpc('replenish_system_float', {
      p_currency: request.currency,
      p_amount: request.amount,
      p_description: request.description || 'Capital injection',
      p_admin_id: adminId,
    });

    if (error) {
      console.error('Error replenishing float:', error);
      throw new Error(error.message);
    }

    return mapFloat(data);
  },

  /**
   * Close float (Superadmin only)
   */
  async closeFloat(request: CloseFloatRequest, adminId: string): Promise<SystemFloat> {
    const { data, error } = await supabase.rpc('close_system_float', {
      p_currency: request.currency,
      p_description: request.description || 'End of financial cycle',
      p_admin_id: adminId,
    });

    if (error) {
      console.error('Error closing float:', error);
      throw new Error(error.message);
    }

    return mapFloat(data);
  },

  /**
   * Check if float has sufficient balance
   */
  async checkFloatAvailability(currency: string, amount: number): Promise<boolean> {
    const { data, error } = await supabase.rpc('check_float_availability', {
      p_currency: currency,
      p_amount: amount,
    });

    if (error) {
      console.error('Error checking float availability:', error);
      // Default to allowing if function doesn't exist
      return true;
    }

    return data === true;
  },

  /**
   * Debit float (called during transactions)
   */
  async debitFloat(currency: string, amount: number, transactionId: string, description?: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('debit_system_float', {
      p_currency: currency,
      p_amount: amount,
      p_transaction_id: transactionId,
      p_description: description || 'Transaction debit',
    });

    if (error) {
      console.error('Error debiting float:', error);
      throw new Error(error.message);
    }

    return data === true;
  },

  /**
   * Credit float (when money returns)
   */
  async creditFloat(currency: string, amount: number, transactionId: string, description?: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('credit_system_float', {
      p_currency: currency,
      p_amount: amount,
      p_transaction_id: transactionId,
      p_description: description || 'Transaction credit',
    });

    if (error) {
      console.error('Error crediting float:', error);
      throw new Error(error.message);
    }

    return data === true;
  },

  /**
   * Get float history
   */
  async getFloatHistory(floatId: string, limit: number = 50): Promise<FloatHistory[]> {
    const { data, error } = await supabase
      .from('system_float_history')
      .select('*')
      .eq('float_id', floatId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching float history:', error);
      throw new Error(error.message);
    }

    return (data || []).map(mapHistory);
  },

  /**
   * Get all history for a currency
   */
  async getHistoryByCurrency(currency: string, limit: number = 100): Promise<FloatHistory[]> {
    const { data, error } = await supabase
      .from('system_float_history')
      .select('*')
      .eq('currency', currency)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching history by currency:', error);
      throw new Error(error.message);
    }

    return (data || []).map(mapHistory);
  },

  /**
   * Get today's float movements via API (bypasses RLS)
   */
  async getTodayMovements(_currency: string): Promise<{ inflows: number; outflows: number }> {
    try {
      // Use API endpoint which uses service role (bypasses RLS)
      const response = await fetch(`${getApiUrl()}/float/today`);

      if (!response.ok) {
        console.error('API error fetching today movements:', response.status);
        return { inflows: 0, outflows: 0 };
      }

      const result = await response.json();
      return {
        inflows: result.deposits || 0,
        outflows: result.payouts || 0,
      };
    } catch (error) {
      console.error('Error fetching today movements:', error);
      return { inflows: 0, outflows: 0 };
    }
  },

  /**
   * Get consolidated totals across all active floats
   */
  async getConsolidatedTotals(): Promise<{
    totalOpeningBalance: number;
    totalCurrentBalance: number;
    totalInflows: number;
    totalOutflows: number;
    floatsByCurrency: Record<string, SystemFloat>;
  }> {
    const activeFloats = await this.getActiveFloats();

    let totalOpeningBalance = 0;
    let totalCurrentBalance = 0;
    let totalInflows = 0;
    let totalOutflows = 0;
    const floatsByCurrency: Record<string, SystemFloat> = {};

    activeFloats.forEach((f) => {
      totalOpeningBalance += f.openingBalance;
      totalCurrentBalance += f.currentBalance;
      totalInflows += f.totalInflows;
      totalOutflows += f.totalOutflows;
      floatsByCurrency[f.currency] = f;
    });

    return {
      totalOpeningBalance,
      totalCurrentBalance,
      totalInflows,
      totalOutflows,
      floatsByCurrency,
    };
  },
};
