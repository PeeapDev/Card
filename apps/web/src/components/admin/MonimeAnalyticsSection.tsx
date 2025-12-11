/**
 * Monime Analytics Section
 *
 * Displays Monime payment gateway inflows (deposits) and outflows (withdrawals)
 * Real-time updates with expandable charts
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Activity,
  Wallet,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  monimeAnalyticsService,
  MonimeAnalyticsSummary,
  MonimePeriodData,
} from '@/services/monimeAnalytics.service';

interface MonimeAnalyticsSectionProps {
  currency?: string;
}

const MonimeAnalyticsSection: React.FC<MonimeAnalyticsSectionProps> = ({
  currency = 'SLE',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isChartsExpanded, setIsChartsExpanded] = useState(false);
  const [summary, setSummary] = useState<MonimeAnalyticsSummary | null>(null);
  const [dailyData, setDailyData] = useState<MonimePeriodData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonimePeriodData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'thisWeek' | 'thisMonth' | 'allTime'>('today');

  const getCurrencySymbol = (code: string): string => {
    if (code === 'SLE') return 'Le';
    if (code === 'USD') return '$';
    return code;
  };

  const formatAmount = (amount: number): string => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toFixed(0);
  };

  const loadData = useCallback(async () => {
    try {
      const [summaryData, daily, monthly] = await Promise.all([
        monimeAnalyticsService.getSummary(currency),
        monimeAnalyticsService.getDailyData(7, currency),
        monimeAnalyticsService.getMonthlyData(6, currency),
      ]);

      setSummary(summaryData);
      setDailyData(daily);
      setMonthlyData(monthly);
    } catch (error) {
      console.error('Error loading Monime analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currency]);

  useEffect(() => {
    loadData();

    // Subscribe to real-time updates
    const unsubscribe = monimeAnalyticsService.subscribeToTransactions(() => {
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getCurrentPeriodData = () => {
    if (!summary) return { deposits: 0, withdrawals: 0, netFlow: 0, depositCount: 0, withdrawalCount: 0 };

    switch (selectedPeriod) {
      case 'today':
        return summary.today;
      case 'thisWeek':
        return summary.thisWeek;
      case 'thisMonth':
        return summary.thisMonth;
      case 'allTime':
        return summary.allTime;
      default:
        return summary.today;
    }
  };

  const currentData = getCurrentPeriodData();
  const symbol = getCurrencySymbol(currency);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-xl border border-purple-500/20 p-4 mt-4">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-purple-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-xl border border-purple-500/20 mt-4 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-purple-500/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Wallet className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-medium text-white">Monime Gateway</h3>
            <p className="text-xs text-gray-400">Payment Flows</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right mr-2">
            <p className="text-xs text-gray-400">Net Flow</p>
            <p className={`text-sm font-semibold ${currentData.netFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {currentData.netFlow >= 0 ? '+' : ''}{symbol} {formatAmount(currentData.netFlow)}
            </p>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Period Selector */}
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {(['today', 'thisWeek', 'thisMonth', 'allTime'] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setSelectedPeriod(period)}
                      className={`px-2 py-1 text-xs rounded-md transition-colors ${
                        selectedPeriod === period
                          ? 'bg-purple-500 text-white'
                          : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                      }`}
                    >
                      {period === 'today' ? 'Today' : period === 'thisWeek' ? 'Week' : period === 'thisMonth' ? 'Month' : 'All'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-1 text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Inflow/Outflow Cards */}
              <div className="grid grid-cols-2 gap-3">
                {/* Inflows (Deposits) */}
                <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowDownCircle className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-green-400 font-medium">Inflows</span>
                  </div>
                  <p className="text-lg font-bold text-green-400">
                    {symbol} {formatAmount((currentData as any).totalDeposits ?? (currentData as any).deposits ?? 0)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {currentData.depositCount} deposits
                  </p>
                </div>

                {/* Outflows (Withdrawals) */}
                <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpCircle className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-red-400 font-medium">Outflows</span>
                  </div>
                  <p className="text-lg font-bold text-red-400">
                    {symbol} {formatAmount((currentData as any).totalWithdrawals ?? (currentData as any).withdrawals ?? 0)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {currentData.withdrawalCount} withdrawals
                  </p>
                </div>
              </div>

              {/* Net Flow Summary */}
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-gray-300">Net Flow</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentData.netFlow >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                    <span className={`text-sm font-semibold ${currentData.netFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {currentData.netFlow >= 0 ? '+' : ''}{symbol} {formatAmount(currentData.netFlow)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      currentData.netFlow >= 0 ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.abs(currentData.netFlow) /
                          Math.max(((currentData as any).totalDeposits ?? (currentData as any).deposits ?? 0) + ((currentData as any).totalWithdrawals ?? (currentData as any).withdrawals ?? 0), 1) *
                          100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Charts Toggle */}
              <button
                onClick={() => setIsChartsExpanded(!isChartsExpanded)}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                {isChartsExpanded ? 'Hide Charts' : 'Show Charts'}
                {isChartsExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {/* Charts */}
              <AnimatePresence>
                {isChartsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    {/* Daily Flow Chart */}
                    <div className="bg-gray-800/30 rounded-lg p-3">
                      <h4 className="text-xs text-gray-400 mb-2">Daily Flows (7 days)</h4>
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={dailyData}>
                            <defs>
                              <linearGradient id="depositGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="withdrawalGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="period" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                            <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={formatAmount} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#1f2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                fontSize: '12px',
                              }}
                              formatter={(value: number) => [`${symbol} ${formatAmount(value)}`, '']}
                            />
                            <Area
                              type="monotone"
                              dataKey="deposits"
                              stroke="#22c55e"
                              fill="url(#depositGradient)"
                              name="Inflows"
                            />
                            <Area
                              type="monotone"
                              dataKey="withdrawals"
                              stroke="#ef4444"
                              fill="url(#withdrawalGradient)"
                              name="Outflows"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Monthly Bar Chart */}
                    <div className="bg-gray-800/30 rounded-lg p-3">
                      <h4 className="text-xs text-gray-400 mb-2">Monthly Comparison</h4>
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="period" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                            <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={formatAmount} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#1f2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                fontSize: '12px',
                              }}
                              formatter={(value: number) => [`${symbol} ${formatAmount(value)}`, '']}
                            />
                            <Legend wrapperStyle={{ fontSize: '10px' }} />
                            <Bar dataKey="deposits" fill="#22c55e" name="Inflows" radius={[2, 2, 0, 0]} />
                            <Bar dataKey="withdrawals" fill="#ef4444" name="Outflows" radius={[2, 2, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-gray-800/30 rounded-lg p-2">
                        <p className="text-gray-400">Avg Daily Deposits</p>
                        <p className="text-white font-medium">
                          {symbol} {formatAmount(dailyData.reduce((sum, d) => sum + d.deposits, 0) / Math.max(dailyData.length, 1))}
                        </p>
                      </div>
                      <div className="bg-gray-800/30 rounded-lg p-2">
                        <p className="text-gray-400">Avg Daily Withdrawals</p>
                        <p className="text-white font-medium">
                          {symbol} {formatAmount(dailyData.reduce((sum, d) => sum + d.withdrawals, 0) / Math.max(dailyData.length, 1))}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MonimeAnalyticsSection;
