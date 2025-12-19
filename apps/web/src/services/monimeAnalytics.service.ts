/**
 * Monime Analytics Service
 *
 * Fetches real transaction data directly from Monime API via backend
 * Tracks all Monime payment inflows (credits) and outflows (debits)
 *
 * Inflows = Money coming INTO the system (deposits, payments received)
 * Outflows = Money going OUT of the system (withdrawals, payouts)
 */

import { api } from '@/lib/api';

export interface MonimeSummary {
  totalDeposits: number;
  totalWithdrawals: number;
  depositCount: number;
  withdrawalCount: number;
  netFlow: number;
}

export interface MonimePeriodData {
  period: string;
  deposits: number;
  withdrawals: number;
  depositCount: number;
  withdrawalCount: number;
  netFlow: number;
}

export interface MonimeAnalyticsSummary {
  today: MonimeSummary;
  thisWeek: MonimeSummary;
  thisMonth: MonimeSummary;
  allTime: MonimeSummary;
}

export interface MonimeTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: {
    currency: string;
    value: number;
  };
  reference?: string;
  timestamp?: string;  // Normalized timestamp from backend
  createTime?: string; // Original Monime field
  updateTime?: string;
}

export interface MonimeAnalyticsResponse {
  success: boolean;
  currency: string;
  summary: MonimeAnalyticsSummary;
  recentTransactions: MonimeTransaction[];
}

export interface MonimeBalanceAccount {
  id: string;
  name: string;
  balance: number;
  balanceMinorUnits: number;
}

export interface MonimeBalanceResponse {
  success: boolean;
  balance: number; // Primary currency balance (SLE)
  balancesByCurrency: Record<string, {
    totalBalance: number;
    totalBalanceMinorUnits: number;
    currency: string;
    accounts: MonimeBalanceAccount[];
  }>;
  accountCount: number;
  updatedAt: string;
}

// Cache for analytics data (5 minute TTL)
let analyticsCache: {
  data: MonimeAnalyticsResponse | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0,
};

