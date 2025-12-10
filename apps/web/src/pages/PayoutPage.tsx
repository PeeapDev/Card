/**
 * Mobile Money Payout Page
 *
 * Full-page experience for sending money to mobile money numbers
 * Supports Orange Money and Africell Money in Sierra Leone
 */

import { useState, useEffect } from 'react';
import {
  Smartphone,
  Wallet,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Info,
  Clock,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MainLayout } from '@/components/layout/MainLayout';
import { useWallets } from '@/hooks/useWallets';
import { useAuth } from '@/context/AuthContext';
import { currencyService, Currency } from '@/services/currency.service';

interface MobileMoneyProvider {
  providerId: string;
  name: string;
  country: string;
  canPayout: boolean;
}

type Step = 'form' | 'confirm' | 'processing' | 'success' | 'error';

const API_BASE = import.meta.env.VITE_API_URL || 'https://peeap.vercel.app/api';

// Known provider mappings
const PROVIDER_DISPLAY: Record<string, { name: string; color: string; icon: string; bgColor: string }> = {
  'm17': { name: 'Orange Money', color: 'text-orange-600', icon: '🍊', bgColor: 'bg-orange-100' },
  'm18': { name: 'Africell Money', color: 'text-purple-600', icon: '📱', bgColor: 'bg-purple-100' },
};

