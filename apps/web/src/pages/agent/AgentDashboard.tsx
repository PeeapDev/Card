import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  Send,
  Users,
  TrendingUp,
  Banknote,
  QrCode,
  History,
  DollarSign,
  Percent,
} from 'lucide-react';
import { MotionCard } from '@/components/ui/Card';
import { AgentLayout } from '@/components/layout/AgentLayout';
import { useAuth } from '@/context/AuthContext';
import { agentService, AgentDashboardStats, CashOutRequest, AgentTransaction } from '@/services/agent.service';
import { currencyService, Currency } from '@/services/currency.service';

export function AgentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AgentDashboardStats>({
    walletBalance: 0,
    floatBalance: 0,
    todayCashIn: 0,
    todayCashOut: 0,
    todayCommissions: 0,
    todayTransactions: 0,
    pendingCashOuts: 0,
    monthlyVolume: 0,
    monthlyCommissions: 0,
    totalCustomersServed: 0,
  });

  const [pendingCashOuts, setPendingCashOuts] = useState<CashOutRequest[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<AgentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentTier, setAgentTier] = useState<'basic' | 'standard' | 'agent_plus'>('basic');

  // Cash-in modal state
  const [showCashInModal, setShowCashInModal] = useState(false);
  const [cashInPhone, setCashInPhone] = useState('');
  const [cashInAmount, setCashInAmount] = useState('');
  const [cashInLoading, setCashInLoading] = useState(false);
  const [cashInMessage, setCashInMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Cash-out verification modal state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifiedRequest, setVerifiedRequest] = useState<CashOutRequest | null>(null);
  const [verifyMessage, setVerifyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Currency state
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user?.id]);

  const currencySymbol = defaultCurrency?.symbol || 'Le ';

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const fetchDashboardData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [dashStats, pending, transactions, profile] = await Promise.all([
        agentService.getDashboardStats(user.id),
        agentService.getPendingCashOuts(user.id, 5),
        agentService.getTransactions(user.id, { limit: 5 }),
        agentService.getProfile(user.id),
      ]);

      setStats(dashStats);
      setPendingCashOuts(pending);
      setRecentTransactions(transactions);
      if (profile?.tier) {
        setAgentTier(profile.tier);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCashIn = async () => {
    if (!user?.id || !cashInPhone || !cashInAmount) return;

    setCashInLoading(true);
    setCashInMessage(null);

    try {
      const result = await agentService.processCashIn({
        agentId: user.id,
        customerPhone: cashInPhone,
        amount: parseFloat(cashInAmount),
      });

      if (result.success) {
        setCashInMessage({ type: 'success', text: result.message });
        setCashInPhone('');
        setCashInAmount('');
        fetchDashboardData();
        setTimeout(() => {
          setShowCashInModal(false);
          setCashInMessage(null);
        }, 2000);
      } else {
        setCashInMessage({ type: 'error', text: result.message });
      }
    } catch {
      setCashInMessage({ type: 'error', text: 'Failed to process cash-in' });
    } finally {
      setCashInLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      setVerifyMessage({ type: 'error', text: 'Please enter a valid 6-digit code' });
      return;
    }

    setVerifyLoading(true);
    setVerifyMessage(null);

    try {
      const result = await agentService.verifyCashOutCode(verifyCode);
      if (result.success && result.request) {
        setVerifiedRequest(result.request);
        setVerifyMessage({ type: 'success', text: 'Code verified! Confirm to dispense cash.' });
      } else {
        setVerifyMessage({ type: 'error', text: result.error || 'Invalid or expired code' });
      }
    } catch {
      setVerifyMessage({ type: 'error', text: 'Failed to verify code' });
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleCompleteCashOut = async () => {
    if (!user?.id || !verifiedRequest) return;

    setVerifyLoading(true);
    try {
      const result = await agentService.completeCashOut({
        requestId: verifiedRequest.id,
        agentId: user.id,
        code: verifyCode,
      });

      if (result.success) {
        setVerifyMessage({ type: 'success', text: result.message });
        fetchDashboardData();
        setTimeout(() => {
          setShowVerifyModal(false);
          setVerifyCode('');
          setVerifiedRequest(null);
          setVerifyMessage(null);
        }, 2000);
      } else {
        setVerifyMessage({ type: 'error', text: result.message });
      }
    } catch {
      setVerifyMessage({ type: 'error', text: 'Failed to complete cash-out' });
    } finally {
      setVerifyLoading(false);
    }
  };

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

  const limits = agentService.getLimits(agentTier);

  return (
    <AgentLayout>
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <motion.div
          className="flex justify-between items-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agent Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400">
              {agentTier === 'agent_plus' ? 'Agent+ Account' : agentTier === 'standard' ? 'Standard Agent' : 'Basic Agent'}
              {' '}&bull;{' '}Daily Limit: {formatCurrency(limits.dailyLimit)}
            </p>
          </div>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={fetchDashboardData}
              className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </motion.button>
          </div>
        </motion.div>

        {/* Float Balance Card & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Float Balance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700 text-white rounded-xl shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <Wallet className="w-6 h-6" />
              </div>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Float Balance</span>
            </div>
            <p className="text-sm text-orange-100">Available Cash</p>
            <p className="text-3xl font-bold">{formatCurrency(stats.floatBalance)}</p>
            <div className="flex gap-2 mt-4">
              <Link
                to="/agent/float"
                className="flex-1 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
              >
                <TrendingUp className="w-4 h-4" />
                Top Up
              </Link>
              <Link
                to="/agent/transactions"
                className="flex-1 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
              >
                <History className="w-4 h-4" />
                History
              </Link>
            </div>
          </motion.div>

          {/* Cash In */}
          <MotionCard className="p-6" delay={0.2}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <ArrowDownLeft className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Cash In (Deposit)</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Accept cash from customer and credit their wallet
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCashInModal(true)}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <Banknote className="w-5 h-5" />
              Process Cash In
            </motion.button>
          </MotionCard>

          {/* Cash Out */}
          <MotionCard className="p-6" delay={0.3}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <ArrowUpRight className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Cash Out (Withdrawal)</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Verify customer code and dispense cash
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowVerifyModal(true)}
              className="w-full py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
            >
              <QrCode className="w-5 h-5" />
              Verify Code
            </motion.button>
          </MotionCard>
        </div>

        {/* Today's Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MotionCard className="p-4" delay={0.4}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <ArrowDownLeft className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Today's Cash In</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(stats.todayCashIn)}</p>
              </div>
            </div>
          </MotionCard>

          <MotionCard className="p-4" delay={0.45}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <ArrowUpRight className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Today's Cash Out</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(stats.todayCashOut)}</p>
              </div>
            </div>
          </MotionCard>

          <MotionCard className="p-4" delay={0.5}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Percent className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Today's Commission</p>
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{formatCurrency(stats.todayCommissions)}</p>
              </div>
            </div>
          </MotionCard>

          <MotionCard className="p-4" delay={0.55}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Send className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Transactions</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.todayTransactions}</p>
              </div>
            </div>
          </MotionCard>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Cash-Outs */}
          <MotionCard className="lg:col-span-2 p-6" delay={0.6}>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pending Cash-Outs</h2>
                {stats.pendingCashOuts > 0 && (
                  <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-medium rounded-full">
                    {stats.pendingCashOuts}
                  </span>
                )}
              </div>
              <Link
                to="/agent/cashout"
                className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300"
              >
                View All
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : pendingCashOuts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No pending cash-out requests</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">Requests will appear here when customers request cash</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingCashOuts.map((request) => (
                  <motion.div
                    key={request.id}
                    whileHover={{ scale: 1.01 }}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                        <Banknote className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{request.customerName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Code: <span className="font-mono font-bold">{request.code}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(request.amount)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Expires {formatTimeAgo(request.codeExpiresAt)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </MotionCard>

          {/* Monthly Summary & Quick Stats */}
          <div className="space-y-6">
            <MotionCard className="p-6" delay={0.7}>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Monthly Summary</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Volume</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(stats.monthlyVolume)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Commissions</span>
                  </div>
                  <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(stats.monthlyCommissions)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Customers</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">{stats.totalCustomersServed}</span>
                </div>
              </div>
            </MotionCard>

            {/* Recent Transactions */}
            <MotionCard className="p-6" delay={0.8}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
                <Link
                  to="/agent/transactions"
                  className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700"
                >
                  View All
                </Link>
              </div>
              <div className="space-y-3">
                {recentTransactions.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No recent transactions</p>
                ) : (
                  recentTransactions.slice(0, 4).map((txn) => (
                    <div key={txn.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-full ${
                          txn.type === 'CASH_IN' ? 'bg-green-100 dark:bg-green-900/30' :
                          txn.type === 'CASH_OUT' ? 'bg-red-100 dark:bg-red-900/30' :
                          'bg-blue-100 dark:bg-blue-900/30'
                        }`}>
                          {txn.type === 'CASH_IN' ? (
                            <ArrowDownLeft className="w-3 h-3 text-green-600 dark:text-green-400" />
                          ) : txn.type === 'CASH_OUT' ? (
                            <ArrowUpRight className="w-3 h-3 text-red-600 dark:text-red-400" />
                          ) : (
                            <Send className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{txn.type.replace('_', ' ')}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(txn.createdAt)}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-medium ${
                        txn.type === 'CASH_IN' ? 'text-green-600 dark:text-green-400' :
                        txn.type === 'CASH_OUT' ? 'text-red-600 dark:text-red-400' :
                        'text-gray-900 dark:text-white'
                      }`}>
                        {txn.type === 'CASH_OUT' ? '-' : '+'}{formatCurrency(txn.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </MotionCard>
          </div>
        </div>

        {/* Agent+ Upgrade Banner */}
        {agentTier !== 'agent_plus' && (
          <MotionCard className="p-6 border-2 border-orange-200 dark:border-orange-800 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20" delay={0.9}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/50 rounded-xl">
                  <Zap className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Upgrade to Agent+</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Higher limits ({formatCurrency(5000000)}/day), lower fees, priority support & more
                  </p>
                </div>
              </div>
              <Link
                to="/agent/upgrade"
                className="px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center gap-2"
              >
                <Zap className="w-5 h-5" />
                Upgrade Now
              </Link>
            </div>
          </MotionCard>
        )}
      </motion.div>

      {/* Cash In Modal */}
      {showCashInModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Cash In (Deposit)</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Accept cash from customer and credit their wallet
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Customer Phone Number
                </label>
                <input
                  type="tel"
                  value={cashInPhone}
                  onChange={(e) => setCashInPhone(e.target.value)}
                  placeholder="+232 XX XXX XXXX"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount ({currencySymbol})
                </label>
                <input
                  type="number"
                  value={cashInAmount}
                  onChange={(e) => setCashInAmount(e.target.value)}
                  placeholder="0"
                  min={limits.minTransaction}
                  max={limits.maxTransaction}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-2xl font-bold"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Min: {formatCurrency(limits.minTransaction)} &bull; Max: {formatCurrency(limits.maxTransaction)}
                </p>
              </div>

              {cashInAmount && (
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Fee (1%)</span>
                    <span className="text-gray-900 dark:text-white">{formatCurrency(Math.max(parseFloat(cashInAmount) * 0.01, 1))}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-500">Customer receives</span>
                    <span className="font-bold text-green-600">{formatCurrency(parseFloat(cashInAmount) - Math.max(parseFloat(cashInAmount) * 0.01, 1))}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-500">Your commission</span>
                    <span className="font-bold text-purple-600">{formatCurrency(Math.max(parseFloat(cashInAmount) * 0.01, 1) * 0.5)}</span>
                  </div>
                </div>
              )}

              {cashInMessage && (
                <div className={`p-3 rounded-lg ${
                  cashInMessage.type === 'success'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }`}>
                  {cashInMessage.text}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCashInModal(false);
                    setCashInPhone('');
                    setCashInAmount('');
                    setCashInMessage(null);
                  }}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCashIn}
                  disabled={cashInLoading || !cashInPhone || !cashInAmount}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {cashInLoading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Confirm Deposit
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Cash Out Verification Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Cash Out Verification</h3>

            {!verifiedRequest ? (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Enter the 6-digit code from the customer
                </p>

                <div className="mb-4">
                  <input
                    type="text"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    className="w-full px-4 py-4 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-3xl font-mono text-center tracking-widest"
                    maxLength={6}
                  />
                </div>

                {verifyMessage && (
                  <div className={`p-3 rounded-lg mb-4 ${
                    verifyMessage.type === 'success'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  }`}>
                    {verifyMessage.text}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowVerifyModal(false);
                      setVerifyCode('');
                      setVerifyMessage(null);
                    }}
                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerifyCode}
                    disabled={verifyLoading || verifyCode.length !== 6}
                    className="flex-1 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {verifyLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <QrCode className="w-5 h-5" />
                        Verify Code
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-4">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Code Verified</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Customer</span>
                      <span className="font-medium text-gray-900 dark:text-white">{verifiedRequest.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Amount</span>
                      <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(verifiedRequest.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Your commission</span>
                      <span className="font-bold text-purple-600">{formatCurrency(verifiedRequest.fee * 0.5)}</span>
                    </div>
                  </div>
                </div>

                {stats.floatBalance < verifiedRequest.amount && (
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Insufficient float balance
                  </div>
                )}

                {verifyMessage && verifyMessage.type === 'error' && (
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg mb-4">
                    {verifyMessage.text}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowVerifyModal(false);
                      setVerifyCode('');
                      setVerifiedRequest(null);
                      setVerifyMessage(null);
                    }}
                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCompleteCashOut}
                    disabled={verifyLoading || stats.floatBalance < verifiedRequest.amount}
                    className="flex-1 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {verifyLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Banknote className="w-5 h-5" />
                        Dispense Cash
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AgentLayout>
  );
}
