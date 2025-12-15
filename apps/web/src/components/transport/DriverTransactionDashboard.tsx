/**
 * Driver Transaction Dashboard
 *
 * Full dashboard showing:
 * - Wallet balance and quick stats
 * - Daily target progress
 * - Transaction reports (daily/monthly/yearly)
 * - Transaction history with time
 * - Refund capability for recent transactions
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCcw,
  Loader2,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  RotateCcw,
  X,
  Target,
  TrendingUp,
  Calendar,
  BarChart3,
  ChevronDown,
  Settings,
  Award,
  Zap,
  Sun,
  Moon,
  CalendarDays,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ExtendedWallet } from '@/services/wallet.service';
import { clsx } from 'clsx';

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  description?: string;
  merchant_name?: string;
  created_at: string;
  metadata?: any;
  wallet_id?: string;
  source_wallet_id?: string;
  destination_wallet_id?: string;
}

interface DriverTarget {
  id?: string;
  user_id: string;
  daily_target: number;
  created_at?: string;
  updated_at?: string;
}

interface DashboardStats {
  todayEarnings: number;
  todayTransactions: number;
  weekEarnings: number;
  weekTransactions: number;
  monthEarnings: number;
  monthTransactions: number;
  yearEarnings: number;
  yearTransactions: number;
}

interface DriverTransactionDashboardProps {
  userId: string;
  wallet: ExtendedWallet;
  onStart: () => void;
  onRefresh: () => void;
}

type TabType = 'today' | 'week' | 'month' | 'year';

export function DriverTransactionDashboard({
  userId,
  wallet,
  onStart,
  onRefresh,
}: DriverTransactionDashboardProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [stats, setStats] = useState<DashboardStats>({
    todayEarnings: 0,
    todayTransactions: 0,
    weekEarnings: 0,
    weekTransactions: 0,
    monthEarnings: 0,
    monthTransactions: 0,
    yearEarnings: 0,
    yearTransactions: 0,
  });

  // Daily target state
  const [dailyTarget, setDailyTarget] = useState<number>(0);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [newTarget, setNewTarget] = useState('');
  const [savingTarget, setSavingTarget] = useState(false);

  // Refund modal state
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundSuccess, setRefundSuccess] = useState(false);
  const [refundError, setRefundError] = useState('');

  // Get date ranges
  const getDateRanges = () => {
    const now = new Date();

    // Today - start of day
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Week - start of week (Sunday)
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    // Month - start of month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Year - start of year
    const yearStart = new Date(now.getFullYear(), 0, 1);

    return { todayStart, weekStart, monthStart, yearStart };
  };

  // Fetch all data
  const fetchData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);

    try {
      const { todayStart, weekStart, monthStart, yearStart } = getDateRanges();

      // Fetch all transactions for this wallet
      const { data: allTxns, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const txns = allTxns || [];
      setTransactions(txns);

      // Calculate stats
      const completedTxns = txns.filter(t => t.status === 'COMPLETED' && t.amount > 0);

      const todayTxns = completedTxns.filter(t => new Date(t.created_at) >= todayStart);
      const weekTxns = completedTxns.filter(t => new Date(t.created_at) >= weekStart);
      const monthTxns = completedTxns.filter(t => new Date(t.created_at) >= monthStart);
      const yearTxns = completedTxns.filter(t => new Date(t.created_at) >= yearStart);

      setStats({
        todayEarnings: todayTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0),
        todayTransactions: todayTxns.length,
        weekEarnings: weekTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0),
        weekTransactions: weekTxns.length,
        monthEarnings: monthTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0),
        monthTransactions: monthTxns.length,
        yearEarnings: yearTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0),
        yearTransactions: yearTxns.length,
      });

      // Fetch daily target
      const { data: targetData } = await supabase
        .from('driver_targets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (targetData) {
        setDailyTarget(targetData.daily_target || 0);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId, wallet.id]);

  // Save daily target
  const handleSaveTarget = async () => {
    const targetValue = parseFloat(newTarget);
    if (isNaN(targetValue) || targetValue < 0) return;

    setSavingTarget(true);
    try {
      // Upsert target
      const { error } = await supabase
        .from('driver_targets')
        .upsert({
          user_id: userId,
          daily_target: targetValue,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        // Table might not exist, try creating it first or just save locally
        console.error('Error saving target:', error);
      }

      setDailyTarget(targetValue);
      setShowTargetModal(false);
      setNewTarget('');
    } catch (err) {
      console.error('Error saving target:', err);
    } finally {
      setSavingTarget(false);
    }
  };

  // Check if transaction can be refunded (less than 1 hour old)
  const canRefund = (transaction: Transaction) => {
    const createdAt = new Date(transaction.created_at).getTime();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return (
      createdAt > oneHourAgo &&
      transaction.status === 'COMPLETED' &&
      transaction.amount > 0
    );
  };

  // Get refund time remaining
  const getRefundTimeRemaining = (transaction: Transaction) => {
    const createdAt = new Date(transaction.created_at).getTime();
    const expiresAt = createdAt + 60 * 60 * 1000;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) return null;
    const minutes = Math.floor(remaining / 60000);
    return `${minutes}m`;
  };

  // Handle refund
  const handleRefund = async () => {
    if (!selectedTransaction || !refundReason) return;

    setRefundLoading(true);
    setRefundError('');

    try {
      const payerWalletId = selectedTransaction.source_wallet_id || selectedTransaction.metadata?.sourceWalletId;

      if (!payerWalletId) {
        throw new Error('Cannot find payer information for refund');
      }

      if (wallet.balance < Math.abs(selectedTransaction.amount)) {
        throw new Error('Insufficient wallet balance for refund');
      }

      const { data: payerWallet, error: walletError } = await supabase
        .from('wallets')
        .select('id, balance, user_id')
        .eq('id', payerWalletId)
        .eq('status', 'ACTIVE')
        .single();

      if (walletError || !payerWallet) {
        throw new Error('Payer wallet not found');
      }

      const refundAmount = Math.abs(selectedTransaction.amount);
      const refundReference = `REF-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      // Debit driver wallet
      await supabase
        .from('wallets')
        .update({
          balance: wallet.balance - refundAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', wallet.id);

      // Credit payer wallet
      await supabase
        .from('wallets')
        .update({
          balance: parseFloat(payerWallet.balance) + refundAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payerWallet.id);

      // Create refund transactions
      await supabase.from('transactions').insert([
        {
          wallet_id: wallet.id,
          type: 'REFUND',
          amount: -refundAmount,
          currency: selectedTransaction.currency || 'SLE',
          status: 'COMPLETED',
          description: `Refund: ${refundReason}`,
          reference: refundReference,
          metadata: { originalTransactionId: selectedTransaction.id, refundReason },
        },
        {
          wallet_id: payerWallet.id,
          type: 'REFUND',
          amount: refundAmount,
          currency: selectedTransaction.currency || 'SLE',
          status: 'COMPLETED',
          description: `Refund received`,
          reference: refundReference,
          metadata: { originalTransactionId: selectedTransaction.id },
        },
      ]);

      // Update original transaction
      await supabase
        .from('transactions')
        .update({ status: 'REFUNDED' })
        .eq('id', selectedTransaction.id);

      setRefundSuccess(true);
      setTimeout(() => {
        fetchData();
        onRefresh();
        setShowRefundModal(false);
        setRefundSuccess(false);
        setSelectedTransaction(null);
        setRefundReason('');
      }, 1500);
    } catch (err: any) {
      setRefundError(err.message || 'Failed to process refund');
    } finally {
      setRefundLoading(false);
    }
  };

  // Filter transactions based on active tab
  const filteredTransactions = useMemo(() => {
    const { todayStart, weekStart, monthStart, yearStart } = getDateRanges();

    return transactions.filter(t => {
      const txDate = new Date(t.created_at);
      switch (activeTab) {
        case 'today': return txDate >= todayStart;
        case 'week': return txDate >= weekStart;
        case 'month': return txDate >= monthStart;
        case 'year': return txDate >= yearStart;
        default: return true;
      }
    });
  }, [transactions, activeTab]);

  // Format time
  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format date
  const formatDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Calculate target progress
  const targetProgress = dailyTarget > 0 ? Math.min((stats.todayEarnings / dailyTarget) * 100, 100) : 0;
  const targetReached = dailyTarget > 0 && stats.todayEarnings >= dailyTarget;

  // Get current stats based on active tab
  const getCurrentStats = () => {
    switch (activeTab) {
      case 'today': return { earnings: stats.todayEarnings, count: stats.todayTransactions, label: 'Today' };
      case 'week': return { earnings: stats.weekEarnings, count: stats.weekTransactions, label: 'This Week' };
      case 'month': return { earnings: stats.monthEarnings, count: stats.monthTransactions, label: 'This Month' };
      case 'year': return { earnings: stats.yearEarnings, count: stats.yearTransactions, label: 'This Year' };
    }
  };

  const currentStats = getCurrentStats();

  if (loading) {
    return (
      <div className="h-full bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-900 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h2 className="text-lg font-bold">Dashboard</h2>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="p-2 rounded-full hover:bg-gray-800 transition-colors"
        >
          <RefreshCcw className={clsx('w-5 h-5 text-gray-400', refreshing && 'animate-spin')} />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Wallet Balance Card */}
        <div className="p-4">
          <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-5 h-5 text-white/80" />
                <span className="text-white/80 text-sm">Available Balance</span>
              </div>
              <p className="text-3xl font-bold text-white mb-3">
                Le {wallet.balance.toLocaleString()}
              </p>
              <div className="flex items-center justify-between text-xs text-white/70">
                <span>Driver Wallet</span>
                <span>{wallet.currency}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Target Card */}
        <div className="px-4 mb-4">
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-yellow-400" />
                <span className="font-medium">Daily Target</span>
              </div>
              <button
                onClick={() => {
                  setNewTarget(dailyTarget.toString());
                  setShowTargetModal(true);
                }}
                className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Settings className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {dailyTarget > 0 ? (
              <>
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <p className="text-2xl font-bold text-white">
                      Le {stats.todayEarnings.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      of Le {dailyTarget.toLocaleString()} target
                    </p>
                  </div>
                  {targetReached && (
                    <div className="flex items-center gap-1 text-green-400 text-sm">
                      <Award className="w-4 h-4" />
                      <span>Reached!</span>
                    </div>
                  )}
                </div>
                <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${targetProgress}%` }}
                    transition={{ duration: 0.5 }}
                    className={clsx(
                      'h-full rounded-full',
                      targetReached ? 'bg-green-500' : 'bg-yellow-500'
                    )}
                  />
                </div>
                <p className="text-right text-xs text-gray-500 mt-1">
                  {targetProgress.toFixed(0)}% complete
                </p>
              </>
            ) : (
              <button
                onClick={() => setShowTargetModal(true)}
                className="w-full py-3 border-2 border-dashed border-gray-600 rounded-xl text-gray-400 hover:border-yellow-500 hover:text-yellow-400 transition-colors"
              >
                + Set Daily Target
              </button>
            )}
          </div>
        </div>

        {/* Time Period Tabs */}
        <div className="px-4 mb-4">
          <div className="flex bg-gray-800 rounded-xl p-1">
            {(['today', 'week', 'month', 'year'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  'flex-1 py-2 text-sm font-medium rounded-lg transition-colors',
                  activeTab === tab
                    ? 'bg-cyan-500 text-black'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="px-4 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-xs text-gray-400">{currentStats.label}</span>
              </div>
              <p className="text-xl font-bold text-green-400">
                Le {currentStats.earnings.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">Total Earnings</p>
            </div>

            <div className="bg-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-xs text-gray-400">{currentStats.label}</span>
              </div>
              <p className="text-xl font-bold text-blue-400">
                {currentStats.count}
              </p>
              <p className="text-xs text-gray-500">Transactions</p>
            </div>
          </div>
        </div>

        {/* Quick Stats Summary */}
        <div className="px-4 mb-4">
          <div className="bg-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Earnings Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm">Today</span>
                </div>
                <span className="font-semibold">Le {stats.todayEarnings.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span className="text-sm">This Week</span>
                </div>
                <span className="font-semibold">Le {stats.weekEarnings.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-purple-400" />
                  <span className="text-sm">This Month</span>
                </div>
                <span className="font-semibold">Le {stats.monthEarnings.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-green-400" />
                  <span className="text-sm">This Year</span>
                </div>
                <span className="font-semibold">Le {stats.yearEarnings.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">{currentStats.label}'s Transactions</h3>
            <span className="text-sm text-gray-500">{filteredTransactions.length} transactions</span>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="w-6 h-6 text-gray-500" />
              </div>
              <p className="text-gray-400 text-sm">No transactions {currentStats.label.toLowerCase()}</p>
              <p className="text-gray-500 text-xs mt-1">Start collecting to see transactions here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((tx) => {
                const canRefundTx = canRefund(tx);
                const timeRemaining = getRefundTimeRemaining(tx);
                const isIncoming = tx.amount > 0;
                const isRefund = tx.type === 'REFUND';

                return (
                  <div
                    key={tx.id}
                    className="bg-gray-800 rounded-xl p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={clsx(
                          'w-10 h-10 rounded-full flex items-center justify-center',
                          isRefund
                            ? 'bg-purple-500/20'
                            : isIncoming
                            ? 'bg-green-500/20'
                            : 'bg-red-500/20'
                        )}
                      >
                        {isRefund ? (
                          <RotateCcw className="w-5 h-5 text-purple-400" />
                        ) : isIncoming ? (
                          <ArrowDownRight className="w-5 h-5 text-green-400" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {tx.description || tx.type}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{formatDate(tx.created_at)}</span>
                          <span className="w-1 h-1 bg-gray-600 rounded-full" />
                          <span>{formatTime(tx.created_at)}</span>
                          {tx.status === 'REFUNDED' && (
                            <>
                              <span className="w-1 h-1 bg-gray-600 rounded-full" />
                              <span className="text-purple-400">Refunded</span>
                            </>
                          )}
                          {canRefundTx && timeRemaining && (
                            <>
                              <span className="w-1 h-1 bg-gray-600 rounded-full" />
                              <span className="text-yellow-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {timeRemaining}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p
                          className={clsx(
                            'font-semibold',
                            isRefund
                              ? 'text-purple-400'
                              : isIncoming
                              ? 'text-green-400'
                              : 'text-red-400'
                          )}
                        >
                          {isIncoming ? '+' : ''}Le {Math.abs(tx.amount).toLocaleString()}
                        </p>
                      </div>
                      {canRefundTx && tx.status !== 'REFUNDED' && (
                        <button
                          onClick={() => {
                            setSelectedTransaction(tx);
                            setRefundReason('');
                            setRefundError('');
                            setRefundSuccess(false);
                            setShowRefundModal(true);
                          }}
                          className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-lg text-yellow-400 transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Start Collecting Button - Fixed at Bottom */}
      <div className="p-4 border-t border-gray-800 bg-gray-900">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onStart}
          className="w-full py-4 bg-cyan-500 text-black rounded-2xl font-bold text-lg flex items-center justify-center gap-2"
          style={{
            boxShadow: '0 0 20px rgba(34, 211, 238, 0.4), 0 0 40px rgba(34, 211, 238, 0.2)',
          }}
        >
          Start Collecting
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Daily Target Modal */}
      <AnimatePresence>
        {showTargetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl w-full max-w-sm border border-gray-700"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-yellow-400" />
                  <h3 className="font-semibold">Set Daily Target</h3>
                </div>
                <button
                  onClick={() => setShowTargetModal(false)}
                  className="p-1 hover:bg-gray-800 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <p className="text-gray-400 text-sm">
                  Set a daily earnings target to track your progress and stay motivated.
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Target Amount (Le)
                  </label>
                  <input
                    type="number"
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                    placeholder="e.g., 500000"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>

                {/* Quick select buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {[100000, 250000, 500000].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setNewTarget(amount.toString())}
                      className="py-2 px-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                    >
                      Le {(amount / 1000).toFixed(0)}K
                    </button>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowTargetModal(false)}
                    className="flex-1 py-3 bg-gray-800 text-white rounded-xl font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveTarget}
                    disabled={!newTarget || savingTarget}
                    className={clsx(
                      'flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2',
                      newTarget && !savingTarget
                        ? 'bg-yellow-500 text-black'
                        : 'bg-gray-800 text-gray-500'
                    )}
                  >
                    {savingTarget ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Save Target'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refund Modal */}
      <AnimatePresence>
        {showRefundModal && selectedTransaction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl w-full max-w-sm border border-gray-700"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-yellow-400" />
                  <h3 className="font-semibold">Refund Payment</h3>
                </div>
                <button
                  onClick={() => setShowRefundModal(false)}
                  className="p-1 hover:bg-gray-800 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {refundSuccess ? (
                <div className="p-6 text-center">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h4 className="text-lg font-semibold mb-2">Refund Successful</h4>
                  <p className="text-gray-400 text-sm">
                    Le {Math.abs(selectedTransaction.amount).toLocaleString()} has been refunded.
                  </p>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  <div className="bg-gray-800 rounded-xl p-3">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-400 text-sm">Amount</span>
                      <span className="font-semibold">
                        Le {Math.abs(selectedTransaction.amount).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Time</span>
                      <span className="text-sm">
                        {formatDate(selectedTransaction.created_at)} at {formatTime(selectedTransaction.created_at)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Reason for Refund *
                    </label>
                    <select
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      className="w-full px-3 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="">Select reason</option>
                      <option value="Customer request">Customer request</option>
                      <option value="Wrong amount">Wrong amount</option>
                      <option value="Trip cancelled">Trip cancelled</option>
                      <option value="Duplicate payment">Duplicate payment</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                    <p className="text-yellow-400 text-xs">
                      Refunds are only available within 1 hour of transaction.
                    </p>
                  </div>

                  {refundError && (
                    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                      <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <p className="text-red-400 text-xs">{refundError}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowRefundModal(false)}
                      disabled={refundLoading}
                      className="flex-1 py-3 bg-gray-800 text-white rounded-xl font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRefund}
                      disabled={!refundReason || refundLoading}
                      className={clsx(
                        'flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2',
                        refundReason && !refundLoading
                          ? 'bg-yellow-500 text-black'
                          : 'bg-gray-800 text-gray-500'
                      )}
                    >
                      {refundLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Confirm Refund'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
