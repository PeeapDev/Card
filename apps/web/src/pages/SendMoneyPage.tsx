/**
 * Send Money Page - P2P Transfer
 *
 * Allows users to send money to other users via:
 * - Phone number
 * - Email
 * - Wallet ID
 * - QR Code scan
 */

import { useState, useEffect } from 'react';
import {
  Send,
  Phone,
  Mail,
  QrCode,
  Wallet,
  ArrowRight,
  CheckCircle,
  XCircle,
  Loader2,
  User,
  DollarSign,
  AlertCircle,
  History,
  Search,
  Copy,
  Share2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { p2pService } from '@/services/p2p';

interface Recipient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

interface TransferResult {
  success: boolean;
  transactionId?: string;
  fee?: number;
  netAmount?: number;
  error?: string;
}

interface RecentTransfer {
  id: string;
  recipient: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

type SendMethod = 'phone' | 'email' | 'wallet' | 'qr';

export function SendMoneyPage() {
  const { user } = useAuth();
  const [sendMethod, setSendMethod] = useState<SendMethod>('phone');
  const [recipient, setRecipient] = useState('');
  const [resolvedRecipient, setResolvedRecipient] = useState<Recipient | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [step, setStep] = useState<'input' | 'confirm' | 'result'>('input');
  const [result, setResult] = useState<TransferResult | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [fee, setFee] = useState(0);
  const [recentTransfers, setRecentTransfers] = useState<RecentTransfer[]>([]);

  useEffect(() => {
    fetchWalletBalance();
    fetchRecentTransfers();
  }, []);

  useEffect(() => {
    // Calculate fee when amount changes
    const amountNum = parseFloat(amount) || 0;
    const calculatedFee = amountNum * 0.01; // 1% fee for standard users
    setFee(Math.max(calculatedFee, 0.10)); // Min fee $0.10
  }, [amount]);

  const fetchWalletBalance = async () => {
    try {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user?.id)
        .eq('wallet_type', 'primary')
        .single();

      if (wallet) {
        setWalletBalance(wallet.balance);
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
    }
  };

  const fetchRecentTransfers = async () => {
    try {
      const { data: transfers } = await supabase
        .from('p2p_transfers')
        .select('id, recipient_id, amount, created_at, status, users!recipient_id(first_name, last_name)')
        .eq('sender_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (transfers) {
        setRecentTransfers(transfers.map((t: any) => ({
          id: t.id,
          recipient: t.users ? `${t.users.first_name} ${t.users.last_name}` : 'Unknown',
          amount: t.amount,
          date: new Date(t.created_at).toLocaleDateString(),
          status: t.status,
        })));
      }
    } catch (error) {
      console.error('Error fetching transfers:', error);
    }
  };

  const resolveRecipient = async () => {
    if (!recipient.trim()) return;

    setIsResolving(true);
    try {
      let query = supabase.from('users').select('id, first_name, last_name, email, phone');

      if (sendMethod === 'phone') {
        query = query.eq('phone', recipient);
      } else if (sendMethod === 'email') {
        query = query.eq('email', recipient);
      } else if (sendMethod === 'wallet') {
        // Look up by wallet ID or user ID
        const { data: wallet } = await supabase
          .from('wallets')
          .select('user_id')
          .eq('id', recipient)
          .single();

        if (wallet) {
          query = query.eq('id', wallet.user_id);
        }
      }

      const { data } = await query.single();

      if (data) {
        setResolvedRecipient({
          id: data.id,
          name: `${data.first_name} ${data.last_name}`,
          email: data.email,
          phone: data.phone,
        });
      } else {
        setResolvedRecipient(null);
      }
    } catch (error) {
      console.error('Error resolving recipient:', error);
      setResolvedRecipient(null);
    } finally {
      setIsResolving(false);
    }
  };

  const handleContinue = () => {
    if (!resolvedRecipient || !amount || parseFloat(amount) <= 0) return;
    setStep('confirm');
  };

  const handleSend = async () => {
    if (!resolvedRecipient || !amount || !user?.id) return;

    setIsLoading(true);
    try {
      const amountNum = parseFloat(amount);

      // Get sender's wallet
      const { data: senderWallet } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', user.id)
        .eq('wallet_type', 'primary')
        .single();

      if (!senderWallet) {
        setResult({ success: false, error: 'Wallet not found' });
        setStep('result');
        return;
      }

      if (senderWallet.balance < amountNum) {
        setResult({ success: false, error: 'Insufficient balance' });
        setStep('result');
        return;
      }

      // Use the P2P service to process the transfer
      const transferResult = await p2pService.sendMoney(
        user.id,
        senderWallet.id,
        {
          recipientId: resolvedRecipient.id,
          amount: amountNum,
          currency: 'USD',
          note: note || undefined,
          method: sendMethod,
          idempotencyKey: `${user.id}_${Date.now()}`,
        }
      );

      setResult(transferResult);
      setStep('result');

      if (transferResult.success) {
        fetchWalletBalance();
      }
    } catch (error) {
      console.error('Transfer error:', error);
      setResult({ success: false, error: 'Transfer failed. Please try again.' });
      setStep('result');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setRecipient('');
    setResolvedRecipient(null);
    setAmount('');
    setNote('');
    setStep('input');
    setResult(null);
    fetchRecentTransfers();
  };

  const getMethodIcon = (method: SendMethod) => {
    switch (method) {
      case 'phone': return <Phone className="w-5 h-5" />;
      case 'email': return <Mail className="w-5 h-5" />;
      case 'wallet': return <Wallet className="w-5 h-5" />;
      case 'qr': return <QrCode className="w-5 h-5" />;
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Send Money</h1>
          <p className="text-gray-500">Transfer money to friends, family, or businesses</p>
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

        {/* Main Card */}
        <Card className="p-6">
          {step === 'input' && (
            <div className="space-y-6">
              {/* Send Method Tabs */}
              <div className="flex gap-2">
                {(['phone', 'email', 'wallet', 'qr'] as SendMethod[]).map((method) => (
                  <button
                    key={method}
                    onClick={() => {
                      setSendMethod(method);
                      setRecipient('');
                      setResolvedRecipient(null);
                    }}
                    className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors ${
                      sendMethod === method
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {getMethodIcon(method)}
                    <span className="hidden sm:inline capitalize">{method}</span>
                  </button>
                ))}
              </div>

              {/* Recipient Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {sendMethod === 'phone' && 'Phone Number'}
                  {sendMethod === 'email' && 'Email Address'}
                  {sendMethod === 'wallet' && 'Wallet ID'}
                  {sendMethod === 'qr' && 'Scan QR Code'}
                </label>
                {sendMethod === 'qr' ? (
                  <div className="bg-gray-100 rounded-xl p-8 text-center">
                    <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">QR scanning coming soon</p>
                    <button className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg">
                      Open Camera
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type={sendMethod === 'email' ? 'email' : 'text'}
                      value={recipient}
                      onChange={(e) => {
                        setRecipient(e.target.value);
                        setResolvedRecipient(null);
                      }}
                      onBlur={resolveRecipient}
                      placeholder={
                        sendMethod === 'phone' ? '+1234567890' :
                        sendMethod === 'email' ? 'email@example.com' :
                        'wallet_xxxxx'
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    {isResolving && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                      </div>
                    )}
                  </div>
                )}

                {/* Resolved Recipient */}
                {resolvedRecipient && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-green-900">{resolvedRecipient.name}</p>
                      <p className="text-sm text-green-600">
                        {resolvedRecipient.email || resolvedRecipient.phone}
                      </p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />
                  </div>
                )}
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-xl font-semibold focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                {parseFloat(amount) > 0 && (
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-gray-500">Fee (1%)</span>
                    <span className="text-gray-700">${fee.toFixed(2)}</span>
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
                disabled={!resolvedRecipient || !amount || parseFloat(amount) <= 0}
                className="w-full py-4 bg-primary-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {step === 'confirm' && resolvedRecipient && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-primary-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Confirm Transfer</h2>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">To</span>
                  <span className="font-medium">{resolvedRecipient.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-medium">${parseFloat(amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fee</span>
                  <span className="font-medium">${fee.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 pt-4 flex justify-between">
                  <span className="text-gray-900 font-semibold">Total</span>
                  <span className="text-xl font-bold text-primary-600">
                    ${parseFloat(amount).toFixed(2)}
                  </span>
                </div>
                {note && (
                  <div className="border-t border-gray-200 pt-4">
                    <span className="text-gray-500 text-sm">Note: {note}</span>
                  </div>
                )}
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  Please verify the recipient details before confirming. Transfers cannot be reversed.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('input')}
                  className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSend}
                  disabled={isLoading}
                  className="flex-1 py-4 bg-primary-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send ${parseFloat(amount).toFixed(2)}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'result' && result && (
            <div className="space-y-6 text-center">
              {result.success ? (
                <>
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Transfer Successful!</h2>
                    <p className="text-gray-500 mt-2">
                      You sent ${parseFloat(amount).toFixed(2)} to {resolvedRecipient?.name}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500">Transaction ID</p>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <code className="text-sm font-mono">{result.transactionId}</code>
                      <button
                        onClick={() => navigator.clipboard.writeText(result.transactionId || '')}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <Copy className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={resetForm}
                      className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                    >
                      Send More
                    </button>
                    <button className="flex-1 py-4 bg-primary-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors">
                      <Share2 className="w-5 h-5" />
                      Share Receipt
                    </button>
                  </div>
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
            </div>
          )}
        </Card>

        {/* Recent Transfers */}
        {step === 'input' && recentTransfers.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <History className="w-5 h-5" />
                Recent Transfers
              </h3>
            </div>
            <div className="space-y-3">
              {recentTransfers.map((transfer) => (
                <div
                  key={transfer.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{transfer.recipient}</p>
                      <p className="text-sm text-gray-500">{transfer.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      -${transfer.amount.toFixed(2)}
                    </p>
                    <p className={`text-xs ${
                      transfer.status === 'completed' ? 'text-green-600' :
                      transfer.status === 'pending' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {transfer.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
