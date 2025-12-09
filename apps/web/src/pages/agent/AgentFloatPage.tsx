import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Building,
  CreditCard,
  Smartphone,
  Clock,
} from 'lucide-react';
import { MotionCard } from '@/components/ui/Card';
import { AgentLayout } from '@/components/layout/AgentLayout';
import { useAuth } from '@/context/AuthContext';
import { agentService, AgentDashboardStats, AgentTransaction } from '@/services/agent.service';
import { currencyService, Currency } from '@/services/currency.service';

export function AgentFloatPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AgentDashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<AgentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentTier, setAgentTier] = useState<'basic' | 'standard' | 'agent_plus'>('basic');

  // Top-up modal state
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupMethod, setTopupMethod] = useState<'bank' | 'mobile' | 'card'>('mobile');
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupMessage, setTopupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Currency state
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  const currencySymbol = defaultCurrency?.symbol || 'Le';

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [dashStats, transactions, profile] = await Promise.all([
        agentService.getDashboardStats(user.id),
        agentService.getTransactions(user.id, {
          limit: 10,
          type: undefined,
        }),
        agentService.getProfile(user.id),
      ]);
      setStats(dashStats);
      setRecentTransactions(transactions);
      if (profile?.tier) {
        setAgentTier(profile.tier);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTopup = async () => {
    if (!user?.id || !topupAmount) return;

    setTopupLoading(true);
    setTopupMessage(null);

    try {
      const result = await agentService.requestFloatTopup(user.id, parseFloat(topupAmount));
      if (result.success) {
        setTopupMessage({ type: 'success', text: result.message });
        setTopupAmount('');
        fetchData();
        setTimeout(() => {
          setShowTopupModal(false);
          setTopupMessage(null);
        }, 2000);
      } else {
        setTopupMessage({ type: 'error', text: result.message });
      }
    } catch {
      setTopupMessage({ type: 'error', text: 'Failed to request top-up' });
    } finally {
      setTopupLoading(false);
    }
  };

  const limits = agentService.getLimits(agentTier);

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Calculate float utilization
  const floatUtilization = stats
    ? Math.min(100, ((stats.todayCashIn + stats.todayCashOut) / limits.dailyLimit) * 100)
    : 0;

  return (
    <AgentLayout>
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Float Management</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage your cash float and transaction limits</p>
          </div>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={fetchData}
              className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowTopupModal(true)}
              className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              Top Up Float
            </motion.button>
          </div>
        </div>

        {/* Main Balance Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 p-6 bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700 text-white rounded-xl shadow-lg"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Wallet className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm text-orange-100">Available Float Balance</p>
                  <p className="text-4xl font-bold">{formatCurrency(stats?.floatBalance || 0)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-orange-100">Daily Limit</p>
                <p className="text-2xl font-bold">{formatCurrency(limits.dailyLimit)}</p>
              </div>
            </div>

            {/* Daily Usage Progress */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-orange-100 mb-2">
                <span>Daily Usage</span>
                <span>{floatUtilization.toFixed(1)}% used</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3">
                <div
                  className="bg-white rounded-full h-3 transition-all duration-500"
                  style={{ width: `${floatUtilization}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-orange-100 mt-1">
                <span>{formatCurrency((stats?.todayCashIn || 0) + (stats?.todayCashOut || 0))} processed today</span>
                <span>{formatCurrency(limits.dailyLimit - (stats?.todayCashIn || 0) - (stats?.todayCashOut || 0))} remaining</span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowDownLeft className="w-4 h-4 text-green-300" />
                  <span className="text-xs text-orange-100">Cash In</span>
                </div>
                <p className="text-lg font-bold">{formatCurrency(stats?.todayCashIn || 0)}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowUpRight className="w-4 h-4 text-red-300" />
                  <span className="text-xs text-orange-100">Cash Out</span>
                </div>
                <p className="text-lg font-bold">{formatCurrency(stats?.todayCashOut || 0)}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-purple-300" />
                  <span className="text-xs text-orange-100">Commission</span>
                </div>
                <p className="text-lg font-bold">{formatCurrency(stats?.todayCommissions || 0)}</p>
              </div>
            </div>
          </motion.div>

          {/* Tier Info */}
          <MotionCard className="p-6" delay={0.1}>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Account Tier</h3>
            <div className={`p-4 rounded-lg mb-4 ${
              agentTier === 'agent_plus'
                ? 'bg-gradient-to-r from-purple-100 to-orange-100 dark:from-purple-900/30 dark:to-orange-900/30'
                : agentTier === 'standard'
                ? 'bg-blue-100 dark:bg-blue-900/30'
                : 'bg-gray-100 dark:bg-gray-700/50'
            }`}>
              <p className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                {agentTier === 'agent_plus' ? 'Agent+' : agentTier}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {agentTier === 'agent_plus'
                  ? 'Premium features unlocked'
                  : agentTier === 'standard'
                  ? 'Standard agent benefits'
                  : 'Basic tier - Upgrade for higher limits'}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Min Transaction</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(limits.minTransaction)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Max Transaction</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(limits.maxTransaction)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Daily Limit</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(limits.dailyLimit)}</span>
              </div>
            </div>

            {agentTier !== 'agent_plus' && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full mt-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 flex items-center justify-center gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                Upgrade Account
              </motion.button>
            )}
          </MotionCard>
        </div>

        {/* Low Balance Warning */}
        {stats && stats.floatBalance < 5000 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-300">Low Float Balance</p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                Consider topping up your float to continue processing transactions smoothly.
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowTopupModal(true)}
              className="ml-auto px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700"
            >
              Top Up Now
            </motion.button>
          </motion.div>
        )}

        {/* Monthly Summary & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Summary */}
          <MotionCard className="p-6" delay={0.2}>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Monthly Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-gray-600 dark:text-gray-400">Total Volume</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(stats?.monthlyVolume || 0)}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-gray-600 dark:text-gray-400">Total Commissions</span>
                </div>
                <span className="font-bold text-purple-600 dark:text-purple-400">{formatCurrency(stats?.monthlyCommissions || 0)}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-gray-600 dark:text-gray-400">Customers Served</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">{stats?.totalCustomersServed || 0}</span>
              </div>
            </div>
          </MotionCard>

          {/* Recent Activity */}
          <MotionCard className="p-6" delay={0.3}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
            </div>
            <div className="space-y-3">
              {recentTransactions.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No recent activity</p>
              ) : (
                recentTransactions.slice(0, 5).map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        txn.type === 'CASH_IN' || txn.type === 'DEPOSIT'
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : txn.type === 'CASH_OUT'
                          ? 'bg-red-100 dark:bg-red-900/30'
                          : 'bg-blue-100 dark:bg-blue-900/30'
                      }`}>
                        {txn.type === 'CASH_IN' || txn.type === 'DEPOSIT' ? (
                          <ArrowDownLeft className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : txn.type === 'CASH_OUT' ? (
                          <ArrowUpRight className="w-4 h-4 text-red-600 dark:text-red-400" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{txn.type.replace('_', ' ')}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(txn.createdAt)}</p>
                      </div>
                    </div>
                    <span className={`font-medium ${
                      txn.type === 'CASH_IN' || txn.type === 'DEPOSIT'
                        ? 'text-green-600 dark:text-green-400'
                        : txn.type === 'CASH_OUT'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {txn.type === 'CASH_OUT' ? '-' : '+'}{formatCurrency(txn.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </MotionCard>
        </div>
      </motion.div>

      {/* Top-up Modal */}
      {showTopupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Top Up Float</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Request a float top-up to increase your available balance
            </p>

            <div className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount ({currencySymbol})
                </label>
                <input
                  type="number"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-2xl font-bold"
                />
                <div className="flex gap-2 mt-2">
                  {[10, 50, 100, 500].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setTopupAmount(amount.toString())}
                      className="flex-1 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      {formatCurrency(amount)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setTopupMethod('mobile')}
                    className={`p-3 rounded-lg border-2 transition-colors flex flex-col items-center gap-2 ${
                      topupMethod === 'mobile'
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Smartphone className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Mobile Money</span>
                  </button>
                  <button
                    onClick={() => setTopupMethod('bank')}
                    className={`p-3 rounded-lg border-2 transition-colors flex flex-col items-center gap-2 ${
                      topupMethod === 'bank'
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Building className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Bank Transfer</span>
                  </button>
                  <button
                    onClick={() => setTopupMethod('card')}
                    className={`p-3 rounded-lg border-2 transition-colors flex flex-col items-center gap-2 ${
                      topupMethod === 'card'
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <CreditCard className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Card</span>
                  </button>
                </div>
              </div>

              {/* Processing Info */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">Processing Time</span>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-300">
                  {topupMethod === 'mobile'
                    ? 'Instant - Mobile money transfers are processed immediately'
                    : topupMethod === 'bank'
                    ? '1-2 business days - Bank transfers may take time to clear'
                    : 'Instant - Card payments are processed immediately'}
                </p>
              </div>

              {topupMessage && (
                <div className={`p-3 rounded-lg ${
                  topupMessage.type === 'success'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }`}>
                  {topupMessage.text}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowTopupModal(false);
                    setTopupAmount('');
                    setTopupMessage(null);
                  }}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTopup}
                  disabled={topupLoading || !topupAmount || parseFloat(topupAmount) <= 0}
                  className="flex-1 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {topupLoading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <TrendingUp className="w-5 h-5" />
                      Request Top Up
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AgentLayout>
  );
}
