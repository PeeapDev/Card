/**
 * Spending Analytics Service
 *
 * Analyzes user transactions to provide spending insights
 */

import { supabase } from '@/lib/supabase';

export interface SpendingCategory {
  category: string;
  amount: number;
  percentage: number;
  transactionCount: number;
  color: string;
}

export interface MonthlySpending {
  month: string;
  monthName: string;
  income: number;
  expenses: number;
  net: number;
}

export interface SpendingSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  averageDaily: number;
  biggestExpense: {
    amount: number;
    description: string;
    date: string;
  } | null;
  transactionCount: number;
}

export interface SpendingInsight {
  type: 'warning' | 'success' | 'info';
  title: string;
  message: string;
  metric?: number;
}

// Category mapping based on transaction type
const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  TRANSFER: { label: 'Transfers', color: '#6366f1' },
  BILL_PAYMENT: { label: 'Bills & Utilities', color: '#f59e0b' },
  AIRTIME: { label: 'Airtime', color: '#10b981' },
  DATA: { label: 'Data Bundles', color: '#06b6d4' },
  CARD_PAYMENT: { label: 'Card Payments', color: '#8b5cf6' },
  BNPL_PAYMENT: { label: 'BNPL', color: '#ec4899' },
  CASH_OUT: { label: 'Cash Withdrawals', color: '#ef4444' },
  DEPOSIT: { label: 'Deposits', color: '#22c55e' },
  CASHBACK_REDEMPTION: { label: 'Cashback', color: '#14b8a6' },
  OTHER: { label: 'Other', color: '#6b7280' },
};

