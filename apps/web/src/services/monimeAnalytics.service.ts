/**
 * Monime Analytics Service
 *
 * Tracks all Monime payment inflows (deposits) and outflows (withdrawals)
 * Data sources:
 * 1. monime_transactions table - Direct wallet deposits/withdrawals via Monime
 * 2. transactions table - Payments via mobile money that went through Monime
 * 3. checkout_sessions table - Completed checkout sessions with mobile_money payment
 *
 * Inflows = Money coming INTO the system via Monime (deposits, incoming payments)
 * Outflows = Money going OUT via Monime (withdrawals, cashouts)
 */

import { supabase } from '@/lib/supabase';

export interface MonimeSummary {
  totalDeposits: number;
  totalWithdrawals: number;
  depositCount: number;
  withdrawalCount: number;
  netFlow: number;
  currency: string;
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
  yesterday: MonimeSummary;
  thisWeek: MonimeSummary;
  thisMonth: MonimeSummary;
  thisYear: MonimeSummary;
  allTime: MonimeSummary;
}

// Helper to get date ranges
const getDateRange = (period: 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'thisYear') => {
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
    case 'thisMonth':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = now;
      break;
    case 'thisYear':
      start = new Date(now.getFullYear(), 0, 1);
      end = now;
      break;
    default:
      start = now;
      end = now;
  }

  return { start, end };
};

// Calculate Monime flows for a date range - combines multiple data sources
const calculateMonimeFlows = async (
  start?: Date,
  end?: Date,
  currency: string = 'SLE'
): Promise<MonimeSummary> => {
  try {
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let depositCount = 0;
    let withdrawalCount = 0;

    // Source 1: monime_transactions table (direct deposits/withdrawals)
    try {
      let monimeQuery = supabase
        .from('monime_transactions')
        .select('id, type, amount, currency_code, status, created_at')
        .eq('status', 'COMPLETED')
        .eq('currency_code', currency);

      if (start) {
        monimeQuery = monimeQuery.gte('created_at', start.toISOString());
      }
      if (end) {
        monimeQuery = monimeQuery.lte('created_at', end.toISOString());
      }

      const { data: monimeTxns, error: monimeError } = await monimeQuery;

      if (!monimeError && monimeTxns) {
        const deposits = monimeTxns.filter(t => t.type === 'DEPOSIT');
        const withdrawals = monimeTxns.filter(t => t.type === 'WITHDRAWAL');

        totalDeposits += deposits.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        totalWithdrawals += withdrawals.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        depositCount += deposits.length;
        withdrawalCount += withdrawals.length;
      }
    } catch (e) {
      console.log('monime_transactions table may not exist:', e);
    }

    // Source 2: checkout_sessions with mobile_money payment (completed payments via Monime)
    // These are INFLOWS - money coming into merchant wallets via Monime mobile money
    try {
      let checkoutQuery = supabase
        .from('checkout_sessions')
        .select('id, amount, currency_code, status, payment_method, completed_at, created_at')
        .eq('status', 'COMPLETE')
        .eq('currency_code', currency);

      // Filter by payment_method containing mobile
      if (start) {
        checkoutQuery = checkoutQuery.gte('completed_at', start.toISOString());
      }
      if (end) {
        checkoutQuery = checkoutQuery.lte('completed_at', end.toISOString());
      }

      const { data: checkoutSessions, error: checkoutError } = await checkoutQuery;

      if (!checkoutError && checkoutSessions) {
        // Filter for mobile money payments (these went through Monime)
        const mobilePayments = checkoutSessions.filter(s =>
          s.payment_method === 'mobile_money' ||
          s.payment_method === 'monime_mobile' ||
          s.payment_method?.includes('mobile')
        );

        // These are inflows - money coming INTO the system
        totalDeposits += mobilePayments.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
        depositCount += mobilePayments.length;
      }
    } catch (e) {
      console.log('checkout_sessions query error:', e);
    }

    // Source 3: transactions table with monime/mobile_money metadata
    // Look for deposit transactions that came through Monime
    try {
      let txnQuery = supabase
        .from('transactions')
        .select('id, type, amount, currency, status, metadata, created_at')
        .eq('status', 'completed')
        .eq('currency', currency);

      if (start) {
        txnQuery = txnQuery.gte('created_at', start.toISOString());
      }
      if (end) {
        txnQuery = txnQuery.lte('created_at', end.toISOString());
      }

      const { data: transactions, error: txnError } = await txnQuery;

      if (!txnError && transactions) {
        // Filter for Monime-related transactions
        const monimeRelated = transactions.filter(t => {
          const metadata = t.metadata || {};
          const paymentMethod = metadata.paymentMethod || metadata.payment_method || '';
          return (
            paymentMethod.includes('monime') ||
            paymentMethod.includes('mobile') ||
            metadata.monimeReference ||
            metadata.checkoutSessionId
          );
        });

        // Categorize by type
        for (const txn of monimeRelated) {
          const amount = parseFloat(txn.amount) || 0;
          const type = (txn.type || '').toLowerCase();

          // Deposits/credits are inflows
          if (type === 'deposit' || type === 'credit' || type === 'receive') {
            // Avoid double counting with checkout_sessions
            const metadata = txn.metadata || {};
            if (!metadata.checkoutSessionId) {
              totalDeposits += amount;
              depositCount += 1;
            }
          }
          // Withdrawals/cashouts are outflows
          else if (type === 'withdrawal' || type === 'cashout' || type === 'payout') {
            totalWithdrawals += amount;
            withdrawalCount += 1;
          }
        }
      }
    } catch (e) {
      console.log('transactions query error:', e);
    }

    // Source 4: payouts table (money going OUT via Monime)
    try {
      let payoutQuery = supabase
        .from('payouts')
        .select('id, amount, currency, status, created_at')
        .eq('status', 'completed')
        .eq('currency', currency);

      if (start) {
        payoutQuery = payoutQuery.gte('created_at', start.toISOString());
      }
      if (end) {
        payoutQuery = payoutQuery.lte('created_at', end.toISOString());
      }

      const { data: payouts, error: payoutError } = await payoutQuery;

      if (!payoutError && payouts) {
        totalWithdrawals += payouts.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        withdrawalCount += payouts.length;
      }
    } catch (e) {
      console.log('payouts table may not exist:', e);
    }

    return {
      totalDeposits,
      totalWithdrawals,
      depositCount,
      withdrawalCount,
      netFlow: totalDeposits - totalWithdrawals,
      currency,
    };
  } catch (err) {
    console.error('Error calculating Monime flows:', err);
    return {
      totalDeposits: 0,
      totalWithdrawals: 0,
      depositCount: 0,
      withdrawalCount: 0,
      netFlow: 0,
      currency,
    };
  }
};

