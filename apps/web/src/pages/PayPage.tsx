/**
 * Pay Page - Public Payment Checkout
 *
 * Handles payment links in format:
 * - /pay?to=userId&amount=100&note=description
 * - /pay?qr=reference
 * - /pay?username=@mohamed&amount=50
 *
 * Features:
 * - Public checkout (no login required to view)
 * - QR code display for mobile app scanning
 * - NFC scanning on mobile devices
 * - "Complete with Login" button for web payments
 * - Deep link support for mobile app
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import {
  Send,
  User,
  DollarSign,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Shield,
  Wallet,
  Smartphone,
  Wifi,
  QrCode,
  LogIn,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface Recipient {
  id: string;
  name: string;
  username?: string;
  email?: string;
  phone?: string;
  walletId: string;
}

type PaymentStep = 'loading' | 'checkout' | 'login' | 'confirm' | 'processing' | 'success' | 'error';

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
  const [copied, setCopied] = useState(false);
  const [isNFCSupported, setIsNFCSupported] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Wallet state (for logged-in users)
  const [walletId, setWalletId] = useState<string>('');
  const [walletBalance, setWalletBalance] = useState(0);

  // Fee calculation
  const feePercentage = 1;
  const feeMinimum = 0.10;
  const fee = amount > 0 ? Math.max(amount * (feePercentage / 100), feeMinimum) : 0;

  // Parse URL params
  const toUserId = searchParams.get('to');
  const urlAmount = searchParams.get('amount');
  const urlNote = searchParams.get('note');
  const qrReference = searchParams.get('qr');
  const usernameParam = searchParams.get('username');

  // Generate payment URL for QR code
  const paymentUrl = window.location.href;
  const deepLink = `peeappay://pay?${searchParams.toString()}`;

  useEffect(() => {
    // Check device capabilities
    setIsNFCSupported('NDEFReader' in window);
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

    initializePayment();
  }, [toUserId, qrReference, usernameParam]);

  useEffect(() => {
    // If user logs in, fetch their wallet
    if (isAuthenticated && user?.id && step === 'login') {
      fetchWallet();
      setStep('confirm');
    }
  }, [isAuthenticated, user?.id]);

  const initializePayment = async () => {
    try {
      let recipientData: Recipient | null = null;

      // Handle username lookup
      if (usernameParam) {
        const username = usernameParam.replace('@', '');
        recipientData = await fetchRecipientByUsername(username);
      }
      // Handle direct user ID
      else if (toUserId) {
        recipientData = await fetchRecipient(toUserId);
      }
      // Handle QR reference
      else if (qrReference) {
        // For now, treat QR reference as user ID
        recipientData = await fetchRecipient(qrReference);
      }

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

      // Show public checkout page (no login required)
      setStep('checkout');

    } catch (err: any) {
      console.error('Payment init error:', err);
      setError(err.message || 'Failed to load payment');
      setStep('error');
    }
  };

  const fetchRecipient = async (userId: string): Promise<Recipient | null> => {
    const { data: userData } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, username')
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
      username: userData.username,
      email: userData.email,
      phone: userData.phone,
      walletId: wallet?.id || '',
    };
  };

  const fetchRecipientByUsername = async (username: string): Promise<Recipient | null> => {
    const { data: userData } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, username')
      .eq('username', username)
      .single();

    if (!userData) return null;

    const { data: wallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', userData.id)
      .eq('wallet_type', 'primary')
      .single();

    return {
      id: userData.id,
      name: `${userData.first_name} ${userData.last_name}`,
      username: userData.username,
      email: userData.email,
      phone: userData.phone,
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

  const handleLoginToComplete = () => {
    // Store payment intent
    sessionStorage.setItem('paymentIntent', JSON.stringify({
      to: toUserId || recipient?.id,
      username: usernameParam,
      amount: amount || urlAmount,
      note: note || urlNote,
      qr: qrReference,
    }));
    setStep('login');
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
      // Check balance
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

      const txnId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Deduct from sender
      await supabase
        .from('wallets')
        .update({
          balance: senderWallet.balance - amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', walletId);

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

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(paymentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenApp = () => {
    window.location.href = deepLink;
  };

  // Loading state
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-600 to-primary-800 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p>Loading payment...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-600 to-primary-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Payment Error</h1>
          <p className="text-gray-600 mb-6">{error || 'Something went wrong'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700"
          >
            Go Home
          </button>
        </Card>
      </div>
    );
  }

  // Success state
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-600 to-green-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-4">
            You sent ${amount.toFixed(2)} to {recipient?.name}
          </p>
          {transactionId && (
            <p className="text-xs text-gray-400 mb-6">
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
    );
  }

  // Processing state
  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-600 to-primary-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Processing Payment</h1>
          <p className="text-gray-600">Please wait...</p>
        </Card>
      </div>
    );
  }

  // Login prompt (after clicking "Complete with Login")
  if (step === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-600 to-primary-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Sign In to Complete Payment</h1>
          <p className="text-gray-600 mb-6">
            Sign in to send ${amount.toFixed(2)} to {recipient?.name}
          </p>
          <button
            onClick={() => navigate('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search))}
            className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 mb-3"
          >
            Sign In
          </button>
          <p className="text-sm text-gray-500">
            Don't have an account?{' '}
            <a href="/register" className="text-primary-600 hover:underline">
              Sign up
            </a>
          </p>
        </Card>
      </div>
    );
  }

  // Confirm payment (logged in user)
  if (step === 'confirm' && isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-600 to-primary-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full overflow-hidden">
          {/* Header */}
          <div className="bg-primary-600 text-white p-6 text-center">
            <Send className="w-10 h-10 mx-auto mb-2" />
            <h1 className="text-xl font-bold">Confirm Payment</h1>
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
                {recipient?.username && (
                  <p className="text-sm text-primary-600">@{recipient.username}</p>
                )}
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="p-6 text-center border-b border-gray-100">
            <p className="text-4xl font-bold text-gray-900">${amount.toFixed(2)}</p>
            <p className="text-sm text-gray-500 mt-1">Fee: ${fee.toFixed(2)}</p>
          </div>

          {/* Balance */}
          <div className="p-4 bg-blue-50 flex items-center justify-between">
            <span className="text-sm text-blue-700">Your balance</span>
            <span className="font-semibold text-blue-700">${walletBalance.toFixed(2)}</span>
          </div>

          {amount > walletBalance && (
            <div className="p-4 bg-red-50 flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">Insufficient balance</span>
            </div>
          )}

          {/* Actions */}
          <div className="p-6 space-y-3">
            <button
              onClick={processPayment}
              disabled={amount <= 0 || amount > walletBalance}
              className="w-full py-4 bg-primary-600 text-white rounded-xl font-semibold disabled:opacity-50"
            >
              Send ${amount.toFixed(2)}
            </button>
            <button
              onClick={() => navigate(-1)}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl"
            >
              Cancel
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // Public Checkout Page (default)
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="overflow-hidden">
          {/* Header */}
          <div className="bg-primary-600 text-white p-6 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold">Payment Request</h1>
            <p className="text-primary-100 text-sm">Peeap Pay</p>
          </div>

          {/* Recipient Info */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="w-7 h-7 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pay to</p>
                <p className="font-bold text-gray-900 text-lg">{recipient?.name}</p>
                {recipient?.username && (
                  <p className="text-primary-600 font-medium">@{recipient.username}</p>
                )}
              </div>
            </div>
          </div>

          {/* Amount */}
          {amount > 0 && (
            <div className="p-6 text-center border-b border-gray-100 bg-gray-50">
              <p className="text-sm text-gray-500">Amount</p>
              <p className="text-4xl font-bold text-gray-900">${amount.toFixed(2)}</p>
              {note && <p className="text-sm text-gray-500 mt-2">{note}</p>}
            </div>
          )}

          {/* QR Code for Mobile App */}
          <div className="p-6 text-center border-b border-gray-100">
            <div className="flex items-center justify-center gap-2 mb-4">
              <QrCode className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Scan with Peeap App</span>
            </div>
            <div className="bg-white p-4 rounded-xl inline-block shadow-sm border">
              <QRCode value={paymentUrl} size={180} level="M" />
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Open Peeap app and scan this code
            </p>
          </div>

          {/* NFC Indicator (mobile only) */}
          {isMobile && isNFCSupported && (
            <div className="p-4 bg-blue-50 border-b border-blue-100">
              <div className="flex items-center justify-center gap-2 text-blue-700">
                <Wifi className="w-5 h-5 animate-pulse" />
                <span className="text-sm font-medium">Ready for NFC tap</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="p-6 space-y-3">
            {/* Open in App (mobile) */}
            {isMobile && (
              <button
                onClick={handleOpenApp}
                className="w-full py-4 bg-primary-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-700"
              >
                <Smartphone className="w-5 h-5" />
                Open in Peeap App
                <ExternalLink className="w-4 h-4" />
              </button>
            )}

            {/* Complete with Login */}
            <button
              onClick={handleLoginToComplete}
              className={`w-full py-4 ${isMobile ? 'bg-gray-100 text-gray-700' : 'bg-primary-600 text-white'} rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90`}
            >
              <LogIn className="w-5 h-5" />
              Complete with Login
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-200"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Link Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy Payment Link
                </>
              )}
            </button>
          </div>

          {/* Security Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <Shield className="w-4 h-4" />
              <span className="text-xs">Secured by Peeap Pay</span>
            </div>
          </div>
        </Card>

        {/* Download App Link */}
        <div className="text-center mt-4">
          <a
            href="https://peeap.com/download"
            className="text-sm text-white/80 hover:text-white"
          >
            Don't have the app? Download Peeap
          </a>
        </div>
      </div>
    </div>
  );
}
