/**
 * POS Wallet Component
 *
 * Displays POS wallet and primary wallet as beautiful cards similar to dashboard
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  X,
  Check,
  AlertCircle,
  Loader2,
  ArrowLeftRight,
  CreditCard,
  PiggyBank,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { walletService, ExtendedWallet, WalletType } from '@/services/wallet.service';
import { formatCurrency } from '@/lib/currency';

interface POSWalletProps {
  onBalanceChange?: (balance: number) => void;
  compact?: boolean;
}

export function POSWallet({ onBalanceChange, compact = false }: POSWalletProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [posWallet, setPosWallet] = useState<ExtendedWallet | null>(null);
  const [primaryWallet, setPrimaryWallet] = useState<ExtendedWallet | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferDirection, setTransferDirection] = useState<'to-pos' | 'from-pos'>('to-pos');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadWallets();
    }
  }, [user?.id]);

  const loadWallets = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Get or create POS wallet
      const pos = await walletService.getOrCreateWalletByType(user.id, 'pos', 'POS Wallet');
      setPosWallet(pos);
      onBalanceChange?.(pos.balance);

      // Get primary wallet
      const primary = await walletService.getWalletByType(user.id, 'primary');
      setPrimaryWallet(primary);
    } catch (error) {
      console.error('Error loading wallets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWallets();
    setRefreshing(false);
  };

  const handleTransfer = async () => {
    if (!posWallet || !primaryWallet || !transferAmount) return;

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' });
      return;
    }

    const fromWallet = transferDirection === 'to-pos' ? primaryWallet : posWallet;
    const toWallet = transferDirection === 'to-pos' ? posWallet : primaryWallet;

    if (amount > fromWallet.balance) {
      setMessage({ type: 'error', text: 'Insufficient balance' });
      return;
    }

    setTransferring(true);
    setMessage(null);

    try {
      await walletService.transferBetweenOwnWallets(
        fromWallet.id,
        toWallet.id,
        amount,
        transferDirection === 'to-pos' ? 'Transfer to POS Wallet' : 'Transfer from POS Wallet'
      );

      setMessage({ type: 'success', text: `Successfully transferred ${formatCurrency(amount, 'SLE')}` });
      setTransferAmount('');
      await loadWallets();

      setTimeout(() => {
        setShowTransferModal(false);
        setMessage(null);
      }, 1500);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Transfer failed' });
    } finally {
      setTransferring(false);
    }
  };

  const openTransfer = (direction: 'to-pos' | 'from-pos') => {
    setTransferDirection(direction);
    setTransferAmount('');
    setMessage(null);
    setShowTransferModal(true);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Wallet Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* POS Wallet Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 p-6 text-white shadow-xl shadow-green-500/25">
          {/* Background Pattern */}
          <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <defs>
                <pattern id="pos-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <circle cx="20" cy="20" r="2" fill="currentColor" />
                </pattern>
              </defs>
              <rect x="0" y="0" width="200" height="200" fill="url(#pos-pattern)" />
            </svg>
          </div>

          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-20 -left-10 w-60 h-60 bg-white/5 rounded-full blur-3xl" />

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-green-100 text-sm font-medium">POS Wallet</p>
                  <p className="text-xs text-green-200/70">Sales & Float</p>
                </div>
              </div>
              <button
                onClick={handleRefresh}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Balance */}
            <div className="mb-6">
              <p className="text-3xl font-bold tracking-tight">
                {formatCurrency(posWallet?.balance || 0, 'SLE')}
              </p>
              <p className="text-green-100/80 text-sm mt-1">Available Balance</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => openTransfer('to-pos')}
                disabled={!primaryWallet || primaryWallet.balance <= 0}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowDownLeft className="w-4 h-4" />
                Add Funds
              </button>
              <button
                onClick={() => openTransfer('from-pos')}
                disabled={!posWallet || posWallet.balance <= 0}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white text-green-600 hover:bg-green-50 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowUpRight className="w-4 h-4" />
                Withdraw
              </button>
            </div>
          </div>
        </div>

        {/* Primary Wallet Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 p-6 text-white shadow-xl shadow-blue-500/25">
          {/* Background Pattern */}
          <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <defs>
                <pattern id="primary-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <rect x="18" y="18" width="4" height="4" fill="currentColor" transform="rotate(45 20 20)" />
                </pattern>
              </defs>
              <rect x="0" y="0" width="200" height="200" fill="url(#primary-pattern)" />
            </svg>
          </div>

          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-20 -left-10 w-60 h-60 bg-white/5 rounded-full blur-3xl" />

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-blue-100 text-sm font-medium">Main Wallet</p>
                  <p className="text-xs text-blue-200/70">Primary Account</p>
                </div>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded-full text-xs">
                <Sparkles className="w-3 h-3" />
                Primary
              </div>
            </div>

            {/* Balance */}
            <div className="mb-6">
              <p className="text-3xl font-bold tracking-tight">
                {formatCurrency(primaryWallet?.balance || 0, 'SLE')}
              </p>
              <p className="text-blue-100/80 text-sm mt-1">Available Balance</p>
            </div>

            {/* Transfer hint */}
            <div className="flex items-center justify-between py-2.5 px-4 bg-white/10 backdrop-blur-sm rounded-xl">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-blue-200" />
                <span className="text-sm text-blue-100">Transfer to POS</span>
              </div>
              <button
                onClick={() => openTransfer('to-pos')}
                disabled={!primaryWallet || primaryWallet.balance <= 0}
                className="text-sm font-medium text-white hover:text-blue-200 transition-colors disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transfer Modal */}
      <AnimatePresence>
        {showTransferModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowTransferModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    transferDirection === 'to-pos'
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-blue-100 dark:bg-blue-900/30'
                  }`}>
                    <ArrowLeftRight className={`w-5 h-5 ${
                      transferDirection === 'to-pos'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {transferDirection === 'to-pos' ? 'Add to POS Wallet' : 'Withdraw to Main'}
                    </h3>
                    <p className="text-sm text-gray-500">Move funds between wallets</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTransferModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Transfer Direction Visual */}
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-6">
                <div className="text-center">
                  <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${
                    transferDirection === 'to-pos'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                      : 'bg-green-100 dark:bg-green-900/30 text-green-600'
                  }`}>
                    {transferDirection === 'to-pos' ? (
                      <Wallet className="w-6 h-6" />
                    ) : (
                      <CreditCard className="w-6 h-6" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">From</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {transferDirection === 'to-pos' ? 'Main' : 'POS'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(
                      transferDirection === 'to-pos' ? primaryWallet?.balance || 0 : posWallet?.balance || 0,
                      'SLE'
                    )}
                  </p>
                </div>

                <div className="flex-shrink-0 px-4">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                    <ArrowLeftRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                <div className="text-center">
                  <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${
                    transferDirection === 'to-pos'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                  }`}>
                    {transferDirection === 'to-pos' ? (
                      <CreditCard className="w-6 h-6" />
                    ) : (
                      <Wallet className="w-6 h-6" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">To</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {transferDirection === 'to-pos' ? 'POS' : 'Main'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(
                      transferDirection === 'to-pos' ? posWallet?.balance || 0 : primaryWallet?.balance || 0,
                      'SLE'
                    )}
                  </p>
                </div>
              </div>

              {/* Amount Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    NLe
                  </span>
                  <input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-14 pr-4 py-4 text-2xl font-bold border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 text-right"
                  />
                </div>
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2 mb-6">
                {[100, 500, 1000, 5000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setTransferAmount(amt.toString())}
                    className="py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    {amt.toLocaleString()}
                  </button>
                ))}
              </div>

              {/* Message */}
              {message && (
                <div className={`p-3 rounded-lg mb-4 flex items-center gap-2 ${
                  message.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                }`}>
                  {message.type === 'success' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span className="text-sm">{message.text}</span>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransfer}
                  disabled={transferring || !transferAmount || parseFloat(transferAmount) <= 0}
                  className={`flex-1 py-3 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 ${
                    transferDirection === 'to-pos'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {transferring ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ArrowLeftRight className="w-4 h-4" />
                      Transfer
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default POSWallet;
