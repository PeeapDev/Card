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
} from 'lucide-react';
import { MotionCard, GradientCard } from '@/components/ui/Card';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { currencyService, Currency } from '@/services/currency.service';

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
  // Currency state
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
  }, []);

  const currencySymbol = defaultCurrency?.symbol || 'Le';

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const [stats] = useState({
    todayRevenue: 0,
    monthlyRevenue: 0,
    totalTransactions: 0,
    avgTicket: 0,
    successRate: 0,
    pendingPayouts: 0,
  });

  const [recentTransactions] = useState<{id: string; amount: number; status: string; time: string; cardLast4: string}[]>([]);

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
                      <th className="pb-3 font-medium">Transaction ID</th>
                      <th className="pb-3 font-medium">Card</th>
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
                        <td className="py-3 text-sm font-medium text-gray-900 dark:text-white">{txn.id}</td>
                        <td className="py-3 text-sm text-gray-600 dark:text-gray-400">****{txn.cardLast4}</td>
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
    </MerchantLayout>
  );
}
