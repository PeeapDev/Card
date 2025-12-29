/**
 * Withdraw Page - Withdraw money from Peeap wallet to Bank or Mobile Money
 *
 * Users can withdraw their balance to:
 * - Mobile Money (Orange Money, Africell)
 * - Bank Account (from user's connected bank accounts)
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
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { MainLayout } from '@/components/layout/MainLayout';
import { useWallets } from '@/hooks/useWallets';
import { useAuth } from '@/context/AuthContext';
import { currencyService, Currency } from '@/services/currency.service';
import { bankAccountService, UserBankAccount } from '@/services/bankAccount.service';

interface MobileMoneyProvider {
  providerId: string;
  name: string;
  country: string;
  canPayout: boolean;
}

interface Bank {
  id: string;
  name: string;
  country: string;
}

type DestinationType = 'momo' | 'bank';
type Step = 'select' | 'form' | 'processing' | 'success' | 'error';

// Use relative path for same-origin API requests (avoids CORS issues and ensures correct deployment)
const API_BASE = '/api';

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

// Slide to Pay Component
function SlideToPayButton({
  onComplete,
  disabled,
  walletPin,
  onPinChange,
}: {
  onComplete: () => void;
  disabled: boolean;
  walletPin: string;
  onPinChange: (pin: string) => void;
}) {
  const constraintsRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [sliderWidth, setSliderWidth] = useState(0);

  useEffect(() => {
    if (constraintsRef.current) {
      setSliderWidth(constraintsRef.current.offsetWidth - 64); // 64 = button width
    }
  }, []);

  const background = useTransform(
    x,
    [0, sliderWidth],
    ['rgb(22, 163, 74)', 'rgb(21, 128, 61)']
  );

  const textOpacity = useTransform(
    x,
    [0, sliderWidth * 0.3],
    [1, 0]
  );

  const handleDragEnd = () => {
    const currentX = x.get();
    if (currentX >= sliderWidth * 0.85) {
      // Complete the slide
      animate(x, sliderWidth, { duration: 0.2 });
      setIsCompleted(true);
      setTimeout(() => {
        onComplete();
      }, 300);
    } else {
      // Reset
      animate(x, 0, { duration: 0.3 });
    }
  };

  const isPinValid = walletPin.length === 4;
  const canSlide = !disabled && isPinValid && !isCompleted;

  return (
    <div className="space-y-3">
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
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center text-xl tracking-[0.5em] font-mono"
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Use your 4-digit wallet PIN
        </p>
      </div>

      {/* Slide to Pay */}
      <motion.div
        ref={constraintsRef}
        className={`relative h-16 rounded-xl overflow-hidden ${
          canSlide
            ? 'bg-green-600'
            : 'bg-gray-300 dark:bg-gray-700'
        }`}
        style={{ background: canSlide ? background : undefined }}
      >
        {/* Text */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: textOpacity }}
        >
          <span className={`text-sm font-medium flex items-center gap-2 ${
            canSlide ? 'text-white' : 'text-gray-500 dark:text-gray-400'
          }`}>
            {!isPinValid ? (
              'Enter PIN to enable'
            ) : isCompleted ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Processing...
              </>
            ) : (
              <>
                Slide to Withdraw
                <ChevronRight className="w-5 h-5" />
                <ChevronRight className="w-5 h-5 -ml-3" />
              </>
            )}
          </span>
        </motion.div>

        {/* Slider Button */}
        <motion.div
          drag={canSlide ? 'x' : false}
          dragConstraints={constraintsRef}
          dragElastic={0}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          style={{ x }}
          className={`absolute left-1 top-1 bottom-1 w-14 rounded-lg flex items-center justify-center shadow-lg ${
            canSlide
              ? 'bg-white cursor-grab active:cursor-grabbing'
              : 'bg-gray-200 dark:bg-gray-600 cursor-not-allowed'
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

  const [step, setStep] = useState<Step>('select');
  const [destinationType, setDestinationType] = useState<DestinationType | null>(null);

  // Providers and Banks
  const [momoProviders, setMomoProviders] = useState<MobileMoneyProvider[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);

  // Connected bank accounts
  const [connectedBankAccounts, setConnectedBankAccounts] = useState<UserBankAccount[]>([]);
  const [bankAccountsLoading, setBankAccountsLoading] = useState(false);
  const [selectedBankAccount, setSelectedBankAccount] = useState<UserBankAccount | null>(null);

  // Form state
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
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

  // Load providers on mount
  useEffect(() => {
    loadProviders();
    loadBanks();
  }, []);

  // Set default wallet when wallets load
  useEffect(() => {
    if (wallets && wallets.length > 0 && !selectedWalletId) {
      const sleWallet = wallets.find(w => w.status === 'ACTIVE' && w.currency === 'SLE');
      const activeWallet = wallets.find(w => w.status === 'ACTIVE');
      const defaultWallet = sleWallet || activeWallet || wallets[0];
      setSelectedWalletId(defaultWallet.id);
    }
  }, [wallets, selectedWalletId]);

  // Auto-detect provider when phone number changes (mobile money only)
  useEffect(() => {
    if (destinationType === 'momo') {
      const detected = detectProvider(accountNumber);
      if (detected) {
        setSelectedProviderId(detected);
      }
    }
  }, [accountNumber, destinationType]);

  // Calculate fee when amount changes
  useEffect(() => {
    const amountNum = parseFloat(amount) || 0;
    if (amountNum > 0) {
      // 2% fee only (no flat fee) - fees in new Leone (Le)
      let calculatedFee = Math.round(amountNum * 0.02 * 100) / 100; // 2% fee
      setFee(calculatedFee);
      setTotalDeduction(amountNum + calculatedFee);
    } else {
      setFee(0);
      setTotalDeduction(0);
    }
  }, [amount]);

  const loadProviders = async () => {
    try {
      const response = await fetch(`${API_BASE}/router/mobile-money/providers`);
      const data = await response.json();
      if (data.success && data.providers) {
        setMomoProviders(data.providers.filter((p: MobileMoneyProvider) => p.canPayout));
      }
    } catch (err) {
      console.error('Failed to load providers:', err);
      setMomoProviders([
        { providerId: 'm17', name: 'Orange Money', country: 'SL', canPayout: true },
        { providerId: 'm18', name: 'Africell Money', country: 'SL', canPayout: true },
      ]);
    } finally {
      setProvidersLoading(false);
    }
  };

  // Load available banks from Monime API
  const loadBanks = async () => {
    try {
      const bankList = await bankAccountService.getAvailableBanks('SL');
      setBanks(bankList.map(b => ({ id: b.providerId, name: b.name, country: b.country })));
    } catch (err) {
      console.error('Failed to load banks:', err);
    }
  };

  // Load user's connected bank accounts
  const loadConnectedBankAccounts = async () => {
    setBankAccountsLoading(true);
    try {
      const accounts = await bankAccountService.getUserBankAccounts();
      setConnectedBankAccounts(accounts);
      // Auto-select default account if exists
      const defaultAccount = accounts.find(a => a.isDefault);
      if (defaultAccount) {
        selectBankAccount(defaultAccount);
      } else if (accounts.length > 0) {
        selectBankAccount(accounts[0]);
      }
    } catch (err) {
      console.error('Failed to load connected bank accounts:', err);
    } finally {
      setBankAccountsLoading(false);
    }
  };

  // Select a bank account
  const selectBankAccount = (account: UserBankAccount) => {
    setSelectedBankAccount(account);
    setSelectedProviderId(account.bankProviderId);
    setAccountNumber(account.accountNumber);
    setAccountName(account.accountName || '');
  };

  const getCurrencySymbol = (code: string): string => {
    // SLE is the new Sierra Leone Leone after redenomination - symbol is "Le"
    if (code === 'SLE') return 'Le';
    return currencies.find(c => c.code === code)?.symbol || code;
  };

  const formatCurrency = (amt: number, currencyCode: string = 'SLE'): string => {
    const symbol = getCurrencySymbol(currencyCode);
    // Show 2 decimal places for new Leone (Le)
    return `${symbol} ${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const validateForm = (): boolean => {
    setError('');

    if (!selectedWalletId) {
      setError('Please select a wallet');
      return false;
    }

    // For bank withdrawals, check selected bank account
    if (destinationType === 'bank') {
      if (!selectedBankAccount) {
        setError('Please select a bank account');
        return false;
      }
    } else {
      // For mobile money
      if (!selectedProviderId) {
        setError('Please select a provider');
        return false;
      }

      if (!accountNumber) {
        setError('Please enter a phone number');
        return false;
      }

      const normalized = accountNumber.replace(/\s+/g, '').replace(/^(\+232|232)/, '');
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

    const selectedWallet = wallets?.find(w => w.id === selectedWalletId);
    if (!selectedWallet || selectedWallet.balance < totalDeduction) {
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
      // Build request payload based on destination type
      const payload: Record<string, any> = {
        userId: user.id,
        walletId: selectedWalletId,
        amount: parseFloat(amount),
        currency: 'SLE',
        destinationType,
        walletPin,
      };

      if (destinationType === 'bank' && selectedBankAccount) {
        // Use selected bank account details
        payload.providerId = selectedBankAccount.bankProviderId;
        payload.accountNumber = selectedBankAccount.accountNumber;
        payload.accountName = selectedBankAccount.accountName || undefined;
        payload.bankAccountId = selectedBankAccount.id;
      } else {
        // Mobile money
        payload.providerId = selectedProviderId;
        payload.accountNumber = accountNumber;
      }

      const response = await fetch(`${API_BASE}/router/payouts/user/cashout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Check if response is JSON
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
      // Handle JSON parse errors specifically
      if (err.name === 'SyntaxError' && err.message.includes('JSON')) {
        setError('Service temporarily unavailable. Please try again later.');
      } else {
        setError(err.message || 'Withdrawal failed. Please try again.');
      }
      setStep('error');
    }
  };

  const handleReset = () => {
    setStep('select');
    setDestinationType(null);
    setSelectedProviderId('');
    setAccountNumber('');
    setAccountName('');
    setAmount('');
    setWalletPin('');
    setError('');
    setPayoutId(null);
    setSelectedBankAccount(null);
    setConnectedBankAccounts([]);
  };

  const selectedWallet = wallets?.find(w => w.id === selectedWalletId);
  const providerDisplay = destinationType === 'momo' && PROVIDER_DISPLAY[selectedProviderId]
    ? PROVIDER_DISPLAY[selectedProviderId]
    : { name: selectedBankAccount?.bankName || 'Bank', color: 'text-blue-600', icon: 'BK', bgColor: 'bg-blue-100' };

  // Check if form is ready for submission
  const isFormValid = destinationType === 'bank'
    ? selectedBankAccount && parseFloat(amount) >= 1
    : selectedProviderId && accountNumber && parseFloat(amount) >= 1 &&
      /^[0-9]{8}$/.test(accountNumber.replace(/\s+/g, '').replace(/^(\+232|232)/, ''));

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          {step !== 'select' && step !== 'success' && step !== 'error' && (
            <button
              onClick={() => setStep('select')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Withdraw</h1>
            <p className="text-gray-500 dark:text-gray-400">Send to bank or mobile money</p>
          </div>
        </div>

        {/* Step: Select Destination Type */}
        {step === 'select' && (
          <>
            {/* Balance Card */}
            {selectedWallet && (
              <Card className="p-4 bg-gradient-to-r from-green-600 to-green-500 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-100">Available Balance</p>
                    <p className="text-3xl font-bold">
                      {formatCurrency(selectedWallet.balance, selectedWallet.currency)}
                    </p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Wallet className="w-8 h-8" />
                  </div>
                </div>
              </Card>
            )}

            <Card className="p-6 space-y-6">
              <h2 className="font-semibold text-gray-900 dark:text-white">Where do you want to withdraw to?</h2>

              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => {
                    setDestinationType('momo');
                    if (momoProviders.length > 0) {
                      setSelectedProviderId(momoProviders[0].providerId);
                    }
                    setStep('form');
                  }}
                  className="flex items-center gap-4 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-left"
                >
                  <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                    <Smartphone className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">Mobile Money</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Orange Money, Africell</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </button>

                <button
                  onClick={async () => {
                    setDestinationType('bank');
                    // Load user's connected bank accounts
                    await loadConnectedBankAccounts();
                    setStep('form');
                  }}
                  className="flex items-center gap-4 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
                >
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">Bank Account</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Transfer to your connected bank accounts</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Info */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  Withdrawals typically complete within 1-24 hours depending on the provider.
                </span>
              </div>
            </Card>
          </>
        )}

        {/* Step: Form - Two Column Layout */}
        {step === 'form' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Amount & Recipient Details */}
            <Card className="p-6 space-y-4">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <ArrowDownToLine className="w-5 h-5 text-green-600" />
                Amount & Recipient
              </h2>

              {/* Connected Bank Accounts (for bank withdrawals) */}
              {destinationType === 'bank' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Bank Account
                  </label>

                  {bankAccountsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    </div>
                  ) : connectedBankAccounts.length === 0 ? (
                    // No connected bank accounts - prompt to add one
                    <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl text-center">
                      <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                      <p className="font-medium text-gray-900 dark:text-white mb-2">
                        No Bank Accounts Connected
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Add a bank account in settings to enable bank withdrawals
                      </p>
                      <Button
                        onClick={() => navigate('/settings')}
                        className="inline-flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Bank Account
                      </Button>
                    </div>
                  ) : (
                    // Show connected bank accounts
                    <div className="space-y-2">
                      {connectedBankAccounts.map((account) => (
                        <button
                          key={account.id}
                          type="button"
                          onClick={() => selectBankAccount(account)}
                          className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                            selectedBankAccount?.id === account.id
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${
                            selectedBankAccount?.id === account.id
                              ? 'bg-blue-200 dark:bg-blue-800'
                              : 'bg-gray-100 dark:bg-gray-800'
                          }`}>
                            <Building2 className={`w-5 h-5 ${
                              selectedBankAccount?.id === account.id
                                ? 'text-blue-700 dark:text-blue-300'
                                : 'text-gray-600 dark:text-gray-400'
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
                              {account.bankName} • {bankAccountService.formatAccountNumber(account.accountNumber)}
                            </p>
                            {account.accountName && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                {account.accountName}
                              </p>
                            )}
                          </div>
                          {selectedBankAccount?.id === account.id && (
                            <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          )}
                        </button>
                      ))}

                      {/* Add new bank account button */}
                      <button
                        type="button"
                        onClick={() => navigate('/settings')}
                        className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="text-sm font-medium">Add Another Bank Account</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Phone Number (for mobile money) */}
              {destinationType === 'momo' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">+232</span>
                    <input
                      type="tel"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      placeholder="76123456"
                      className="w-full pl-14 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Auto-Detected Provider Badge */}
                  {accountNumber.length >= 2 && (
                    <div className="mt-2">
                      {selectedProviderId && PROVIDER_DISPLAY[selectedProviderId] ? (
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${PROVIDER_DISPLAY[selectedProviderId].bgColor}`}>
                          <span className={`font-bold text-sm ${PROVIDER_DISPLAY[selectedProviderId].color}`}>
                            {PROVIDER_DISPLAY[selectedProviderId].icon}
                          </span>
                          <span className={`font-medium text-sm ${PROVIDER_DISPLAY[selectedProviderId].color}`}>
                            {PROVIDER_DISPLAY[selectedProviderId].name}
                          </span>
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
              )}

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">Le</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="10"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-lg font-semibold"
                  />
                </div>
              </div>

              {/* Fee Breakdown */}
              {totalDeduction > 0 && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm space-y-1">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Amount:</span>
                    <span>{formatCurrency(parseFloat(amount) || 0)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Fee (2%):</span>
                    <span>{formatCurrency(fee)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-gray-900 dark:text-white pt-1 border-t border-gray-200 dark:border-gray-700">
                    <span>Total Deduction:</span>
                    <span className="text-green-600">{formatCurrency(totalDeduction)}</span>
                  </div>
                </div>
              )}
            </Card>

            {/* Right Column: Wallet & Slide to Pay */}
            <Card className="p-6 space-y-4">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-green-600" />
                Pay from Wallet
              </h2>

              {/* Wallet Info */}
              {selectedWallet && (
                <div className="p-4 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-100">Available Balance</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(selectedWallet.balance, selectedWallet.currency)}
                      </p>
                    </div>
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Wallet className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              )}

              {/* Wallet Selection (if multiple wallets) */}
              {wallets && wallets.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Wallet</label>
                  <select
                    value={selectedWalletId}
                    onChange={(e) => setSelectedWalletId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    {wallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.currency} Wallet - {formatCurrency(wallet.balance, wallet.currency)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Summary */}
              {isFormValid && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Sending:</strong> {formatCurrency(parseFloat(amount))} to {providerDisplay.name}
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    {destinationType === 'momo' ? `+232 ${accountNumber}` : accountNumber}
                  </p>
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

              {/* Back Button */}
              <Button variant="outline" className="w-full" onClick={() => setStep('select')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Card>
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <Card className="p-6">
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-green-600 animate-spin mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Processing your withdrawal...</p>
              <p className="text-sm text-gray-500 mt-2">Please wait, do not close this page.</p>
            </div>
          </Card>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <Card className="p-6">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Withdrawal Initiated!</h3>
              <p className="text-gray-500 dark:text-gray-400 text-center mb-2">
                {formatCurrency(parseFloat(amount))} is being sent to {providerDisplay.name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {destinationType === 'momo' ? `+232 ${accountNumber}` : accountNumber}
              </p>
              {payoutId && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
                  Reference: {payoutId.slice(0, 20)}...
                </p>
              )}
              <p className="text-sm text-gray-500 text-center mb-6">
                You will receive a notification once the transfer is complete.
              </p>
              <Button onClick={handleReset} className="w-full max-w-xs">
                Done
              </Button>
            </div>
          </Card>
        )}

        {/* Step: Error */}
        {step === 'error' && (
          <Card className="p-6">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Withdrawal Failed</h3>
              <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
                {error || 'Something went wrong. Please try again.'}
              </p>
              <div className="flex gap-3 w-full max-w-xs">
                <Button variant="outline" className="flex-1" onClick={handleReset}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={() => { setError(''); setStep('form'); }}>
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
