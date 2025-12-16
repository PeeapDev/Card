/**
 * Spending Analytics Page
 *
 * Provides insights into user's spending patterns and habits
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  analyticsService,
  SpendingCategory,
  MonthlySpending,
  SpendingSummary,
  SpendingInsight,
} from '@/services/analytics.service';

type Period = 'week' | 'month' | 'quarter' | 'year';

export function SpendingAnalyticsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');

  // Data states
  const [summary, setSummary] = useState<SpendingSummary | null>(null);
  const [categories, setCategories] = useState<SpendingCategory[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlySpending[]>([]);
  const [insights, setInsights] = useState<SpendingInsight[]>([]);
  const [topRecipients, setTopRecipients] = useState<Array<{ name: string; amount: number; count: number }>>([]);

  // Load data when period changes
  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id, period]);

  const getDateRange = (): { start: Date; end: Date } => {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }

    return { start, end };
  };

  const loadData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { start, end } = getDateRange();

      const [summaryData, categoriesData, trendData, insightsData, recipientsData] = await Promise.all([
        analyticsService.getSummary(user.id, start, end),
        analyticsService.getSpendingByCategory(user.id, start, end),
        analyticsService.getMonthlyTrend(user.id, 6),
        analyticsService.getInsights(user.id),
        analyticsService.getTopRecipients(user.id, start, end, 5),
      ]);

      setSummary(summaryData);
      setCategories(categoriesData);
      setMonthlyTrend(trendData);
      setInsights(insightsData);
      setTopRecipients(recipientsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `NLe ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'quarter': return 'Last 3 Months';
      case 'year': return 'This Year';
    }
  };

  const getInsightIcon = (type: SpendingInsight['type']) => {
    switch (type) {
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getInsightBg = (type: SpendingInsight['type']) => {
    switch (type) {
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'success': return 'bg-green-50 border-green-200';
      case 'info': return 'bg-blue-50 border-blue-200';
    }
  };

  // Calculate max for trend chart
  const maxTrendValue = Math.max(
    ...monthlyTrend.flatMap(m => [m.income, m.expenses]),
    1
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Spending Analytics</h1>
            <p className="text-gray-600 mt-1">Track and understand your spending habits</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {(['week', 'month', 'quarter', 'year'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              period === p
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p === 'week' && '7 Days'}
            {p === 'month' && '30 Days'}
            {p === 'quarter' && '3 Months'}
            {p === 'year' && '1 Year'}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Income</p>
          <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(summary?.totalIncome || 0)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Expenses</p>
          <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(summary?.totalExpenses || 0)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Net</p>
          <p className={`text-xl font-bold mt-1 ${(summary?.netBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(summary?.netBalance || 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Daily Avg</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(summary?.averageDaily || 0)}</p>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="mb-6 space-y-3">
          {insights.slice(0, 3).map((insight, index) => (
            <div
              key={index}
              className={`p-4 rounded-xl border ${getInsightBg(insight.type)}`}
            >
              <div className="flex items-start gap-3">
                {getInsightIcon(insight.type)}
                <div>
                  <p className="font-medium text-gray-900">{insight.title}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{insight.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Spending by Category */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Spending by Category</h3>

        {categories.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No spending data for this period</p>
          </div>
        ) : (
          <div className="space-y-4">
            {categories.map((cat, index) => (
              <div key={index}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-medium text-gray-900">{cat.category}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-gray-900">{formatCurrency(cat.amount)}</span>
                    <span className="text-gray-500 ml-2">({cat.percentage}%)</span>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{cat.transactionCount} transactions</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monthly Trend */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Monthly Trend</h3>

        {monthlyTrend.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No trend data available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-600">Income</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-600">Expenses</span>
              </div>
            </div>

            {/* Chart */}
            <div className="flex items-end gap-3 h-40">
              {monthlyTrend.map((month, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex gap-1 items-end h-32">
                    {/* Income bar */}
                    <div
                      className="flex-1 bg-green-500 rounded-t transition-all hover:bg-green-600"
                      style={{
                        height: `${(month.income / maxTrendValue) * 100}%`,
                        minHeight: month.income > 0 ? '4px' : '0',
                      }}
                      title={`Income: ${formatCurrency(month.income)}`}
                    />
                    {/* Expense bar */}
                    <div
                      className="flex-1 bg-red-500 rounded-t transition-all hover:bg-red-600"
                      style={{
                        height: `${(month.expenses / maxTrendValue) * 100}%`,
                        minHeight: month.expenses > 0 ? '4px' : '0',
                      }}
                      title={`Expenses: ${formatCurrency(month.expenses)}`}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{month.monthName}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Top Recipients */}
      {topRecipients.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Top Spending</h3>
          <div className="space-y-3">
            {topRecipients.map((recipient, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{recipient.name}</p>
                    <p className="text-xs text-gray-500">{recipient.count} transactions</p>
                  </div>
                </div>
                <p className="font-semibold text-gray-900">{formatCurrency(recipient.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Biggest Expense */}
      {summary?.biggestExpense && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Biggest Expense</h3>
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
            <div>
              <p className="font-medium text-gray-900">{summary.biggestExpense.description}</p>
              <p className="text-sm text-gray-500">{formatDate(summary.biggestExpense.date)}</p>
            </div>
            <p className="text-xl font-bold text-red-600">{formatCurrency(summary.biggestExpense.amount)}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!summary?.transactionCount && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Data Yet</h3>
          <p className="text-gray-500">Make some transactions to see your spending analytics</p>
        </div>
      )}
    </div>
  );
}
