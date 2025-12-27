import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  ArrowUpRight,
  ArrowRight,
  RefreshCw,
  QrCode,
  Building2,
  Wallet,
  Users,
  Plus,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { ScanToPayModal } from '@/components/payment/ScanToPayModal';
import { currencyService, Currency } from '@/services/currency.service';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { SkeletonDashboard } from '@/components/ui/Skeleton';

export function MerchantDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);
  const [showScanToPay, setShowScanToPay] = useState(false);
  const [loading, setLoading] = useState(true);
  const [businessCount, setBusinessCount] = useState(0);

  const [stats, setStats] = useState({
    todayRevenue: 0,
    monthlyRevenue: 0,
    totalTransactions: 0,
    avgTicket: 0,
    successRate: 0,
    walletBalance: 0,
  });

  const [recentTransactions, setRecentTransactions] = useState<{
    id: string;
    amount: number;
    status: string;
    time: string;
    payerName: string;
    paymentMethod: string;
  }[]>([]);

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
  }, []);

  useEffect(() => {
    async function fetchMerchantData() {
      if (!user?.id) return;

      try {
        setLoading(true);

        // Get businesses count
        const { data: businesses } = await supabase
          .from('merchant_businesses')
          .select('id')
          .eq('merchant_id', user.id);

        setBusinessCount(businesses?.length || 0);

        // Get merchant's primary wallet
        const { data: merchantWallet } = await supabase
          .from('wallets')
          .select('id, balance')
          .eq('user_id', user.id)
          .eq('wallet_type', 'primary')
          .single();

        if (!merchantWallet) {
          setLoading(false);
          return;
        }

        // Fetch transactions
        const { data: allTransactions } = await supabase
          .from('transactions')
          .select('*')
          .eq('wallet_id', merchantWallet.id)
          .gt('amount', 0)
          .order('created_at', { ascending: false });

        const transactions = allTransactions || [];

        // Calculate stats
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
          walletBalance: Number(merchantWallet.balance) || 0,
        });

        // Format recent transactions
        const recent = transactions.slice(0, 5).map(tx => ({
          id: tx.reference || tx.id.substring(0, 8),
          amount: Number(tx.amount),
          status: tx.status?.toLowerCase() || 'pending',
          time: new Date(tx.created_at).toLocaleString(),
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
        <SkeletonDashboard />
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Welcome back! Here's your business overview.</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => setShowScanToPay(true)}
            className="p-4 bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-500/20"
          >
            <QrCode className="w-6 h-6 mb-2" />
            <p className="font-medium text-sm">Scan to Pay</p>
          </button>
          <Link
            to="/merchant/collect-payment"
            className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/20"
          >
            <DollarSign className="w-6 h-6 mb-2" />
            <p className="font-medium text-sm">Collect Payment</p>
          </Link>
          <Link
            to="/merchant/payouts"
            className="p-4 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Building2 className="w-6 h-6 mb-2" />
            <p className="font-medium text-sm">Withdraw</p>
          </Link>
          <Link
            to="/merchant/payment-links"
            className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20"
          >
            <Plus className="w-6 h-6 mb-2" />
            <p className="font-medium text-sm">Payment Link</p>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Wallet Balance */}
          <Card className="p-5 border-l-4 border-l-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Wallet Balance</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(stats.walletBalance)}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <Wallet className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </Card>

          {/* Today's Revenue */}
          <Card className="p-5 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Today's Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(stats.todayRevenue)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </Card>

          {/* Transactions */}
          <Card className="p-5 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.totalTransactions.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <ShoppingCart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </Card>

          {/* Businesses */}
          <Card className="p-5 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">My Businesses</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {businessCount}
                </p>
              </div>
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                <Users className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* Monthly Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Revenue</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(stats.monthlyRevenue)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 rounded-xl">
                <ArrowUpRight className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Transaction</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(stats.avgTicket)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 rounded-xl">
                <RefreshCw className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Success Rate</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {stats.successRate}%
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h2>
            <Link
              to="/merchant/transactions"
              className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">No transactions yet</p>
              <button
                onClick={() => setShowScanToPay(true)}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
              >
                Start Collecting Payments
              </button>
            </div>
          ) : (
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
                  {recentTransactions.map((txn) => (
                    <tr
                      key={txn.id}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
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
