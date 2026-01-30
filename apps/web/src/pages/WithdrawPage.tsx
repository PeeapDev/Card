/**
 * Withdraw/Cashout Page - Modern Redesign
 *
 * Features:
 * - Only main wallet for cashout (other wallets must transfer to main first)
 * - Bank and Mobile Money payout options
 * - Modern card-based design (not list view)
 * - Proper authentication token handling
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  ArrowDownToLine,
  Smartphone,
  Building2,
  Wallet,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Info,
  Lock,
  ChevronRight,
  Plus,
  Star,
  Banknote,
  CreditCard,
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { MainLayout } from '@/components/layout/MainLayout';
import { useWallets } from '@/hooks/useWallets';
import { useAuth } from '@/context/AuthContext';
import { currencyService, Currency } from '@/services/currency.service';
import { bankAccountService, UserBankAccount } from '@/services/bankAccount.service';
import { walletService, ExtendedWallet } from '@/services/wallet.service';
import { sessionService } from '@/services/session.service';

type DestinationType = 'momo' | 'bank';
type Step = 'wallet' | 'method' | 'amount' | 'processing' | 'success' | 'error';

// Use relative path for same-origin API requests
const API_BASE = '/api';

// Mobile Money Provider Cards
const MOMO_PROVIDERS = [
  {
    id: 'm17',
    name: 'Orange Money',
    color: 'from-orange-500 to-orange-600',
    textColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: 'OM',
    prefixes: ['72', '73', '74', '75', '76', '78', '79'],
  },
  {
    id: 'm18',
    name: 'Africell Money',
    color: 'from-blue-500 to-blue-600',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: 'AF',
    prefixes: ['30', '33', '77', '80', '88', '90', '99'],
  },
];

// Auto-detect provider from phone number
function detectProvider(phone: string): string | null {
  const normalized = phone.replace(/\s+/g, '').replace(/^(\+232|232|0)/, '');
  if (normalized.length < 2) return null;
  const prefix = normalized.substring(0, 2);

  for (const provider of MOMO_PROVIDERS) {
    if (provider.prefixes.includes(prefix)) {
      return provider.id;
    }
  }
  return null;
}

// Slide to Pay Component
function SlideToPayButton({
  onComplete,
  disabled,
  walletPin,
  onPinChange,
  label = 'Slide to Withdraw',
}: {
  onComplete: () => void;
  disabled: boolean;
  walletPin: string;
  onPinChange: (pin: string) => void;
  label?: string;
}) {
  const constraintsRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [sliderWidth, setSliderWidth] = useState(0);

  useEffect(() => {
    if (constraintsRef.current) {
      setSliderWidth(constraintsRef.current.offsetWidth - 64);
    }
  }, []);

  const background = useTransform(
    x,
    [0, sliderWidth],
    ['rgb(22, 163, 74)', 'rgb(21, 128, 61)']
  );

  const textOpacity = useTransform(x, [0, sliderWidth * 0.3], [1, 0]);

  const handleDragEnd = () => {
    const currentX = x.get();
    if (currentX >= sliderWidth * 0.85) {
      animate(x, sliderWidth, { duration: 0.2 });
      setIsCompleted(true);
      setTimeout(() => onComplete(), 300);
    } else {
      animate(x, 0, { duration: 0.3 });
    }
  };

  const isPinValid = walletPin.length === 4;
  const canSlide = !disabled && isPinValid && !isCompleted;

  return (
    <div className="space-y-4">
      {/* PIN Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Enter Wallet PIN to confirm
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="password"
            maxLength={4}
            value={walletPin}
            onChange={(e) => onPinChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="••••"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center text-xl tracking-[0.5em] font-mono"
          />
        </div>
      </div>

      {/* Slide to Pay */}
      <motion.div
        ref={constraintsRef}
        className={`relative h-16 rounded-xl overflow-hidden ${
          canSlide ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-700'
        }`}
        style={{ background: canSlide ? background : undefined }}
      >
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: textOpacity }}
        >
          <span className={`text-sm font-medium flex items-center gap-2 ${
            canSlide ? 'text-white' : 'text-gray-500 dark:text-gray-400'
          }`}>
            {!isPinValid ? 'Enter PIN to enable' : isCompleted ? (
              <><CheckCircle className="w-5 h-5" />Processing...</>
            ) : (
              <>{label}<ChevronRight className="w-5 h-5" /><ChevronRight className="w-5 h-5 -ml-3" /></>
            )}
          </span>
        </motion.div>

        <motion.div
          drag={canSlide ? 'x' : false}
          dragConstraints={constraintsRef}
          dragElastic={0}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          style={{ x }}
          className={`absolute left-1 top-1 bottom-1 w-14 rounded-lg flex items-center justify-center shadow-lg ${
            canSlide ? 'bg-white cursor-grab active:cursor-grabbing' : 'bg-gray-200 dark:bg-gray-600 cursor-not-allowed'
          }`}
        >
          {isCompleted ? (
            <CheckCircle className="w-6 h-6 text-green-600" />
          ) : (
            <ArrowRight className={`w-6 h-6 ${canSlide ? 'text-green-600' : 'text-gray-400'}`} />
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}

export function WithdrawPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: wallets, isLoading: walletsLoading, refetch: refetchWallets } = useWallets();

  const [step, setStep] = useState<Step>('wallet');
  const [destinationType, setDestinationType] = useState<DestinationType | null>(null);

  // Main wallet state (only primary wallet for cashout)
  const [mainWallet, setMainWallet] = useState<ExtendedWallet | null>(null);

  // Connected bank accounts
  const [connectedBankAccounts, setConnectedBankAccounts] = useState<UserBankAccount[]>([]);
  const [bankAccountsLoading, setBankAccountsLoading] = useState(false);
  const [selectedBankAccount, setSelectedBankAccount] = useState<UserBankAccount | null>(null);

  // Mobile Money state
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Form state
  const [amount, setAmount] = useState('');
  const [walletPin, setWalletPin] = useState('');

  // Fee calculation
  const [fee, setFee] = useState(0);
  const [totalDeduction, setTotalDeduction] = useState(0);

  // Result state
  const [error, setError] = useState('');
  const [payoutId, setPayoutId] = useState<string | null>(null);

  // Currency state
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  useEffect(() => {
    currencyService.getCurrencies().then(setCurrencies);
  }, []);

  // Identify main wallet only (primary SLE wallet for cashout)
  useEffect(() => {
    if (wallets && wallets.length > 0) {
      // Main wallet is the primary SLE wallet
      const primary = wallets.find(
        (w) => w.status === 'ACTIVE' && w.currency === 'SLE' && (w as ExtendedWallet).walletType === 'primary'
      ) as ExtendedWallet;

      // Fallback: first active SLE wallet
      const fallback = wallets.find(
        (w) => w.status === 'ACTIVE' && w.currency === 'SLE'
      ) as ExtendedWallet;

      setMainWallet(primary || fallback || null);
    }
  }, [wallets]);

  // Auto-detect provider when phone number changes
  useEffect(() => {
    if (destinationType === 'momo') {
      const detected = detectProvider(phoneNumber);
      if (detected) {
        setSelectedProviderId(detected);
      }
    }
  }, [phoneNumber, destinationType]);

  // Calculate fee when amount changes
  useEffect(() => {
    const amountNum = parseFloat(amount) || 0;
    if (amountNum > 0) {
      const calculatedFee = Math.round(amountNum * 0.02 * 100) / 100; // 2% fee
      setFee(calculatedFee);
      setTotalDeduction(amountNum + calculatedFee);
    } else {
      setFee(0);
      setTotalDeduction(0);
    }
  }, [amount]);

  // Load connected bank accounts
  const loadConnectedBankAccounts = async () => {
    setBankAccountsLoading(true);
    try {
      const accounts = await bankAccountService.getUserBankAccounts();
      setConnectedBankAccounts(accounts);
      const defaultAccount = accounts.find((a) => a.isDefault);
      if (defaultAccount) {
        setSelectedBankAccount(defaultAccount);
      } else if (accounts.length > 0) {
        setSelectedBankAccount(accounts[0]);
      }
    } catch (err) {
      console.error('Failed to load connected bank accounts:', err);
    } finally {
      setBankAccountsLoading(false);
    }
  };

  const getCurrencySymbol = (code: string): string => {
    if (code === 'SLE') return 'Le';
    return currencies.find((c) => c.code === code)?.symbol || code;
  };

  const formatCurrency = (amt: number, currencyCode: string = 'SLE'): string => {
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol} ${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const validateForm = (): boolean => {
    setError('');

    if (!mainWallet) {
      setError('Main wallet not found');
      return false;
    }

    if (destinationType === 'bank') {
      if (!selectedBankAccount) {
        setError('Please select a bank account');
        return false;
      }
    } else if (destinationType === 'momo') {
      if (!selectedProviderId) {
        setError('Please select a mobile money provider');
        return false;
      }
      if (!phoneNumber) {
        setError('Please enter a phone number');
        return false;
      }
      const normalized = phoneNumber.replace(/\s+/g, '').replace(/^(\+232|232)/, '');
      if (!/^[0-9]{8}$/.test(normalized)) {
        setError('Please enter a valid 8-digit phone number');
        return false;
      }
    }

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum < 1) {
      setError('Minimum withdrawal amount is Le 1');
      return false;
    }

    if (mainWallet.balance < totalDeduction) {
      setError(`Insufficient balance. You need ${formatCurrency(totalDeduction)} (including fee)`);
      return false;
    }

    if (walletPin.length !== 4) {
      setError('Please enter your 4-digit wallet PIN');
      return false;
    }

    return true;
  };

  const handleWithdraw = async () => {
    if (!user || !validateForm()) return;

    setStep('processing');
    setError('');

    try {
      // Get session token for authentication
      const sessionToken = sessionService.getSessionToken();

      const payload: Record<string, any> = {
        userId: user.id,
        walletId: mainWallet!.id,
        amount: parseFloat(amount),
        currency: 'SLE',
        destinationType,
        walletPin,
      };

      if (destinationType === 'bank' && selectedBankAccount) {
        payload.providerId = selectedBankAccount.bankProviderId;
        payload.accountNumber = selectedBankAccount.accountNumber;
        payload.accountName = selectedBankAccount.accountName || undefined;
        payload.bankAccountId = selectedBankAccount.id;
      } else if (destinationType === 'momo') {
        payload.providerId = selectedProviderId;
        payload.accountNumber = phoneNumber;
      }

      const response = await fetch(`${API_BASE}/router/payouts/user/cashout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Service temporarily unavailable. Please try again later.');
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Withdrawal failed');
      }

      setPayoutId(data.payoutId);
      setStep('success');
      refetchWallets();
    } catch (err: any) {
      console.error('Withdraw error:', err);
      if (err.name === 'SyntaxError' && err.message.includes('JSON')) {
        setError('Service temporarily unavailable. Please try again later.');
      } else {
        setError(err.message || 'Transfer failed. Please try again.');
      }
      setStep('error');
    }
  };

  const handleReset = () => {
    setStep('wallet');
    setDestinationType(null);
    setSelectedProviderId('');
    setPhoneNumber('');
    setAmount('');
    setWalletPin('');
    setError('');
    setPayoutId(null);
    setSelectedBankAccount(null);
  };

  const selectedProvider = MOMO_PROVIDERS.find((p) => p.id === selectedProviderId);

  const isFormValid =
    destinationType === 'bank'
      ? selectedBankAccount && parseFloat(amount) >= 1
      : destinationType === 'momo'
      ? selectedProviderId && phoneNumber.length >= 8 && parseFloat(amount) >= 1
      : false;

  if (walletsLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6 pb-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          {step !== 'wallet' && step !== 'success' && step !== 'error' && (
            <button
              onClick={() => setStep(step === 'amount' ? 'method' : step === 'method' ? 'wallet' : 'wallet')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cashout</h1>
            <p className="text-gray-500 dark:text-gray-400">Withdraw to bank or mobile money</p>
          </div>
        </div>

        {/* Step: Wallet Overview */}
        {step === 'wallet' && (
          <div className="space-y-6">
            {/* Main Wallet Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 via-green-500 to-emerald-500 p-6 text-white shadow-xl"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

              <div className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="w-5 h-5 text-green-100" />
                  <span className="text-sm font-medium text-green-100">Main Wallet</span>
                  <span className="px-2 py-0.5 text-xs bg-white/20 rounded-full">For Cashout</span>
                </div>
                <p className="text-4xl font-bold mb-4">
                  {mainWallet ? formatCurrency(mainWallet.balance, mainWallet.currency) : 'Le 0.00'}
                </p>

                <Button
                  onClick={() => setStep('method')}
                  disabled={!mainWallet || mainWallet.balance <= 0}
                  className="bg-white text-green-600 hover:bg-green-50 font-semibold shadow-lg"
                >
                  <ArrowDownToLine className="w-4 h-4 mr-2" />
                  Withdraw Funds
                </Button>
              </div>
            </motion.div>

            {/* No balance warning */}
            {mainWallet && mainWallet.balance <= 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">No Balance to Withdraw</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Add funds to your wallet before making a withdrawal.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step: Select Method */}
        {step === 'method' && (
          <div className="space-y-6">
            {/* Balance Reminder */}
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-700 dark:text-green-300">Available Balance</span>
              </div>
              <span className="font-bold text-green-700 dark:text-green-300">
                {mainWallet ? formatCurrency(mainWallet.balance, mainWallet.currency) : 'Le 0.00'}
              </span>
            </div>

            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Where do you want to withdraw?</h2>

            {/* Method Cards - Grid Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Mobile Money Card */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setDestinationType('momo');
                  setStep('amount');
                }}
                className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white text-left shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <Smartphone className="w-10 h-10 mb-4" />
                <h3 className="text-xl font-bold mb-1">Mobile Money</h3>
                <p className="text-sm text-orange-100">Orange Money, Africell</p>
                <ArrowRight className="absolute bottom-6 right-6 w-6 h-6 text-orange-200" />
              </motion.button>

              {/* Bank Card */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={async () => {
                  setDestinationType('bank');
                  await loadConnectedBankAccounts();
                  setStep('amount');
                }}
                className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white text-left shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <Building2 className="w-10 h-10 mb-4" />
                <h3 className="text-xl font-bold mb-1">Bank Account</h3>
                <p className="text-sm text-blue-100">Transfer to bank</p>
                <ArrowRight className="absolute bottom-6 right-6 w-6 h-6 text-blue-200" />
              </motion.button>
            </div>

            {/* Fees Info */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Banknote className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Withdrawal Fees</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                A 2% transaction fee applies to all withdrawals. Minimum withdrawal is Le 1.
              </p>
            </div>
          </div>
        )}

        {/* Step: Amount & Details */}
        {step === 'amount' && (
          <div className="space-y-6">
            {/* Method Header */}
            <div className={`p-4 rounded-xl ${
              destinationType === 'momo' ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800' :
              'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
            }`}>
              <div className="flex items-center gap-3">
                {destinationType === 'momo' ? (
                  <Smartphone className="w-6 h-6 text-orange-600" />
                ) : (
                  <Building2 className="w-6 h-6 text-blue-600" />
                )}
                <div>
                  <h3 className={`font-semibold ${
                    destinationType === 'momo' ? 'text-orange-800 dark:text-orange-200' : 'text-blue-800 dark:text-blue-200'
                  }`}>
                    {destinationType === 'momo' ? 'Mobile Money Withdrawal' : 'Bank Withdrawal'}
                  </h3>
                  <p className={`text-sm ${
                    destinationType === 'momo' ? 'text-orange-600 dark:text-orange-300' : 'text-blue-600 dark:text-blue-300'
                  }`}>
                    Enter withdrawal details below
                  </p>
                </div>
              </div>
            </div>

            <Card className="p-6 space-y-6">
              {/* Mobile Money: Provider Selection */}
              {destinationType === 'momo' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Select Provider
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {MOMO_PROVIDERS.map((provider) => (
                        <motion.button
                          key={provider.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedProviderId(provider.id)}
                          className={`relative p-4 rounded-xl border-2 transition-all ${
                            selectedProviderId === provider.id
                              ? `${provider.borderColor} ${provider.bgColor} border-2`
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${provider.color} flex items-center justify-center text-white font-bold text-lg mb-2`}>
                            {provider.icon}
                          </div>
                          <p className={`font-medium ${selectedProviderId === provider.id ? provider.textColor : 'text-gray-900 dark:text-white'}`}>
                            {provider.name}
                          </p>
                          {selectedProviderId === provider.id && (
                            <CheckCircle className={`absolute top-3 right-3 w-5 h-5 ${provider.textColor}`} />
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">+232</span>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        placeholder="XX XXX XXXX"
                        className="w-full pl-14 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Enter 8-digit phone number without country code</p>
                  </div>
                </>
              )}

              {/* Bank: Account Selection */}
              {destinationType === 'bank' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Select Bank Account
                  </label>

                  {bankAccountsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    </div>
                  ) : connectedBankAccounts.length === 0 ? (
                    <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl text-center">
                      <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                      <p className="font-medium text-gray-900 dark:text-white mb-2">No Bank Accounts Connected</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Add a bank account in settings to enable bank withdrawals
                      </p>
                      <Button onClick={() => navigate('/settings')}>
                        <Plus className="w-4 h-4 mr-2" />Add Bank Account
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {connectedBankAccounts.map((account) => (
                        <motion.button
                          key={account.id}
                          whileHover={{ scale: 1.01 }}
                          onClick={() => setSelectedBankAccount(account)}
                          className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                            selectedBankAccount?.id === account.id
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${
                            selectedBankAccount?.id === account.id ? 'bg-blue-200 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-800'
                          }`}>
                            <Building2 className={`w-5 h-5 ${
                              selectedBankAccount?.id === account.id ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 dark:text-white truncate">
                                {account.nickname || account.bankName}
                              </p>
                              {account.isDefault && (
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {bankAccountService.formatAccountNumber(account.accountNumber)}
                            </p>
                          </div>
                          {selectedBankAccount?.id === account.id && (
                            <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          )}
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount to Withdraw
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg font-medium">Le</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-12 pr-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-2xl font-semibold"
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-gray-500">Available: {mainWallet ? formatCurrency(mainWallet.balance) : 'Le 0.00'}</span>
                  <button
                    onClick={() => {
                      if (mainWallet && mainWallet.balance > 0) {
                        const maxWithdraw = mainWallet.balance / 1.02; // Account for 2% fee
                        setAmount(maxWithdraw.toFixed(2));
                      }
                    }}
                    className="text-green-600 hover:text-green-700 font-medium"
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* Fee Breakdown */}
              {totalDeduction > 0 && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl space-y-2">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Amount</span>
                    <span>{formatCurrency(parseFloat(amount) || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Fee (2%)</span>
                    <span>{formatCurrency(fee)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-600">
                    <span>Total Deduction</span>
                    <span className="text-green-600">{formatCurrency(totalDeduction)}</span>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Slide to Pay */}
              <SlideToPayButton
                onComplete={handleWithdraw}
                disabled={!isFormValid}
                walletPin={walletPin}
                onPinChange={setWalletPin}
              />
            </Card>
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <Loader2 className="w-16 h-16 text-green-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-green-100 rounded-full" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-2">Processing Withdrawal</h3>
              <p className="text-gray-500 dark:text-gray-400 text-center">
                Please wait while we process your request...
              </p>
            </div>
          </Card>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="p-8">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Withdrawal Initiated!</h3>
                <p className="text-gray-500 dark:text-gray-400 text-center mb-4">
                  {formatCurrency(parseFloat(amount))} is being sent to {
                    destinationType === 'momo' ? selectedProvider?.name : selectedBankAccount?.bankName
                  }
                </p>
                {payoutId && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
                    Reference: {payoutId.slice(0, 24)}...
                  </p>
                )}
                <p className="text-sm text-gray-500 text-center mb-8">
                  You will receive a notification once the transfer is complete. This typically takes 1-24 hours.
                </p>
                <Button onClick={handleReset} className="w-full max-w-xs">
                  Done
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Step: Error */}
        {step === 'error' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="p-8">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                  <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Withdrawal Failed</h3>
                <p className="text-gray-500 dark:text-gray-400 text-center mb-8">
                  {error || 'Something went wrong. Please try again.'}
                </p>
                <div className="flex gap-3 w-full max-w-xs">
                  <Button variant="outline" className="flex-1" onClick={handleReset}>
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={() => { setError(''); setStep('amount'); }}>
                    Try Again
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

      </div>
    </MainLayout>
  );
}
