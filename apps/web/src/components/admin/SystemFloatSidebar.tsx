/**
 * System Float Sidebar
 *
 * Collapsible sidebar showing consolidated account / system float information.
 * Displays opening balance, current balance, inflows/outflows, and utilization.
 * Includes profit analytics with expandable charts.
 * Real-time updates via Supabase subscriptions.
 * Only visible to superadmin users.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Wallet,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Plus,
  Lock,
  History,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  BarChart3,
  LineChart,
  Calendar,
  DollarSign,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { systemFloatService, SystemFloat, FloatSummary } from '@/services/systemFloat.service';
import { profitAnalyticsService, ProfitData, ProfitSummary, ProfitChartData } from '@/services/profitAnalytics.service';
import { currencyService, Currency } from '@/services/currency.service';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import MonimeAnalyticsSection from './MonimeAnalyticsSection';

interface SystemFloatSidebarProps {
  onOpenFloat: () => void;
  onReplenishFloat: (currency: string) => void;
  onCloseFloat: (currency: string) => void;
  onViewHistory: (currency: string) => void;
}

type ChartPeriod = 'daily' | 'weekly' | 'monthly';

export function SystemFloatSidebar({
  onOpenFloat,
  onReplenishFloat,
  onCloseFloat,
  onViewHistory,
}: SystemFloatSidebarProps) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isProfitExpanded, setIsProfitExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [floats, setFloats] = useState<FloatSummary[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [todayMovements, setTodayMovements] = useState<Record<string, { inflows: number; outflows: number }>>({});
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);

  // Profit state
  const [profitSummary, setProfitSummary] = useState<ProfitSummary | null>(null);
  const [chartData, setChartData] = useState<ProfitChartData | null>(null);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('daily');
  const [profitLoading, setProfitLoading] = useState(false);

  // Check if user is superadmin
  const isSuperAdmin = user?.roles?.includes('superadmin') || false;
  const isAdmin = user?.roles?.includes('admin') || user?.roles?.includes('superadmin') || false;

  useEffect(() => {
    if (isAdmin) {
      loadData();
      loadProfitData();

      // Set up real-time subscriptions
      const floatSubscription = supabase
        .channel('system-float-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'system_float' },
          () => {
            loadData();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'system_float_history' },
          () => {
            loadData();
          }
        )
        .subscribe();

      // Subscribe to transaction changes for profit updates
      const unsubscribeTransactions = profitAnalyticsService.subscribeToTransactions(() => {
        loadProfitData();
      });

      return () => {
        floatSubscription.unsubscribe();
        unsubscribeTransactions();
      };
    }
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [floatSummary, currencyList] = await Promise.all([
        systemFloatService.getFloatSummary(),
        currencyService.getCurrencies(),
      ]);

      setFloats(floatSummary.filter(f => f.status === 'active'));
      setCurrencies(currencyList.filter(c => c.isActive));

      // Load today's movements for each active float
      const movements: Record<string, { inflows: number; outflows: number }> = {};
      for (const float of floatSummary.filter(f => f.status === 'active')) {
        movements[float.currency] = await systemFloatService.getTodayMovements(float.currency);
      }
      setTodayMovements(movements);

      // Select first currency by default
      if (floatSummary.length > 0 && !selectedCurrency) {
        setSelectedCurrency(floatSummary[0].currency);
      }
    } catch (error) {
      console.error('Error loading float data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProfitData = async () => {
    setProfitLoading(true);
    try {
      const [summary, charts] = await Promise.all([
        profitAnalyticsService.getProfitSummary(),
        profitAnalyticsService.getChartData(),
      ]);
      setProfitSummary(summary);
      setChartData(charts);
    } catch (error) {
      console.error('Error loading profit data:', error);
    } finally {
      setProfitLoading(false);
    }
  };

  const formatAmount = (amount: number, currency: string): string => {
    const curr = currencies.find(c => c.code === currency);
    const symbol = curr?.symbol || currency;

    if (amount >= 1000000) {
      return `${symbol} ${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
      return `${symbol} ${(amount / 1000).toFixed(1)}K`;
    }
    return `${symbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatFullAmount = (amount: number, currency: string): string => {
    const curr = currencies.find(c => c.code === currency);
    const symbol = curr?.symbol || currency;
    return `${symbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatProfit = (amount: number): string => {
    const defaultCurrency = currencies.find(c => c.isDefault) || currencies[0];
    const symbol = defaultCurrency?.symbol || 'Le';

    if (amount >= 1000000) {
      return `${symbol} ${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
      return `${symbol} ${(amount / 1000).toFixed(1)}K`;
    }
    return `${symbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getUtilizationColor = (percentage: number): string => {
    if (percentage < 50) return 'text-green-500';
    if (percentage < 75) return 'text-yellow-500';
    if (percentage < 90) return 'text-orange-500';
    return 'text-red-500';
  };

  const getUtilizationBgColor = (percentage: number): string => {
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 75) return 'bg-yellow-500';
    if (percentage < 90) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getChartDataForPeriod = (): ProfitData[] => {
    if (!chartData) return [];
    switch (chartPeriod) {
      case 'daily':
        return chartData.daily;
      case 'weekly':
        return chartData.weekly;
      case 'monthly':
        return chartData.monthly;
      default:
        return chartData.daily;
    }
  };

  const getProfitChange = (): { value: number; isPositive: boolean } => {
    if (!profitSummary) return { value: 0, isPositive: true };
    const current = profitSummary.today.profit;
    const previous = profitSummary.yesterday.profit;
    if (previous === 0) return { value: 100, isPositive: current > 0 };
    const change = ((current - previous) / previous) * 100;
    return { value: Math.abs(change), isPositive: change >= 0 };
  };

  if (!isAdmin) {
    return null;
  }

  const selectedFloat = floats.find(f => f.currency === selectedCurrency);
  const profitChange = getProfitChange();

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -left-3 top-4 z-10 p-1.5 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        {isExpanded ? (
          <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[calc(100vh-120px)] overflow-y-auto"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-4 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <PiggyBank className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">System Float</h3>
                    <p className="text-primary-100 text-xs">Consolidated Account</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Real-time"></span>
                  <button
                    onClick={() => { loadData(); loadProfitData(); }}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-4 h-4 text-white ${loading || profitLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Currency Tabs */}
            {floats.length > 0 && (
              <div className="flex border-b border-gray-200 dark:border-gray-700 px-2 pt-2 gap-1 overflow-x-auto">
                {floats.map((float) => (
                  <button
                    key={float.currency}
                    onClick={() => setSelectedCurrency(float.currency)}
                    className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                      selectedCurrency === float.currency
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border-b-2 border-primary-600'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {float.currency}
                  </button>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="p-4 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              ) : floats.length === 0 ? (
                <div className="text-center py-6">
                  <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">No active float</p>
                  {isSuperAdmin && (
                    <button
                      onClick={onOpenFloat}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Open New Float
                    </button>
                  )}
                </div>
              ) : selectedFloat ? (
                <>
                  {/* Opening Balance */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Opening Balance
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {selectedFloat.financialYear || 'Current Cycle'}
                      </span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {formatFullAmount(selectedFloat.openingBalance, selectedFloat.currency)}
                    </p>
                  </div>

                  {/* Current Balance */}
                  <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-3 border border-primary-200 dark:border-primary-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-primary-600 dark:text-primary-400 uppercase tracking-wider font-medium">
                        Current Balance
                      </span>
                      <CheckCircle className="w-4 h-4 text-primary-500" />
                    </div>
                    <p className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                      {formatFullAmount(selectedFloat.currentBalance, selectedFloat.currency)}
                    </p>
                  </div>

                  {/* Utilization Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Float Utilization</span>
                      <span className={`font-semibold ${getUtilizationColor(selectedFloat.utilizationPercentage)}`}>
                        {selectedFloat.utilizationPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${getUtilizationBgColor(selectedFloat.utilizationPercentage)}`}
                        style={{ width: `${Math.min(selectedFloat.utilizationPercentage, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {formatAmount(selectedFloat.openingBalance - selectedFloat.currentBalance, selectedFloat.currency)} used of {formatAmount(selectedFloat.openingBalance, selectedFloat.currency)}
                    </p>
                  </div>

                  {/* Today's Movement */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Today's Movement
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400 mb-1">
                          <ArrowDownRight className="w-4 h-4" />
                          <span className="text-xs uppercase font-medium">Inflows</span>
                        </div>
                        <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                          +{formatAmount(todayMovements[selectedFloat.currency]?.inflows || 0, selectedFloat.currency)}
                        </p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                        <div className="flex items-center gap-1 text-red-600 dark:text-red-400 mb-1">
                          <ArrowUpRight className="w-4 h-4" />
                          <span className="text-xs uppercase font-medium">Outflows</span>
                        </div>
                        <p className="text-lg font-semibold text-red-700 dark:text-red-300">
                          -{formatAmount(todayMovements[selectedFloat.currency]?.outflows || 0, selectedFloat.currency)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions - Superadmin Only */}
                  {isSuperAdmin && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                      <button
                        onClick={() => onReplenishFloat(selectedFloat.currency)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Replenish Float
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => onViewHistory(selectedFloat.currency)}
                          className="flex items-center justify-center gap-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm text-gray-700 dark:text-gray-300"
                        >
                          <History className="w-4 h-4" />
                          History
                        </button>
                        <button
                          onClick={() => onCloseFloat(selectedFloat.currency)}
                          className="flex items-center justify-center gap-1 px-3 py-2 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm text-red-600 dark:text-red-400"
                        >
                          <Lock className="w-4 h-4" />
                          Close
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : null}

              {/* Open New Float Button */}
              {isSuperAdmin && floats.length > 0 && currencies.length > floats.length && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <button
                    onClick={onOpenFloat}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors text-sm text-gray-600 dark:text-gray-400"
                  >
                    <Plus className="w-4 h-4" />
                    Open Float for Another Currency
                  </button>
                </div>
              )}
            </div>

            {/* Profit Analytics Section - Expandable */}
            <div className="border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setIsProfitExpanded(!isProfitExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <LineChart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Profit Analytics</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Today: {profitSummary ? formatProfit(profitSummary.today.profit) : '...'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {profitSummary && (
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      profitChange.isPositive
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {profitChange.isPositive ? '+' : '-'}{profitChange.value.toFixed(1)}%
                    </span>
                  )}
                  {isProfitExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {isProfitExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-4">
                      {/* Period Tabs */}
                      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                        {(['daily', 'weekly', 'monthly'] as ChartPeriod[]).map((period) => (
                          <button
                            key={period}
                            onClick={() => setChartPeriod(period)}
                            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                              chartPeriod === period
                                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                            }`}
                          >
                            {period.charAt(0).toUpperCase() + period.slice(1)}
                          </button>
                        ))}
                      </div>

                      {/* Chart */}
                      {profitLoading ? (
                        <div className="flex items-center justify-center h-40">
                          <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
                        </div>
                      ) : (
                        <div className="h-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={getChartDataForPeriod()}>
                              <defs>
                                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis
                                dataKey="period"
                                tick={{ fontSize: 10 }}
                                stroke="#9ca3af"
                              />
                              <YAxis
                                tick={{ fontSize: 10 }}
                                stroke="#9ca3af"
                                tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}K` : value}
                              />
                              <Tooltip
                                formatter={(value: number) => [formatProfit(value), 'Profit']}
                                contentStyle={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="profit"
                                stroke="#10b981"
                                strokeWidth={2}
                                fill="url(#profitGradient)"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Profit Summary Cards */}
                      {profitSummary && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400">This Week</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {formatProfit(profitSummary.thisWeek.profit)}
                            </p>
                            <p className="text-xs text-gray-400">{profitSummary.thisWeek.transactionCount} txns</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400">This Month</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {formatProfit(profitSummary.thisMonth.profit)}
                            </p>
                            <p className="text-xs text-gray-400">{profitSummary.thisMonth.transactionCount} txns</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Last Month</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {formatProfit(profitSummary.lastMonth.profit)}
                            </p>
                            <p className="text-xs text-gray-400">{profitSummary.lastMonth.transactionCount} txns</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400">This Year</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {formatProfit(profitSummary.thisYear.profit)}
                            </p>
                            <p className="text-xs text-gray-400">{profitSummary.thisYear.transactionCount} txns</p>
                          </div>
                        </div>
                      )}

                      {/* Transaction Volume Bar Chart */}
                      {chartData && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                          <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Transaction Volume
                          </h5>
                          <div className="h-24">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={getChartDataForPeriod()}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                  dataKey="period"
                                  tick={{ fontSize: 9 }}
                                  stroke="#9ca3af"
                                />
                                <YAxis
                                  tick={{ fontSize: 9 }}
                                  stroke="#9ca3af"
                                />
                                <Tooltip
                                  formatter={(value: number) => [value, 'Transactions']}
                                  contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                  }}
                                />
                                <Bar
                                  dataKey="transactionCount"
                                  fill="#6366f1"
                                  radius={[4, 4, 0, 0]}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Monime Gateway Analytics Section */}
            <MonimeAnalyticsSection currency={selectedCurrency || 'SLE'} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed State - Mini Summary */}
      {!isExpanded && floats.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-14 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-2"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <PiggyBank className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            {floats.slice(0, 3).map((float) => (
              <div key={float.currency} className="text-center">
                <p className="text-[10px] text-gray-500 dark:text-gray-400">{float.currency}</p>
                <p className={`text-xs font-bold ${getUtilizationColor(float.utilizationPercentage)}`}>
                  {float.utilizationPercentage.toFixed(0)}%
                </p>
              </div>
            ))}
            <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-1" />
            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <LineChart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
