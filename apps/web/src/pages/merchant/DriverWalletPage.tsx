/**
 * Driver Wallet Page
 *
 * Dedicated wallet for drivers to manage their collected fares
 * Features:
 * - View driver wallet balance
 * - Transfer funds to main wallet
 * - View collection history
 * - Daily/weekly earnings summary
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  ArrowRightLeft,
  TrendingUp,
  Car,
  Clock,
  ChevronRight,
  Loader2,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Home,
} from 'lucide-react';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { walletService, ExtendedWallet } from '@/services/wallet.service';
import { supabase } from '@/lib/supabase';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  description?: string;
  created_at: string;
  status: string;
}

interface EarningsSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  totalTrips: number;
}

export function DriverWalletPage() {
  const { user } = useAuth();

  // Wallet state
  const [driverWallet, setDriverWallet] = useState<ExtendedWallet | null>(null);
  const [primaryWallet, setPrimaryWallet] = useState<ExtendedWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Transfer state
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [transferError, setTransferError] = useState('');

  // Transactions
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Earnings summary
  const [earnings, setEarnings] = useState<EarningsSummary>({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    totalTrips: 0,
  });

  // Load wallets
  const loadWallets = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError('');

      // Get or create driver wallet
      const driver = await walletService.getOrCreateWalletByType(user.id, 'driver', 'Driver Wallet');
      setDriverWallet(driver);

      // Get primary wallet
      const primary = await walletService.getWalletByType(user.id, 'primary');
      setPrimaryWallet(primary);
    } catch (err: any) {
      console.error('Error loading wallets:', err);
      setError(err.message || 'Failed to load wallets');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load transactions
  const loadTransactions = useCallback(async () => {
    if (!driverWallet?.id) return;

    try {
      setLoadingTransactions(true);

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_id', driverWallet.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setTransactions(data || []);

      // Calculate earnings
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const allTransactions = data || [];
      const credits = allTransactions.filter(t => t.amount > 0 && t.status === 'COMPLETED');

      setEarnings({
        today: credits
          .filter(t => new Date(t.created_at) >= startOfDay)
          .reduce((sum, t) => sum + t.amount, 0),
        thisWeek: credits
          .filter(t => new Date(t.created_at) >= startOfWeek)
          .reduce((sum, t) => sum + t.amount, 0),
        thisMonth: credits
          .filter(t => new Date(t.created_at) >= startOfMonth)
          .reduce((sum, t) => sum + t.amount, 0),
        totalTrips: credits.length,
      });
    } catch (err: any) {
      console.error('Error loading transactions:', err);
    } finally {
      setLoadingTransactions(false);
    }
  }, [driverWallet?.id]);

  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  useEffect(() => {
    if (driverWallet) {
      loadTransactions();
    }
  }, [driverWallet, loadTransactions]);

  // Handle transfer to main wallet
  const handleTransfer = async () => {
    if (!driverWallet || !primaryWallet || !transferAmount) return;

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      setTransferError('Please enter a valid amount');
      return;
    }

    if (amount > driverWallet.balance) {
      setTransferError('Insufficient balance in driver wallet');
      return;
    }

    try {
      setTransferring(true);
      setTransferError('');

      await walletService.transferBetweenOwnWallets(
        driverWallet.id,
        primaryWallet.id,
        amount,
        'Transfer from Driver Wallet to Main Wallet'
      );

      setTransferSuccess(true);
      setTransferAmount('');

      // Reload wallets and transactions
      await loadWallets();
      await loadTransactions();

      // Reset after 3 seconds
      setTimeout(() => {
        setTransferSuccess(false);
        setShowTransfer(false);
      }, 2000);
    } catch (err: any) {
      console.error('Transfer error:', err);
      setTransferError(err.message || 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  // Quick amount buttons
  const quickAmounts = [
    { label: 'Le 50', value: 50 },
    { label: 'Le 100', value: 100 },
    { label: 'Le 500', value: 500 },
    { label: 'All', value: driverWallet?.balance || 0 },
  ];

  if (loading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </MerchantLayout>
    );
  }

  if (error) {
    return (
      <MerchantLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Failed to Load Wallet</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={loadWallets}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Car className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              Driver Wallet
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your collected fares separately from your main wallet
            </p>
          </div>
          <button
            onClick={() => { loadWallets(); loadTransactions(); }}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Driver Wallet Balance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl p-6 text-white"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5" />
                <span className="text-yellow-100 font-medium">Driver Wallet</span>
              </div>
              <span className="text-xs px-2 py-1 bg-white/20 rounded-full">Active</span>
            </div>
            <div className="mb-4">
              <p className="text-yellow-100 text-sm">Available Balance</p>
              <p className="text-3xl font-bold">
                Le {driverWallet?.balance.toLocaleString() || '0'}
              </p>
            </div>
            <div className="text-sm text-yellow-100">
              {earnings.totalTrips} trips collected
            </div>
          </motion.div>

          {/* Main Wallet Balance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                <span className="text-green-100 font-medium">Main Wallet</span>
              </div>
              <span className="text-xs px-2 py-1 bg-white/20 rounded-full">Primary</span>
            </div>
            <div className="mb-4">
              <p className="text-green-100 text-sm">Available Balance</p>
              <p className="text-3xl font-bold">
                Le {primaryWallet?.balance.toLocaleString() || '0'}
              </p>
            </div>
            <div className="text-sm text-green-100">
              Your personal wallet
            </div>
          </motion.div>
        </div>

        {/* Transfer Section */}
        <Card className="p-6">
          {!showTransfer ? (
            <button
              onClick={() => setShowTransfer(true)}
              disabled={!driverWallet?.balance || driverWallet.balance <= 0}
              className={clsx(
                'w-full flex items-center justify-center gap-3 py-4 rounded-xl font-medium transition-all',
                driverWallet?.balance && driverWallet.balance > 0
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
              )}
            >
              <ArrowRightLeft className="w-5 h-5" />
              Transfer to Main Wallet
            </button>
          ) : transferSuccess ? (
            <div className="text-center py-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4"
              >
                <CheckCircle className="w-8 h-8 text-green-600" />
              </motion.div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Transfer Complete!</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Funds have been moved to your main wallet
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">Transfer to Main Wallet</h3>
                <button
                  onClick={() => { setShowTransfer(false); setTransferError(''); }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>

              {/* Quick amount buttons */}
              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((qa) => (
                  <button
                    key={qa.label}
                    onClick={() => setTransferAmount(qa.value.toString())}
                    className={clsx(
                      'py-2 rounded-lg text-sm font-medium transition-colors',
                      transferAmount === qa.value.toString()
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    )}
                  >
                    {qa.label}
                  </button>
                ))}
              </div>

              {/* Amount input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount (Le)
                </label>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Available: Le {driverWallet?.balance.toLocaleString() || '0'}
                </p>
              </div>

              {transferError && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {transferError}
                </div>
              )}

              <button
                onClick={handleTransfer}
                disabled={transferring || !transferAmount}
                className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {transferring ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="w-5 h-5" />
                    Transfer Le {parseFloat(transferAmount || '0').toLocaleString()}
                  </>
                )}
              </button>
            </div>
          )}
        </Card>

        {/* Earnings Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Today</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  Le {earnings.today.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">This Week</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  Le {earnings.thisWeek.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">This Month</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  Le {earnings.thisMonth.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Car className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Trips</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {earnings.totalTrips}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Recent Collections</h3>
            {loadingTransactions && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No collections yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Start collecting fares to see them here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      'p-2 rounded-full',
                      tx.amount > 0
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-red-100 dark:bg-red-900/30'
                    )}>
                      {tx.amount > 0 ? (
                        <ArrowDownLeft className="w-4 h-4 text-green-600" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {tx.description || (tx.amount > 0 ? 'Fare Collected' : 'Transfer Out')}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className={clsx(
                    'font-semibold',
                    tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {tx.amount > 0 ? '+' : ''}Le {Math.abs(tx.amount).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </MerchantLayout>
  );
}

export default DriverWalletPage;