export function PayoutPage() {
  const { user } = useAuth();
  const { data: wallets, isLoading: walletsLoading, refetch: refetchWallets } = useWallets();

  const [step, setStep] = useState<Step>('form');
  const [providers, setProviders] = useState<MobileMoneyProvider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);

  // Form state
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
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

  // Recent payouts
  const [recentPayouts, setRecentPayouts] = useState<Array<{
    id: string;
    phone: string;
    amount: number;
    provider: string;
    date: string;
    status: string;
  }>>([]);

  useEffect(() => {
    currencyService.getCurrencies().then(setCurrencies);
    loadProviders();
  }, []);

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
      // 2% fee, min 500 SLE, max 5000 SLE
      let calculatedFee = Math.round(amountNum * 0.02);
      calculatedFee = Math.max(500, Math.min(5000, calculatedFee));
      setFee(calculatedFee);
      setTotalDeduction(amountNum + calculatedFee);
    } else {
      setFee(0);
      setTotalDeduction(0);
    }
  }, [amount]);

  const loadProviders = async () => {
    setProvidersLoading(true);
    try {
      const response = await fetch(`${API_BASE}/router/mobile-money/providers`);
      const data = await response.json();
      if (data.success && data.providers) {
        setProviders(data.providers);
        // Auto-select first provider if available
        if (data.providers.length > 0 && !selectedProviderId) {
          setSelectedProviderId(data.providers[0].providerId);
        }
      }
    } catch (err) {
      console.error('Failed to load providers:', err);
      // Fallback to known providers
      setProviders([
        { providerId: 'm17', name: 'Orange Money', country: 'SL', canPayout: true },
        { providerId: 'm18', name: 'Africell Money', country: 'SL', canPayout: true },
      ]);
      if (!selectedProviderId) {
        setSelectedProviderId('m17');
      }
    } finally {
      setProvidersLoading(false);
    }
  };

  const getCurrencySymbol = (code: string): string => {
    return currencies.find(c => c.code === code)?.symbol || code;
  };

  const formatCurrency = (amt: number, currencyCode: string): string => {
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol} ${amt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
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

    if (!selectedProviderId) {
      setError('Please select a mobile money provider');
      return;
    }

    if (!phoneNumber || !validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number (8 digits)');
      return;
    }

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amountNum < 1000) {
      setError('Minimum amount is SLE 1,000');
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
    if (!user) return;

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
          providerId: selectedProviderId,
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
    } catch (err: any) {
      console.error('Send to mobile money error:', err);
      setError(err.message || 'Failed to send money. Please try again.');
      setStep('error');
    }
  };

  const handleReset = () => {
    setStep('form');
    setPhoneNumber('');
    setAmount('');
    setDescription('');
    setError('');
    setTransactionId(null);
  };

  const selectedWallet = wallets?.find(w => w.id === selectedWalletId);
  const selectedProvider = providers.find(p => p.providerId === selectedProviderId);
  const providerDisplay = PROVIDER_DISPLAY[selectedProviderId] || { name: selectedProvider?.name || 'Mobile Money', color: 'text-gray-600', icon: '📱', bgColor: 'bg-gray-100' };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          {(step === 'confirm') && (
            <button
              onClick={() => setStep('form')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mobile Money Payout</h1>
            <p className="text-gray-500 dark:text-gray-400">Send money to Orange Money or Africell</p>
          </div>
        </div>

        {/* Balance Card */}
        {selectedWallet && (
          <Card className="p-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-100">Available Balance</p>
                <p className="text-3xl font-bold">
                  {formatCurrency(selectedWallet.balance, selectedWallet.currency)}
                </p>
                <p className="text-sm text-orange-200 mt-1">{selectedWallet.currency} Wallet</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <Wallet className="w-8 h-8" />
              </div>
            </div>
          </Card>
        )}

        {/* Form Step */}
        {step === 'form' && (
          <Card className="p-6 space-y-6">
            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Select Provider
              </label>
              {providersLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                  <span className="ml-2 text-sm text-gray-500">Loading providers...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {providers.map((provider) => {
                    const display = PROVIDER_DISPLAY[provider.providerId] || { name: provider.name, color: 'text-gray-600', icon: '📱', bgColor: 'bg-gray-100' };
                    const isSelected = selectedProviderId === provider.providerId;
                    return (
                      <button
                        key={provider.providerId}
                        type="button"
                        onClick={() => setSelectedProviderId(provider.providerId)}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-3xl">{display.icon}</span>
                        <span className={`font-medium ${isSelected ? display.color : 'text-gray-700 dark:text-gray-300'}`}>
                          {display.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recipient Phone Number
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                  +232
                </span>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="76123456"
                  className="w-full pl-16 pr-4 py-4 text-lg border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">Enter 8-digit phone number without country code</p>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                  SLE
                </span>
                <input
                  type="number"
                  min="1000"
                  step="100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="10,000"
                  className="w-full pl-14 pr-4 py-4 text-2xl font-bold border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              {/* Quick amount buttons */}
              <div className="flex gap-2 mt-3">
                {[5000, 10000, 25000, 50000].map((quickAmount) => (
                  <button
                    key={quickAmount}
                    onClick={() => setAmount(quickAmount.toString())}
                    disabled={selectedWallet && quickAmount + 500 > selectedWallet.balance}
                    className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 font-medium text-sm"
                  >
                    {(quickAmount / 1000).toFixed(0)}K
                  </button>
                ))}
              </div>

              {/* Fee breakdown */}
              {totalDeduction > 0 && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Amount</span>
                    <span className="text-gray-700 dark:text-gray-300">{formatCurrency(parseFloat(amount) || 0, 'SLE')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Fee (2%)</span>
                    <span className="text-gray-700 dark:text-gray-300">{formatCurrency(fee, 'SLE')}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-900 dark:text-white">Total Deduction</span>
                    <span className="text-orange-600">{formatCurrency(totalDeduction, 'SLE')}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Wallet Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pay from Wallet
              </label>
              {walletsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                </div>
              ) : wallets && wallets.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {wallets.filter(w => w.status === 'ACTIVE').map((wallet) => (
                    <button
                      key={wallet.id}
                      type="button"
                      onClick={() => setSelectedWalletId(wallet.id)}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        selectedWalletId === wallet.id
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Wallet className={`w-5 h-5 ${selectedWalletId === wallet.id ? 'text-orange-600' : 'text-gray-500'}`} />
                      <div className="flex-1 text-left">
                        <p className={`font-medium ${selectedWalletId === wallet.id ? 'text-orange-700 dark:text-orange-300' : 'text-gray-900 dark:text-white'}`}>
                          {wallet.currency} Wallet
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(wallet.balance, wallet.currency)}
                        </p>
                      </div>
                      {selectedWalletId === wallet.id && (
                        <CheckCircle className="w-5 h-5 text-orange-600" />
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this for?"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Info */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium">Transfer Information</p>
                <ul className="mt-1 space-y-1 text-blue-600 dark:text-blue-400">
                  <li>• Transfers complete within minutes</li>
                  <li>• 2% fee applies (min SLE 500, max SLE 5,000)</li>
                  <li>• Minimum transfer: SLE 1,000</li>
                </ul>
              </div>
            </div>

            {/* Continue Button */}
            <Button
              onClick={handleProceedToConfirm}
              disabled={!amount || !phoneNumber || !selectedProviderId}
              className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
            >
              Continue
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Card>
        )}

        {/* Confirm Step */}
        {step === 'confirm' && (
          <Card className="p-6 space-y-6">
            {/* Header */}
            <div className="text-center">
              <div className={`w-20 h-20 mx-auto mb-4 ${providerDisplay.bgColor} rounded-full flex items-center justify-center`}>
                <span className="text-4xl">{providerDisplay.icon}</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Confirm Transfer</h2>
              <p className="text-gray-500 dark:text-gray-400">to {providerDisplay.name}</p>
            </div>

            {/* Amount Display */}
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-orange-600">
                {formatCurrency(parseFloat(amount), 'SLE')}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Total deduction: {formatCurrency(totalDeduction, 'SLE')}
              </p>
            </div>

            {/* Transaction Details */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Sending to</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{providerDisplay.icon}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{providerDisplay.name}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Phone Number</span>
                <span className="font-medium text-gray-900 dark:text-white">+232 {phoneNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Amount</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(parseFloat(amount), 'SLE')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Fee</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(fee, 'SLE')}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="font-medium text-gray-700 dark:text-gray-300">Total Deduction</span>
                <span className="font-bold text-lg text-orange-600">{formatCurrency(totalDeduction, 'SLE')}</span>
              </div>
            </div>

            {/* Warning */}
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Please verify the phone number is correct. Transfers cannot be reversed once sent.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 py-4"
                onClick={() => setStep('form')}
              >
                Back
              </Button>
              <Button
                className="flex-1 py-4 bg-orange-600 hover:bg-orange-700"
                onClick={handleSend}
              >
                Send {formatCurrency(parseFloat(amount), 'SLE')}
              </Button>
            </div>
          </Card>
        )}

        {/* Processing Step */}
        {step === 'processing' && (
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6">Processing Transfer</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-2 text-center">
                Sending {formatCurrency(parseFloat(amount), 'SLE')} to {providerDisplay.name}
              </p>
              <p className="text-sm text-gray-400 mt-4">Please wait, do not close this page.</p>
            </div>
          </Card>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Transfer Successful!</h3>
              <p className="text-gray-500 dark:text-gray-400 text-center mb-2">
                {formatCurrency(parseFloat(amount), 'SLE')} sent to {providerDisplay.name}
              </p>
              <p className="text-gray-500 dark:text-gray-400 mb-1">
                +232 {phoneNumber}
              </p>
              {transactionId && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
                  Transaction ID: {transactionId.slice(0, 12)}...
                </p>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
                <Clock className="w-4 h-4" />
                <span>The recipient will receive the money within minutes</span>
              </div>

              <Button onClick={handleReset} className="w-full py-4 bg-orange-600 hover:bg-orange-700">
                Send Another Transfer
              </Button>
            </div>
          </Card>
        )}

        {/* Error Step */}
        {step === 'error' && (
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Transfer Failed</h3>
              <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
                {error || 'Something went wrong. Please try again.'}
              </p>
              <div className="flex gap-3 w-full">
                <Button variant="outline" className="flex-1 py-4" onClick={handleReset}>
                  Cancel
                </Button>
                <Button className="flex-1 py-4 bg-orange-600 hover:bg-orange-700" onClick={() => setStep('form')}>
                  Try Again
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
