/**
 * POS Wallet Component
 *
 * Displays POS wallet balance and allows transfers to/from primary wallet
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  AlertCircle,
  Loader2,
  Banknote,
  ArrowLeftRight,
  CreditCard,
  PiggyBank,
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
  const [allWallets, setAllWallets] = useState<ExtendedWallet[]>([]);
  const [expanded, setExpanded] = useState(!compact);
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

      // Get all wallets for display - only show POS-relevant wallets (pos and primary)
      const wallets = await walletService.getWallets(user.id);
      setAllWallets((wallets as ExtendedWallet[]).filter(w =>
        w.walletType === 'pos' || w.walletType === 'primary'
      ));
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

  const getWalletIcon = (type: WalletType) => {
    switch (type) {
      case 'pos':
        return <CreditCard className="w-4 h-4" />;
      case 'driver':
        return <Banknote className="w-4 h-4" />;
      case 'merchant':
        return <Wallet className="w-4 h-4" />;
      default:
        return <PiggyBank className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 ${compact ? '' : 'p-6'}`}>
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2" />
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header - Always visible */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm text-gray-500 dark:text-gray-400">POS Wallet</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(posWallet?.balance || 0, 'SLE')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRefresh();
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </button>

        {/* Expanded Content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="px-4 pb-4 space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                {/* All Wallets */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Your Wallets</p>
                  <div className="space-y-2">
                    {allWallets.map((wallet) => (
                      <div
                        key={wallet.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          wallet.walletType === 'pos'
                            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                            : 'bg-gray-50 dark:bg-gray-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            wallet.walletType === 'pos'
                              ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
                              : wallet.walletType === 'primary'
                              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                              : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                          }`}>
                            {getWalletIcon(wallet.walletType)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                              {wallet.name || `${wallet.walletType} Wallet`}
                            </p>
                            <p className="text-xs text-gray-500">{wallet.currency}</p>
                          </div>
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(wallet.balance, 'SLE')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Transfer Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setTransferDirection('to-pos');
                      setShowTransferModal(true);
                    }}
                    disabled={!primaryWallet || primaryWallet.balance <= 0}
                    className="flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">Add to POS</span>
                  </button>
                  <button
                    onClick={() => {
                      setTransferDirection('from-pos');
                      setShowTransferModal(true);
                    }}
                    disabled={!posWallet || posWallet.balance <= 0}
                    className="flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span className="text-sm font-medium">To Main</span>
                  </button>
                </div>

                {/* Info text */}
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Transfer funds between your wallets to manage your POS float
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <ArrowLeftRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {transferDirection === 'to-pos' ? 'Add to POS Wallet' : 'Transfer to Main Wallet'}
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
                      <PiggyBank className="w-6 h-6" />
                    ) : (
                      <CreditCard className="w-6 h-6" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">From</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {transferDirection === 'to-pos' ? 'Main Wallet' : 'POS Wallet'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(
                      transferDirection === 'to-pos' ? primaryWallet?.balance || 0 : posWallet?.balance || 0,
                      'SLE'
                    )}
                  </p>
                </div>

                <div className="flex-shrink-0">
                  <ArrowLeftRight className="w-6 h-6 text-gray-400" />
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
                      <PiggyBank className="w-6 h-6" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">To</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {transferDirection === 'to-pos' ? 'POS Wallet' : 'Main Wallet'}
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
                <p className="text-xs text-gray-500 mt-2">
                  Available: {formatCurrency(
                    transferDirection === 'to-pos' ? primaryWallet?.balance || 0 : posWallet?.balance || 0,
                    'SLE'
                  )}
                </p>
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2 mb-6">
                {[100, 500, 1000, 5000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setTransferAmount(amt.toString())}
                    className="py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    {amt}
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
                  className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {transferring ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Transferring...
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
