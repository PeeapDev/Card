import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Wallet, Plus, ArrowDownRight, ArrowUpRight, MoreVertical, Snowflake, Send, QrCode, Copy, CheckCircle, Search, User, X, AlertCircle, PiggyBank, ChevronDown, Loader2, XCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, Button } from '@/components/ui';
import { MainLayout } from '@/components/layout/MainLayout';
import { CreatePotModal } from '@/components/pots';
import { useWallets, useCreateWallet, useDeposit, useTransfer, useFreezeWallet, useUnfreezeWallet } from '@/hooks/useWallets';
import { clsx } from 'clsx';
import type { Wallet as WalletType } from '@/types';
import { supabase } from '@/lib/supabase';
import { monimeService, toMinorUnits } from '@/services/monime.service';
import { PaymentQRCode } from '@/components/payment/PaymentQRCode';
import { useAuth } from '@/context/AuthContext';
import { currencyService, Currency } from '@/services/currency.service';

interface Recipient {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  walletId?: string;
}

export function WalletsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: wallets, isLoading, refetch } = useWallets();
  const createWallet = useCreateWallet();
  const deposit = useDeposit();
  const transfer = useTransfer();
  const freezeWallet = useFreezeWallet();
  const unfreezeWallet = useUnfreezeWallet();

  // Currencies for formatting
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  // Toast notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'cancelled'; message: string } | null>(null);

  useEffect(() => {
    currencyService.getCurrencies().then(setCurrencies);
  }, []);

  // Handle deposit result from URL params
  useEffect(() => {
    const depositStatus = searchParams.get('deposit');
    const amount = searchParams.get('amount');
    const currency = searchParams.get('currency') || 'SLE';
    const message = searchParams.get('message');

    if (depositStatus) {
      // Refetch wallets to get updated balance
      refetch();

      if (depositStatus === 'success') {
        const amountStr = amount ? ` Le ${Number(amount).toLocaleString()}` : '';
        setToast({ type: 'success', message: `Deposit successful!${amountStr} added to your wallet.` });
      } else if (depositStatus === 'cancelled') {
        setToast({ type: 'cancelled', message: 'Deposit was cancelled. No funds were added.' });
      } else if (depositStatus === 'error') {
        setToast({ type: 'error', message: message || 'Deposit failed. Please try again.' });
      }

      // Clear the URL params after showing toast
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, refetch]);

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Get currency symbol by code
  const getCurrencySymbol = (code: string): string => {
    // SLE is the new Sierra Leone Leone after redenomination - symbol is "Le"
    if (code === 'SLE') return 'Le';
    return currencies.find(c => c.code === code)?.symbol || code;
  };

  // Format amount with correct currency symbol
  const formatCurrency = (amount: number, currencyCode: string): string => {
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreatePotModal, setShowCreatePotModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<WalletType | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState('');
  const [newWalletCurrency, setNewWalletCurrency] = useState<'USD' | 'SLE'>('SLE');
  const [createWalletError, setCreateWalletError] = useState('');

  // Transfer state
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDescription, setTransferDescription] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Recipient[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Search for recipient by email or phone
  const searchRecipient = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .or(`email.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(5);

      if (error) {
        console.error('Error searching recipient:', error);
        setSearchResults([]);
        return;
      }

      setSearchResults(data?.map(u => ({
        id: u.id,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
      })) || []);
    } catch (error) {
      console.error('Error searching recipient:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedWallet || !transferAmount || !selectedRecipient) return;

    setTransferError('');

    const amount = parseFloat(transferAmount);
    if (amount <= 0) {
      setTransferError('Amount must be greater than 0');
      return;
    }
    if (amount > selectedWallet.balance) {
      setTransferError('Insufficient balance');
      return;
    }

    try {
      // For now, we'll use the recipient's ID as the target wallet
      // In production, you'd need to get their wallet ID or create a wallet-to-user transfer
      await transfer.mutateAsync({
        fromWalletId: selectedWallet.id,
        toWalletId: selectedRecipient.id, // This would be the recipient's wallet ID
        amount: amount,
        description: transferDescription || `Transfer to ${selectedRecipient.firstName} ${selectedRecipient.lastName}`,
      });

      setTransferSuccess(true);
      setTimeout(() => {
        setShowTransferModal(false);
        resetTransferState();
      }, 2000);
    } catch (error: any) {
      setTransferError(error.message || 'Transfer failed. Please try again.');
    }
  };

  const resetTransferState = () => {
    setTransferAmount('');
    setTransferDescription('');
    setRecipientSearch('');
    setSearchResults([]);
    setSelectedRecipient(null);
    setTransferError('');
    setTransferSuccess(false);
    setSelectedWallet(null);
  };

  const copyWalletId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateWallet = async () => {
    setCreateWalletError('');
    try {
      await createWallet.mutateAsync({ currency: newWalletCurrency });
      setShowCreateModal(false);
      setNewWalletCurrency('SLE'); // Reset to default
    } catch (error: any) {
      console.error('Failed to create wallet:', error);
      setCreateWalletError(error.message || 'Failed to create wallet. Please try again.');
    }
  };

  const handleDeposit = async () => {
    if (!selectedWallet || !depositAmount) return;

    const amount = parseFloat(depositAmount);
    if (amount <= 0) {
      setDepositError('Amount must be greater than 0');
      return;
    }

    setDepositLoading(true);
    setDepositError('');

    try {
      // Convert to minor units (cents) for Monime
      const amountInMinorUnits = toMinorUnits(amount);

      // Call our API endpoint to create Monime checkout session
      const response = await fetch('/api/monime/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletId: selectedWallet.id,
          amount: amountInMinorUnits,
          currency: 'SLE',
          userId: user?.id,
          description: `Deposit to ${selectedWallet.currency} wallet`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.paymentUrl) {
        // Redirect to Monime checkout page
        window.location.href = data.paymentUrl;
      } else {
        setDepositError('Failed to get payment URL. Please try again.');
      }
    } catch (error: any) {
      console.error('Failed to initiate deposit:', error);
      setDepositError(error.message || 'Failed to initiate deposit. Please try again.');
    } finally {
      setDepositLoading(false);
    }
  };

  const handleFreeze = async (wallet: WalletType) => {
    try {
      if (wallet.status === 'FROZEN') {
        await unfreezeWallet.mutateAsync(wallet.id);
      } else {
        await freezeWallet.mutateAsync(wallet.id);
      }
    } catch (error) {
      console.error('Failed to update wallet status:', error);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Toast Notification */}
        {toast && (
          <div
            className={clsx(
              'fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-top-2 max-w-md',
              toast.type === 'success' && 'bg-green-50 border border-green-200 text-green-800',
              toast.type === 'cancelled' && 'bg-yellow-50 border border-yellow-200 text-yellow-800',
              toast.type === 'error' && 'bg-red-50 border border-red-200 text-red-800'
            )}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />}
            {toast.type === 'cancelled' && <XCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
            <p className="text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => setToast(null)}
              className="ml-auto p-1 hover:bg-black/5 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Wallets</h1>
            <p className="text-gray-500 mt-1">Manage your digital wallets</p>
          </div>

          {/* Create Dropdown */}
          <div className="relative">
            <Button onClick={() => setShowCreateDropdown(!showCreateDropdown)}>
              <Plus className="w-4 h-4 mr-2" />
              Create
              <ChevronDown className={clsx(
                'w-4 h-4 ml-2 transition-transform',
                showCreateDropdown && 'rotate-180'
              )} />
            </Button>

            {showCreateDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowCreateDropdown(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
                  <button
                    onClick={() => {
                      setShowCreateDropdown(false);
                      setShowCreateModal(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Wallet</p>
                      <p className="text-xs text-gray-500">Regular spending wallet</p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateDropdown(false);
                      setShowCreatePotModal(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <PiggyBank className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Savings Pot</p>
                      <p className="text-xs text-gray-500">Locked savings goal</p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Wallets grid */}
        {isLoading ? (
          <div className="text-center py-12">Loading wallets...</div>
        ) : wallets && wallets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wallets.map((wallet) => (
              <Card key={wallet.id} className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div
                      className={clsx(
                        'w-12 h-12 rounded-full flex items-center justify-center',
                        wallet.status === 'ACTIVE' ? 'bg-primary-100' : 'bg-gray-100'
                      )}
                    >
                      <Wallet
                        className={clsx(
                          'w-6 h-6',
                          wallet.status === 'ACTIVE' ? 'text-primary-600' : 'text-gray-400'
                        )}
                      />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{wallet.currency} Wallet</p>
                      <p
                        className={clsx(
                          'text-xs',
                          wallet.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-500'
                        )}
                      >
                        {wallet.status}
                      </p>
                    </div>
                  </div>
                  <button className="p-1 rounded hover:bg-gray-100">
                    <MoreVertical className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-500">Balance</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(wallet.balance, wallet.currency)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4 text-xs text-gray-500">
                  <div>
                    <p>Daily Limit</p>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(wallet.dailyLimit, wallet.currency)}
                    </p>
                  </div>
                  <div>
                    <p>Monthly Limit</p>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(wallet.monthlyLimit, wallet.currency)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedWallet(wallet);
                      setShowDepositModal(true);
                    }}
                    disabled={wallet.status !== 'ACTIVE'}
                  >
                    <ArrowDownRight className="w-4 h-4 mr-1" />
                    Deposit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedWallet(wallet);
                      setShowTransferModal(true);
                    }}
                    disabled={wallet.status !== 'ACTIVE'}
                  >
                    <ArrowUpRight className="w-4 h-4 mr-1" />
                    Send
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedWallet(wallet);
                      setShowReceiveModal(true);
                    }}
                    disabled={wallet.status !== 'ACTIVE'}
                    title="Receive Money"
                  >
                    <QrCode className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFreeze(wallet)}
                    title={wallet.status === 'FROZEN' ? 'Unfreeze' : 'Freeze'}
                  >
                    <Snowflake
                      className={clsx(
                        'w-4 h-4',
                        wallet.status === 'FROZEN' ? 'text-blue-500' : 'text-gray-400'
                      )}
                    />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No wallets yet</h3>
            <p className="text-gray-500 mb-6">Create your first wallet or savings pot to get started</p>
            <div className="flex justify-center gap-4">
              <Button onClick={() => setShowCreateModal(true)}>
                <Wallet className="w-4 h-4 mr-2" />
                Create Wallet
              </Button>
              <Button variant="outline" onClick={() => setShowCreatePotModal(true)}>
                <PiggyBank className="w-4 h-4 mr-2" />
                Create Pot
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Create Wallet Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create New Wallet</CardTitle>
            </CardHeader>
            <p className="text-gray-500 mb-4">Choose the currency for your new wallet.</p>

            {/* Currency Selection */}
            <div className="mb-6 space-y-3">
              <button
                onClick={() => setNewWalletCurrency('SLE')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  newWalletCurrency === 'SLE'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  newWalletCurrency === 'SLE' ? 'bg-primary-100' : 'bg-gray-100'
                }`}>
                  <span className="text-xl font-bold text-primary-600">Le</span>
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-gray-900">Leone Wallet (SLE)</p>
                  <p className="text-sm text-gray-500">For mobile money payouts</p>
                </div>
                {newWalletCurrency === 'SLE' && (
                  <CheckCircle className="w-5 h-5 text-primary-600" />
                )}
              </button>

              <button
                onClick={() => setNewWalletCurrency('USD')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  newWalletCurrency === 'USD'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  newWalletCurrency === 'USD' ? 'bg-primary-100' : 'bg-gray-100'
                }`}>
                  <span className="text-xl font-bold text-green-600">$</span>
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-gray-900">US Dollar Wallet (USD)</p>
                  <p className="text-sm text-gray-500">For international transactions</p>
                </div>
                {newWalletCurrency === 'USD' && (
                  <CheckCircle className="w-5 h-5 text-primary-600" />
                )}
              </button>
            </div>

            {/* Error Message */}
            {createWalletError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{createWalletError}</span>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateWalletError('');
                  setNewWalletCurrency('SLE');
                }}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleCreateWallet} isLoading={createWallet.isPending}>
                Create {newWalletCurrency} Wallet
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Deposit Modal */}
      {showDepositModal && selectedWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <Card className="w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ArrowDownRight className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Add Funds</h2>
                  <p className="text-sm text-gray-500">Deposit to {selectedWallet.currency} Wallet</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDepositModal(false);
                  setDepositAmount('');
                  setDepositError('');
                  setSelectedWallet(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Current Balance */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Current Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  Le {selectedWallet.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount to Deposit</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">Le</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={depositAmount}
                    onChange={(e) => {
                      setDepositAmount(e.target.value);
                      setDepositError('');
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                    disabled={depositLoading}
                  />
                </div>
                {/* Quick amount buttons */}
                <div className="flex gap-2 mt-2">
                  {[10, 50, 100, 500].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setDepositAmount(amount.toString())}
                      className="flex-1 px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                      disabled={depositLoading}
                    >
                      Le {amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Notice */}
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <ArrowDownRight className="w-4 h-4 text-orange-600 mt-0.5" />
                  <p className="text-sm text-orange-800">
                    Add money with Orange Money
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {depositError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{depositError}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowDepositModal(false);
                    setDepositAmount('');
                    setDepositError('');
                    setSelectedWallet(null);
                  }}
                  disabled={depositLoading}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleDeposit}
                  disabled={!depositAmount || parseFloat(depositAmount) <= 0 || depositLoading}
                >
                  {depositLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="w-4 h-4 mr-2" />
                      Deposit Le {depositAmount || '0.00'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Transfer/Send Money Modal */}
      {showTransferModal && selectedWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Send className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Send Money</h2>
                  <p className="text-sm text-gray-500">Transfer from {selectedWallet.currency} Wallet</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  resetTransferState();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {transferSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Transfer Successful!</h3>
                <p className="text-gray-500">
                  {getCurrencySymbol(selectedWallet.currency)}{transferAmount} has been sent to {selectedRecipient?.firstName} {selectedRecipient?.lastName}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Wallet Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Send from Wallet
                  </label>
                  <select
                    value={selectedWallet.id}
                    onChange={(e) => {
                      const wallet = wallets?.find(w => w.id === e.target.value);
                      if (wallet) setSelectedWallet(wallet);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    {wallets?.filter(w => w.status === 'ACTIVE').map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.currency} Wallet - {formatCurrency(wallet.balance, wallet.currency)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Available Balance */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Available Balance</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(selectedWallet.balance, selectedWallet.currency)}
                  </p>
                </div>

                {/* Recipient Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Send to (Email or Phone)
                  </label>
                  {selectedRecipient ? (
                    <div className="flex items-center justify-between p-3 bg-primary-50 border border-primary-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {selectedRecipient.firstName} {selectedRecipient.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{selectedRecipient.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedRecipient(null)}
                        className="p-1 hover:bg-primary-100 rounded"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={recipientSearch}
                        onChange={(e) => {
                          setRecipientSearch(e.target.value);
                          searchRecipient(e.target.value);
                        }}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Search by email or phone..."
                      />
                      {isSearching && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}

                      {/* Search Results Dropdown */}
                      {searchResults.length > 0 && !selectedRecipient && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {searchResults.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => {
                                setSelectedRecipient(user);
                                setRecipientSearch('');
                                setSearchResults([]);
                              }}
                              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
                            >
                              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-gray-500" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">{getCurrencySymbol(selectedWallet.currency)}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="0.00"
                    />
                  </div>
                  {/* Quick amount buttons */}
                  <div className="flex gap-2 mt-2">
                    {[10, 25, 50, 100].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setTransferAmount(amount.toString())}
                        className="flex-1 px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                      >
                        {getCurrencySymbol(selectedWallet.currency)}{amount}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={transferDescription}
                    onChange={(e) => setTransferDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="What's this for?"
                  />
                </div>

                {/* Error Message */}
                {transferError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{transferError}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowTransferModal(false);
                      resetTransferState();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleTransfer}
                    isLoading={transfer.isPending}
                    disabled={!selectedRecipient || !transferAmount || parseFloat(transferAmount) <= 0}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send {getCurrencySymbol(selectedWallet.currency)}{transferAmount || '0.00'}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Receive Money Modal */}
      {showReceiveModal && selectedWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <Card className="w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ArrowDownRight className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Receive Money</h2>
                  <p className="text-sm text-gray-500">Share your wallet details</p>
                </div>
              </div>
              <button
                onClick={() => setShowReceiveModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* QR Code - Generated for this wallet */}
              {user && (
                <div className="flex justify-center p-4 bg-gray-50 rounded-lg">
                  <PaymentQRCode
                    userId={user.id}
                    walletId={selectedWallet.id}
                    type="static"
                    size={180}
                    currency={selectedWallet.currency}
                  />
                </div>
              )}

              {/* Wallet ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Wallet ID
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={selectedWallet.id}
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() => copyWalletId(selectedWallet.id)}
                  >
                    {copied ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <p className="text-sm text-gray-500 text-center">
                Scan this QR code or share your wallet ID to receive money
              </p>

              <Button
                className="w-full"
                onClick={() => setShowReceiveModal(false)}
              >
                Done
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Create Pot Modal */}
      <CreatePotModal
        isOpen={showCreatePotModal}
        onClose={() => setShowCreatePotModal(false)}
        onSuccess={() => {
          setShowCreatePotModal(false);
          navigate('/pots');
        }}
      />
    </MainLayout>
  );
}
