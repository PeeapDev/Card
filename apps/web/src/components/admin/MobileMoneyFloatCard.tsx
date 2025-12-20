/**
 * Mobile Money Float Card
 *
 * Displays mobile money float balances per provider (Orange Money, Africell)
 * Shows current balance, deposits, payouts for each provider.
 * Real-time updates via Supabase subscriptions.
 */

import { useState, useEffect } from 'react';
import {
  Smartphone,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Plus,
  History,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
  Wallet,
  AlertCircle,
  Users,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  DollarSign,
  Coins,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  mobileMoneyFloatService,
  MobileMoneyFloatSummary,
  MobileMoneyFloatHistory,
  FloatPayout,
  EarningsSummary,
  PROVIDER_INFO,
} from '@/services/mobileMoneyFloat.service';
import { currencyService } from '@/services/currency.service';
import { monimeAnalyticsService, MonimeBalanceResponse } from '@/services/monimeAnalytics.service';
import { supabase } from '@/lib/supabase';

interface MobileMoneyFloatCardProps {
  onReplenish?: (providerId: string) => void;
  onViewHistory?: (providerId: string) => void;
}

export function MobileMoneyFloatCard({ onReplenish, onViewHistory }: MobileMoneyFloatCardProps) {
  const [loading, setLoading] = useState(true);
  const [floats, setFloats] = useState<MobileMoneyFloatSummary[]>([]);
  const [todayMovements, setTodayMovements] = useState<{ deposits: number; payouts: number; fees: number }>({
    deposits: 0,
    payouts: 0,
    fees: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<MobileMoneyFloatHistory[]>([]);
  const [recentPayouts, setRecentPayouts] = useState<FloatPayout[]>([]);
  const [payoutsSummary, setPayoutsSummary] = useState<{
    totalAmount: number;
    completedCount: number;
    pendingCount: number;
    failedCount: number;
  }>({ totalAmount: 0, completedCount: 0, pendingCount: 0, failedCount: 0 });
  const [expanded, setExpanded] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showPayouts, setShowPayouts] = useState(false);
  const [monimeBalance, setMonimeBalance] = useState<MonimeBalanceResponse | null>(null);
  const [monimeLoading, setMonimeLoading] = useState(true);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [earnings, setEarnings] = useState<EarningsSummary>({
    totalEarnings: 0,
    depositFees: 0,
    withdrawalFees: 0,
    transactionFees: 0,
    checkoutFees: 0,
    count: 0,
  });
  const [earningsLoading, setEarningsLoading] = useState(false);

  useEffect(() => {
    loadData();
    loadMonimeBalance();
    loadPayouts();
    loadEarnings();

    // Set up real-time subscriptions using system_float tables
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
        { event: 'INSERT', schema: 'public', table: 'system_float_history' },
        () => {
          loadData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payouts' },
        () => {
          loadPayouts();
        }
      )
      .subscribe();

    // Refresh Monime balance every 60 seconds
    const monimeInterval = setInterval(() => {
      loadMonimeBalance();
    }, 60000);

    return () => {
      floatSubscription.unsubscribe();
      clearInterval(monimeInterval);
    };
  }, []);

  const loadMonimeBalance = async () => {
    setMonimeLoading(true);
    try {
      const balance = await monimeAnalyticsService.getBalance();
      setMonimeBalance(balance);
    } catch (error) {
      console.error('Error loading Monime balance:', error);
    } finally {
      setMonimeLoading(false);
    }
  };

  const loadPayouts = async () => {
    setPayoutsLoading(true);
    try {
      const result = await mobileMoneyFloatService.getPayouts({ limit: 20 });
      setRecentPayouts(result.payouts);
      setPayoutsSummary(result.summary);
    } catch (error) {
      console.error('Error loading payouts:', error);
    } finally {
      setPayoutsLoading(false);
    }
  };

  const loadEarnings = async () => {
    setEarningsLoading(true);
    try {
      const result = await mobileMoneyFloatService.getEarnings('month');
      setEarnings(result.summary);
    } catch (error) {
      console.error('Error loading earnings:', error);
    } finally {
      setEarningsLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [floatData, movements, transactions] = await Promise.all([
        mobileMoneyFloatService.getFloatSummary(),
        mobileMoneyFloatService.getTodayMovements(),
        mobileMoneyFloatService.getRecentTransactions(10),
      ]);
      setFloats(floatData);
      setTodayMovements(movements);
      setRecentTransactions(transactions);
    } catch (error) {
      console.error('Error loading mobile money float data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Use currency service formatAmount which handles NLe conversion (divides by 1000)
  // This is for amounts stored in Old Leone format (database values)
  const formatCurrency = (amount: number): string => {
    return currencyService.formatAmount(amount, 'SLE');
  };

  // Format Monime balance directly - Monime already returns amounts in New Leone (NLe)
  // No division needed since Monime operates in NLe
  const formatMonimeBalance = (amount: number): string => {
    return `NLe ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatTime = (dateString: string | null): string => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const totalBalance = floats.reduce((sum, f) => sum + f.currentBalance, 0);
  const totalDeposits = floats.reduce((sum, f) => sum + f.totalDeposits, 0);
  const totalPayouts = floats.reduce((sum, f) => sum + f.totalPayouts, 0);

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div
        className="p-4 bg-gradient-to-r from-orange-600 to-orange-500 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-white/20 rounded-lg">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">Float Activity</h3>
              <p className="text-sm text-orange-100">Real-time Transactions</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-white">
              <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
              <p className="text-xs text-orange-100">Total Balance</p>
            </div>
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-white" />
            ) : (
              <ChevronDown className="w-5 h-5 text-white" />
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Monime Gateway Balance */}
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                  <Wallet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-indigo-900 dark:text-indigo-100">Monime Gateway</h4>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400">Available for Payouts</p>
                </div>
              </div>
              <button
                onClick={loadMonimeBalance}
                disabled={monimeLoading}
                className="p-1.5 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg"
              >
                <RefreshCw className={`w-4 h-4 ${monimeLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {monimeLoading && !monimeBalance ? (
              <div className="flex items-center justify-center py-2">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
              </div>
            ) : monimeBalance && monimeBalance.success ? (
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">
                    {formatMonimeBalance(monimeBalance.balance)}
                  </p>
                </div>
                {monimeBalance.accountCount > 0 && (
                  <p className="text-xs text-indigo-500 dark:text-indigo-400">
                    {monimeBalance.accountCount} account{monimeBalance.accountCount > 1 ? 's' : ''} •
                    Updated {new Date(monimeBalance.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-4 h-4" />
                <div className="flex flex-col">
                  <span className="text-sm">Unable to fetch Monime balance</span>
                  {monimeBalance?.error && (
                    <span className="text-xs opacity-75">
                      {monimeBalance.error.includes('not enabled')
                        ? 'Monime module is disabled'
                        : monimeBalance.error.includes('not configured') || monimeBalance.error.includes('CREDENTIALS_MISSING')
                        ? 'API credentials not configured'
                        : monimeBalance.error.includes('token') || monimeBalance.error.includes('401')
                        ? 'Authentication required'
                        : monimeBalance.error}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Today's Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                <ArrowDownRight className="w-4 h-4" />
                <span className="text-xs font-medium">Today Deposits</span>
              </div>
              <p className="text-lg font-bold text-green-700 dark:text-green-300">
                {formatCurrency(todayMovements.deposits)}
              </p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
                <ArrowUpRight className="w-4 h-4" />
                <span className="text-xs font-medium">Today Payouts</span>
              </div>
              <p className="text-lg font-bold text-red-700 dark:text-red-300">
                {formatCurrency(todayMovements.payouts)}
              </p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                <Wallet className="w-4 h-4" />
                <span className="text-xs font-medium">Net Flow</span>
              </div>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                {formatCurrency(todayMovements.deposits - todayMovements.payouts)}
              </p>
            </div>
          </div>

          {/* Platform Earnings Section */}
          <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                  <Coins className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-emerald-900 dark:text-emerald-100">Platform Earnings</h4>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Profit from transaction fees (This Month)</p>
                </div>
              </div>
              <button
                onClick={loadEarnings}
                disabled={earningsLoading}
                className="p-1.5 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg"
              >
                <RefreshCw className={`w-4 h-4 ${earningsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Total Earnings */}
            <div className="mb-3 p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Profit</span>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(earnings.totalEarnings)}
                </span>
              </div>
            </div>

            {/* Earnings Breakdown */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-white/40 dark:bg-gray-800/40 rounded-lg">
                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 mb-1">
                  <ArrowDownRight className="w-3 h-3" />
                  <span className="text-xs">Deposit Fees</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(earnings.depositFees)}
                </p>
              </div>
              <div className="p-2 bg-white/40 dark:bg-gray-800/40 rounded-lg">
                <div className="flex items-center gap-1 text-red-600 dark:text-red-400 mb-1">
                  <ArrowUpRight className="w-3 h-3" />
                  <span className="text-xs">Withdrawal Fees</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(earnings.withdrawalFees)}
                </p>
              </div>
              <div className="p-2 bg-white/40 dark:bg-gray-800/40 rounded-lg">
                <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400 mb-1">
                  <DollarSign className="w-3 h-3" />
                  <span className="text-xs">Transaction Fees</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(earnings.transactionFees)}
                </p>
              </div>
              <div className="p-2 bg-white/40 dark:bg-gray-800/40 rounded-lg">
                <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 mb-1">
                  <Wallet className="w-3 h-3" />
                  <span className="text-xs">Checkout Fees</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(earnings.checkoutFees)}
                </p>
              </div>
            </div>

            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 text-center">
              {earnings.count} fee transactions this month
            </p>
          </div>

          {/* Provider Cards */}
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : floats.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Smartphone className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No float data available</p>
                <p className="text-xs">Open a float to get started</p>
              </div>
            ) : (
              floats.map((float) => {
                const providerInfo = PROVIDER_INFO[float.providerId] || {
                  name: float.providerName,
                  color: 'text-gray-600',
                  bgColor: 'bg-gray-100',
                  icon: '??',
                };

                return (
                  <div
                    key={float.providerId}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${providerInfo.bgColor} rounded-lg flex items-center justify-center`}>
                          <span className={`font-bold text-sm ${providerInfo.color}`}>{providerInfo.icon}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">{providerInfo.name}</h4>
                          <p className="text-xs text-gray-500">{float.currency}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-bold ${providerInfo.color}`}>
                          {formatCurrency(float.currentBalance)}
                        </p>
                        <p className="text-xs text-gray-500">Current Balance</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Total In</p>
                        <p className="font-medium text-green-600">{formatCurrency(float.totalDeposits)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Total Out</p>
                        <p className="font-medium text-red-600">{formatCurrency(float.totalPayouts)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Fees Earned</p>
                        <p className="font-medium text-blue-600">{formatCurrency(float.totalFeesCollected)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Last In: {formatTime(float.lastDepositAt)}</span>
                        <span>Last Out: {formatTime(float.lastPayoutAt)}</span>
                      </div>
                      <div className="flex gap-2">
                        {onReplenish && (
                          <button
                            onClick={() => onReplenish(float.providerId)}
                            className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                            title="Add Funds"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                        {onViewHistory && (
                          <button
                            onClick={() => onViewHistory(float.providerId)}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            title="View History"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Low balance warning */}
                    {float.currentBalance < 100 && (
                      <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                        <span className="text-xs text-yellow-700 dark:text-yellow-300">
                          Low balance - consider replenishing
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Payouts Section */}
          <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                  <Send className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-red-900 dark:text-red-100">Payouts</h4>
                  <p className="text-xs text-red-600 dark:text-red-400">User & Merchant Withdrawals</p>
                </div>
              </div>
              <button
                onClick={loadPayouts}
                disabled={payoutsLoading}
                className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
              >
                <RefreshCw className={`w-4 h-4 ${payoutsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Payout Stats */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-3 h-3" />
                  <span className="text-xs font-medium">{payoutsSummary.completedCount}</span>
                </div>
                <p className="text-xs text-gray-500">Completed</p>
              </div>
              <div className="p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs font-medium">{payoutsSummary.pendingCount}</span>
                </div>
                <p className="text-xs text-gray-500">Processing</p>
              </div>
              <div className="p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 text-red-600 dark:text-red-400">
                  <XCircle className="w-3 h-3" />
                  <span className="text-xs font-medium">{payoutsSummary.failedCount}</span>
                </div>
                <p className="text-xs text-gray-500">Failed</p>
              </div>
            </div>

            {/* Toggle Payouts List */}
            <button
              onClick={() => setShowPayouts(!showPayouts)}
              className="w-full flex items-center justify-between p-2 bg-white/40 dark:bg-gray-800/40 rounded-lg text-sm text-red-700 dark:text-red-300 hover:bg-white/60 dark:hover:bg-gray-800/60"
            >
              <span className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Recent Payouts ({recentPayouts.length})
              </span>
              {showPayouts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* Payouts List */}
            {showPayouts && (
              <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                {payoutsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw className="w-5 h-5 animate-spin text-red-400" />
                  </div>
                ) : recentPayouts.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No recent payouts</p>
                ) : (
                  recentPayouts.map((payout) => {
                    const isUserCashout = payout.payout_type === 'USER_CASHOUT';
                    const statusColor = payout.status === 'COMPLETED' ? 'text-green-600' :
                                        payout.status === 'FAILED' ? 'text-red-600' : 'text-amber-600';
                    const statusBg = payout.status === 'COMPLETED' ? 'bg-green-100 dark:bg-green-900/30' :
                                     payout.status === 'FAILED' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30';

                    return (
                      <div
                        key={payout.id}
                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg ${isUserCashout ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-purple-100 dark:bg-purple-900/30'}`}>
                            {isUserCashout ? (
                              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {payout.displayName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {payout.provider_name} • {payout.account_number.slice(-4).padStart(payout.account_number.length, '•')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-red-600 dark:text-red-400">
                            -{formatCurrency(payout.amount)}
                          </p>
                          <div className="flex items-center justify-end gap-1">
                            <span className={`text-xs ${statusColor}`}>
                              {payout.status}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(payout.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Recent Transactions Toggle */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <span className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Recent Float Transactions
            </span>
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Recent Transactions */}
          {showHistory && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentTransactions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No recent transactions</p>
              ) : (
                recentTransactions.map((tx) => {
                  const providerInfo = PROVIDER_INFO[tx.providerId];
                  const isDeposit = tx.transactionType === 'credit' || tx.transactionType === 'replenish';

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-1.5 rounded-lg ${
                            isDeposit ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                          }`}
                        >
                          {isDeposit ? (
                            <ArrowDownRight className="w-4 h-4 text-green-600" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {tx.transactionType.charAt(0).toUpperCase() + tx.transactionType.slice(1)}
                          </p>
                          <p className="text-xs text-gray-500">{providerInfo?.name || tx.providerId}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-medium ${
                            isDeposit ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {isDeposit ? '+' : '-'}{formatCurrency(tx.amount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      )}
    </Card>
  );
}