export const analyticsService = {
  /**
   * Get spending summary for a period
   */
  async getSummary(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SpendingSummary> {
    // Get wallet ID
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .single();

    if (!wallet) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        netBalance: 0,
        averageDaily: 0,
        biggestExpense: null,
        transactionCount: 0,
      };
    }

    // Fetch transactions for period
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, type, description, created_at')
      .eq('wallet_id', wallet.id)
      .eq('status', 'COMPLETED')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (!transactions?.length) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        netBalance: 0,
        averageDaily: 0,
        biggestExpense: null,
        transactionCount: 0,
      };
    }

    let totalIncome = 0;
    let totalExpenses = 0;
    let biggestExpense: { amount: number; description: string; date: string } | null = null;

    for (const txn of transactions) {
      const amount = parseFloat(txn.amount) || 0;

      if (amount > 0) {
        totalIncome += amount;
      } else {
        const expenseAmount = Math.abs(amount);
        totalExpenses += expenseAmount;

        if (!biggestExpense || expenseAmount > biggestExpense.amount) {
          biggestExpense = {
            amount: expenseAmount,
            description: txn.description || txn.type,
            date: txn.created_at,
          };
        }
      }
    }

    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const averageDaily = daysDiff > 0 ? totalExpenses / daysDiff : 0;

    return {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      averageDaily,
      biggestExpense,
      transactionCount: transactions.length,
    };
  },

  /**
   * Get spending by category
   */
  async getSpendingByCategory(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SpendingCategory[]> {
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .single();

    if (!wallet) {
      return [];
    }

    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('wallet_id', wallet.id)
      .eq('status', 'COMPLETED')
      .lt('amount', 0) // Only expenses
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (!transactions?.length) {
      return [];
    }

    // Group by category
    const categoryTotals: Record<string, { amount: number; count: number }> = {};
    let totalSpent = 0;

    for (const txn of transactions) {
      const amount = Math.abs(parseFloat(txn.amount) || 0);
      const category = txn.type || 'OTHER';

      if (!categoryTotals[category]) {
        categoryTotals[category] = { amount: 0, count: 0 };
      }

      categoryTotals[category].amount += amount;
      categoryTotals[category].count++;
      totalSpent += amount;
    }

    // Convert to array with percentages
    const categories: SpendingCategory[] = Object.entries(categoryTotals)
      .map(([key, data]) => ({
        category: CATEGORY_CONFIG[key]?.label || key,
        amount: data.amount,
        percentage: totalSpent > 0 ? Math.round((data.amount / totalSpent) * 100) : 0,
        transactionCount: data.count,
        color: CATEGORY_CONFIG[key]?.color || '#6b7280',
      }))
      .sort((a, b) => b.amount - a.amount);

    return categories;
  },

  /**
   * Get monthly spending trend
   */
  async getMonthlyTrend(userId: string, months = 6): Promise<MonthlySpending[]> {
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .single();

    if (!wallet) {
      return [];
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months + 1);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, created_at')
      .eq('wallet_id', wallet.id)
      .eq('status', 'COMPLETED')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Initialize months
    const monthlyData: Record<string, { income: number; expenses: number }> = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = { income: 0, expenses: 0 };
    }

    // Process transactions
    for (const txn of transactions || []) {
      const date = new Date(txn.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (monthlyData[key]) {
        const amount = parseFloat(txn.amount) || 0;
        if (amount > 0) {
          monthlyData[key].income += amount;
        } else {
          monthlyData[key].expenses += Math.abs(amount);
        }
      }
    }

    // Convert to array
    return Object.entries(monthlyData)
      .map(([month, data]) => {
        const [year, monthNum] = month.split('-');
        return {
          month,
          monthName: monthNames[parseInt(monthNum) - 1],
          income: data.income,
          expenses: data.expenses,
          net: data.income - data.expenses,
        };
      })
      .reverse();
  },

  /**
   * Get spending insights
   */
  async getInsights(userId: string): Promise<SpendingInsight[]> {
    const insights: SpendingInsight[] = [];

    // Get current and previous month data
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [currentMonth, lastMonth] = await Promise.all([
      this.getSummary(userId, startOfMonth, now),
      this.getSummary(userId, startOfLastMonth, endOfLastMonth),
    ]);

    // Compare with last month
    if (lastMonth.totalExpenses > 0 && currentMonth.totalExpenses > 0) {
      const change = ((currentMonth.totalExpenses - lastMonth.totalExpenses) / lastMonth.totalExpenses) * 100;

      if (change > 20) {
        insights.push({
          type: 'warning',
          title: 'Spending Increase',
          message: `Your spending is ${Math.abs(Math.round(change))}% higher than last month. Consider reviewing your expenses.`,
          metric: change,
        });
      } else if (change < -10) {
        insights.push({
          type: 'success',
          title: 'Great Savings!',
          message: `You've reduced spending by ${Math.abs(Math.round(change))}% compared to last month.`,
          metric: change,
        });
      }
    }

    // Daily average check
    if (currentMonth.averageDaily > 0) {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const projectedMonthly = currentMonth.averageDaily * daysInMonth;

      insights.push({
        type: 'info',
        title: 'Monthly Projection',
        message: `At your current rate, you'll spend Le ${projectedMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })} this month.`,
        metric: projectedMonthly,
      });
    }

    // Transaction frequency
    if (currentMonth.transactionCount > 0) {
      const daysPassed = now.getDate();
      const avgPerDay = currentMonth.transactionCount / daysPassed;

      if (avgPerDay > 5) {
        insights.push({
          type: 'info',
          title: 'High Activity',
          message: `You're averaging ${avgPerDay.toFixed(1)} transactions per day. Consider consolidating payments.`,
        });
      }
    }

    // Positive balance insight
    if (currentMonth.netBalance > 0) {
      insights.push({
        type: 'success',
        title: 'Positive Cash Flow',
        message: `You've earned Le ${currentMonth.netBalance.toLocaleString()} more than you've spent this month!`,
        metric: currentMonth.netBalance,
      });
    }

    return insights;
  },

  /**
   * Get top merchants/recipients
   */
  async getTopRecipients(
    userId: string,
    startDate: Date,
    endDate: Date,
    limit = 5
  ): Promise<Array<{ name: string; amount: number; count: number }>> {
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .single();

    if (!wallet) {
      return [];
    }

    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, description, metadata')
      .eq('wallet_id', wallet.id)
      .eq('status', 'COMPLETED')
      .lt('amount', 0)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (!transactions?.length) {
      return [];
    }

    // Group by description/merchant
    const recipients: Record<string, { amount: number; count: number }> = {};

    for (const txn of transactions) {
      const name = txn.description || 'Unknown';
      if (!recipients[name]) {
        recipients[name] = { amount: 0, count: 0 };
      }
      recipients[name].amount += Math.abs(parseFloat(txn.amount) || 0);
      recipients[name].count++;
    }

    return Object.entries(recipients)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);
  },
};
