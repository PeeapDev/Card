/**
 * Send to Mobile Money Modal Component
 *
 * Allows users to send money from their Peeap wallet to
 * Orange Money or Africell mobile money numbers
 */

import { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Wallet,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { useWallets } from '@/hooks/useWallets';
import { useAuth } from '@/context/AuthContext';
import { currencyService, Currency } from '@/services/currency.service';

interface SendToMobileMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = 'form' | 'confirm' | 'processing' | 'success' | 'error';

const API_BASE = import.meta.env.VITE_API_URL || 'https://peeap.vercel.app/api';

// Known provider mappings
const PROVIDER_DISPLAY: Record<string, { name: string; color: string; icon: string; bgColor: string }> = {
  'm17': { name: 'Orange Money', color: 'text-orange-600', icon: 'OM', bgColor: 'bg-orange-100' },
  'm18': { name: 'Africell Money', color: 'text-blue-600', icon: 'AF', bgColor: 'bg-blue-100' },
};

// Phone number prefixes for provider detection (Sierra Leone)
// Orange: 72-76, 78-79
// Africell: 30, 33, 77, 80, 88, 90, 99
const ORANGE_PREFIXES = ['72', '73', '74', '75', '76', '78', '79'];
const AFRICELL_PREFIXES = ['30', '33', '77', '80', '88', '90', '99'];

// Auto-detect provider from phone number
function detectProvider(phone: string): string | null {
  const normalized = phone.replace(/\s+/g, '').replace(/^(\+232|232|0)/, '');
  if (normalized.length < 2) return null;

  const prefix = normalized.substring(0, 2);

  if (ORANGE_PREFIXES.includes(prefix)) {
    return 'm17'; // Orange Money
  }
  if (AFRICELL_PREFIXES.includes(prefix)) {
    return 'm18'; // Africell Money
  }
  return null;
}

export function SendToMobileMoneyModal({ isOpen, onClose, onSuccess }: SendToMobileMoneyModalProps) {
  const { user } = useAuth();
  const { data: wallets, isLoading: walletsLoading, refetch: refetchWallets } = useWallets();

  const [step, setStep] = useState<Step>('form');

  // Form state
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [detectedProviderId, setDetectedProviderId] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  // Fee calculation
  const [fee, setFee] = useState(0);
  const [totalDeduction, setTotalDeduction] = useState(0);

  // Result state
  const [error, setError] = useState('');
  const [transactionId, setTransactionId] = useState<string | null>(null);

  // Currency state
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  useEffect(() => {
    currencyService.getCurrencies().then(setCurrencies);
  }, []);

  // Auto-detect provider when phone number changes
  useEffect(() => {
    const detected = detectProvider(phoneNumber);
    setDetectedProviderId(detected);
  }, [phoneNumber]);

  // Set default wallet when wallets load - prioritize SLE wallet for mobile money
  useEffect(() => {
    if (wallets && wallets.length > 0 && !selectedWalletId) {
      // Prioritize: 1) Active SLE wallet, 2) Any active wallet, 3) First wallet
      const sleWallet = wallets.find(w => w.status === 'ACTIVE' && w.currency === 'SLE');
      const activeWallet = wallets.find(w => w.status === 'ACTIVE');
      const defaultWallet = sleWallet || activeWallet || wallets[0];
      setSelectedWalletId(defaultWallet.id);
    }
  }, [wallets, selectedWalletId]);

  // Calculate fee when amount changes
  useEffect(() => {
    const amountNum = parseFloat(amount) || 0;
    if (amountNum > 0) {
      // 2% fee only - new Leone (Le) after redenomination
      let calculatedFee = Math.round(amountNum * 0.02 * 100) / 100;
      setFee(calculatedFee);
      setTotalDeduction(amountNum + calculatedFee);
    } else {
      setFee(0);
      setTotalDeduction(0);
    }
  }, [amount]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('form');
        setPhoneNumber('');
        setAmount('');
        setDescription('');
        setError('');
        setTransactionId(null);
        setDetectedProviderId(null);
      }, 300);
    }
  }, [isOpen]);

  const getCurrencySymbol = (code: string): string => {
    // SLE is the new Sierra Leone Leone after redenomination - symbol is "Le"
    if (code === 'SLE') return 'Le';
    return currencies.find(c => c.code === code)?.symbol || code;
  };

  const formatCurrency = (amt: number, currencyCode: string): string => {
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol} ${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const validatePhoneNumber = (phone: string): boolean => {
    // Remove spaces and country code if present
    const normalized = phone.replace(/\s+/g, '').replace(/^(\+232|232)/, '');
    // Should be 8 digits
    return /^[0-9]{8}$/.test(normalized);
  };

  const handleProceedToConfirm = () => {
    setError('');

    if (!selectedWalletId) {
      setError('Please select a wallet');
      return;
    }

    if (!phoneNumber || !validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number (8 digits)');
      return;
    }

    if (!detectedProviderId) {
      setError('Unable to detect network. Please enter a valid Orange or Africell number.');
      return;
    }

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const selectedWallet = wallets?.find(w => w.id === selectedWalletId);
    if (!selectedWallet || selectedWallet.balance < totalDeduction) {
      setError(`Insufficient balance. You need ${formatCurrency(totalDeduction, 'SLE')} (including fee)`);
      return;
    }

    setStep('confirm');
  };

  const handleSend = async () => {
    if (!user || !detectedProviderId) return;

    setStep('processing');
    setError('');

    try {
      const response = await fetch(`${API_BASE}/router/mobile-money/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          currency: 'SLE',
          phoneNumber,
          providerId: detectedProviderId,
          userId: user.id,
          walletId: selectedWalletId,
          description: description || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send money');
      }

      setTransactionId(data.transactionId);
      setStep('success');

      // Refresh wallets to show updated balance
      refetchWallets();

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Send to mobile money error:', err);
      setError(err.message || 'Failed to send money. Please try again.');
      setStep('error');
    }
  };

  const handleRetry = () => {
    setStep('form');
    setError('');
  };

  if (!isOpen) return null;

  const selectedWallet = wallets?.find(w => w.id === selectedWalletId);
  const providerDisplay = detectedProviderId
    ? PROVIDER_DISPLAY[detectedProviderId]
    : { name: 'Mobile Money', color: 'text-gray-600', icon: '?', bgColor: 'bg-gray-100' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Smartphone className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Send to Mobile Money</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {step === 'form' && 'Enter recipient details'}
                {step === 'confirm' && 'Confirm transfer details'}
                {step === 'processing' && 'Processing transfer...'}
                {step === 'success' && 'Transfer successful!'}
                {step === 'error' && 'Transfer failed'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Form Step */}
        {step === 'form' && (
          <div className="space-y-4">
            {/* Phone Number with Auto-Detection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Recipient Phone Number
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  +232
                </span>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="76123456"
                  className="w-full pl-14 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              {/* Detected Provider Badge */}
              {phoneNumber.length >= 2 && (
                <div className="mt-2">
                  {detectedProviderId ? (
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${providerDisplay.bgColor}`}>
                      <span className={`font-bold text-sm ${providerDisplay.color}`}>{providerDisplay.icon}</span>
                      <span className={`font-medium text-sm ${providerDisplay.color}`}>{providerDisplay.name}</span>
                      <span className="text-xs text-gray-500">detected</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-600 dark:text-red-400">Unknown network</span>
                    </div>
                  )}
                </div>
              )}

              <p className="mt-1 text-xs text-gray-500">
                Orange: 72-76, 78-79 | Africell: 30, 33, 77, 80, 88, 90, 99
              </p>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  Le
                </span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="10"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              {totalDeduction > 0 && (
                <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Amount:</span>
                    <span>{formatCurrency(parseFloat(amount) || 0, 'SLE')}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Fee (2%):</span>
                    <span>{formatCurrency(fee, 'SLE')}</span>
                  </div>
                  <div className="flex justify-between font-medium text-gray-900 dark:text-white pt-1 border-t border-gray-200 dark:border-gray-700 mt-1">
                    <span>Total:</span>
                    <span>{formatCurrency(totalDeduction, 'SLE')}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Wallet Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pay from
              </label>
              {walletsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                </div>
              ) : wallets && wallets.length > 0 ? (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {wallets.map((wallet) => (
                    <button
                      key={wallet.id}
                      type="button"
                      onClick={() => setSelectedWalletId(wallet.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                        selectedWalletId === wallet.id
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Wallet className={`w-5 h-5 ${selectedWalletId === wallet.id ? 'text-primary-600' : 'text-gray-500'}`} />
                      <div className="flex-1 text-left">
                        <p className={`font-medium ${selectedWalletId === wallet.id ? 'text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-white'}`}>
                          {wallet.currency} Wallet
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(wallet.balance, wallet.currency)}
                        </p>
                      </div>
                      {selectedWalletId === wallet.id && (
                        <CheckCircle className="w-5 h-5 text-primary-600" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No wallets available</p>
              )}
            </div>

            {/* Description (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this for?"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Info */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-2 text-blue-700 dark:text-blue-400">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="text-sm">
                Transfers are typically completed within minutes. A 2% fee applies.
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleProceedToConfirm}
                disabled={!amount || !phoneNumber || !detectedProviderId}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Confirm Step */}
        {step === 'confirm' && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Sending to</span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${providerDisplay.color}`}>{providerDisplay.icon}</span>
                  <span className="font-medium">{providerDisplay.name}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Phone Number</span>
                <span className="font-medium">+232 {phoneNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Amount</span>
                <span className="font-medium">{formatCurrency(parseFloat(amount), 'SLE')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Fee</span>
                <span className="font-medium">{formatCurrency(fee, 'SLE')}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Deduction</span>
                <span className="font-bold text-lg text-primary-600">{formatCurrency(totalDeduction, 'SLE')}</span>
              </div>
            </div>

            {/* Wallet Balance */}
            {selectedWallet && (
              <div className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">Wallet Balance</span>
                <span className="font-medium">{formatCurrency(selectedWallet.balance, selectedWallet.currency)}</span>
              </div>
            )}

            {/* Warning */}
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Please verify the phone number is correct. Transfers cannot be reversed once sent.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('form')}>
                Back
              </Button>
              <Button className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={handleSend}>
                Send {formatCurrency(parseFloat(amount), 'SLE')}
              </Button>
            </div>
          </div>
        )}

        {/* Processing Step */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-orange-600 animate-spin mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Processing your transfer...</p>
            <p className="text-sm text-gray-500 mt-2">Please wait, do not close this window.</p>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Transfer Successful!</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-2">
              {formatCurrency(parseFloat(amount), 'SLE')} sent to {providerDisplay.name}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              +232 {phoneNumber}
            </p>
            {transactionId && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
                Transaction ID: {transactionId.slice(0, 8)}...
              </p>
            )}
            <Button onClick={onClose} className="w-full">
              Done
            </Button>
          </div>
        )}

        {/* Error Step */}
        {step === 'error' && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Transfer Failed</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
              {error || 'Something went wrong. Please try again.'}
            </p>
            <div className="flex gap-3 w-full">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleRetry}>
                Try Again
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
