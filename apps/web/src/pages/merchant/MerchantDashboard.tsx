import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Store,
  DollarSign,
  TrendingUp,
  CreditCard,
  ShoppingCart,
  ArrowUpRight,
  Calendar,
  Download,
  RefreshCw,
  Settings,
  QrCode,
  Building2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { MotionCard, GradientCard } from '@/components/ui/Card';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { ScanToPayModal } from '@/components/payment/ScanToPayModal';
import { currencyService, Currency } from '@/services/currency.service';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' }
  }
};

export function MerchantDashboard() {
  const { user } = useAuth();

  // Currency state
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  // Scan to Pay modal state
  const [showScanToPay, setShowScanToPay] = useState(false);

  // Loading state
  const [loading, setLoading] = useState(true);

  // Stats state
  const [stats, setStats] = useState({
    todayRevenue: 0,
    monthlyRevenue: 0,
    totalTransactions: 0,
    avgTicket: 0,
    successRate: 0,
    pendingPayouts: 0,
  });

  // Transactions state
  const [recentTransactions, setRecentTransactions] = useState<{
    id: string;
    amount: number;
    status: string;
    time: string;
    cardLast4: string;
    payerName: string;
    paymentMethod: string;
  }[]>([]);

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
  }, []);

  // Fetch merchant data from all shops
  useEffect(() => {
    async function fetchMerchantData() {
      if (!user?.id) return;

      try {
        setLoading(true);

        // 1. Get all businesses owned by this merchant
        const { data: businesses, error: bizError } = await supabase
          .from('merchant_businesses')
          .select('id, name, merchant_id')
          .eq('merchant_id', user.id);

        if (bizError) {
          console.error('Error fetching businesses:', bizError);
          return;
        }

        if (!businesses || businesses.length === 0) {
          setLoading(false);
          return;
        }

        // 2. Get merchant's primary wallet (all transactions go to merchant's wallet)
        const { data: merchantWallet, error: walletError } = await supabase
          .from('wallets')
          .select('id, balance')
          .eq('user_id', user.id)
          .eq('wallet_type', 'primary')
          .single();

        if (walletError || !merchantWallet) {
          console.error('Error fetching merchant wallet:', walletError);
          setLoading(false);
          return;
        }

        // 3. Fetch all transactions for merchant's wallet (incoming payments are positive amounts)
        const { data: allTransactions, error: txError } = await supabase
          .from('transactions')
          .select('*')
          .eq('wallet_id', merchantWallet.id)
          .gt('amount', 0) // Only incoming payments (positive amounts)
          .order('created_at', { ascending: false });

        if (txError) {
          console.error('Error fetching transactions:', txError);
          setLoading(false);
          return;
        }

        const transactions = allTransactions || [];

        // 4. Calculate stats
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const todayTransactions = transactions.filter(tx => new Date(tx.created_at) >= todayStart);
        const monthTransactions = transactions.filter(tx => new Date(tx.created_at) >= monthStart);
        const completedTransactions = transactions.filter(tx => tx.status === 'COMPLETED');

        const todayRevenue = todayTransactions
          .filter(tx => tx.status === 'COMPLETED')
          .reduce((sum, tx) => sum + Number(tx.amount), 0);

        const monthlyRevenue = monthTransactions
          .filter(tx => tx.status === 'COMPLETED')
          .reduce((sum, tx) => sum + Number(tx.amount), 0);

        const totalCompleted = completedTransactions.length;
        const avgTicket = totalCompleted > 0
          ? completedTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0) / totalCompleted
          : 0;

        const successRate = transactions.length > 0
          ? Math.round((completedTransactions.length / transactions.length) * 100)
          : 0;

        setStats({
          todayRevenue,
          monthlyRevenue,
          totalTransactions: transactions.length,
          avgTicket,
          successRate,
          pendingPayouts: Number(merchantWallet.balance) || 0,
        });

        // 5. Format recent transactions for display
        const recent = transactions.slice(0, 10).map(tx => ({
          id: tx.reference || tx.id.substring(0, 8),
          amount: Number(tx.amount),
          status: tx.status?.toLowerCase() || 'pending',
          time: new Date(tx.created_at).toLocaleString(),
          cardLast4: tx.metadata?.card_last4 || '****',
          payerName: tx.metadata?.payerName || tx.description || 'Customer',
          paymentMethod: tx.metadata?.paymentMethod || 'unknown',
        }));

        setRecentTransactions(recent);

      } catch (error) {
        console.error('Error fetching merchant data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMerchantData();
  }, [user?.id]);

  const currencySymbol = defaultCurrency?.symbol || 'Le';

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          className="flex justify-between items-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Merchant Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400">Overview of your merchant account</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors">
              <Calendar className="w-4 h-4" />
              Last 30 days
            </button>
            <button className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </motion.div>

        {/* Revenue Stats */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <GradientCard gradient="green" delay={0}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-green-100 text-sm font-medium">Today's Revenue</p>
                  <p className="text-3xl font-bold mt-2">{formatCurrency(stats.todayRevenue)}</p>
                  <div className="flex items-center gap-1 mt-2 text-green-100">
                    <ArrowUpRight className="w-4 h-4" />
                    <span className="text-sm">+12.5% vs yesterday</span>
                  </div>
                </div>
                <div className="p-3 bg-white/20 rounded-lg">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
            </GradientCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <GradientCard gradient="blue" delay={0.1}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Monthly Revenue</p>
                  <p className="text-3xl font-bold mt-2">{formatCurrency(stats.monthlyRevenue)}</p>
                  <div className="flex items-center gap-1 mt-2 text-blue-100">
                    <ArrowUpRight className="w-4 h-4" />
                    <span className="text-sm">+8.3% vs last month</span>
                  </div>
                </div>
                <div className="p-3 bg-white/20 rounded-lg">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </GradientCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <GradientCard gradient="purple" delay={0.2}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Pending Payouts</p>
                  <p className="text-3xl font-bold mt-2">{formatCurrency(stats.pendingPayouts)}</p>
                  <div className="flex items-center gap-1 mt-2 text-purple-100">
                    <RefreshCw className="w-4 h-4" />
                    <span className="text-sm">Next payout: Tomorrow</span>
                  </div>
                </div>
                <div className="p-3 bg-white/20 rounded-lg">
                  <Store className="w-6 h-6" />
                </div>
              </div>
            </GradientCard>
          </motion.div>
        </motion.div>

        {/* Secondary Stats */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <MotionCard padding="sm" className="flex items-center gap-4" delay={0.3} glowEffect>
              <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Transactions</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{stats.totalTransactions.toLocaleString()}</p>
              </div>
            </MotionCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <MotionCard padding="sm" className="flex items-center gap-4" delay={0.4} glowEffect>
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <CreditCard className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Average Ticket</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatCurrency(stats.avgTicket)}</p>
              </div>
            </MotionCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <MotionCard padding="sm" className="flex items-center gap-4" delay={0.5} glowEffect>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Success Rate</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{stats.successRate}%</p>
              </div>
            </MotionCard>
          </motion.div>
        </motion.div>

        {/* Recent Transactions & Quick Actions */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <MotionCard className="p-6" delay={0.6}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h2>
                <button className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">View all</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                      <th className="pb-3 font-medium">Customer</th>
                      <th className="pb-3 font-medium">Method</th>
                      <th className="pb-3 font-medium">Amount</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.map((txn, index) => (
                      <motion.tr
                        key={txn.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 + index * 0.05 }}
                        className="border-b border-gray-100 dark:border-gray-700 last:border-0"
                      >
                        <td className="py-3 text-sm font-medium text-gray-900 dark:text-white">{txn.payerName}</td>
                        <td className="py-3 text-sm text-gray-600 dark:text-gray-400">
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                            {txn.paymentMethod === 'scan_to_pay' ? 'QR Scan' :
                             txn.paymentMethod === 'mobile_money' ? 'Mobile Money' :
                             txn.paymentMethod === 'peeap_card' ? 'Card' :
                             txn.paymentMethod || 'Unknown'}
                          </span>
                        </td>
                        <td className="py-3 text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(txn.amount)}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            txn.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                            txn.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                            'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}>
                            {txn.status}
                          </span>
                        </td>
                        <td className="py-3 text-sm text-gray-500 dark:text-gray-400">{txn.time}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </MotionCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <MotionCard className="p-6" delay={0.7}>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowScanToPay(true)}
                  className="w-full p-4 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg text-left transition-colors flex items-center gap-3 border border-primary-200 dark:border-primary-800"
                >
                  <QrCode className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-white">Scan to Pay</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Scan customer QR to charge</p>
                  </div>
                </motion.button>
                <Link to="/merchant/payouts">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full p-4 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg text-left transition-colors flex items-center gap-3 border border-emerald-200 dark:border-emerald-800"
                  >
                    <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-white">Withdraw Funds</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Withdraw to bank or mobile money</p>
                    </div>
                  </motion.div>
                </Link>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-left transition-colors flex items-center gap-3"
                >
                  <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-white">Process Refund</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Issue customer refunds</p>
                  </div>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-left transition-colors flex items-center gap-3"
                >
                  <Download className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-white">Download Report</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Export transaction data</p>
                  </div>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-left transition-colors flex items-center gap-3"
                >
                  <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-white">Payment Settings</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Configure payment options</p>
                  </div>
                </motion.button>
              </div>
            </MotionCard>
          </motion.div>
        </motion.div>
      </div>

      {/* Floating Scan to Pay Button - Mobile */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowScanToPay(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg flex items-center justify-center md:hidden"
        aria-label="Scan to Pay"
      >
        <QrCode className="w-6 h-6" />
      </motion.button>

      {/* Scan to Pay Modal */}
      <ScanToPayModal
        isOpen={showScanToPay}
        onClose={() => setShowScanToPay(false)}
      />
    </MerchantLayout>
  );
}
