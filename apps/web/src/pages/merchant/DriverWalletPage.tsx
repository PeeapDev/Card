/**
 * Driver Wallet Page
 *
 * Dedicated wallet for drivers to manage their collected fares
 * Features:
 * - View driver wallet balance
 * - Collect payments (QR, NFC, Mobile Money)
 * - Transfer funds to main wallet
 * - View collection history
 * - Daily/weekly earnings summary
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  QrCode,
  X,
  Banknote,
  Calculator,
  Gauge,
  ArrowLeft,
  Sun,
  Moon,
  Smartphone,
} from 'lucide-react';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { walletService, ExtendedWallet } from '@/services/wallet.service';
import { supabase } from '@/lib/supabase';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { DriverCollectionView } from '@/components/transport/DriverCollectionView';
import { PhoneFrame } from '@/components/ui/PhoneFrame';
import { APP_URL, isDevelopment } from '@/config/urls';

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

  // Collection state - Phone frame flow
  const [showPhoneCollection, setShowPhoneCollection] = useState(false);
  const [collectionStep, setCollectionStep] = useState<'mode' | 'keypad' | 'collecting' | 'success'>('mode');
  const [fareType, setFareType] = useState<'fixed' | 'meter' | null>(null);
  const [collectionAmount, setCollectionAmount] = useState('');
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectionSession, setCollectionSession] = useState<{
    sessionId: string;
    paymentUrl: string;
    amount: number;
  } | null>(null);

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

  // Quick amount buttons for transfer
  const quickAmounts = [
    { label: 'Le 50', value: 50 },
    { label: 'Le 100', value: 100 },
    { label: 'Le 500', value: 500 },
    { label: 'All', value: driverWallet?.balance || 0 },
  ];

  // Quick collection amounts
  const quickCollectionAmounts = [
    { label: 'Le 2', value: 2 },
    { label: 'Le 3', value: 3 },
    { label: 'Le 5', value: 5 },
    { label: 'Le 10', value: 10 },
  ];

  // Generate unique session ID
  const generateSessionId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'cs_';
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Start a payment collection session
  const startCollection = async () => {
    const amount = parseFloat(collectionAmount);
    if (isNaN(amount) || amount <= 0) return;

    try {
      setIsCollecting(true);

      // Create a unique session ID
      const sessionId = generateSessionId();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      // Create a checkout session in the database
      const { data: session, error: sessionError } = await supabase
        .from('checkout_sessions')
        .insert({
          external_id: sessionId,
          merchant_id: null, // Driver collection doesn't need merchant
          status: 'OPEN',
          amount,
          currency_code: 'SLE',
          description: `${fareType === 'fixed' ? 'Fixed fare' : 'Metered fare'} collection`,
          merchant_name: `${user?.firstName || 'Driver'} ${user?.lastName || ''}`.trim(),
          payment_methods: { qr: true, card: true, mobile: true },
          metadata: {
            type: 'driver_collection',
            fareType: fareType,
            driverId: user?.id,
            walletId: driverWallet?.id,
          },
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Generate payment URL - use /scan-pay for compatibility
      const baseUrl = isDevelopment
        ? `http://${window.location.hostname}:${window.location.port}`
        : APP_URL;
      const paymentUrl = `${baseUrl}/scan-pay/${sessionId}`;

      setCollectionSession({
        sessionId,
        paymentUrl,
        amount,
      });
      setCollectionStep('collecting');
    } catch (err: any) {
      console.error('Error starting collection:', err);
      alert('Failed to start collection. Please try again.');
    } finally {
      setIsCollecting(false);
    }
  };

  // Handle keypad input
  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      setCollectionAmount(prev => prev.slice(0, -1));
    } else if (key === 'clear') {
      setCollectionAmount('');
    } else {
      setCollectionAmount(prev => prev + key);
    }
  };

  // Reset collection flow
  const resetCollectionFlow = () => {
    setCollectionStep('mode');
    setFareType(null);
    setCollectionAmount('');
    setCollectionSession(null);
  };

  // Close phone collection
  const closePhoneCollection = () => {
    resetCollectionFlow();
    setShowPhoneCollection(false);
    // Refresh wallet after closing
    loadWallets();
    loadTransactions();
  };

  // Handle successful payment collection
  const handlePaymentComplete = () => {
    setCollectionStep('success');
  };

  // Cancel collection - go back to keypad
  const cancelCollection = async () => {
    if (collectionSession) {
      await supabase
        .from('checkout_sessions')
        .update({ status: 'CANCELLED' })
        .eq('external_id', collectionSession.sessionId);
    }
    setCollectionSession(null);
    setCollectionStep('keypad');
  };

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
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Car className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              Driver Wallet
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage collected fares
            </p>
          </div>
          <button
            onClick={() => { loadWallets(); loadTransactions(); }}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Main Grid Layout - 3 columns on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Wallets & Actions */}
          <div className="lg:col-span-2 space-y-4">
            {/* Balance Cards - Side by side */}
            <div className="grid grid-cols-2 gap-3">
              {/* Driver Wallet Balance */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl p-4 text-white"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Car className="w-4 h-4" />
                    <span className="text-yellow-100 text-sm font-medium">Driver</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 bg-white/20 rounded-full">Active</span>
                </div>
                <p className="text-yellow-100 text-xs">Balance</p>
                <p className="text-2xl font-bold">
                  Le {driverWallet?.balance.toLocaleString() || '0'}
                </p>
                <p className="text-xs text-yellow-100 mt-1">
                  {earnings.totalTrips} trips
                </p>
              </motion.div>

              {/* Main Wallet Balance */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Home className="w-4 h-4" />
                    <span className="text-green-100 text-sm font-medium">Main</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 bg-white/20 rounded-full">Primary</span>
                </div>
                <p className="text-green-100 text-xs">Balance</p>
                <p className="text-2xl font-bold">
                  Le {primaryWallet?.balance.toLocaleString() || '0'}
                </p>
                <p className="text-xs text-green-100 mt-1">
                  Personal wallet
                </p>
              </motion.div>
            </div>

            {/* Action Buttons - Side by side */}
            <div className="grid grid-cols-2 gap-3">
              {/* Collect Payment Button - Opens Phone Frame */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowPhoneCollection(true)}
                className="flex items-center gap-3 p-4 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl text-white shadow-lg"
                style={{
                  boxShadow: '0 0 15px rgba(34, 211, 238, 0.3)',
                }}
              >
                <div className="p-2 bg-white/20 rounded-full">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Collect Payment</p>
                  <p className="text-cyan-100 text-xs">QR, NFC, Mobile</p>
                </div>
              </motion.button>

              {/* Transfer Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowTransfer(true)}
                disabled={!driverWallet?.balance || driverWallet.balance <= 0}
                className={clsx(
                  'flex items-center gap-3 p-4 rounded-xl shadow-lg transition-all',
                  driverWallet?.balance && driverWallet.balance > 0
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                )}
              >
                <div className={clsx(
                  'p-2 rounded-full',
                  driverWallet?.balance && driverWallet.balance > 0
                    ? 'bg-white/20'
                    : 'bg-gray-200 dark:bg-gray-700'
                )}>
                  <ArrowRightLeft className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Transfer Out</p>
                  <p className={clsx(
                    'text-xs',
                    driverWallet?.balance && driverWallet.balance > 0
                      ? 'text-green-100'
                      : 'text-gray-500'
                  )}>To Main Wallet</p>
                </div>
              </motion.button>
            </div>

            {/* Transfer Section */}
            <AnimatePresence>
            {showTransfer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
            <Card className="p-4">
              {transferSuccess ? (
                <div className="text-center py-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="inline-flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full mb-3"
                  >
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </motion.div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Transfer Complete!</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Funds moved to main wallet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Transfer to Main Wallet</h3>
                    <button
                      onClick={() => { setShowTransfer(false); setTransferError(''); }}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Quick amount buttons */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {quickAmounts.map((qa) => (
                      <button
                        key={qa.label}
                        onClick={() => setTransferAmount(qa.value.toString())}
                        className={clsx(
                          'py-1.5 rounded-lg text-xs font-medium transition-colors',
                          transferAmount === qa.value.toString()
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                        )}
                      >
                        {qa.label}
                      </button>
                    ))}
                  </div>

                  {/* Amount input */}
                  <input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                  />

                  {transferError && (
                    <div className="flex items-center gap-2 text-red-600 text-xs">
                      <AlertCircle className="w-3 h-3" />
                      {transferError}
                    </div>
                  )}

                  <button
                    onClick={handleTransfer}
                    disabled={transferring || !transferAmount}
                    className="w-full py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {transferring ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Transferring...
                      </>
                    ) : (
                      <>
                        <ArrowRightLeft className="w-4 h-4" />
                        Transfer Le {parseFloat(transferAmount || '0').toLocaleString()}
                      </>
                    )}
                  </button>
                </div>
              )}
            </Card>
            </motion.div>
            )}
            </AnimatePresence>
          </div>

          {/* Right Column - Earnings Summary */}
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Earnings</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded">
                      <DollarSign className="w-3 h-3 text-green-600" />
                    </div>
                    <span className="text-xs text-gray-500">Today</span>
                  </div>
                  <span className="font-semibold text-sm">Le {earnings.today.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded">
                      <Calendar className="w-3 h-3 text-blue-600" />
                    </div>
                    <span className="text-xs text-gray-500">This Week</span>
                  </div>
                  <span className="font-semibold text-sm">Le {earnings.thisWeek.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded">
                      <TrendingUp className="w-3 h-3 text-purple-600" />
                    </div>
                    <span className="text-xs text-gray-500">This Month</span>
                  </div>
                  <span className="font-semibold text-sm">Le {earnings.thisMonth.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded">
                      <Car className="w-3 h-3 text-yellow-600" />
                    </div>
                    <span className="text-xs text-gray-500">Total Trips</span>
                  </div>
                  <span className="font-semibold text-sm">{earnings.totalTrips}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Transactions - Full width below */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Recent Transactions</h3>
          {loadingTransactions ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-4">
              No transactions yet
            </p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {transactions.slice(0, 10).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                >
                  <div className="flex items-center gap-2">
                    <div className={clsx(
                      'p-1.5 rounded-full',
                      tx.amount > 0
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-red-100 dark:bg-red-900/30'
                    )}>
                      {tx.amount > 0 ? (
                        <ArrowDownLeft className="w-3 h-3 text-green-600" />
                      ) : (
                        <ArrowUpRight className="w-3 h-3 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-900 dark:text-white">
                        {tx.description || tx.type}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className={clsx(
                    'text-sm font-semibold',
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

      {/* Phone Frame Collection Mode */}
      {showPhoneCollection && (
        <PhoneFrame>
          <AnimatePresence mode="wait">
            {/* Step 1: Mode Selection */}
            {collectionStep === 'mode' && (
              <motion.div
                key="mode"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full bg-gray-900 text-white flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                  <button
                    onClick={closePhoneCollection}
                    className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <p className="font-semibold">Collect Payment</p>
                  <div className="w-9" />
                </div>

                {/* Wallet Balance */}
                <div className="p-4">
                  <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Wallet className="w-5 h-5 text-white/80" />
                      <span className="text-white/80 text-sm">Driver Wallet</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      Le {driverWallet?.balance.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>

                {/* Fare Type Selection */}
                <div className="flex-1 p-4 flex flex-col justify-center">
                  <p className="text-gray-400 text-xs text-center mb-4">Select fare type</p>
                  <div className="space-y-3">
                    {/* Fixed Price */}
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setFareType('fixed');
                        setCollectionStep('keypad');
                      }}
                      className="w-full p-4 rounded-2xl bg-gray-800 hover:bg-gray-750 transition-colors flex items-center gap-3"
                    >
                      <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                        <Calculator className="w-6 h-6 text-green-400" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold">Fixed Price</h3>
                        <p className="text-xs text-gray-400">Set amount before trip</p>
                      </div>
                    </motion.button>

                    {/* Put & Take / Metered */}
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setFareType('meter');
                        setCollectionStep('keypad');
                      }}
                      className="w-full p-4 rounded-2xl bg-gray-800 hover:bg-gray-750 transition-colors flex items-center gap-3"
                    >
                      <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                        <Gauge className="w-6 h-6 text-blue-400" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold">Put & Take</h3>
                        <p className="text-xs text-gray-400">Enter amount after trip</p>
                      </div>
                    </motion.button>
                  </div>
                </div>

                {/* Recent earnings */}
                <div className="p-4 border-t border-gray-800">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Today's Earnings</span>
                    <span className="text-green-400 font-semibold">Le {earnings.today.toLocaleString()}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Keypad for Amount Entry */}
            {collectionStep === 'keypad' && (
              <motion.div
                key="keypad"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className={clsx(
                  'h-full flex flex-col',
                  isDarkTheme ? 'bg-black text-white' : 'bg-white text-gray-900'
                )}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-3 pt-3">
                  <button
                    onClick={() => {
                      setCollectionStep('mode');
                      setCollectionAmount('');
                    }}
                    className={clsx('p-2 rounded-full transition-colors', isDarkTheme ? 'hover:bg-gray-800' : 'hover:bg-gray-100')}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <p className={clsx('text-xs', isDarkTheme ? 'text-gray-500' : 'text-gray-400')}>
                    {fareType === 'fixed' ? 'Fixed Price' : 'Put & Take'}
                  </p>
                  <button
                    onClick={() => setIsDarkTheme(!isDarkTheme)}
                    className={clsx('p-2 rounded-full transition-colors', isDarkTheme ? 'hover:bg-gray-800 text-yellow-400' : 'hover:bg-gray-100')}
                  >
                    {isDarkTheme ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </button>
                </div>

                {/* Amount Display - BIG with neon glow */}
                <div className="flex-1 flex flex-col items-center justify-center">
                  <motion.span
                    key={collectionAmount}
                    initial={{ scale: 1.05 }}
                    animate={{ scale: 1 }}
                    className={clsx('text-7xl font-bold tabular-nums', isDarkTheme && 'text-cyan-400')}
                    style={isDarkTheme ? {
                      textShadow: '0 0 20px rgba(34, 211, 238, 0.5), 0 0 40px rgba(34, 211, 238, 0.3)'
                    } : {}}
                  >
                    {collectionAmount || '0'}
                  </motion.span>
                  <p className={clsx('text-sm mt-2', isDarkTheme ? 'text-gray-500' : 'text-gray-400')}>
                    Leone (SLE)
                  </p>
                </div>

                {/* Numeric Keypad */}
                <div className="px-3 pb-3">
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <motion.button
                        key={num}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleKeyPress(num.toString())}
                        className={clsx(
                          'h-14 rounded-2xl text-2xl font-semibold flex items-center justify-center transition-colors',
                          isDarkTheme ? 'bg-gray-900 active:bg-gray-800' : 'bg-gray-100 active:bg-gray-200'
                        )}
                      >
                        {num}
                      </motion.button>
                    ))}
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleKeyPress('clear')}
                      className={clsx(
                        'h-14 rounded-2xl text-sm font-medium flex items-center justify-center',
                        isDarkTheme ? 'bg-gray-900 text-gray-500' : 'bg-gray-100 text-gray-500'
                      )}
                    >
                      Clear
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleKeyPress('0')}
                      className={clsx(
                        'h-14 rounded-2xl text-2xl font-semibold flex items-center justify-center',
                        isDarkTheme ? 'bg-gray-900 active:bg-gray-800' : 'bg-gray-100 active:bg-gray-200'
                      )}
                    >
                      0
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleKeyPress('backspace')}
                      className={clsx(
                        'h-14 rounded-2xl flex items-center justify-center',
                        isDarkTheme ? 'bg-gray-900 active:bg-gray-800' : 'bg-gray-100 active:bg-gray-200'
                      )}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414a2 2 0 011.414-.586H19a2 2 0 012 2v10a2 2 0 01-2 2h-8.172a2 2 0 01-1.414-.586L3 12z" />
                      </svg>
                    </motion.button>
                  </div>

                  {/* Pay Button */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={startCollection}
                    disabled={!collectionAmount || isCollecting || parseFloat(collectionAmount) <= 0}
                    className={clsx(
                      'w-full mt-3 py-4 rounded-2xl text-xl font-bold transition-all flex items-center justify-center gap-2',
                      collectionAmount && parseFloat(collectionAmount) > 0 && !isCollecting
                        ? isDarkTheme
                          ? 'bg-cyan-500 text-black'
                          : 'bg-primary-500 text-white'
                        : isDarkTheme
                          ? 'bg-gray-900 text-gray-600 cursor-not-allowed'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    )}
                    style={collectionAmount && parseFloat(collectionAmount) > 0 && !isCollecting && isDarkTheme ? {
                      boxShadow: '0 0 20px rgba(34, 211, 238, 0.4), 0 0 40px rgba(34, 211, 238, 0.2)'
                    } : {}}
                  >
                    {isCollecting ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <span>Collect Le {collectionAmount || '0'}</span>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Collection View (QR/NFC/Mobile) */}
            {collectionStep === 'collecting' && collectionSession && (
              <motion.div
                key="collecting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                <DriverCollectionView
                  amount={collectionSession.amount}
                  sessionId={collectionSession.sessionId}
                  paymentUrl={collectionSession.paymentUrl}
                  driverId={user?.id || ''}
                  onPaymentComplete={handlePaymentComplete}
                  onCancel={cancelCollection}
                />
              </motion.div>
            )}

            {/* Step 4: Success */}
            {collectionStep === 'success' && collectionSession && (
              <motion.div
                key="success"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full bg-gradient-to-b from-green-500 to-green-600 text-white flex flex-col items-center justify-center p-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8"
                >
                  <CheckCircle className="w-16 h-16 text-green-500" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-center"
                >
                  <h2 className="text-3xl font-bold mb-2">Payment Received!</h2>
                  <p className="text-5xl font-bold mb-4">
                    Le {collectionSession.amount.toLocaleString()}
                  </p>
                  <p className="text-green-100 mb-8">
                    Added to your Driver Wallet
                  </p>
                </motion.div>

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  onClick={() => {
                    resetCollectionFlow();
                    // Stay in phone frame for another collection
                  }}
                  className="w-full max-w-xs py-4 bg-white text-green-600 rounded-2xl font-semibold text-lg"
                >
                  <DollarSign className="w-5 h-5 inline mr-2" />
                  Collect Another
                </motion.button>

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  onClick={closePhoneCollection}
                  className="mt-4 text-white/80 text-sm"
                >
                  Back to Dashboard
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </PhoneFrame>
      )}
    </MerchantLayout>
  );
}

export default DriverWalletPage;