export const monimeAnalyticsService = {
  /**
   * Get Monime flow summary for all periods
   */
  async getSummary(currency: string = 'SLE'): Promise<MonimeAnalyticsSummary> {
    const periods: Array<'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'thisYear'> = [
      'today', 'yesterday', 'thisWeek', 'thisMonth', 'thisYear'
    ];

    const [today, yesterday, thisWeek, thisMonth, thisYear, allTime] = await Promise.all([
      ...periods.map(period => {
        const { start, end } = getDateRange(period);
        return calculateMonimeFlows(start, end, currency);
      }),
      calculateMonimeFlows(undefined, undefined, currency), // allTime
    ]);

    return {
      today,
      yesterday,
      thisWeek,
      thisMonth,
      thisYear,
      allTime,
    };
  },

  /**
   * Get daily Monime data for charts
   */
  async getDailyData(days: number = 7, currency: string = 'SLE'): Promise<MonimePeriodData[]> {
    const results: MonimePeriodData[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const data = await calculateMonimeFlows(start, end, currency);

      results.push({
        period: dayName,
        deposits: data.totalDeposits,
        withdrawals: data.totalWithdrawals,
        depositCount: data.depositCount,
        withdrawalCount: data.withdrawalCount,
        netFlow: data.netFlow,
      });
    }

    return results;
  },

  /**
   * Get monthly Monime data for charts
   */
  async getMonthlyData(months: number = 6, currency: string = 'SLE'): Promise<MonimePeriodData[]> {
    const results: MonimePeriodData[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);

      const monthName = monthStart.toLocaleDateString('en-US', { month: 'short' });
      const data = await calculateMonimeFlows(monthStart, monthEnd, currency);

      results.push({
        period: monthName,
        deposits: data.totalDeposits,
        withdrawals: data.totalWithdrawals,
        depositCount: data.depositCount,
        withdrawalCount: data.withdrawalCount,
        netFlow: data.netFlow,
      });
    }

    return results;
  },

  /**
   * Get recent Monime-related transactions from all sources
   */
  async getRecentTransactions(limit: number = 10, currency?: string): Promise<any[]> {
    try {
      // Get from checkout_sessions (mobile payments)
      let query = supabase
        .from('checkout_sessions')
        .select('*')
        .eq('status', 'COMPLETE')
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (currency) {
        query = query.eq('currency_code', currency);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching recent transactions:', error);
        return [];
      }

      // Filter for mobile money payments
      const mobilePayments = (data || []).filter(s =>
        s.payment_method === 'mobile_money' ||
        s.payment_method === 'monime_mobile' ||
        s.payment_method?.includes('mobile')
      );

      return mobilePayments;
    } catch (err) {
      console.error('Error:', err);
      return [];
    }
  },

  /**
   * Subscribe to real-time updates from multiple tables
   */
  subscribeToTransactions(callback: () => void): () => void {
    // Subscribe to checkout_sessions (main source for hosted checkout)
    const checkoutSub = supabase
      .channel('monime-checkout-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkout_sessions',
        },
        () => {
          callback();
        }
      )
      .subscribe();

    // Subscribe to transactions table
    const txnSub = supabase
      .channel('monime-txn-changes')
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

    // Subscribe to monime_transactions if it exists
    const monimeSub = supabase
      .channel('monime-direct-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'monime_transactions',
        },
        () => {
          callback();
        }
      )
      .subscribe();

    // Subscribe to payouts
    const payoutSub = supabase
      .channel('monime-payout-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payouts',
        },
        () => {
          callback();
        }
      )
      .subscribe();

    return () => {
      checkoutSub.unsubscribe();
      txnSub.unsubscribe();
      monimeSub.unsubscribe();
      payoutSub.unsubscribe();
    };
  },
};
