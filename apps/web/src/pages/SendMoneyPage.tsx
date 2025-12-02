/**
 * Send Money Page - Production Ready
 *
 * Real P2P transfers with:
 * - QR Code scanning (camera)
 * - NFC tap-to-pay
 * - Manual recipient search (phone/email/wallet)
 * - Transaction PIN verification
 * - Slide to send confirmation
 * - Profile avatars with initials
 */

import { useState, useEffect } from 'react';
import {
  Send,
  Phone,
  QrCode,
  Wallet,
  ArrowRight,
  CheckCircle,
  XCircle,
  Loader2,
  User,
  DollarSign,
  AlertCircle,
  Wifi,
  Search,
  ArrowLeft,
  AtSign,
  Lock,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { MainLayout } from '@/components/layout/MainLayout';
import { QRScanner } from '@/components/payment/QRScanner';
import { NFCPayment } from '@/components/payment/NFCPayment';
import { UserSearch } from '@/components/ui/UserSearch';
import { SlideToSend } from '@/components/ui/SlideToSend';
import { TransactionPinModal } from '@/components/ui/TransactionPinModal';
import { SetupPinModal } from '@/components/ui/SetupPinModal';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { qrEngine, QRValidationResult } from '@/services/qr-engine';

interface Recipient {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  phone?: string;
  walletId: string;
  profilePicture?: string;
}

interface TransferResult {
  success: boolean;
  transactionId?: string;
  fee?: number;
  error?: string;
}

interface RecentTransfer {
  id: string;
  recipientName: string;
  recipientId: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

type SendMethod = 'search' | 'qr' | 'nfc';
type Step = 'method' | 'scan' | 'recipient' | 'amount' | 'confirm' | 'result';

export function SendMoneyPage() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('method');
  const [sendMethod, setSendMethod] = useState<SendMethod>('search');

  // Recipient state
  const [recipient, setRecipient] = useState<Recipient | null>(null);

  // Transfer state
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<TransferResult | null>(null);

  // Wallet state
  const [walletId, setWalletId] = useState<string>('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [fee, setFee] = useState(0);

  // PIN Modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [showSetupPinModal, setShowSetupPinModal] = useState(false);
  const [hasTransactionPin, setHasTransactionPin] = useState(false);

  // Recent transfers
  const [recentTransfers, setRecentTransfers] = useState<RecentTransfer[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchWallet();
      fetchRecentTransfers();
      checkTransactionPin();
    }
  }, [user?.id]);

  // Check for pre-selected recipient from dashboard
  useEffect(() => {
    const storedRecipient = sessionStorage.getItem('sendMoneyRecipient');
    if (storedRecipient) {
      try {
        const parsedRecipient = JSON.parse(storedRecipient);
        sessionStorage.removeItem('sendMoneyRecipient');

        const fetchRecipientWallet = async () => {
          const { data: wallet } = await supabase
            .from('wallets')
            .select('id')
            .eq('user_id', parsedRecipient.id)
            .eq('wallet_type', 'primary')
            .single();

          if (wallet) {
            setRecipient({
              id: parsedRecipient.id,
              name: `${parsedRecipient.first_name} ${parsedRecipient.last_name}`,
              firstName: parsedRecipient.first_name,
              lastName: parsedRecipient.last_name,
              username: parsedRecipient.username || undefined,
              email: parsedRecipient.email || undefined,
              phone: parsedRecipient.phone || undefined,
              walletId: wallet.id,
            });
            setStep('amount');
          }
        };

        fetchRecipientWallet();
      } catch (e) {
        console.error('Error parsing stored recipient:', e);
        sessionStorage.removeItem('sendMoneyRecipient');
      }
    }
  }, []);

  useEffect(() => {
    // Calculate fee (1% with $0.10 minimum)
    const amountNum = parseFloat(amount) || 0;
    const calculatedFee = Math.max(amountNum * 0.01, 0.10);
    setFee(amountNum > 0 ? calculatedFee : 0);
  }, [amount]);

  const checkTransactionPin = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('users')
      .select('transaction_pin')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error checking transaction PIN:', error);
      setHasTransactionPin(false);
      return;
    }

    const hasPin = !!data?.transaction_pin;
    console.log('Transaction PIN check:', { hasPin, userId: user.id });
    setHasTransactionPin(hasPin);
  };

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
      fetchRecentTransfers(wallet.id);
    }
  };

  const fetchRecentTransfers = async (wId?: string) => {
    const walletIdToUse = wId || walletId;
    if (!walletIdToUse) return;

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('wallet_id', walletIdToUse)
      .eq('type', 'TRANSFER')
      .lt('amount', 0)
      .order('created_at', { ascending: false })
      .limit(5);

    if (transactions && transactions.length > 0) {
      const transfers: RecentTransfer[] = transactions.map(tx => ({
        id: tx.id,
        recipientName: tx.metadata?.recipient_name || 'Unknown',
        recipientId: tx.metadata?.recipient_id || '',
        amount: Math.abs(tx.amount),
        date: tx.created_at,
        status: tx.status === 'COMPLETED' ? 'completed' : tx.status === 'PENDING' ? 'pending' : 'failed',
      }));
      setRecentTransfers(transfers);
    }
  };

  const handleQRScan = async (result: QRValidationResult) => {
    if (result.valid && result.recipient) {
      setRecipient({
        id: result.recipient.id,
        name: result.recipient.name,
        walletId: result.recipient.walletId,
      });

      if (result.data?.amount) {
        setAmount(result.data.amount.toString());
      }

      setStep('amount');
    } else {
      setResult({
        success: false,
        error: result.error || 'Invalid QR code',
      });
      setStep('result');
    }
  };

  const handleContinue = () => {
    if (!recipient || !amount || parseFloat(amount) <= 0) return;
    if (parseFloat(amount) > walletBalance) {
      setResult({ success: false, error: 'Insufficient balance' });
      setStep('result');
      return;
    }
    setStep('confirm');
  };

  const handleSlideConfirm = () => {
    console.log('handleSlideConfirm called, hasTransactionPin:', hasTransactionPin);
    // If user doesn't have a PIN set, prompt them to set one
    if (!hasTransactionPin) {
      console.log('Opening SetupPinModal');
      setShowSetupPinModal(true);
      return;
    }
    // If user has a PIN set, require verification
    console.log('Opening TransactionPinModal');
    setShowPinModal(true);
  };

  const handlePinSetupSuccess = () => {
    setShowSetupPinModal(false);
    setHasTransactionPin(true);
    // After PIN is set, show the verification modal
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
      await processTransfer();
      return true;
    }

    return false;
  };

  const processTransfer = async () => {
    if (!recipient || !amount || !user?.id || !walletId) return;

    setIsProcessing(true);
    const amountNum = parseFloat(amount);
    const totalAmount = amountNum;

    try {
      // Check balance again
      const { data: senderWallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', walletId)
        .single();

      if (!senderWallet || senderWallet.balance < totalAmount) {
        setResult({ success: false, error: 'Insufficient balance' });
        setStep('result');
        return;
      }

      // Generate transaction ID
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Deduct from sender
      const { error: deductError } = await supabase
        .from('wallets')
        .update({
          balance: senderWallet.balance - totalAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', walletId);

      if (deductError) throw deductError;

      // Add to recipient
      const { data: recipientWallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', recipient.walletId)
        .single();

      if (recipientWallet) {
        const netAmount = amountNum - fee;
        await supabase
          .from('wallets')
          .update({
            balance: recipientWallet.balance + netAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', recipient.walletId);
      }

      // Create transaction records
      await supabase.from('transactions').insert([
        {
          external_id: `${transactionId}_out`,
          wallet_id: walletId,
          type: 'TRANSFER',
          amount: -amountNum,
          fee: fee,
          currency: 'USD',
          status: 'COMPLETED',
          description: note || `Transfer to ${recipient.name}`,
          metadata: {
            recipient_id: recipient.id,
            recipient_wallet: recipient.walletId,
            recipient_name: recipient.name,
            method: sendMethod,
          },
        },
        {
          external_id: `${transactionId}_in`,
          wallet_id: recipient.walletId,
          type: 'TRANSFER',
          amount: amountNum - fee,
          currency: 'USD',
          status: 'COMPLETED',
          description: note || `Transfer from ${user.firstName} ${user.lastName}`,
          metadata: {
            sender_id: user.id,
            sender_wallet: walletId,
            sender_name: `${user.firstName} ${user.lastName}`,
            method: sendMethod,
          },
        },
      ]);

      setResult({
        success: true,
        transactionId,
        fee,
      });
      setStep('result');
      fetchWallet();

    } catch (error: any) {
      console.error('Transfer error:', error);
      setResult({
        success: false,
        error: error.message || 'Transfer failed. Please try again.',
      });
      setStep('result');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setStep('method');
    setSendMethod('search');
    setRecipient(null);
    setAmount('');
    setNote('');
    setResult(null);
    fetchWallet();
  };

  const goBack = () => {
    switch (step) {
      case 'scan':
        setStep('method');
        break;
      case 'recipient':
        setStep('method');
        break;
      case 'amount':
        setRecipient(null);
        setStep(sendMethod === 'search' ? 'recipient' : 'method');
        break;
      case 'confirm':
        setStep('amount');
        break;
      default:
        setStep('method');
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          {step !== 'method' && step !== 'result' && (
            <button
              onClick={goBack}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Send Money</h1>
            <p className="text-gray-500">Transfer money instantly</p>
          </div>
        </div>

        {/* Balance Card */}
        <Card className="p-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-100">Available Balance</p>
              <p className="text-3xl font-bold">
                ${walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <Wallet className="w-8 h-8" />
            </div>
          </div>
        </Card>

        {/* Step: Select Method */}
        {step === 'method' && (
          <Card className="p-6 space-y-6">
            <h2 className="font-semibold text-gray-900">How do you want to send?</h2>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => {
                  setSendMethod('search');
                  setStep('recipient');
                }}
                className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
              >
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Search className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Search Recipient</p>
                  <p className="text-sm text-gray-500">Find by name, email or phone</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setSendMethod('qr');
                  setStep('scan');
                }}
                className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
              >
                <div className="p-3 bg-purple-100 rounded-xl">
                  <QrCode className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Scan QR Code</p>
                  <p className="text-sm text-gray-500">Scan recipient's payment QR</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setSendMethod('nfc');
                  setStep('scan');
                }}
                className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
              >
                <div className="p-3 bg-green-100 rounded-xl">
                  <Wifi className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">NFC Tap to Pay</p>
                  <p className="text-sm text-gray-500">Tap devices together</p>
                </div>
              </button>
            </div>
          </Card>
        )}

        {/* Step: QR Scan */}
        {step === 'scan' && sendMethod === 'qr' && (
          <Card className="p-6">
            <QRScanner
              onScan={handleQRScan}
              onClose={() => setStep('method')}
            />
          </Card>
        )}

        {/* Step: NFC Scan */}
        {step === 'scan' && sendMethod === 'nfc' && walletId && user?.id && (
          <Card className="p-6">
            <NFCPayment
              userId={user.id}
              walletId={walletId}
              mode="send"
              maxAmount={walletBalance}
              onPaymentReceived={(txId) => {
                setResult({ success: true, transactionId: txId });
                setStep('result');
              }}
              onError={(err) => {
                setResult({ success: false, error: err });
                setStep('result');
              }}
            />
          </Card>
        )}

        {/* Step: Search Recipient */}
        {step === 'recipient' && (
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Find Recipient</h2>

            {/* Global User Search */}
            <UserSearch
              placeholder="Search by @username, phone, or name..."
              excludeUserId={user?.id}
              autoFocus
              onSelect={async (searchResult) => {
                const { data: wallet } = await supabase
                  .from('wallets')
                  .select('id')
                  .eq('user_id', searchResult.id)
                  .eq('wallet_type', 'primary')
                  .single();

                if (wallet) {
                  setRecipient({
                    id: searchResult.id,
                    name: `${searchResult.first_name} ${searchResult.last_name}`,
                    firstName: searchResult.first_name,
                    lastName: searchResult.last_name,
                    username: searchResult.username || undefined,
                    email: searchResult.email || undefined,
                    phone: searchResult.phone || undefined,
                    walletId: wallet.id,
                  });
                  setStep('amount');
                } else {
                  setResult({
                    success: false,
                    error: 'This user does not have a wallet. They cannot receive payments.',
                  });
                  setStep('result');
                }
              }}
            />

            {/* Search Help */}
            <div className="p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-blue-700 font-medium mb-2">Search tips:</p>
              <ul className="text-sm text-blue-600 space-y-1">
                <li className="flex items-center gap-2">
                  <AtSign className="w-4 h-4" />
                  <span>Search by username: @johndoe</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>Search by phone: +1234567890</span>
                </li>
                <li className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>Search by name: John Doe</span>
                </li>
              </ul>
            </div>
          </Card>
        )}

        {/* Step: Enter Amount */}
        {step === 'amount' && recipient && (
          <Card className="p-6 space-y-6">
            {/* Recipient Info with Avatar */}
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
              <ProfileAvatar
                firstName={recipient.firstName}
                lastName={recipient.lastName}
                profilePicture={recipient.profilePicture}
                size="lg"
              />
              <div className="flex-1">
                <p className="font-medium text-green-900">Sending to</p>
                <p className="text-green-700">{recipient.name}</p>
                {recipient.username && (
                  <p className="text-xs text-green-500 flex items-center gap-1">
                    <AtSign className="w-3 h-3" />
                    {recipient.username}
                  </p>
                )}
                {recipient.phone && (
                  <p className="text-xs text-green-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {recipient.phone}
                  </p>
                )}
              </div>
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={walletBalance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl text-2xl font-bold focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  autoFocus
                />
              </div>

              {/* Quick amounts */}
              <div className="flex gap-2 mt-3">
                {[10, 25, 50, 100].map((quickAmount) => (
                  <button
                    key={quickAmount}
                    onClick={() => setAmount(quickAmount.toString())}
                    disabled={quickAmount > walletBalance}
                    className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 font-medium"
                  >
                    ${quickAmount}
                  </button>
                ))}
              </div>

              {/* Fee info */}
              {parseFloat(amount) > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Transfer fee (1%)</span>
                    <span className="text-gray-700">${fee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-500">Recipient receives</span>
                    <span className="font-medium text-gray-900">
                      ${(parseFloat(amount) - fee).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note (optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What's this for?"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Continue Button */}
            <button
              onClick={handleContinue}
              disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > walletBalance}
              className="w-full py-4 bg-primary-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
              <ArrowRight className="w-5 h-5" />
            </button>
          </Card>
        )}

        {/* Step: Confirm with Slide to Send */}
        {step === 'confirm' && recipient && (
          <Card className="p-6 space-y-6">
            {/* Header */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4">
                <ProfileAvatar
                  firstName={recipient.firstName}
                  lastName={recipient.lastName}
                  profilePicture={recipient.profilePicture}
                  size="xl"
                />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Confirm Transfer</h2>
              <p className="text-gray-500">to {recipient.name}</p>
            </div>

            {/* Amount Display */}
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-primary-600">
                ${parseFloat(amount).toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Recipient receives ${(parseFloat(amount) - fee).toFixed(2)}
              </p>
            </div>

            {/* Transaction Details */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">To</span>
                <span className="font-medium">{recipient.name}</span>
              </div>
              {recipient.phone && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Phone</span>
                  <span className="text-gray-700">{recipient.phone}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Amount</span>
                <span className="font-medium">${parseFloat(amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Fee</span>
                <span className="text-gray-700">${fee.toFixed(2)}</span>
              </div>
              {note && (
                <div className="border-t border-gray-200 pt-3">
                  <span className="text-gray-500 text-sm">Note: {note}</span>
                </div>
              )}
            </div>

            {/* Security Notice */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                Please verify the recipient details. Transfers cannot be reversed.
              </p>
            </div>

            {/* PIN Required Notice */}
            {hasTransactionPin && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Lock className="w-4 h-4" />
                <span>Transaction PIN required to complete</span>
              </div>
            )}

            {/* Slide to Send */}
            <SlideToSend
              amount={amount}
              recipientName={recipient.name}
              onConfirm={handleSlideConfirm}
              disabled={isProcessing}
              isProcessing={isProcessing}
            />

            {/* Back Button */}
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
                  <h2 className="text-2xl font-bold text-gray-900">Transfer Successful!</h2>
                  <p className="text-gray-500 mt-2">
                    You sent ${parseFloat(amount).toFixed(2)} to {recipient?.name}
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
                  Send More Money
                </button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Transfer Failed</h2>
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
        recipientName={recipient?.name || ''}
      />

      {/* Setup PIN Modal - for first-time users */}
      <SetupPinModal
        isOpen={showSetupPinModal}
        onClose={() => setShowSetupPinModal(false)}
        onSuccess={handlePinSetupSuccess}
        userId={user?.id || ''}
      />
    </MainLayout>
  );
}
