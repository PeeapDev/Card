/**
 * Bill Payments Page
 *
 * Pay utility bills including:
 * - Electricity (EDSA)
 * - Water (GVWC)
 * - TV Subscriptions (DStv, GOtv)
 */

import React, { useState, useEffect } from 'react';
import {
  Zap,
  Droplets,
  Tv,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
  Wallet,
  Search,
  Receipt,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { MainLayout } from '@/components/layout/MainLayout';
import { TransactionPinModal } from '@/components/ui/TransactionPinModal';
import { SetupPinModal } from '@/components/ui/SetupPinModal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { currencyService, Currency } from '@/services/currency.service';

// Bill Categories
type BillCategory = 'electricity' | 'water' | 'tv';

interface ServiceProvider {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  category: BillCategory;
  description: string;
  accountLabel: string;
  accountPlaceholder: string;
  minAmount: number;
  maxAmount: number;
}

interface BillResult {
  success: boolean;
  transactionId?: string;
  token?: string; // For electricity prepaid tokens
  error?: string;
}

interface RecentBill {
  id: string;
  provider: string;
  accountNumber: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

type Step = 'category' | 'provider' | 'details' | 'confirm' | 'result';

// Service Providers (Sierra Leone focused)
const SERVICE_PROVIDERS: ServiceProvider[] = [
  // Electricity
  {
    id: 'edsa',
    name: 'EDSA - Electricity Distribution',
    shortName: 'EDSA',
    logo: '/providers/edsa.png',
    category: 'electricity',
    description: 'Electricity Distribution and Supply Authority',
    accountLabel: 'Meter Number',
    accountPlaceholder: 'Enter your meter number',
    minAmount: 10,
    maxAmount: 5000,
  },
  // Water
  {
    id: 'gvwc',
    name: 'GVWC - Guma Valley Water',
    shortName: 'GVWC',
    logo: '/providers/gvwc.png',
    category: 'water',
    description: 'Guma Valley Water Company',
    accountLabel: 'Account Number',
    accountPlaceholder: 'Enter your account number',
    minAmount: 5,
    maxAmount: 1000,
  },
  // TV
  {
    id: 'dstv',
    name: 'DStv Subscription',
    shortName: 'DStv',
    logo: '/providers/dstv.png',
    category: 'tv',
    description: 'MultiChoice DStv',
    accountLabel: 'Smart Card Number',
    accountPlaceholder: 'Enter your smart card number',
    minAmount: 20,
    maxAmount: 500,
  },
  {
    id: 'gotv',
    name: 'GOtv Subscription',
    shortName: 'GOtv',
    logo: '/providers/gotv.png',
    category: 'tv',
    description: 'MultiChoice GOtv',
    accountLabel: 'IUC Number',
    accountPlaceholder: 'Enter your IUC number',
    minAmount: 10,
    maxAmount: 200,
  },
];

// Predefined amounts for quick selection
const QUICK_AMOUNTS: Record<BillCategory, number[]> = {
  electricity: [20, 50, 100, 200],
  water: [10, 25, 50, 100],
  tv: [25, 50, 100, 150],
};

// Category icons
const CATEGORY_ICONS: Record<BillCategory, React.ElementType> = {
  electricity: Zap,
  water: Droplets,
  tv: Tv,
};

// Category colors
const CATEGORY_COLORS: Record<BillCategory, { bg: string; text: string; icon: string }> = {
  electricity: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: 'text-yellow-600' },
  water: { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'text-blue-600' },
  tv: { bg: 'bg-purple-100', text: 'text-purple-700', icon: 'text-purple-600' },
};

export function BillPaymentsPage() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('category');
  const [selectedCategory, setSelectedCategory] = useState<BillCategory | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);

  // Form state
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<BillResult | null>(null);

  // Wallet state
  const [walletId, setWalletId] = useState<string>('');
  const [walletBalance, setWalletBalance] = useState(0);

  // PIN state
  const [showPinModal, setShowPinModal] = useState(false);
  const [showSetupPinModal, setShowSetupPinModal] = useState(false);
  const [hasTransactionPin, setHasTransactionPin] = useState(false);

  // Recent bills
  const [recentBills, setRecentBills] = useState<RecentBill[]>([]);

  // Currency state
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
  }, []);

  const currencySymbol = defaultCurrency?.symbol || 'Le';

  const formatCurrency = (amt: number): string => {
    return `${currencySymbol} ${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  useEffect(() => {
    if (user?.id) {
      fetchWallet();
      checkTransactionPin();
      fetchRecentBills();
    }
  }, [user?.id]);

  const fetchWallet = async () => {
    if (!user?.id) return;

    const { data: wallet } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', user.id)
      .eq('wallet_type', 'primary')
      .single();

    if (wallet) {
      setWalletId(wallet.id);
      setWalletBalance(wallet.balance);
    }
  };

  const checkTransactionPin = async () => {
    if (!user?.id) return;

    const { data } = await supabase
      .from('users')
      .select('transaction_pin')
      .eq('id', user.id)
      .single();

    setHasTransactionPin(!!data?.transaction_pin);
  };

  const fetchRecentBills = async () => {
    if (!user?.id) return;

    // Get recent bill payment transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('wallet_id', walletId)
      .eq('type', 'BILL_PAYMENT')
      .order('created_at', { ascending: false })
      .limit(5);

    if (transactions && transactions.length > 0) {
      const bills: RecentBill[] = transactions.map(tx => ({
        id: tx.id,
        provider: tx.metadata?.provider_name || 'Unknown',
        accountNumber: tx.metadata?.account_number || '',
        amount: Math.abs(tx.amount),
        date: tx.created_at,
        status: tx.status === 'COMPLETED' ? 'completed' : tx.status === 'PENDING' ? 'pending' : 'failed',
      }));
      setRecentBills(bills);
    }
  };

  const handleCategorySelect = (category: BillCategory) => {
    setSelectedCategory(category);
    setStep('provider');
  };

  const handleProviderSelect = (provider: ServiceProvider) => {
    setSelectedProvider(provider);
    setStep('details');
  };

  const handleContinue = () => {
    if (!selectedProvider || !accountNumber || !amount) return;

    const amountNum = parseFloat(amount);
    if (amountNum < selectedProvider.minAmount || amountNum > selectedProvider.maxAmount) {
      return;
    }

    if (amountNum > walletBalance) {
      setResult({ success: false, error: 'Insufficient balance' });
      setStep('result');
      return;
    }

    setStep('confirm');
  };

  const handleConfirmPayment = () => {
    if (!hasTransactionPin) {
      setShowSetupPinModal(true);
      return;
    }
    setShowPinModal(true);
  };

  const handlePinSetupSuccess = () => {
    setShowSetupPinModal(false);
    setHasTransactionPin(true);
    setShowPinModal(true);
  };

  const verifyTransactionPin = async (enteredPin: string): Promise<boolean> => {
    if (!user?.id) return false;

    const { data } = await supabase
      .from('users')
      .select('transaction_pin')
      .eq('id', user.id)
      .single();

    if (data?.transaction_pin === enteredPin) {
      setShowPinModal(false);
      await processBillPayment();
      return true;
    }

    return false;
  };

  const processBillPayment = async () => {
    if (!selectedProvider || !accountNumber || !amount || !user?.id || !walletId) return;

    setIsProcessing(true);
    const amountNum = parseFloat(amount);

    try {
      // Check balance
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', walletId)
        .single();

      if (!wallet || wallet.balance < amountNum) {
        setResult({ success: false, error: 'Insufficient balance' });
        setStep('result');
        return;
      }

      // Generate transaction ID
      const transactionId = `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Deduct from wallet
      const { error: deductError } = await supabase
        .from('wallets')
        .update({
          balance: wallet.balance - amountNum,
          updated_at: new Date().toISOString(),
        })
        .eq('id', walletId);

      if (deductError) throw deductError;

      // Generate token for electricity (simulated)
      let token: string | undefined;
      if (selectedProvider.category === 'electricity') {
        // Generate a random 20-digit token (in real app, this comes from provider API)
        token = Array.from({ length: 20 }, () => Math.floor(Math.random() * 10)).join('');
        // Format as groups of 4: 1234-5678-9012-3456-7890
        token = token.match(/.{1,4}/g)?.join('-') || token;
      }

      // Create transaction record
      await supabase.from('transactions').insert({
        external_id: transactionId,
        wallet_id: walletId,
        type: 'BILL_PAYMENT',
        amount: -amountNum,
        currency: defaultCurrency?.code || 'SLE',
        status: 'COMPLETED',
        description: `${selectedProvider.name} payment`,
        metadata: {
          provider_id: selectedProvider.id,
          provider_name: selectedProvider.shortName,
          category: selectedProvider.category,
          account_number: accountNumber,
          token: token,
        },
      });

      setResult({
        success: true,
        transactionId,
        token,
      });
      setStep('result');
      fetchWallet();

    } catch (error: any) {
      console.error('Bill payment error:', error);
      setResult({
        success: false,
        error: error.message || 'Payment failed. Please try again.',
      });
      setStep('result');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setStep('category');
    setSelectedCategory(null);
    setSelectedProvider(null);
    setAccountNumber('');
    setAmount('');
    setResult(null);
    fetchWallet();
  };

  const goBack = () => {
    switch (step) {
      case 'provider':
        setSelectedCategory(null);
        setStep('category');
        break;
      case 'details':
        setSelectedProvider(null);
        setStep('provider');
        break;
      case 'confirm':
        setStep('details');
        break;
      default:
        setStep('category');
    }
  };

  const filteredProviders = selectedCategory
    ? SERVICE_PROVIDERS.filter(p => p.category === selectedCategory)
    : [];

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          {step !== 'category' && step !== 'result' && (
            <button onClick={goBack} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pay Bills</h1>
            <p className="text-gray-500">Pay your utility bills instantly</p>
          </div>
        </div>

        {/* Balance Card */}
        <Card className="p-4 bg-gradient-to-r from-green-600 to-green-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-100">Available Balance</p>
              <p className="text-3xl font-bold">{formatCurrency(walletBalance)}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <Wallet className="w-8 h-8" />
            </div>
          </div>
        </Card>

        {/* Step: Select Category */}
        {step === 'category' && (
          <>
            <Card className="p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Select Bill Category</h2>

              <div className="grid grid-cols-1 gap-3">
                {(['electricity', 'water', 'tv'] as BillCategory[]).map((category) => {
                  const Icon = CATEGORY_ICONS[category];
                  const colors = CATEGORY_COLORS[category];
                  const providerCount = SERVICE_PROVIDERS.filter(p => p.category === category).length;

                  return (
                    <button
                      key={category}
                      onClick={() => handleCategorySelect(category)}
                      className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
                    >
                      <div className={`p-3 ${colors.bg} rounded-xl`}>
                        <Icon className={`w-6 h-6 ${colors.icon}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 capitalize">{category}</p>
                        <p className="text-sm text-gray-500">{providerCount} provider{providerCount > 1 ? 's' : ''} available</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Recent Bills */}
            {recentBills.length > 0 && (
              <Card className="p-6 space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  Recent Payments
                </h3>
                <div className="space-y-2">
                  {recentBills.map((bill) => (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{bill.provider}</p>
                        <p className="text-sm text-gray-500">{bill.accountNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(bill.amount)}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(bill.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {/* Step: Select Provider */}
        {step === 'provider' && selectedCategory && (
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 capitalize">
              Select {selectedCategory} Provider
            </h2>

            <div className="space-y-3">
              {filteredProviders.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleProviderSelect(provider)}
                  className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
                >
                  <div className={`p-3 ${CATEGORY_COLORS[provider.category].bg} rounded-xl`}>
                    {React.createElement(CATEGORY_ICONS[provider.category], {
                      className: `w-6 h-6 ${CATEGORY_COLORS[provider.category].icon}`
                    })}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{provider.name}</p>
                    <p className="text-sm text-gray-500">{provider.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Step: Enter Details */}
        {step === 'details' && selectedProvider && (
          <Card className="p-6 space-y-6">
            {/* Provider Info */}
            <div className={`flex items-center gap-3 p-4 ${CATEGORY_COLORS[selectedProvider.category].bg} rounded-xl`}>
              {React.createElement(CATEGORY_ICONS[selectedProvider.category], {
                className: `w-6 h-6 ${CATEGORY_COLORS[selectedProvider.category].icon}`
              })}
              <div>
                <p className={`font-medium ${CATEGORY_COLORS[selectedProvider.category].text}`}>
                  {selectedProvider.shortName}
                </p>
                <p className="text-sm text-gray-600">{selectedProvider.description}</p>
              </div>
            </div>

            {/* Account Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {selectedProvider.accountLabel}
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder={selectedProvider.accountPlaceholder}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                autoFocus
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min={selectedProvider.minAmount}
                  max={Math.min(selectedProvider.maxAmount, walletBalance)}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg text-xl font-bold focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Min: {formatCurrency(selectedProvider.minAmount)} | Max: {formatCurrency(selectedProvider.maxAmount)}
              </p>

              {/* Quick amounts */}
              <div className="flex gap-2 mt-3">
                {QUICK_AMOUNTS[selectedProvider.category].map((quickAmount) => (
                  <button
                    key={quickAmount}
                    onClick={() => setAmount(quickAmount.toString())}
                    disabled={quickAmount > walletBalance}
                    className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 font-medium text-sm"
                  >
                    {currencySymbol}{quickAmount}
                  </button>
                ))}
              </div>
            </div>

            {/* Continue Button */}
            <button
              onClick={handleContinue}
              disabled={
                !accountNumber ||
                !amount ||
                parseFloat(amount) < selectedProvider.minAmount ||
                parseFloat(amount) > Math.min(selectedProvider.maxAmount, walletBalance)
              }
              className="w-full py-4 bg-primary-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
              <ArrowRight className="w-5 h-5" />
            </button>
          </Card>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && selectedProvider && (
          <Card className="p-6 space-y-6">
            <div className="text-center">
              <div className={`w-16 h-16 mx-auto mb-4 ${CATEGORY_COLORS[selectedProvider.category].bg} rounded-full flex items-center justify-center`}>
                {React.createElement(CATEGORY_ICONS[selectedProvider.category], {
                  className: `w-8 h-8 ${CATEGORY_COLORS[selectedProvider.category].icon}`
                })}
              </div>
              <h2 className="text-xl font-bold text-gray-900">Confirm Payment</h2>
              <p className="text-gray-500">{selectedProvider.shortName}</p>
            </div>

            {/* Amount Display */}
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-primary-600">
                {formatCurrency(parseFloat(amount))}
              </p>
            </div>

            {/* Payment Details */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Provider</span>
                <span className="font-medium">{selectedProvider.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{selectedProvider.accountLabel}</span>
                <span className="font-medium">{accountNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Amount</span>
                <span className="font-medium">{formatCurrency(parseFloat(amount))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Fee</span>
                <span className="font-medium text-green-600">FREE</span>
              </div>
            </div>

            {/* Warning */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                Please verify the {selectedProvider.accountLabel.toLowerCase()} before proceeding.
                Payments cannot be reversed.
              </p>
            </div>

            {/* Confirm Button */}
            <button
              onClick={handleConfirmPayment}
              disabled={isProcessing}
              className="w-full py-4 bg-primary-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Receipt className="w-5 h-5" />
                  Pay {formatCurrency(parseFloat(amount))}
                </>
              )}
            </button>

            <button
              onClick={goBack}
              disabled={isProcessing}
              className="w-full py-3 text-gray-600 font-medium hover:text-gray-800 disabled:opacity-50"
            >
              Go Back
            </button>
          </Card>
        )}

        {/* Step: Result */}
        {step === 'result' && result && (
          <Card className="p-6 space-y-6 text-center">
            {result.success ? (
              <>
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Payment Successful!</h2>
                  <p className="text-gray-500 mt-2">
                    Your {selectedProvider?.shortName} payment of {formatCurrency(parseFloat(amount))} was successful.
                  </p>
                </div>

                {/* Token for electricity */}
                {result.token && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <p className="text-sm text-yellow-700 font-medium mb-2">Your Electricity Token</p>
                    <p className="text-2xl font-mono font-bold text-yellow-900 tracking-wider">
                      {result.token}
                    </p>
                    <p className="text-xs text-yellow-600 mt-2">
                      Enter this token on your prepaid meter
                    </p>
                  </div>
                )}

                {result.transactionId && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500">Transaction ID</p>
                    <p className="text-sm font-mono text-gray-700 break-all">
                      {result.transactionId}
                    </p>
                  </div>
                )}

                <button
                  onClick={resetForm}
                  className="w-full py-4 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
                >
                  Pay Another Bill
                </button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Payment Failed</h2>
                  <p className="text-gray-500 mt-2">{result.error}</p>
                </div>
                <button
                  onClick={resetForm}
                  className="w-full py-4 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
                >
                  Try Again
                </button>
              </>
            )}
          </Card>
        )}
      </div>

      {/* Transaction PIN Modal */}
      <TransactionPinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onVerify={verifyTransactionPin}
        amount={amount}
        recipientName={selectedProvider?.shortName || ''}
      />

      {/* Setup PIN Modal */}
      <SetupPinModal
        isOpen={showSetupPinModal}
        onClose={() => setShowSetupPinModal(false)}
        onSuccess={handlePinSetupSuccess}
        userId={user?.id || ''}
      />
    </MainLayout>
  );
}
