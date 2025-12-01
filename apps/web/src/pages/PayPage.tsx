/**
 * Pay Page - Handle Payment Links
 *
 * Handles payment links in format:
 * - /pay?to=userId&amount=100&note=description
 * - /pay?qr=reference
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Send,
  User,
  DollarSign,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Shield,
  Wallet,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { qrEngine } from '@/services/qr-engine';

interface Recipient {
  id: string;
  name: string;
  email?: string;
  walletId: string;
}

interface FeeConfig {
  percentage: number;
  minimum: number;
  currency: string;
}

type PaymentStep = 'loading' | 'login' | 'confirm' | 'processing' | 'success' | 'error';

export function PayPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [step, setStep] = useState<PaymentStep>('loading');
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  // Wallet state
  const [walletId, setWalletId] = useState<string>('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [fee, setFee] = useState(0);
  const [feeConfig] = useState<FeeConfig>({ percentage: 1, minimum: 0.10, currency: 'USD' });

  // Parse URL params
  const toUserId = searchParams.get('to');
  const urlAmount = searchParams.get('amount');
  const urlNote = searchParams.get('note');
  const qrReference = searchParams.get('qr');

  useEffect(() => {
    initializePayment();
  }, [toUserId, qrReference, authLoading]);

  useEffect(() => {
    // Calculate fee
    const calculatedFee = Math.max(amount * (feeConfig.percentage / 100), feeConfig.minimum);
    setFee(amount > 0 ? calculatedFee : 0);
  }, [amount, feeConfig]);

  const initializePayment = async () => {
    // Wait for auth to load
    if (authLoading) return;

    try {
      // Handle QR reference
      if (qrReference) {
        const validation = await qrEngine.validateQRByReference(qrReference);
        if (!validation.valid) {
          setError(validation.error || 'Invalid QR code');
          setStep('error');
          return;
        }

        if (validation.recipient) {
          setRecipient(validation.recipient);
        }
        if (validation.data?.amount) {
          setAmount(validation.data.amount);
        }
      }
      // Handle direct user ID
      else if (toUserId) {
        const recipientData = await fetchRecipient(toUserId);
        if (!recipientData) {
          setError('Recipient not found');
          setStep('error');
          return;
        }
        setRecipient(recipientData);

        if (urlAmount) {
          setAmount(parseFloat(urlAmount));
        }
        if (urlNote) {
          setNote(urlNote);
        }
      } else {
        setError('Invalid payment link');
        setStep('error');
        return;
      }

      // Check if user is logged in
      if (!isAuthenticated) {
        setStep('login');
        return;
      }

      // Fetch user's wallet
      await fetchWallet();
      setStep('confirm');

    } catch (err: any) {
      console.error('Payment init error:', err);
      setError(err.message || 'Failed to load payment');
      setStep('error');
    }
  };

  const fetchRecipient = async (userId: string): Promise<Recipient | null> => {
    const { data: userData } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .eq('id', userId)
      .single();

    if (!userData) return null;

    const { data: wallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', userId)
      .eq('wallet_type', 'primary')
      .single();

    return {
      id: userData.id,
      name: `${userData.first_name} ${userData.last_name}`,
      email: userData.email,
      walletId: wallet?.id || '',
    };
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
    }
  };

  const processPayment = async () => {
    if (!recipient || !amount || !user?.id || !walletId) {
      setError('Missing payment information');
      return;
    }

    if (amount > walletBalance) {
      setError('Insufficient balance');
      return;
    }

    if (recipient.id === user.id) {
      setError('Cannot send money to yourself');
      return;
    }

    setStep('processing');

    try {
      // Check balance again
      const { data: senderWallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', walletId)
        .single();

      if (!senderWallet || senderWallet.balance < amount) {
        setError('Insufficient balance');
        setStep('error');
        return;
      }

      // Generate transaction ID
      const txnId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Deduct from sender
      const { error: deductError } = await supabase
        .from('wallets')
        .update({
          balance: senderWallet.balance - amount,
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
        const netAmount = amount - fee;
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
          external_id: `${txnId}_out`,
          wallet_id: walletId,
          type: 'TRANSFER',
          amount: -amount,
          fee: fee,
          currency: 'USD',
          status: 'COMPLETED',
          description: note || `Transfer to ${recipient.name}`,
          metadata: {
            recipient_id: recipient.id,
            recipient_wallet: recipient.walletId,
            recipient_name: recipient.name,
            method: 'payment_link',
          },
        },
        {
          external_id: `${txnId}_in`,
          wallet_id: recipient.walletId,
          type: 'TRANSFER',
          amount: amount - fee,
          currency: 'USD',
          status: 'COMPLETED',
          description: note || `Transfer from ${user.firstName} ${user.lastName}`,
          metadata: {
            sender_id: user.id,
            sender_wallet: walletId,
            sender_name: `${user.firstName} ${user.lastName}`,
            method: 'payment_link',
          },
        },
      ]);

      setTransactionId(txnId);
      setStep('success');

    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed');
      setStep('error');
    }
  };

  const handleLogin = () => {
    // Store payment intent in session storage
    sessionStorage.setItem('paymentIntent', JSON.stringify({
      to: toUserId,
      amount: urlAmount,
      note: urlNote,
      qr: qrReference,
    }));
    navigate('/login?redirect=/pay');
  };

  // Loading state
  if (step === 'loading' || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-600 to-primary-800 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p>Loading payment...</p>
        </div>
      </div>
    );
  }

  // Login required
  if (step === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-600 to-primary-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="p-8 text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Sign In Required</h1>
            <p className="text-gray-600 mb-6">
              Please sign in to send money to {recipient?.name || 'this user'}
            </p>

            {amount > 0 && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Amount to pay</p>
                <p className="text-2xl font-bold text-gray-900">${amount.toFixed(2)}</p>
              </div>
            )}

            <button
              onClick={handleLogin}
              className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
            >
              Sign In to Continue
            </button>

            <p className="mt-4 text-sm text-gray-500">
              Don't have an account?{' '}
              <a href="/register" className="text-primary-600 hover:underline">
                Sign up
              </a>
            </p>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-600 to-primary-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Payment Failed</h1>
            <p className="text-gray-600 mb-6">{error || 'Something went wrong'}</p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/')}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200"
              >
                Go Home
              </button>
              <button
                onClick={() => {
                  setError(null);
                  setStep('loading');
                  initializePayment();
                }}
                className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700"
              >
                Try Again
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Success state
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-600 to-green-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
            <p className="text-gray-600 mb-4">
              You sent ${amount.toFixed(2)} to {recipient?.name}
            </p>

            <div className="p-4 bg-gray-50 rounded-lg mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Amount</span>
                <span className="font-medium">${amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Fee</span>
                <span className="font-medium">${fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                <span className="text-gray-500">Recipient receives</span>
                <span className="font-medium text-green-600">${(amount - fee).toFixed(2)}</span>
              </div>
            </div>

            {transactionId && (
              <p className="text-xs text-gray-400 mb-4">
                Transaction ID: {transactionId}
              </p>
            )}

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700"
            >
              Go to Dashboard
            </button>
          </Card>
        </div>
      </div>
    );
  }

  // Processing state
  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-600 to-primary-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="p-8 text-center">
            <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Processing Payment</h1>
            <p className="text-gray-600">Please wait while we process your payment...</p>
          </Card>
        </div>
      </div>
    );
  }

  // Confirm payment
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="overflow-hidden">
          {/* Header */}
          <div className="bg-primary-600 text-white p-6 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold">Send Payment</h1>
            <p className="text-primary-100 text-sm">Review and confirm your payment</p>
          </div>

          {/* Recipient */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Sending to</p>
                <p className="font-semibold text-gray-900">{recipient?.name}</p>
                {recipient?.email && (
                  <p className="text-sm text-gray-500">{recipient.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Amount Input (if not preset) */}
          {amount === 0 && (
            <div className="p-6 border-b border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={walletBalance}
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl text-2xl font-bold focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Amount Display (if preset) */}
          {amount > 0 && (
            <div className="p-6 text-center border-b border-gray-100">
              <p className="text-sm text-gray-500">Amount</p>
              <p className="text-4xl font-bold text-gray-900">${amount.toFixed(2)}</p>
            </div>
          )}

          {/* Fee breakdown */}
          <div className="p-6 bg-gray-50 border-b border-gray-100">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Transfer amount</span>
                <span className="text-gray-700">${amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Fee ({feeConfig.percentage}%)</span>
                <span className="text-gray-700">${fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                <span className="text-gray-700 font-medium">Recipient receives</span>
                <span className="font-semibold text-green-600">${(amount - fee).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Your balance */}
          <div className="p-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-700">Your balance</span>
            </div>
            <span className="font-semibold text-blue-700">${walletBalance.toFixed(2)}</span>
          </div>

          {/* Insufficient balance warning */}
          {amount > walletBalance && (
            <div className="p-4 bg-red-50 border-b border-red-100 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm text-red-700">Insufficient balance</span>
            </div>
          )}

          {/* Note */}
          {note && (
            <div className="p-4 border-b border-gray-100">
              <p className="text-sm text-gray-500">Note</p>
              <p className="text-gray-700">{note}</p>
            </div>
          )}

          {/* Actions */}
          <div className="p-6 space-y-3">
            <button
              onClick={processPayment}
              disabled={amount <= 0 || amount > walletBalance}
              className="w-full py-4 bg-primary-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
              Send ${amount.toFixed(2)}
            </button>

            <button
              onClick={() => navigate(-1)}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Cancel
            </button>
          </div>

          {/* Security footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <Shield className="w-4 h-4" />
              <span className="text-xs">Secured by Peeap Pay</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
