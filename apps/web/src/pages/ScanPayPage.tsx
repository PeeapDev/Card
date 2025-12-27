/**
 * Scan Pay Page
 *
 * This page handles QR code scans from the checkout page.
 * When a user scans the QR code with their Peeap app or phone camera,
 * they are redirected here to complete the payment.
 *
 * URL format: /scan-pay/:sessionId
 *
 * Flow:
 * 1. User on checkout page displays QR code
 * 2. Another user scans QR with their phone
 * 3. If logged in: Show payment confirmation
 * 4. If not logged in: Prompt to login/register
 * 5. After payment: Update checkout session and notify original page
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Shield,
  Wallet,
  User,
  LogIn,
  ArrowLeft,
  Smartphone,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
  Car,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { API_URL, APP_URL, getApiEndpoint } from '@/config/urls';
import { notificationService } from '@/services/notification.service';

interface CheckoutSession {
  id: string;
  externalId: string;
  merchantId: string;
  status: string;
  amount: number;
  currencyCode: string;
  description?: string;
  merchantName?: string;
  merchantLogoUrl?: string;
  successUrl?: string;
  cancelUrl?: string;
  expiresAt: string;
  isTestMode?: boolean;
}

type PaymentStep = 'loading' | 'login' | 'confirm' | 'pin' | 'processing' | 'success' | 'error' | 'expired' | 'already_paid';

// Currency definitions
const CURRENCIES: Record<string, { symbol: string; name: string }> = {
  SLE: { symbol: 'Le', name: 'Sierra Leonean New Leone' },
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
};

// Play success sound using Web Audio API
const playSuccessSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Pleasant three-tone success sound (C5 → E5 → G5)
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (e) {
    console.log('Could not play success sound');
  }
};

// Fire confetti burst
const fireSuccessConfetti = () => {
  // Center burst
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#10B981', '#34D399', '#6EE7B7', '#FFD700', '#FFA500', '#FF6B6B'],
  });
  // Left burst
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#10B981', '#34D399', '#6EE7B7'],
    });
  }, 150);
  // Right burst
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#10B981', '#34D399', '#6EE7B7'],
    });
  }, 300);
};

export function ScanPayPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const successEffectsTriggered = useRef(false);

  const [step, setStep] = useState<PaymentStep>('loading');
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wallets, setWallets] = useState<Array<{ id: string; name: string; balance: number; wallet_type: string }>>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Get selected wallet info
  const selectedWallet = wallets.find(w => w.id === selectedWalletId);
  const walletBalance = selectedWallet?.balance || 0;
  const walletId = selectedWalletId;

  // Format amount with currency
  const formatAmount = (amt: number, curr: string): string => {
    const currency = CURRENCIES[curr] || CURRENCIES.SLE;
    return `${currency.symbol} ${amt.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Load checkout session
  useEffect(() => {
    loadSession();
  }, [sessionId]);

  // Check wallet when user authenticates
  useEffect(() => {
    if (isAuthenticated && user?.id && session) {
      fetchWallets();
      setStep('confirm');
    }
  }, [isAuthenticated, user?.id, session]);

  const loadSession = async () => {
    if (!sessionId) {
      setError('Invalid payment session');
      setStep('error');
      return;
    }

    try {
      let rawData: any = null;

      // Try to fetch from Supabase directly (works for all sessions including driver-created)
      const { data: supabaseSession, error: supabaseError } = await supabase
        .from('checkout_sessions')
        .select('*')
        .eq('external_id', sessionId)
        .single();


      if (supabaseSession && !supabaseError) {
        rawData = supabaseSession;
      } else if (supabaseError?.code === 'PGRST116') {
        // No rows found in Supabase - session doesn't exist
        throw new Error('Payment session not found');
      } else {
        // Other Supabase error - try API as fallback (but API may be down)
        try {
          const response = await fetch(getApiEndpoint(`/checkout/sessions/${sessionId}`));

          if (!response.ok) {
            throw new Error('Payment session not found');
          }

          rawData = await response.json();
        } catch (apiErr) {
          console.error('[ScanPay] API fallback failed:', apiErr);
          throw new Error('Payment session not found');
        }
      }

      const metadata = rawData.metadata || {};

      const data: CheckoutSession = {
        id: rawData.id,
        externalId: rawData.external_id || rawData.externalId,
        merchantId: rawData.merchant_id || rawData.merchantId,
        amount: rawData.amount,
        currencyCode: rawData.currency_code || rawData.currencyCode || 'SLE',
        description: rawData.description,
        status: rawData.status,
        expiresAt: rawData.expires_at || rawData.expiresAt,
        merchantName: rawData.merchant_name || rawData.merchantName,
        merchantLogoUrl: rawData.merchant_logo_url || rawData.merchantLogoUrl,
        successUrl: rawData.success_url || rawData.successUrl,
        cancelUrl: rawData.cancel_url || rawData.cancelUrl,
        isTestMode: metadata.isTestMode === true,
      };

      // Check if expired
      if (new Date(data.expiresAt) < new Date()) {
        setSession(data);
        setStep('expired');
        return;
      }

      // Check if already paid
      if (data.status === 'COMPLETE') {
        setSession(data);
        setStep('already_paid');
        return;
      }

      if (data.status === 'CANCELLED') {
        setError('This payment was cancelled');
        setStep('error');
        return;
      }

      setSession(data);

      // If user is already logged in, go to confirm
      if (isAuthenticated && user?.id) {
        fetchWallets();
        setStep('confirm');
      } else {
        setStep('login');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load payment');
      setStep('error');
    }
  };

  const fetchWallets = async () => {
    if (!user?.id) return;

    // Fetch all active wallets for the user
    const { data: userWallets, error: walletsError } = await supabase
      .from('wallets')
      .select('id, name, balance, wallet_type')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('wallet_type', { ascending: true });

    if (walletsError) {
      console.error('Error fetching wallets:', walletsError);
      return;
    }

    if (userWallets && userWallets.length > 0) {
      // Map wallet types to friendly names if name is missing
      const walletsWithNames = userWallets.map(w => ({
        ...w,
        name: w.name || getWalletName(w.wallet_type),
      }));

      setWallets(walletsWithNames);

      // Select wallet with highest balance that can cover the payment, or default to primary
      const paymentAmount = session?.amount || 0;
      const affordableWallet = walletsWithNames
        .filter(w => w.balance >= paymentAmount)
        .sort((a, b) => {
          // Prefer primary wallet if it can afford the payment
          if (a.wallet_type === 'primary') return -1;
          if (b.wallet_type === 'primary') return 1;
          return 0;
        })[0];

      // If no wallet can afford, just select primary
      const primaryWallet = walletsWithNames.find(w => w.wallet_type === 'primary');
      setSelectedWalletId(affordableWallet?.id || primaryWallet?.id || walletsWithNames[0].id);
    }
  };

  // Get friendly wallet name from type
  const getWalletName = (type: string): string => {
    const names: Record<string, string> = {
      primary: 'Main Wallet',
      driver: 'Driver Wallet',
      business: 'Business Wallet',
      savings: 'Savings',
      app_driver_wallet: 'Driver Wallet',
      app_terminal: 'Terminal Wallet',
    };
    return names[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Get wallet icon
  const getWalletIcon = (type: string) => {
    if (type.includes('driver')) return Car;
    if (type.includes('business')) return CreditCard;
    return Wallet;
  };

  // Proceed to PIN entry step
  const handleProceedToPin = () => {
    if (!session || !user?.id || !walletId) {
      setError('Missing payment information');
      return;
    }

    if (walletBalance < session.amount) {
      setError('Insufficient balance in your wallet');
      return;
    }

    setPin('');
    setPinError(null);
    setStep('pin');
  };

  // Verify PIN and process payment
  const handlePayment = async () => {
    if (!session || !user?.id || !walletId) {
      setError('Missing payment information');
      setStep('error');
      return;
    }

    if (pin.length !== 4) {
      setPinError('Please enter your 4-digit PIN');
      return;
    }

    // Verify PIN first
    setPinError(null);
    setStep('processing');

    try {
      // Get user's primary card and verify PIN against it
      const { data: primaryCard } = await supabase
        .from('cards')
        .select('id, transaction_pin')
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (primaryCard?.transaction_pin) {
        // Verify PIN matches
        if (primaryCard.transaction_pin !== pin) {
          setPinError('Invalid PIN. Please try again.');
          setStep('pin');
          return;
        }
      }
      // If no card or no PIN set, proceed without PIN verification (for new users)

      // Check if this is a driver collection session (no merchantId or has driverId in metadata)
      const { data: checkoutSession } = await supabase
        .from('checkout_sessions')
        .select('*, metadata')
        .eq('external_id', sessionId)
        .single();

      const isDriverCollection = checkoutSession && (
        !checkoutSession.merchant_id ||
        checkoutSession.metadata?.collectionType === 'driver'
      );

      if (isDriverCollection && checkoutSession) {
        // Process driver collection payment directly via Supabase
        await processDriverPayment(checkoutSession);
      } else {
        // Use API endpoint for merchant-created sessions
        const response = await fetch(getApiEndpoint(`/checkout/sessions/${sessionId}/scan-pay`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            payerUserId: user.id,
            payerWalletId: walletId,
            payerName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            pin: pin,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Payment failed');
        }
      }

      setStep('success');

    } catch (err: any) {
      setError(err.message || 'Payment failed');
      setStep('error');
    }
  };

  // Process driver collection payment directly via Supabase
  const processDriverPayment = async (checkoutSession: any) => {
    if (!user?.id || !walletId || !session) {
      throw new Error('Missing payment information');
    }

    const driverId = checkoutSession.metadata?.driverId;
    if (!driverId) {
      throw new Error('Driver information not found');
    }

    // Get or create driver's dedicated driver wallet
    let { data: driverWallet, error: driverWalletError } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', driverId)
      .eq('wallet_type', 'driver')
      .single();

    // If no driver wallet exists, try primary wallet as fallback (or create driver wallet)
    if (driverWalletError || !driverWallet) {
      // Try to create driver wallet
      const externalId = `DRV-SLE-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({
          user_id: driverId,
          external_id: externalId,
          currency: 'SLE',
          balance: 0,
          status: 'ACTIVE',
          daily_limit: 5000,
          monthly_limit: 50000,
          wallet_type: 'driver',
          name: 'Driver Wallet',
        })
        .select()
        .single();

      if (createError || !newWallet) {
        // Fall back to primary wallet if driver wallet creation fails
        const { data: primaryWallet, error: primaryError } = await supabase
          .from('wallets')
          .select('id, balance')
          .eq('user_id', driverId)
          .eq('wallet_type', 'primary')
          .single();

        if (primaryError || !primaryWallet) {
          throw new Error('Driver wallet not found');
        }
        driverWallet = primaryWallet;
      } else {
        driverWallet = newWallet;
      }
    }

    // At this point we definitely have a driverWallet
    if (!driverWallet) {
      throw new Error('Driver wallet not found');
    }

    // Deduct from payer's wallet
    const { error: deductError } = await supabase
      .from('wallets')
      .update({ balance: walletBalance - session.amount })
      .eq('id', walletId);

    if (deductError) {
      throw new Error('Failed to process payment');
    }

    // Credit driver's wallet
    const { error: creditError } = await supabase
      .from('wallets')
      .update({ balance: driverWallet.balance + session.amount })
      .eq('id', driverWallet.id);

    if (creditError) {
      // Rollback payer's deduction
      await supabase
        .from('wallets')
        .update({ balance: walletBalance })
        .eq('id', walletId);
      throw new Error('Failed to credit driver wallet');
    }

    // Create transaction record
    const transactionRef = `TXN${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const payerName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Payer';

    const { error: txnError } = await supabase
      .from('transactions')
      .insert({
        reference: transactionRef,
        type: 'TRANSFER',
        amount: session.amount,
        currency_code: session.currencyCode,
        status: 'COMPLETED',
        description: checkoutSession.description || 'Driver fare payment',
        sender_wallet_id: walletId,
        recipient_wallet_id: driverWallet.id,
        sender_user_id: user.id,
        recipient_user_id: driverId,
        metadata: {
          paymentMethod: 'scan_to_pay',
          checkoutSessionId: checkoutSession.external_id,
          collectionType: 'driver',
          payerName: payerName,
        },
      });

    if (txnError) {
      console.error('Failed to create transaction record:', txnError);
      // Payment still succeeded, just logging failed
    }

    // Update checkout session status
    const { error: updateError } = await supabase
      .from('checkout_sessions')
      .update({
        status: 'COMPLETE',
        payment_method: 'scan_to_pay',
        payer_name: payerName,
        payer_email: user.email,
        completed_at: new Date().toISOString(),
      })
      .eq('external_id', sessionId);

    if (updateError) {
      console.error('Failed to update checkout session:', updateError);
    }

    // Broadcast payment completion to driver's screen for instant feedback
    // This is faster than polling the database
    const broadcastChannel = supabase.channel(`driver_payment_${sessionId}`);
    await broadcastChannel.subscribe();
    await broadcastChannel.send({
      type: 'broadcast',
      event: 'payment_complete',
      payload: {
        status: 'success',
        payerName: payerName,
        amount: session.amount,
        transactionId: transactionRef,
        timestamp: Date.now(),
      },
    });
    // Clean up channel after sending
    setTimeout(() => {
      supabase.removeChannel(broadcastChannel);
    }, 1000);

    // Send notification to driver about payment received
    try {
      await notificationService.sendPaymentReceived({
        userId: driverId,
        amount: session.amount,
        currency: session.currencyCode,
        senderName: payerName,
        transactionId: transactionRef,
      });
    } catch (notifError) {
      console.error('Failed to send notification:', notifError);
      // Don't fail the payment if notification fails
    }
  };

  const handleLogin = () => {
    // Store the return URL
    const returnUrl = `/scan-pay/${sessionId}`;
    navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
  };

  const handleRegister = () => {
    const returnUrl = `/scan-pay/${sessionId}`;
    navigate(`/register?redirect=${encodeURIComponent(returnUrl)}`);
  };

  // Loading state
  if (step === 'loading' || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-600 to-purple-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading payment...</p>
        </div>
      </div>
    );
  }

  // Expired state
  if (step === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-500 to-red-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Payment Expired</h1>
          <p className="text-gray-600 mb-6">This payment session has expired. Please ask for a new payment link.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Already paid state
  if (step === 'already_paid') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-500 to-emerald-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Already Paid</h1>
          <p className="text-gray-600 mb-6">This payment has already been completed.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-500 to-red-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Payment Error</h1>
          <p className="text-gray-600 mb-6">{error || 'Something went wrong'}</p>
          <div className="space-y-3">
            <button
              onClick={() => loadSession()}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success state - auto redirect to merchant's successUrl or my.peeap.com dashboard
  if (step === 'success') {
    // Trigger sound and confetti effects once
    if (!successEffectsTriggered.current) {
      successEffectsTriggered.current = true;
      playSuccessSound();
      fireSuccessConfetti();

      // Auto redirect after 2 seconds (fast celebration)
      setTimeout(() => {
        if (session?.successUrl) {
          // Redirect to merchant's success URL with payment info
          const url = new URL(session.successUrl);
          url.searchParams.set('status', 'success');
          url.searchParams.set('peeap_status', 'success');
          url.searchParams.set('session_id', session.externalId || sessionId || '');
          url.searchParams.set('amount', String(session.amount));
          url.searchParams.set('currency', session.currencyCode);
          url.searchParams.set('payment_method', 'scan_to_pay');
          window.location.href = url.toString();
        } else {
          // No success URL - redirect to app dashboard
          window.location.href = `${APP_URL}/dashboard`;
        }
      }, 2000);
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center animate-in zoom-in-95 duration-300">
          {/* Animated checkmark */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-50"></div>
            <div className="absolute inset-0 bg-green-100 rounded-full"></div>
            <div className="absolute inset-2 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Thank You!</h1>
          <p className="text-gray-600 mb-4">Payment Successful</p>

          {session && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 mb-4">
              <p className="text-4xl font-bold text-green-600 mb-1">
                {formatAmount(session.amount, session.currencyCode)}
              </p>
              {session?.merchantName && (
                <p className="text-gray-500 text-sm">Paid to {session.merchantName}</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>{session?.successUrl ? `Returning to ${session.merchantName || 'merchant'}...` : 'Redirecting to dashboard...'}</span>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 text-gray-400 text-xs">
              <Shield className="w-3 h-3" />
              <span>Secured by Peeap</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Processing state
  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-600 to-purple-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Processing Payment</h1>
          <p className="text-gray-500">Please wait...</p>
        </div>
      </div>
    );
  }

  // PIN Entry step
  if (step === 'pin' && session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-600 to-purple-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
          {/* Header */}
          <div className="bg-indigo-600 text-white p-6">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setStep('confirm')}
                className="p-2 hover:bg-white/10 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold">Enter PIN</h1>
            </div>
            <div className="text-center">
              <p className="text-indigo-200 text-sm mb-1">Confirm payment of</p>
              <p className="text-3xl font-bold">
                {formatAmount(session.amount, session.currencyCode)}
              </p>
              {session.merchantName && (
                <p className="text-indigo-200 text-sm mt-1">to {session.merchantName}</p>
              )}
            </div>
          </div>

          {/* PIN Input */}
          <div className="p-6">
            <div className="text-center mb-6">
              <Lock className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
              <p className="text-gray-600">Enter your 4-digit PIN to authorize this payment</p>
            </div>

            {pinError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {pinError}
              </div>
            )}

            <div className="relative mb-6">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').substring(0, 4);
                  setPin(value);
                  setPinError(null);
                }}
                placeholder="••••"
                className="w-full py-4 px-6 text-center text-3xl font-mono tracking-[1em] border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                maxLength={4}
                autoFocus
                inputMode="numeric"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <button
              onClick={handlePayment}
              disabled={pin.length !== 4}
              className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-6 h-6" />
              Confirm Payment
            </button>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
              <Shield className="w-4 h-4" />
              <span>Your PIN is encrypted and secure</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Login prompt
  if (step === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-600 to-purple-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
          {/* Header */}
          <div className="bg-indigo-600 text-white p-6 text-center">
            <Smartphone className="w-12 h-12 mx-auto mb-3" />
            <h1 className="text-xl font-bold">Scan to Pay</h1>
            <p className="text-indigo-200 text-sm">Complete this payment with your Peeap account</p>
          </div>

          {/* Payment Details */}
          {session && (
            <div className="p-6 border-b border-gray-100">
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Amount to pay</p>
                <p className="text-4xl font-bold text-gray-900">
                  {formatAmount(session.amount, session.currencyCode)}
                </p>
                {session.merchantName && (
                  <p className="text-gray-600 mt-2">to {session.merchantName}</p>
                )}
                {session.description && (
                  <p className="text-sm text-gray-500 mt-1">{session.description}</p>
                )}
              </div>
            </div>
          )}

          {/* Login/Register Buttons */}
          <div className="p-6 space-y-3">
            <button
              onClick={handleLogin}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-indigo-700"
            >
              <LogIn className="w-5 h-5" />
              Sign In to Pay
            </button>
            <button
              onClick={handleRegister}
              className="w-full py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-200"
            >
              <User className="w-5 h-5" />
              Create Account
            </button>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
              <Shield className="w-4 h-4" />
              <span>Secured by Peeap</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Confirm payment (logged in)
  if (step === 'confirm' && session) {
    const insufficientBalance = walletBalance < session.amount;

    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-600 to-purple-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
          {/* Header */}
          <div className="bg-indigo-600 text-white p-6">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-white/10 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold">Confirm Payment</h1>
            </div>
            <div className="text-center">
              <p className="text-indigo-200 text-sm mb-1">You're paying</p>
              <p className="text-4xl font-bold">
                {formatAmount(session.amount, session.currencyCode)}
              </p>
            </div>
          </div>

          {/* Merchant Info */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              {session.merchantLogoUrl ? (
                <img
                  src={session.merchantLogoUrl}
                  alt={session.merchantName}
                  className="w-14 h-14 rounded-xl object-cover"
                />
              ) : (
                <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <User className="w-7 h-7 text-indigo-600" />
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Paying to</p>
                <p className="font-bold text-gray-900">{session.merchantName || 'Merchant'}</p>
                {session.description && (
                  <p className="text-sm text-gray-500">{session.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Wallet Selector */}
          <div className="p-4 border-b border-gray-100">
            <p className="text-sm text-gray-500 mb-2">Pay from</p>
            <div className="relative">
              <button
                onClick={() => setWalletSelectorOpen(!walletSelectorOpen)}
                className={`w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-between ${
                  insufficientBalance ? 'border-2 border-red-300' : 'border border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  {selectedWallet && (() => {
                    const WalletIcon = getWalletIcon(selectedWallet.wallet_type);
                    return <WalletIcon className="w-5 h-5 text-blue-600" />;
                  })()}
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedWallet?.name || 'Select wallet'}
                    </p>
                    <p className={`text-sm ${insufficientBalance ? 'text-red-600' : 'text-gray-500'}`}>
                      Balance: {formatAmount(walletBalance, session.currencyCode)}
                    </p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${walletSelectorOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown */}
              {walletSelectorOpen && wallets.length > 1 && (
                <>
                  {/* Backdrop to close dropdown */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setWalletSelectorOpen(false)}
                  />
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden max-h-60 overflow-y-auto">
                  {wallets.map((wallet) => {
                    const WalletIcon = getWalletIcon(wallet.wallet_type);
                    const canAfford = wallet.balance >= session.amount;
                    return (
                      <button
                        key={wallet.id}
                        onClick={() => {
                          setSelectedWalletId(wallet.id);
                          setWalletSelectorOpen(false);
                        }}
                        className={`w-full p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          wallet.id === selectedWalletId ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <WalletIcon className={`w-5 h-5 ${canAfford ? 'text-blue-600' : 'text-gray-400'}`} />
                        <div className="flex-1 text-left">
                          <p className={`font-medium ${canAfford ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                            {wallet.name}
                          </p>
                          <p className={`text-sm ${canAfford ? 'text-green-600' : 'text-red-500'}`}>
                            {formatAmount(wallet.balance, session.currencyCode)}
                            {!canAfford && ' (insufficient)'}
                          </p>
                        </div>
                        {wallet.id === selectedWalletId && (
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        )}
                      </button>
                    );
                  })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Insufficient balance warning */}
          {insufficientBalance && (
            <div className="p-4 bg-red-50 flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">
                {wallets.some(w => w.balance >= session.amount)
                  ? 'Select a wallet with sufficient balance'
                  : 'Insufficient balance in all wallets. Please top up first.'}
              </span>
            </div>
          )}

          {/* Pay Button */}
          <div className="p-6">
            <button
              onClick={handleProceedToPin}
              disabled={insufficientBalance}
              className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Lock className="w-6 h-6" />
              Continue to Pay
            </button>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
              <Shield className="w-4 h-4" />
              <span>Your payment is secure</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
