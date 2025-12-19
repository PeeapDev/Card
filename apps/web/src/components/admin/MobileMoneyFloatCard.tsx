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
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  mobileMoneyFloatService,
  MobileMoneyFloatSummary,
  MobileMoneyFloatHistory,
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
  const [expanded, setExpanded] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [monimeBalance, setMonimeBalance] = useState<MonimeBalanceResponse | null>(null);
  const [monimeLoading, setMonimeLoading] = useState(true);

  useEffect(() => {
    loadData();
    loadMonimeBalance();

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
  const formatCurrency = (amount: number): string => {
    return currencyService.formatAmount(amount, 'SLE');
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
            ) : monimeBalance ? (
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">
                    {formatCurrency(monimeBalance.balance)}
                  </p>
                  <span className="text-sm text-indigo-500 dark:text-indigo-400">SLE</span>
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
                <span className="text-sm">Unable to fetch Monime balance</span>
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

          {/* Recent Transactions Toggle */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <span className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Recent Transactions
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
