/**
 * Float Management Modal
 *
 * Modal for managing system float operations:
 * - Opening new float with opening balance
 * - Replenishing existing float
 * - Closing float for the financial cycle
 * - Viewing float history
 *
 * Only accessible by superadmin users.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  ArrowDownRight,
  Lock,
  History,
  AlertCircle,
  CheckCircle,
  Loader2,
  Calendar,
  FileText,
  TrendingUp,
  TrendingDown,
  Clock,
} from 'lucide-react';
import { systemFloatService, FloatHistory } from '@/services/systemFloat.service';
import { currencyService, Currency } from '@/services/currency.service';
import { useAuth } from '@/context/AuthContext';

type ModalMode = 'open' | 'replenish' | 'close' | 'history';

interface FloatManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ModalMode;
  currency?: string;
  onSuccess?: () => void;
}

export function FloatManagementModal({
  isOpen,
  onClose,
  mode,
  currency,
  onSuccess,
}: FloatManagementModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [history, setHistory] = useState<FloatHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form state
  const [selectedCurrency, setSelectedCurrency] = useState(currency || '');
  const [amount, setAmount] = useState('');
  const [financialYear, setFinancialYear] = useState(new Date().getFullYear().toString());
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadCurrencies();
      setError(null);
      setSuccess(false);
      setSelectedCurrency(currency || '');

      if (mode === 'history' && currency) {
        loadHistory(currency);
      }
    }
  }, [isOpen, currency, mode]);

  const loadCurrencies = async () => {
    const list = await currencyService.getCurrencies();
    setCurrencies(list.filter(c => c.isActive));
    if (!selectedCurrency && list.length > 0) {
      setSelectedCurrency(list[0].code);
    }
  };

  const loadHistory = async (curr: string) => {
    setHistoryLoading(true);
    try {
      const historyData = await systemFloatService.getHistoryByCurrency(curr, 50);
      setHistory(historyData);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      switch (mode) {
        case 'open':
          if (!amount || parseFloat(amount) <= 0) {
            throw new Error('Please enter a valid opening balance');
          }
          await systemFloatService.openFloat(
            {
              currency: selectedCurrency,
              openingBalance: parseFloat(amount),
              financialYear,
              description: description || `Opening balance for ${financialYear}`,
            },
            user.id
          );
          break;

        case 'replenish':
          if (!amount || parseFloat(amount) <= 0) {
            throw new Error('Please enter a valid amount');
          }
          await systemFloatService.replenishFloat(
            {
              currency: selectedCurrency || currency!,
              amount: parseFloat(amount),
              description: description || 'Capital injection',
            },
            user.id
          );
          break;

        case 'close':
          await systemFloatService.closeFloat(
            {
              currency: selectedCurrency || currency!,
              description: description || 'End of financial cycle',
            },
            user.id
          );
          break;
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getCurrencySymbol = (code: string): string => {
    if (!code) return 'Le'; // Default to Leone
    const curr = currencies.find(c => c.code === code);
    if (curr?.symbol) return curr.symbol;
    // Fallback symbols
    if (code === 'SLE') return 'Le';
    if (code === 'USD') return '$';
    return code;
  };

  const formatAmount = (amt: number, curr: string): string => {
    return `${getCurrencySymbol(curr)} ${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getHistoryTypeIcon = (type: string) => {
    switch (type) {
      case 'opening':
        return <Plus className="w-4 h-4 text-blue-500" />;
      case 'replenishment':
        return <ArrowDownRight className="w-4 h-4 text-green-500" />;
      case 'closing':
        return <Lock className="w-4 h-4 text-gray-500" />;
      case 'debit':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'credit':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getHistoryTypeLabel = (type: string): string => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getHistoryTypeColor = (type: string): string => {
    switch (type) {
      case 'opening':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'replenishment':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'closing':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
      case 'debit':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'credit':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getModalTitle = (): string => {
    switch (mode) {
      case 'open':
        return 'Open New Float';
      case 'replenish':
        return 'Replenish Float';
      case 'close':
        return 'Close Float';
      case 'history':
        return 'Float History';
      default:
        return 'Float Management';
    }
  };

  const getModalDescription = (): string => {
    switch (mode) {
      case 'open':
        return 'Start a new financial cycle by setting an opening balance for the system float.';
      case 'replenish':
        return 'Inject additional capital into the active float to increase available funds.';
      case 'close':
        return 'Close the current financial cycle. This will lock the float and prevent further spending.';
      case 'history':
        return 'View all float operations and transactions for this currency.';
      default:
        return '';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full ${
              mode === 'history' ? 'max-w-2xl' : 'max-w-md'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {getModalTitle()}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {getModalDescription()}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {success ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Success!
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {mode === 'open' && 'New float has been opened successfully.'}
                    {mode === 'replenish' && 'Float has been replenished successfully.'}
                    {mode === 'close' && 'Float has been closed successfully.'}
                  </p>
                </div>
              ) : mode === 'history' ? (
                <div className="space-y-4">
                  {/* Currency selector for history */}
                  <div className="flex items-center gap-4 mb-4">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Currency:
                    </label>
                    <select
                      value={selectedCurrency}
                      onChange={(e) => {
                        setSelectedCurrency(e.target.value);
                        loadHistory(e.target.value);
                      }}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      {currencies.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} - {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* History List */}
                  {historyLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : history.length === 0 ? (
                    <div className="text-center py-8">
                      <History className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">No history found</p>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {history.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                        >
                          <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                            {getHistoryTypeIcon(item.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getHistoryTypeColor(item.type)}`}>
                                {getHistoryTypeLabel(item.type)}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(item.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {item.description || item.reference}
                            </p>
                            <div className="flex items-center gap-4 mt-1 text-xs">
                              <span className="text-gray-500 dark:text-gray-400">
                                Amount: <span className={`font-medium ${item.type === 'debit' ? 'text-red-600' : 'text-green-600'}`}>
                                  {item.type === 'debit' ? '-' : '+'}{formatAmount(item.amount, item.currency)}
                                </span>
                              </span>
                              <span className="text-gray-400">|</span>
                              <span className="text-gray-500 dark:text-gray-400">
                                Balance: {formatAmount(item.previousBalance, item.currency)} → {formatAmount(item.newBalance, item.currency)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  {/* Currency Selection (for open mode) */}
                  {mode === 'open' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Currency
                      </label>
                      <select
                        value={selectedCurrency}
                        onChange={(e) => setSelectedCurrency(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Select currency</option>
                        {currencies.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.symbol} - {c.name} ({c.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Display current currency for replenish/close */}
                  {(mode === 'replenish' || mode === 'close') && currency && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Currency: </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {getCurrencySymbol(currency)} ({currency})
                      </span>
                    </div>
                  )}

                  {/* Amount (for open and replenish) */}
                  {(mode === 'open' || mode === 'replenish') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {mode === 'open' ? 'Opening Balance' : 'Amount to Add'}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 dark:text-gray-400 font-medium text-sm">
                            {getCurrencySymbol(selectedCurrency || currency || 'SLE')}
                          </span>
                        </div>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          required
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}

                  {/* Financial Year (for open mode) */}
                  {mode === 'open' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Financial Year
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Calendar className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={financialYear}
                          onChange={(e) => setFinancialYear(e.target.value)}
                          placeholder="2024"
                          required
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description {mode !== 'close' && '(Optional)'}
                    </label>
                    <div className="relative">
                      <div className="absolute top-3 left-3 pointer-events-none">
                        <FileText className="w-5 h-5 text-gray-400" />
                      </div>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={
                          mode === 'open'
                            ? 'Opening balance for new financial cycle...'
                            : mode === 'replenish'
                            ? 'Reason for capital injection...'
                            : 'Reason for closing the float...'
                        }
                        rows={3}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>

                  {/* Warning for close mode */}
                  {mode === 'close' && (
                    <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-800 dark:text-yellow-300 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Warning</p>
                        <p className="text-yellow-700 dark:text-yellow-400">
                          Closing the float will lock this financial cycle and prevent any further transactions until a new float is opened.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      mode === 'close'
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-primary-600 hover:bg-primary-700 text-white'
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {mode === 'open' && <Plus className="w-5 h-5" />}
                        {mode === 'replenish' && <ArrowDownRight className="w-5 h-5" />}
                        {mode === 'close' && <Lock className="w-5 h-5" />}
                        {mode === 'open' && 'Open Float'}
                        {mode === 'replenish' && 'Replenish Float'}
                        {mode === 'close' && 'Close Float'}
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Footer for history mode */}
            {mode === 'history' && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
