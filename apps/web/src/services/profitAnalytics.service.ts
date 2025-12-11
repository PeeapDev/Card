/**
 * Profit Analytics Service
 *
 * Calculates profit from transactions by different time periods.
 * Profit is derived from transaction fees collected by the system.
 */

import { supabase } from '@/lib/supabase';

export interface ProfitData {
  period: string;
  revenue: number;
  fees: number;
  profit: number;
  transactionCount: number;
}

export interface ProfitSummary {
  today: ProfitData;
  yesterday: ProfitData;
  thisWeek: ProfitData;
  lastWeek: ProfitData;
  thisMonth: ProfitData;
  lastMonth: ProfitData;
  thisYear: ProfitData;
  lastYear: ProfitData;
}

export interface ProfitChartData {
  daily: ProfitData[];    // Last 7 days
  weekly: ProfitData[];   // Last 4 weeks
  monthly: ProfitData[];  // Last 12 months
}

// Helper to get date ranges
const getDateRange = (period: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear') => {
  const now = new Date();
  let start: Date;
  let end: Date;

  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    case 'yesterday':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      break;
    case 'thisWeek':
      const dayOfWeek = now.getDay();
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
      end = now;
      break;
    case 'lastWeek':
      const lastWeekDay = now.getDay();
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - lastWeekDay - 7);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - lastWeekDay - 1, 23, 59, 59, 999);
      break;
    case 'thisMonth':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = now;
      break;
    case 'lastMonth':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    case 'thisYear':
      start = new Date(now.getFullYear(), 0, 1);
      end = now;
      break;
    case 'lastYear':
      start = new Date(now.getFullYear() - 1, 0, 1);
      end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      break;
    default:
      start = now;
      end = now;
  }

  return { start, end };
};

// Calculate profit from transactions in a date range
const calculateProfitForRange = async (start: Date, end: Date, periodLabel: string): Promise<ProfitData> => {
  try {
    // Get completed transactions with fees
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('id, amount, fee, type, status, created_at')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .eq('status', 'completed');

    if (error) {
      console.error('Error fetching transactions:', error);
      return { period: periodLabel, revenue: 0, fees: 0, profit: 0, transactionCount: 0 };
    }

    const txns = transactions || [];
    const revenue = txns.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const fees = txns.reduce((sum, t) => sum + (parseFloat(t.fee) || 0), 0);

    return {
      period: periodLabel,
      revenue,
      fees,
      profit: fees, // Profit = fees collected
      transactionCount: txns.length,
    };
  } catch (err) {
    console.error('Error calculating profit:', err);
    return { period: periodLabel, revenue: 0, fees: 0, profit: 0, transactionCount: 0 };
  }
};

export const profitAnalyticsService = {
  /**
   * Get profit summary for all periods
   */
  async getProfitSummary(): Promise<ProfitSummary> {
    const periods: Array<'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear'> = [
      'today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth', 'thisYear', 'lastYear'
    ];

    const results = await Promise.all(
      periods.map(async (period) => {
        const { start, end } = getDateRange(period);
        return calculateProfitForRange(start, end, period);
      })
    );

    return {
      today: results[0],
      yesterday: results[1],
      thisWeek: results[2],
      lastWeek: results[3],
      thisMonth: results[4],
      lastMonth: results[5],
      thisYear: results[6],
      lastYear: results[7],
    };
  },

  /**
   * Get daily profit data for the last N days
   */
  async getDailyProfit(days: number = 7): Promise<ProfitData[]> {
    const results: ProfitData[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const data = await calculateProfitForRange(start, end, dayName);
      results.push(data);
    }

    return results;
  },

  /**
   * Get weekly profit data for the last N weeks
   */
  async getWeeklyProfit(weeks: number = 4): Promise<ProfitData[]> {
    const results: ProfitData[] = [];
    const now = new Date();
    const currentDay = now.getDay();

    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - currentDay - (i * 7));
      const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6, 23, 59, 59, 999);

      const weekLabel = `W${weeks - i}`;
      const data = await calculateProfitForRange(weekStart, weekEnd, weekLabel);
      results.push(data);
    }

    return results;
  },

  /**
   * Get monthly profit data for the last N months
   */
  async getMonthlyProfit(months: number = 12): Promise<ProfitData[]> {
    const results: ProfitData[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);

      const monthName = monthStart.toLocaleDateString('en-US', { month: 'short' });
      const data = await calculateProfitForRange(monthStart, monthEnd, monthName);
      results.push(data);
    }

    return results;
  },

  /**
   * Get all chart data at once
   */
  async getChartData(): Promise<ProfitChartData> {
    const [daily, weekly, monthly] = await Promise.all([
      this.getDailyProfit(7),
      this.getWeeklyProfit(4),
      this.getMonthlyProfit(6),
    ]);

    return { daily, weekly, monthly };
  },

  /**
   * Subscribe to real-time transaction updates
   */
  subscribeToTransactions(callback: () => void): () => void {
    const subscription = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
        },
        () => {
          callback();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },
};