// Cache for balance data (1 minute TTL - more frequent for balance)
let balanceCache: {
  data: MonimeBalanceResponse | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0,
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const BALANCE_CACHE_TTL = 1 * 60 * 1000; // 1 minute

export const monimeAnalyticsService = {
  /**
   * Get Monime analytics summary - fetches from backend API which calls Monime directly
   */
  async getAnalytics(forceRefresh: boolean = false): Promise<MonimeAnalyticsResponse | null> {
    // Check cache first
    const now = Date.now();
    if (!forceRefresh && analyticsCache.data && (now - analyticsCache.timestamp) < CACHE_TTL) {
      return analyticsCache.data;
    }

    try {
      const response = await api.get<MonimeAnalyticsResponse>('/monime/analytics');

      if (response.success) {
        analyticsCache = {
          data: response,
          timestamp: now,
        };
        return response;
      }

      console.error('[MonimeAnalytics] API returned unsuccessful response');
      return null;
    } catch (error) {
      console.error('[MonimeAnalytics] Error fetching analytics:', error);
      // Return cached data if available, even if expired
      if (analyticsCache.data) {
        return analyticsCache.data;
      }
      return null;
    }
  },

  /**
   * Get Monime flow summary for all periods
   */
  async getSummary(): Promise<MonimeAnalyticsSummary> {
    const analytics = await this.getAnalytics();

    if (!analytics) {
      // Return empty summary
      const emptySummary: MonimeSummary = {
        totalDeposits: 0,
        totalWithdrawals: 0,
        depositCount: 0,
        withdrawalCount: 0,
        netFlow: 0,
      };

      return {
        today: emptySummary,
        thisWeek: emptySummary,
        thisMonth: emptySummary,
        allTime: emptySummary,
      };
    }

    return analytics.summary;
  },

  /**
   * Get recent Monime transactions
   */
  async getRecentTransactions(limit: number = 20): Promise<MonimeTransaction[]> {
    const analytics = await this.getAnalytics();
    if (!analytics) return [];
    return analytics.recentTransactions.slice(0, limit);
  },

  /**
   * Get daily data for charts - derived from recent transactions
   */
  async getDailyData(days: number = 7): Promise<MonimePeriodData[]> {
    const analytics = await this.getAnalytics();
    if (!analytics) return [];

    const results: MonimePeriodData[] = [];
    const now = new Date();
    const transactions = analytics.recentTransactions;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString();

      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

      const dayTxns = transactions.filter(t => {
        const ts = t.timestamp || t.createTime;
        return ts && ts >= dayStart && ts < dayEnd;
      });

      const credits = dayTxns.filter(t => t.type === 'credit');
      const debits = dayTxns.filter(t => t.type === 'debit');

      const deposits = credits.reduce((sum, t) => sum + (t.amount?.value || 0), 0);
      const withdrawals = debits.reduce((sum, t) => sum + (t.amount?.value || 0), 0);

      results.push({
        period: dayName,
        deposits,
        withdrawals,
        depositCount: credits.length,
        withdrawalCount: debits.length,
        netFlow: deposits - withdrawals,
      });
    }

    return results;
  },

  /**
   * Get monthly data for charts
   */
  async getMonthlyData(months: number = 6): Promise<MonimePeriodData[]> {
    const analytics = await this.getAnalytics();
    if (!analytics) return [];

    const results: MonimePeriodData[] = [];
    const now = new Date();
    const transactions = analytics.recentTransactions;

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const monthName = monthStart.toLocaleDateString('en-US', { month: 'short' });

      const monthTxns = transactions.filter(t => {
        const ts = t.timestamp || t.createTime;
        return ts && ts >= monthStart.toISOString() && ts < monthEnd.toISOString();
      });

      const credits = monthTxns.filter(t => t.type === 'credit');
      const debits = monthTxns.filter(t => t.type === 'debit');

      const deposits = credits.reduce((sum, t) => sum + (t.amount?.value || 0), 0);
      const withdrawals = debits.reduce((sum, t) => sum + (t.amount?.value || 0), 0);

      results.push({
        period: monthName,
        deposits,
        withdrawals,
        depositCount: credits.length,
        withdrawalCount: debits.length,
        netFlow: deposits - withdrawals,
      });
    }

    return results;
  },

  /**
   * Get Monime account balance
   * Returns the available balance in Monime financial accounts
   */
  async getBalance(forceRefresh: boolean = false): Promise<MonimeBalanceResponse | null> {
    // Check cache first
    const now = Date.now();
    if (!forceRefresh && balanceCache.data && (now - balanceCache.timestamp) < BALANCE_CACHE_TTL) {
      return balanceCache.data;
    }

    try {
      const response = await api.get<MonimeBalanceResponse>('/monime/balance');

      if (response.success) {
        balanceCache = {
          data: response,
          timestamp: now,
        };
        return response;
      }

      console.error('[MonimeAnalytics] Balance API returned unsuccessful response');
      return null;
    } catch (error) {
      console.error('[MonimeAnalytics] Error fetching balance:', error);
      // Return cached data if available, even if expired
      if (balanceCache.data) {
        return balanceCache.data;
      }
      return null;
    }
  },

  /**
   * Get primary currency balance (usually SLE)
   */
  async getPrimaryBalance(): Promise<number> {
    const balance = await this.getBalance();
    return balance?.balance || 0;
  },

  /**
   * Clear the cache - call this when you want fresh data
   */
  clearCache(): void {
    analyticsCache = {
      data: null,
      timestamp: 0,
    };
    balanceCache = {
      data: null,
      timestamp: 0,
    };
  },

  /**
   * Force refresh data from Monime
   */
  async refresh(): Promise<MonimeAnalyticsResponse | null> {
    this.clearCache();
    return this.getAnalytics(true);
  },

  /**
   * Subscribe to updates - polls every interval
   * Returns unsubscribe function
   */
  subscribeToUpdates(callback: () => void, intervalMs: number = 30000): () => void {
    // Initial call
    callback();

    // Set up polling interval
    const intervalId = setInterval(async () => {
      await this.getAnalytics(true); // Force refresh
      callback();
    }, intervalMs);

    return () => {
      clearInterval(intervalId);
    };
  },
};
