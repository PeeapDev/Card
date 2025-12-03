/**
 * Airtime & Data Top-up Page
 *
 * Buy airtime and data bundles for:
 * - Orange SL
 * - Africell
 * - Qcell
 */

import React, { useState, useEffect } from 'react';
import {
  Phone,
  Wifi,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
  Wallet,
  Clock,
  Smartphone,
  Globe,
  AlertCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { MainLayout } from '@/components/layout/MainLayout';
import { TransactionPinModal } from '@/components/ui/TransactionPinModal';
import { SetupPinModal } from '@/components/ui/SetupPinModal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { currencyService, Currency } from '@/services/currency.service';

type TopupType = 'airtime' | 'data';

interface NetworkProvider {
  id: string;
  name: string;
  shortName: string;
  color: string;
  bgColor: string;
  prefixes: string[];
}

interface DataBundle {
  id: string;
  name: string;
  data: string;
  validity: string;
  price: number;
}

interface TopupResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

interface RecentTopup {
  id: string;
  type: TopupType;
  provider: string;
  phoneNumber: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

type Step = 'type' | 'provider' | 'phone' | 'amount' | 'confirm' | 'result';

// Network Providers (Sierra Leone)
const NETWORK_PROVIDERS: NetworkProvider[] = [
  {
    id: 'orange',
    name: 'Orange Sierra Leone',
    shortName: 'Orange',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    prefixes: ['076', '077', '078', '030', '033'],
  },
  {
    id: 'africell',
    name: 'Africell Sierra Leone',
    shortName: 'Africell',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    prefixes: ['025', '040', '044', '088', '099'],
  },
  {
    id: 'qcell',
    name: 'QCell Sierra Leone',
    shortName: 'QCell',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    prefixes: ['032', '034'],
  },
];

// Data bundles by provider
const DATA_BUNDLES: Record<string, DataBundle[]> = {
  orange: [
    { id: 'orange_250mb', name: 'Daily Data', data: '250MB', validity: '1 Day', price: 5 },
    { id: 'orange_500mb', name: 'Small Bundle', data: '500MB', validity: '7 Days', price: 10 },
    { id: 'orange_1gb', name: 'Medium Bundle', data: '1GB', validity: '14 Days', price: 20 },
    { id: 'orange_2gb', name: 'Large Bundle', data: '2GB', validity: '30 Days', price: 35 },
    { id: 'orange_5gb', name: 'Extra Large', data: '5GB', validity: '30 Days', price: 75 },
    { id: 'orange_10gb', name: 'Super Bundle', data: '10GB', validity: '30 Days', price: 120 },
  ],
  africell: [
    { id: 'africell_200mb', name: 'Daily Data', data: '200MB', validity: '1 Day', price: 4 },
    { id: 'africell_500mb', name: 'Weekly Bundle', data: '500MB', validity: '7 Days', price: 9 },
    { id: 'africell_1gb', name: 'Monthly Lite', data: '1GB', validity: '30 Days', price: 18 },
    { id: 'africell_3gb', name: 'Monthly Plus', data: '3GB', validity: '30 Days', price: 45 },
    { id: 'africell_6gb', name: 'Monthly Max', data: '6GB', validity: '30 Days', price: 80 },
    { id: 'africell_unlimited', name: 'Unlimited Night', data: 'Unlimited (10PM-6AM)', validity: '30 Days', price: 50 },
  ],
  qcell: [
    { id: 'qcell_300mb', name: 'Daily Data', data: '300MB', validity: '1 Day', price: 5 },
    { id: 'qcell_750mb', name: 'Weekly Bundle', data: '750MB', validity: '7 Days', price: 12 },
    { id: 'qcell_1.5gb', name: 'Bi-Weekly', data: '1.5GB', validity: '14 Days', price: 22 },
    { id: 'qcell_3gb', name: 'Monthly Value', data: '3GB', validity: '30 Days', price: 40 },
    { id: 'qcell_7gb', name: 'Monthly Premium', data: '7GB', validity: '30 Days', price: 85 },
  ],
};

// Airtime amounts
const AIRTIME_AMOUNTS = [5, 10, 20, 50, 100, 200];

export function AirtimeTopupPage() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('type');
  const [topupType, setTopupType] = useState<TopupType | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<NetworkProvider | null>(null);

  // Form state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedBundle, setSelectedBundle] = useState<DataBundle | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<TopupResult | null>(null);

  // Wallet state
  const [walletId, setWalletId] = useState<string>('');
  const [walletBalance, setWalletBalance] = useState(0);

  // PIN state
  const [showPinModal, setShowPinModal] = useState(false);
  const [showSetupPinModal, setShowSetupPinModal] = useState(false);
  const [hasTransactionPin, setHasTransactionPin] = useState(false);

  // Recent topups
  const [recentTopups, setRecentTopups] = useState<RecentTopup[]>([]);

  // Currency state
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
  }, []);

  const currencySymbol = defaultCurrency?.symbol || 'Le';

  const formatCurrency = (amt: number): string => {
    return `${currencySymbol}${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  useEffect(() => {
    if (user?.id) {
      fetchWallet();
      checkTransactionPin();
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
      fetchRecentTopups(wallet.id);
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

  const fetchRecentTopups = async (wId: string) => {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('wallet_id', wId)
      .in('type', ['AIRTIME', 'DATA'])
      .order('created_at', { ascending: false })
      .limit(5);

    if (transactions && transactions.length > 0) {
      const topups: RecentTopup[] = transactions.map(tx => ({
        id: tx.id,
        type: tx.type === 'AIRTIME' ? 'airtime' : 'data',
        provider: tx.metadata?.provider_name || 'Unknown',
        phoneNumber: tx.metadata?.phone_number || '',
        amount: Math.abs(tx.amount),
        date: tx.created_at,
        status: tx.status === 'COMPLETED' ? 'completed' : tx.status === 'PENDING' ? 'pending' : 'failed',
      }));
      setRecentTopups(topups);
    }
  };

  // Auto-detect network from phone number
  const detectNetwork = (phone: string): NetworkProvider | null => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 3) return null;

    const prefix = cleanPhone.substring(0, 3);

    for (const provider of NETWORK_PROVIDERS) {
      if (provider.prefixes.includes(prefix)) {
        return provider;
      }
    }
    return null;
  };

  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value);
    const detected = detectNetwork(value);
    if (detected && !selectedProvider) {
      setSelectedProvider(detected);
    }
  };

  const handleTypeSelect = (type: TopupType) => {
    setTopupType(type);
    setStep('phone');
  };

  const handlePhoneContinue = () => {
    if (!phoneNumber || phoneNumber.length < 9) return;

    // Auto-detect network if not selected
    if (!selectedProvider) {
      const detected = detectNetwork(phoneNumber);
      if (detected) {
        setSelectedProvider(detected);
      }
    }

    if (topupType === 'airtime') {
      setStep('amount');
    } else {
      setStep('amount'); // Show data bundles
    }
  };

  const handleContinue = () => {
    const payAmount = topupType === 'data' && selectedBundle
      ? selectedBundle.price
      : parseFloat(amount);

    if (payAmount > walletBalance) {
      setResult({ success: false, error: 'Insufficient balance' });
      setStep('result');
      return;
    }

    setStep('confirm');
  };

  const handleConfirmTopup = () => {
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
      await processTopup();
      return true;
    }

    return false;
  };

  const processTopup = async () => {
    if (!selectedProvider || !phoneNumber || !user?.id || !walletId) return;

    const payAmount = topupType === 'data' && selectedBundle
      ? selectedBundle.price
      : parseFloat(amount);

    setIsProcessing(true);

    try {
      // Check balance
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', walletId)
        .single();

      if (!wallet || wallet.balance < payAmount) {
        setResult({ success: false, error: 'Insufficient balance' });
        setStep('result');
        return;
      }

      // Generate transaction ID
      const transactionId = `topup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Deduct from wallet
      const { error: deductError } = await supabase
        .from('wallets')
        .update({
          balance: wallet.balance - payAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', walletId);

      if (deductError) throw deductError;

      // Create transaction record
      await supabase.from('transactions').insert({
        external_id: transactionId,
        wallet_id: walletId,
        type: topupType === 'airtime' ? 'AIRTIME' : 'DATA',
        amount: -payAmount,
        currency: defaultCurrency?.code || 'SLE',
        status: 'COMPLETED',
        description: topupType === 'airtime'
          ? `${selectedProvider.shortName} Airtime - ${phoneNumber}`
          : `${selectedProvider.shortName} ${selectedBundle?.data} Data - ${phoneNumber}`,
        metadata: {
          provider_id: selectedProvider.id,
          provider_name: selectedProvider.shortName,
          phone_number: phoneNumber,
          topup_type: topupType,
          bundle: selectedBundle ? {
            id: selectedBundle.id,
            name: selectedBundle.name,
            data: selectedBundle.data,
            validity: selectedBundle.validity,
          } : null,
        },
      });

      setResult({
        success: true,
        transactionId,
      });
      setStep('result');
      fetchWallet();

    } catch (error: any) {
      console.error('Topup error:', error);
      setResult({
        success: false,
        error: error.message || 'Top-up failed. Please try again.',
      });
      setStep('result');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setStep('type');
    setTopupType(null);
    setSelectedProvider(null);
    setPhoneNumber('');
    setAmount('');
    setSelectedBundle(null);
    setResult(null);
    fetchWallet();
  };

  const goBack = () => {
    switch (step) {
      case 'phone':
        setTopupType(null);
        setStep('type');
        break;
      case 'amount':
        setStep('phone');
        break;
      case 'confirm':
        setStep('amount');
        break;
      default:
        setStep('type');
    }
  };

  const getPayAmount = () => {
    return topupType === 'data' && selectedBundle
      ? selectedBundle.price
      : parseFloat(amount) || 0;
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          {step !== 'type' && step !== 'result' && (
            <button onClick={goBack} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Airtime & Data</h1>
            <p className="text-gray-500">Top up instantly</p>
          </div>
        </div>

        {/* Balance Card */}
        <Card className="p-4 bg-gradient-to-r from-purple-600 to-purple-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-100">Available Balance</p>
              <p className="text-3xl font-bold">{formatCurrency(walletBalance)}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <Wallet className="w-8 h-8" />
            </div>
          </div>
        </Card>

        {/* Step: Select Type */}
        {step === 'type' && (
          <>
            <Card className="p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">What do you need?</h2>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleTypeSelect('airtime')}
                  className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-colors"
                >
                  <div className="p-4 bg-green-100 rounded-full">
                    <Phone className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">Airtime</p>
                    <p className="text-sm text-gray-500">Buy call credit</p>
                  </div>
                </button>

                <button
                  onClick={() => handleTypeSelect('data')}
                  className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-colors"
                >
                  <div className="p-4 bg-blue-100 rounded-full">
                    <Globe className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">Data Bundle</p>
                    <p className="text-sm text-gray-500">Buy internet data</p>
                  </div>
                </button>
              </div>
            </Card>

            {/* Recent Topups */}
            {recentTopups.length > 0 && (
              <Card className="p-6 space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  Recent Top-ups
                </h3>
                <div className="space-y-2">
                  {recentTopups.map((topup) => (
                    <div
                      key={topup.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${topup.type === 'airtime' ? 'bg-green-100' : 'bg-blue-100'}`}>
                          {topup.type === 'airtime'
                            ? <Phone className="w-4 h-4 text-green-600" />
                            : <Globe className="w-4 h-4 text-blue-600" />
                          }
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{topup.provider}</p>
                          <p className="text-sm text-gray-500">{topup.phoneNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(topup.amount)}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(topup.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {/* Step: Enter Phone Number */}
        {step === 'phone' && (
          <Card className="p-6 space-y-6">
            <h2 className="font-semibold text-gray-900">
              Enter Phone Number
            </h2>

            {/* Phone Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mobile Number
              </label>
              <div className="relative">
                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="076 123 4567"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Network Detection */}
            {selectedProvider && (
              <div className={`flex items-center gap-3 p-3 ${selectedProvider.bgColor} rounded-lg`}>
                <div className={`p-2 bg-white rounded-full`}>
                  <Wifi className={`w-4 h-4 ${selectedProvider.color}`} />
                </div>
                <span className={`font-medium ${selectedProvider.color}`}>
                  {selectedProvider.name} detected
                </span>
              </div>
            )}

            {/* Network Selector */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Or select network manually:</p>
              <div className="grid grid-cols-3 gap-2">
                {NETWORK_PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => setSelectedProvider(provider)}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      selectedProvider?.id === provider.id
                        ? `${provider.bgColor} border-current ${provider.color}`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className={`font-medium text-sm ${selectedProvider?.id === provider.id ? provider.color : 'text-gray-700'}`}>
                      {provider.shortName}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handlePhoneContinue}
              disabled={!phoneNumber || phoneNumber.length < 9 || !selectedProvider}
              className="w-full py-4 bg-primary-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
              <ArrowRight className="w-5 h-5" />
            </button>
          </Card>
        )}

        {/* Step: Select Amount (Airtime) or Bundle (Data) */}
        {step === 'amount' && (
          <Card className="p-6 space-y-6">
            {/* Phone Info */}
            <div className={`flex items-center gap-3 p-3 ${selectedProvider?.bgColor} rounded-lg`}>
              <Smartphone className={`w-5 h-5 ${selectedProvider?.color}`} />
              <div>
                <p className={`font-medium ${selectedProvider?.color}`}>{phoneNumber}</p>
                <p className="text-sm text-gray-600">{selectedProvider?.name}</p>
              </div>
            </div>

            {topupType === 'airtime' ? (
              <>
                <h2 className="font-semibold text-gray-900">Select Airtime Amount</h2>

                {/* Quick Amounts */}
                <div className="grid grid-cols-3 gap-3">
                  {AIRTIME_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setAmount(amt.toString())}
                      disabled={amt > walletBalance}
                      className={`p-4 rounded-xl border-2 transition-colors ${
                        amount === amt.toString()
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300'
                      } disabled:opacity-50`}
                    >
                      <p className="text-xl font-bold">{formatCurrency(amt)}</p>
                    </button>
                  ))}
                </div>

                {/* Custom Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Or enter custom amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max={walletBalance}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-semibold text-gray-900">Select Data Bundle</h2>

                {/* Data Bundles */}
                <div className="space-y-3">
                  {(DATA_BUNDLES[selectedProvider?.id || ''] || []).map((bundle) => (
                    <button
                      key={bundle.id}
                      onClick={() => {
                        setSelectedBundle(bundle);
                        setAmount(bundle.price.toString());
                      }}
                      disabled={bundle.price > walletBalance}
                      className={`w-full p-4 rounded-xl border-2 transition-colors text-left ${
                        selectedBundle?.id === bundle.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      } disabled:opacity-50`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-900">{bundle.data}</p>
                          <p className="text-sm text-gray-500">{bundle.validity}</p>
                        </div>
                        <p className="text-xl font-bold text-primary-600">
                          {formatCurrency(bundle.price)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            <button
              onClick={handleContinue}
              disabled={
                topupType === 'airtime'
                  ? (!amount || parseFloat(amount) <= 0 || parseFloat(amount) > walletBalance)
                  : !selectedBundle
              }
              className="w-full py-4 bg-primary-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
              <ArrowRight className="w-5 h-5" />
            </button>
          </Card>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && (
          <Card className="p-6 space-y-6">
            <div className="text-center">
              <div className={`w-16 h-16 mx-auto mb-4 ${selectedProvider?.bgColor} rounded-full flex items-center justify-center`}>
                {topupType === 'airtime'
                  ? <Phone className={`w-8 h-8 ${selectedProvider?.color}`} />
                  : <Globe className={`w-8 h-8 ${selectedProvider?.color}`} />
                }
              </div>
              <h2 className="text-xl font-bold text-gray-900">Confirm Top-up</h2>
              <p className="text-gray-500">{selectedProvider?.shortName}</p>
            </div>

            {/* Amount Display */}
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-primary-600">
                {formatCurrency(getPayAmount())}
              </p>
              {topupType === 'data' && selectedBundle && (
                <p className="text-lg text-gray-600 mt-1">
                  {selectedBundle.data} • {selectedBundle.validity}
                </p>
              )}
            </div>

            {/* Details */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Phone Number</span>
                <span className="font-medium">{phoneNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Network</span>
                <span className="font-medium">{selectedProvider?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Type</span>
                <span className="font-medium capitalize">{topupType}</span>
              </div>
              {topupType === 'data' && selectedBundle && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Bundle</span>
                  <span className="font-medium">{selectedBundle.data} / {selectedBundle.validity}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Amount</span>
                <span className="font-medium">{formatCurrency(getPayAmount())}</span>
              </div>
            </div>

            {/* Warning */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                Please verify the phone number before proceeding. Top-ups cannot be reversed.
              </p>
            </div>

            {/* Confirm Button */}
            <button
              onClick={handleConfirmTopup}
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
                  <CheckCircle className="w-5 h-5" />
                  Confirm Top-up
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
                  <h2 className="text-2xl font-bold text-gray-900">Top-up Successful!</h2>
                  <p className="text-gray-500 mt-2">
                    {formatCurrency(getPayAmount())} {topupType === 'airtime' ? 'airtime' : 'data'} sent to {phoneNumber}
                  </p>
                </div>

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
                  Buy More
                </button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Top-up Failed</h2>
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
        amount={getPayAmount().toString()}
        recipientName={`${selectedProvider?.shortName || ''} ${topupType || ''}`}
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
