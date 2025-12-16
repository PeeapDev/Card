/**
 * Business Checkout Page
 *
 * Public checkout page for business payments via the Peeap SDK.
 * Flow:
 * 1. User enters amount (or pre-filled from URL)
 * 2. User enters email/phone
 * 3. QR Code displayed first for quick scan payment
 * 4. Alternative: Select Mobile Money/Card → Login/Signup → Monime
 * 5. After payment → Thank You page
 */

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Smartphone,
  Building2,
  Wallet,
  Check,
  X,
  Loader2,
  Shield,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Phone,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  QrCode,
  Scan,
  BadgeCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { authService } from '@/services/auth.service';
import { walletService } from '@/services/wallet.service';
import { createHostedCheckoutSession } from '@/lib/hostedCheckout';
import QRCode from 'react-qr-code';
import type { Wallet as WalletType } from '@/types';

// Types
interface Business {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  is_live_mode: boolean;
  approval_status: string;
  live_public_key?: string | null;
  test_public_key?: string | null;
  is_verified?: boolean;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  available: boolean;
  requiresAuth: boolean;
}

type CheckoutStep = 'loading' | 'amount' | 'details' | 'qr_payment' | 'auth' | 'wallet_select' | 'slide_to_pay' | 'enter_pin' | 'processing' | 'success' | 'error';
type AuthMode = 'login' | 'signup';

// Currency definitions
const CURRENCIES: Record<string, { symbol: string; name: string; decimals: number }> = {
  SLE: { symbol: 'Le', name: 'Sierra Leonean Leone', decimals: 2 },
  USD: { symbol: '$', name: 'US Dollar', decimals: 2 },
  EUR: { symbol: '€', name: 'Euro', decimals: 2 },
  GBP: { symbol: '£', name: 'British Pound', decimals: 2 },
  NGN: { symbol: '₦', name: 'Nigerian Naira', decimals: 2 },
  GHS: { symbol: '₵', name: 'Ghanaian Cedi', decimals: 2 },
};

// Storage key for pending checkout
const PENDING_CHECKOUT_KEY = 'peeap_pending_checkout';

export function BusinessCheckoutPage() {
  const { businessId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL params
  const urlAmount = searchParams.get('amount');
  const urlCurrency = searchParams.get('currency') || 'SLE';
  const urlReference = searchParams.get('reference');
  const urlDescription = searchParams.get('description');
  const urlMode = searchParams.get('mode') || 'live';
  const urlRedirect = searchParams.get('redirect');

  // State
  const [step, setStep] = useState<CheckoutStep>('loading');
  const [business, setBusiness] = useState<Business | null>(null);
  const [amount, setAmount] = useState<string>(urlAmount || '');
  const [currency, setCurrency] = useState(urlCurrency);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [paymentUUID, setPaymentUUID] = useState<string>('');
  const [showAlternativeMethods, setShowAlternativeMethods] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(300); // 5 minutes in seconds
  const [isExpired, setIsExpired] = useState(false);

  // Auth state
  const [user, setUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Wallet payment state
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<WalletType | null>(null);
  const [walletsLoading, setWalletsLoading] = useState(false);
  const [slidePosition, setSlidePosition] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const [slideComplete, setSlideComplete] = useState(false);
  const [transactionPin, setTransactionPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Payment methods (alternative to QR)
  const paymentMethods: PaymentMethod[] = [
    {
      id: 'mobile_money',
      name: 'Mobile Money',
      icon: <Smartphone className="w-5 h-5" />,
      description: 'Orange Money, Africell Money',
      available: true,
      requiresAuth: true,
    },
    {
      id: 'card',
      name: 'Card Payment',
      icon: <CreditCard className="w-5 h-5" />,
      description: 'Visa, Mastercard',
      available: true,
      requiresAuth: true,
    },
    {
      id: 'bank_transfer',
      name: 'Bank Transfer',
      icon: <Building2 className="w-5 h-5" />,
      description: 'Direct bank payment',
      available: true,
      requiresAuth: true,
    },
    {
      id: 'wallet',
      name: 'Peeap Wallet',
      icon: <Wallet className="w-5 h-5" />,
      description: 'Pay with your balance',
      available: true,
      requiresAuth: true,
    },
  ];

  // Format currency
  const formatAmount = (amt: number): string => {
    const curr = CURRENCIES[currency] || CURRENCIES.SLE;
    return `${curr.symbol} ${amt.toLocaleString(undefined, {
      minimumFractionDigits: curr.decimals,
      maximumFractionDigits: curr.decimals,
    })}`;
  };

  // Generate UUID
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Generate payment reference with UUID
  const generateReference = () => {
    const uuid = generateUUID();
    setPaymentUUID(uuid);
    return urlReference || `PAY-${uuid.split('-')[0].toUpperCase()}`;
  };

  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate QR code value - Peeap deep link for mobile app scanning
  const getQRCodeValue = () => {
    // Format: peeap://pay?uuid=xxx&businessId=xxx&amount=xxx
    // This will be scanned by Peeap mobile app for instant payment
    const params = new URLSearchParams({
      uuid: paymentUUID,
      businessId: businessId || '',
      businessName: business?.name || '',
      amount: amount,
      currency: currency,
      reference: paymentReference,
      description: urlDescription || `Payment to ${business?.name}`,
    });

    // Primary: Deep link for Peeap app
    return `peeap://pay?${params.toString()}`;
  };

  // Alternative: Web fallback URL for QR code
  const getWebQRCodeValue = () => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      amount: amount,
      currency: currency,
      reference: paymentReference,
      businessId: businessId || '',
    });
    return `${baseUrl}/pay/${businessId}?${params.toString()}`;
  };

  // Check for existing session and pending checkout
  useEffect(() => {
    checkSession();
  }, []);

  // Load business info
  useEffect(() => {
    if (businessId) {
      loadBusiness();
    }
  }, [businessId]);

  // Generate reference when moving to QR payment
  useEffect(() => {
    if (step === 'qr_payment' && !paymentReference) {
      setPaymentReference(generateReference());
    }
  }, [step]);

  // 5-minute countdown timer for QR payment
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (step === 'qr_payment' && timeRemaining > 0 && !isExpired) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsExpired(true);
            // Notify parent window that payment expired
            if (window.parent !== window) {
              window.parent.postMessage({
                type: 'peeap_payment',
                status: 'expired',
                error: { message: 'Payment session expired', code: 'SESSION_EXPIRED' },
              }, '*');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, isExpired]);

  // Reset timer when generating new payment
  useEffect(() => {
    if (paymentUUID) {
      setTimeRemaining(300);
      setIsExpired(false);
    }
  }, [paymentUUID]);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);

      // Check for pending checkout after login
      const pendingCheckout = localStorage.getItem(PENDING_CHECKOUT_KEY);
      if (pendingCheckout) {
        const checkout = JSON.parse(pendingCheckout);
        localStorage.removeItem(PENDING_CHECKOUT_KEY);

        // Restore checkout state and proceed to Monime
        if (checkout.businessId === businessId) {
          setAmount(checkout.amount);
          setCurrency(checkout.currency);
          setEmail(checkout.email);
          setPhone(checkout.phone);
          setSelectedMethod(checkout.selectedMethod);
          setPaymentReference(checkout.reference || generateReference());

          // Auto-proceed to payment
          setTimeout(() => {
            proceedToMonime(checkout);
          }, 500);
        }
      }
    }
  };

  const loadBusiness = async () => {
    try {
      const { data, error } = await supabase
        .from('merchant_businesses')
        .select('id, name, logo_url, description, is_live_mode, approval_status, live_public_key, test_public_key, is_verified')
        .eq('id', businessId)
        .single();

      if (error || !data) {
        setError('Business not found');
        setStep('error');
        return;
      }

      console.log('[BusinessCheckout] Loaded business:', data.name, 'is_verified:', data.is_verified);
      setBusiness(data);

      // If amount is pre-filled from SDK/URL, go DIRECTLY to QR code
      if (urlAmount && parseFloat(urlAmount) > 0) {
        // Generate reference immediately
        setPaymentReference(generateReference());
        // Skip email/phone - go straight to QR payment
        setStep('qr_payment');
      } else {
        setStep('amount');
      }
    } catch (err) {
      console.error('Error loading business:', err);
      setError('Failed to load business');
      setStep('error');
    }
  };

  // Handle amount submit
  const handleAmountSubmit = () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    setError(null);
    setStep('details');
  };

  // Handle details submit - go to QR payment
  const handleDetailsSubmit = () => {
    if (!email && !phone) {
      setError('Please enter your email or phone number');
      return;
    }
    setError(null);
    setAuthEmail(email);
    setAuthPhone(phone);
    setPaymentReference(generateReference());
    setStep('qr_payment');
  };

  // Handle alternative payment method select
  const handlePaymentMethodSelect = async (methodId: string) => {
    setSelectedMethod(methodId);

    const method = paymentMethods.find(m => m.id === methodId);

    // Check if method requires auth and user is not logged in
    if (method?.requiresAuth && !user) {
      setStep('auth');
    } else if (methodId === 'wallet' && user) {
      // User is logged in and selected wallet - go to wallet selection
      const userWallets = await fetchUserWallets(user.id);
      if (userWallets.length === 0) {
        setError('You don\'t have any wallets. Please create a wallet first.');
        return;
      }
      setStep('wallet_select');
    } else {
      // User is logged in, proceed to Monime for other methods
      proceedToMonime();
    }
  };

  // Proceed to Monime checkout
  const proceedToMonime = async (checkoutData?: any) => {
    const data = checkoutData || {
      businessId: business?.id,
      amount,
      currency,
      email,
      phone,
      selectedMethod,
      reference: paymentReference,
    };

    setStep('processing');
    setError(null);

    try {
      // For Mobile Money, Card, or Bank Transfer - use Monime
      if (['mobile_money', 'card', 'bank_transfer'].includes(data.selectedMethod)) {
        // SLE is a whole number currency - no conversion needed
        // User enters 50 SLE → send 50 to API → Monime shows Le 50
        const paymentAmount = Math.round(parseFloat(data.amount));

        const isTestMode = (urlMode || 'live').toLowerCase() === 'test';
        const publicKey = isTestMode ? business?.test_public_key : business?.live_public_key;

        if (!publicKey) {
          throw new Error('Business public key not configured');
        }

        const responseData = await createHostedCheckoutSession({
          publicKey,
          amount: paymentAmount,
          currency: data.currency || currency,
          reference: data.reference || paymentReference,
          description: urlDescription || `Payment to ${business?.name}`,
          customerEmail: data.email || email,
          customerPhone: data.phone || phone,
          paymentMethod: data.selectedMethod || selectedMethod,
          redirectUrl: urlRedirect || undefined,
          metadata: {
            businessId: business?.id,
          },
        });

        // Redirect to hosted checkout

        if (window.parent !== window) {
          // We're in an iframe (SDK modal) - tell parent to handle redirect
          window.parent.postMessage({
            type: 'peeap_payment',
            status: 'redirect',
            redirectUrl: responseData.paymentUrl,
            payment: {
              id: responseData.paymentId,
              reference: paymentReference,
              amount: parseFloat(amount),
              currency: currency,
            },
          }, '*');

          // Also try to redirect this iframe as fallback
          setTimeout(() => {
            window.location.href = responseData.paymentUrl;
          }, 500);
        } else {
          // Not in iframe - redirect directly
          window.location.href = responseData.paymentUrl;
        }
        return;
      }

      // For Peeap Wallet - handle internally
      const newPaymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setPaymentId(newPaymentId);

      // Simulate wallet payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Success
      setStep('success');

      // Post message to parent (for iframe/popup usage)
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'peeap_payment',
          status: 'success',
          payment: {
            id: newPaymentId,
            reference: paymentReference || newPaymentId,
            amount: parseFloat(amount),
            currency: currency,
            status: 'completed',
          },
        }, '*');
      }

      // Redirect if specified
      if (urlRedirect) {
        setTimeout(() => {
          window.location.href = `${urlRedirect}?payment_id=${newPaymentId}&status=success`;
        }, 3000);
      }

    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed');
      setStep('error');

      // Post error to parent
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'peeap_payment',
          status: 'error',
          error: { message: err.message || 'Payment failed' },
        }, '*');
      }
    }
  };

  // Fetch user wallets
  const fetchUserWallets = async (userId: string) => {
    setWalletsLoading(true);
    try {
      const userWallets = await walletService.getWallets(userId);
      setWallets(userWallets);
      return userWallets;
    } catch (err) {
      console.error('Failed to fetch wallets:', err);
      return [];
    } finally {
      setWalletsLoading(false);
    }
  };

  // Handle login using the app's auth service (supports phone + email)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      // Use authService which handles both phone and email login
      const result = await authService.login({
        email: authEmail, // Can be email or phone
        password: authPassword,
      });

      // Check if MFA is required - for checkout, we don't support MFA yet
      if ('mfaRequired' in result) {
        setAuthError('This account has 2FA enabled. Please log in through the main app first.');
        return;
      }

      const loggedInUser = result.user;
      setUser(loggedInUser);

      // If Peeap Wallet selected, go to wallet selection
      if (selectedMethod === 'wallet') {
        const userWallets = await fetchUserWallets(loggedInUser.id);
        if (userWallets.length === 0) {
          setAuthError('You don\'t have any wallets. Please create a wallet first.');
          return;
        }
        setStep('wallet_select');
      } else {
        // For other methods, proceed to Monime
        await proceedToMonime();
      }
    } catch (err: any) {
      setAuthError(err.message || 'Login failed');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle wallet selection
  const handleWalletSelect = (wallet: WalletType) => {
    const paymentAmount = parseFloat(amount);
    if (wallet.balance < paymentAmount) {
      setError(`Insufficient balance. You have ${formatAmount(wallet.balance)} but need ${formatAmount(paymentAmount)}`);
      return;
    }
    setSelectedWallet(wallet);
    setError(null);
    setSlidePosition(0);
    setSlideComplete(false);
    setStep('slide_to_pay');
  };

  // Handle slide to pay
  const handleSlideComplete = () => {
    setSlideComplete(true);
    setStep('enter_pin');
    setTransactionPin('');
    setPinError(null);
  };

  // Verify PIN and complete payment
  const verifyPinAndPay = async () => {
    if (transactionPin.length !== 4) {
      setPinError('Please enter your 4-digit PIN');
      return;
    }

    setStep('processing');
    setPinError(null);

    try {
      // Verify PIN (in production, this would be a secure API call)
      // For now, we'll simulate PIN verification
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('transaction_pin')
        .eq('id', user.id)
        .single();

      if (userError || !userData) {
        setPinError('Failed to verify PIN');
        setStep('enter_pin');
        return;
      }

      // Check PIN (in production, compare hashed values)
      if (userData.transaction_pin !== transactionPin) {
        setPinError('Incorrect PIN. Please try again.');
        setStep('enter_pin');
        return;
      }

      // Deduct from wallet and complete payment
      const paymentAmount = parseFloat(amount);

      // Create transfer/payment transaction
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          wallet_id: selectedWallet?.id,
          type: 'PAYMENT',
          amount: -paymentAmount,
          currency: currency,
          status: 'COMPLETED',
          description: urlDescription || `Payment to ${business?.name}`,
          reference: paymentReference,
          merchant_name: business?.name,
        });

      if (txError) {
        throw new Error('Payment failed. Please try again.');
      }

      // Update wallet balance
      const newBalance = (selectedWallet?.balance || 0) - paymentAmount;
      await supabase
        .from('wallets')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', selectedWallet?.id);

      // Success
      const newPaymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setPaymentId(newPaymentId);
      setStep('success');

      // Notify parent window
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'peeap_payment',
          status: 'success',
          payment: {
            id: newPaymentId,
            reference: paymentReference,
            amount: paymentAmount,
            currency: currency,
            status: 'completed',
            walletId: selectedWallet?.id,
          },
        }, '*');
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      setStep('error');
    }
  };

  // Handle signup using the app's auth service
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      // Parse name into first/last
      const nameParts = authName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Use authService for registration
      const { user: newUser } = await authService.register({
        email: authEmail,
        password: authPassword,
        firstName,
        lastName,
        phone: authPhone,
      });

      setUser(newUser);

      // Proceed to payment
      await proceedToMonime();
    } catch (err: any) {
      setAuthError(err.message || 'Signup failed');
    } finally {
      setAuthLoading(false);
    }
  };

  // Go back
  const goBack = () => {
    if (step === 'details') setStep('amount');
    else if (step === 'qr_payment') setStep('details');
    else if (step === 'auth') {
      setStep('qr_payment');
      setShowAlternativeMethods(true);
    }
  };

  // Close/cancel
  const handleClose = () => {
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'peeap_payment',
        status: 'cancel',
      }, '*');
    }
    window.close();
  };

  // Loading state
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p>Loading checkout...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Payment Error</h1>
          <p className="text-gray-600 mb-6">{error || 'Something went wrong'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
          >
            Try Again
          </button>
        </Card>
      </div>
    );
  }

  // Success state
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-2 flex items-center justify-center gap-1 flex-wrap">
            Thank you for your payment of {formatAmount(parseFloat(amount))} to {business?.name}
            {business?.is_verified && <BadgeCheck className="w-4 h-4 text-blue-500" title="Verified Business" />}
          </p>
          {(paymentId || paymentReference) && (
            <p className="text-xs text-gray-400 mb-6 font-mono">
              Reference: {paymentReference || paymentId}
            </p>
          )}
          {urlRedirect ? (
            <p className="text-sm text-gray-500">Redirecting back...</p>
          ) : (
            <button
              onClick={() => window.close()}
              className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700"
            >
              Close
            </button>
          )}
        </Card>
      </div>
    );
  }

  // Processing state
  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-indigo-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Processing Payment</h1>
          <p className="text-gray-600">Redirecting to secure payment page...</p>
          <p className="text-xs text-gray-400 mt-4">Do not close this window</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b border-gray-100 p-4">
            <div className="flex items-center justify-between">
              {step !== 'amount' ? (
                <button onClick={goBack} className="p-2 hover:bg-gray-100 rounded-lg">
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              ) : (
                <div className="w-9"></div>
              )}
              <div className="flex items-center gap-3">
                {business?.logo_url ? (
                  <img
                    src={business.logo_url}
                    alt={business.name}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900 flex items-center gap-1">
                    {business?.name}
                    {business?.is_verified && <BadgeCheck className="w-4 h-4 text-blue-500" title="Verified Business" />}
                  </p>
                  <p className="text-xs text-gray-500">
                    {urlMode === 'test' && (
                      <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                        TEST MODE
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="px-6 pt-4">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span className={step === 'amount' ? 'text-indigo-600 font-medium' : ''}>Amount</span>
              <span className={step === 'details' ? 'text-indigo-600 font-medium' : ''}>Details</span>
              <span className={step === 'qr_payment' || step === 'auth' ? 'text-indigo-600 font-medium' : ''}>Pay</span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{
                  width: step === 'amount' ? '33%' : step === 'details' ? '66%' : '100%',
                }}
              ></div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Step: Amount */}
          {step === 'amount' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Enter Amount</h2>
              <p className="text-sm text-gray-500 mb-6">
                {urlDescription || `Payment to ${business?.name}`}
              </p>

              <div className="mb-6">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400">
                    {CURRENCIES[currency]?.symbol || 'Le'}
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-4xl font-bold text-center py-6 px-16 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-0 outline-none"
                    autoFocus
                  />
                </div>

                {/* Currency selector */}
                <div className="mt-4">
                  <label className="text-sm text-gray-500 mb-2 block">Currency</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(CURRENCIES).slice(0, 6).map(([code, curr]) => (
                      <button
                        key={code}
                        onClick={() => setCurrency(code)}
                        className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                          currency === code
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {curr.symbol} {code}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleAmountSubmit}
                disabled={!amount || parseFloat(amount) <= 0}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                Continue
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Step: Details */}
          {step === 'details' && (
            <div className="p-6">
              <div className="text-center mb-6 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">You're paying</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatAmount(parseFloat(amount))}
                </p>
              </div>

              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Details</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full py-3 pl-12 pr-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+232 76 123456"
                      className="w-full py-3 pl-12 pr-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleDetailsSubmit}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                Continue to Payment
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Step: QR Payment (Primary) with Alternative Methods */}
          {step === 'qr_payment' && (
            <div className="p-6">
              {/* Business & Amount Header */}
              <div className="text-center mb-6">
                {business?.logo_url ? (
                  <img
                    src={business.logo_url}
                    alt={business.name}
                    className="w-16 h-16 rounded-xl mx-auto mb-3 object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 mx-auto mb-3 flex items-center justify-center text-white text-2xl font-bold">
                    {business?.name?.charAt(0) || 'P'}
                  </div>
                )}
                <h2 className="text-lg font-semibold text-gray-900 flex items-center justify-center gap-1">
                  {business?.name}
                  {business?.is_verified && <BadgeCheck className="w-5 h-5 text-blue-500" title="Verified Business" />}
                </h2>
              </div>

              {/* Timer Display */}
              <div className={`text-center mb-4 py-2 px-4 rounded-lg ${
                isExpired
                  ? 'bg-red-100 text-red-700'
                  : timeRemaining <= 60
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-gray-100 text-gray-600'
              }`}>
                {isExpired ? (
                  <span className="font-medium">Payment session expired</span>
                ) : (
                  <span className="font-mono font-medium">
                    Time remaining: {formatTime(timeRemaining)}
                  </span>
                )}
              </div>

              {/* Expired State */}
              {isExpired ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                    <X className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Session Expired</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    This payment session has expired for security reasons.
                  </p>
                  <button
                    onClick={() => {
                      setPaymentReference(generateReference());
                    }}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700"
                  >
                    Generate New QR Code
                  </button>
                </div>
              ) : (
                <>
                  {/* Amount Display - Prominent */}
                  <div className="text-center mb-6 p-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl text-white">
                    <p className="text-sm opacity-80">Pay</p>
                    <p className="text-4xl font-bold">
                      {formatAmount(parseFloat(amount))}
                    </p>
                    <p className="text-xs opacity-60 mt-2 font-mono">
                      ID: {paymentUUID.split('-')[0]}
                    </p>
                  </div>

                  {/* QR Code Section - MAIN FOCUS */}
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <Scan className="w-6 h-6 text-indigo-600" />
                      <h2 className="text-xl font-bold text-gray-900">Scan to Pay</h2>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border-2 border-indigo-100 inline-block mx-auto shadow-lg">
                      <QRCode
                        value={getQRCodeValue()}
                        size={200}
                        level="H"
                        style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                        bgColor="#ffffff"
                        fgColor="#1e1b4b"
                      />
                    </div>

                    <p className="mt-4 text-sm text-gray-500">
                      Open Peeap app and scan this code
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500">or</span>
                    </div>
                  </div>

                  {/* Payment Methods - Direct List */}
                  <div className="space-y-2">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => handlePaymentMethodSelect(method.id)}
                        disabled={!method.available || isExpired}
                        className={`w-full p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                          selectedMethod === method.id
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        } ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          selectedMethod === method.id
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {method.icon}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-gray-900 text-sm">{method.name}</p>
                          <p className="text-xs text-gray-500">{method.description}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                    ))}
                  </div>

                  {/* Waiting indicator */}
                  <div className="mt-6 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                      <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                      <span className="text-xs">Waiting for payment...</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step: Auth (Login/Signup) */}
          {step === 'auth' && (
            <div className="p-6">
              <div className="text-center mb-6 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatAmount(parseFloat(amount))}
                </p>
              </div>

              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {authMode === 'login' ? 'Login to Continue' : 'Create Account'}
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                {authMode === 'login'
                  ? 'Sign in to complete your payment securely'
                  : 'Create an account to complete your payment'
                }
              </p>

              {authError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {authError}
                </div>
              )}

              <form onSubmit={authMode === 'login' ? handleLogin : handleSignup} className="space-y-4">
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="John Doe"
                        required
                        className="w-full py-3 pl-12 pr-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email or Phone</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="email@example.com or 076123456"
                      required
                      className="w-full py-3 pl-12 pr-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                {authMode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        value={authPhone}
                        onChange={(e) => setAuthPhone(e.target.value)}
                        placeholder="+232 76 123456"
                        className="w-full py-3 pl-12 pr-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full py-3 pl-12 pr-12 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  {authLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {authMode === 'login' ? 'Login & Pay' : 'Create Account & Pay'}
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'signup' : 'login');
                    setAuthError(null);
                  }}
                  className="text-sm text-indigo-600 hover:text-indigo-700"
                >
                  {authMode === 'login'
                    ? "Don't have an account? Sign up"
                    : 'Already have an account? Login'
                  }
                </button>
              </div>
            </div>
          )}

          {/* Step: Wallet Selection */}
          {step === 'wallet_select' && (
            <div className="p-6">
              {/* Amount display */}
              <div className="text-center mb-6 p-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-white">
                <p className="text-sm opacity-80">You're paying</p>
                <p className="text-3xl font-bold">{formatAmount(parseFloat(amount))}</p>
                <p className="text-sm opacity-80 mt-1">to {business?.name}</p>
              </div>

              <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Wallet</h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {walletsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
              ) : wallets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Wallet className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No wallets found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {wallets.map((wallet) => (
                    <button
                      key={wallet.id}
                      onClick={() => handleWalletSelect(wallet)}
                      className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                        wallet.balance >= parseFloat(amount)
                          ? 'border-gray-200 hover:border-indigo-500 hover:bg-indigo-50'
                          : 'border-gray-100 bg-gray-50 opacity-60'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                        <Wallet className="w-6 h-6" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-gray-900">
                          {formatAmount(wallet.balance)}
                        </p>
                        <p className="text-sm text-gray-500">{wallet.currency} Wallet</p>
                      </div>
                      {wallet.balance >= parseFloat(amount) ? (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      ) : (
                        <span className="text-xs text-red-500">Insufficient</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => setStep('qr_payment')}
                className="mt-6 w-full py-3 text-gray-600 text-sm hover:text-gray-800"
              >
                <ArrowLeft className="w-4 h-4 inline mr-2" />
                Back to payment methods
              </button>
            </div>
          )}

          {/* Step: Slide to Pay */}
          {step === 'slide_to_pay' && (
            <div className="p-6">
              {/* Amount display */}
              <div className="text-center mb-6 p-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-white">
                <p className="text-sm opacity-80">Paying</p>
                <p className="text-3xl font-bold">{formatAmount(parseFloat(amount))}</p>
                <p className="text-sm opacity-80 mt-1">to {business?.name}</p>
              </div>

              {/* Wallet info */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">From wallet</p>
                  <p className="font-semibold text-gray-900">{formatAmount(selectedWallet?.balance || 0)}</p>
                </div>
              </div>

              {/* Slide to Pay */}
              <div className="relative mb-6">
                <div className="h-16 bg-gray-100 rounded-full relative overflow-hidden">
                  {/* Track */}
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-300"
                    style={{ width: `${slidePosition}%` }}
                  />

                  {/* Slider button */}
                  <div
                    className="absolute top-1 left-1 bottom-1 w-14 bg-white rounded-full shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing transition-all"
                    style={{ left: `calc(${slidePosition}% - ${slidePosition * 0.14}px + 4px)` }}
                    onMouseDown={(e) => {
                      setIsSliding(true);
                      const startX = e.clientX;
                      const track = e.currentTarget.parentElement;
                      const trackWidth = track?.clientWidth || 200;

                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        const diff = moveEvent.clientX - startX;
                        const newPosition = Math.min(100, Math.max(0, (diff / (trackWidth - 60)) * 100));
                        setSlidePosition(newPosition);

                        if (newPosition >= 95) {
                          handleSlideComplete();
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        }
                      };

                      const handleMouseUp = () => {
                        setIsSliding(false);
                        if (slidePosition < 95) {
                          setSlidePosition(0);
                        }
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };

                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                    onTouchStart={(e) => {
                      setIsSliding(true);
                      const startX = e.touches[0].clientX;
                      const track = e.currentTarget.parentElement;
                      const trackWidth = track?.clientWidth || 200;

                      const handleTouchMove = (moveEvent: TouchEvent) => {
                        const diff = moveEvent.touches[0].clientX - startX;
                        const newPosition = Math.min(100, Math.max(0, (diff / (trackWidth - 60)) * 100));
                        setSlidePosition(newPosition);

                        if (newPosition >= 95) {
                          handleSlideComplete();
                        }
                      };

                      const handleTouchEnd = () => {
                        setIsSliding(false);
                        if (slidePosition < 95) {
                          setSlidePosition(0);
                        }
                        document.removeEventListener('touchmove', handleTouchMove);
                        document.removeEventListener('touchend', handleTouchEnd);
                      };

                      document.addEventListener('touchmove', handleTouchMove);
                      document.addEventListener('touchend', handleTouchEnd);
                    }}
                  >
                    <ChevronRight className="w-6 h-6 text-indigo-600" />
                  </div>

                  {/* Text */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className={`font-medium transition-opacity ${slidePosition > 30 ? 'text-white' : 'text-gray-500'}`}>
                      {slidePosition > 80 ? 'Release to confirm' : 'Slide to pay'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep('wallet_select')}
                className="w-full py-3 text-gray-600 text-sm hover:text-gray-800"
              >
                <ArrowLeft className="w-4 h-4 inline mr-2" />
                Change wallet
              </button>
            </div>
          )}

          {/* Step: Enter PIN */}
          {step === 'enter_pin' && (
            <div className="p-6">
              {/* Amount display */}
              <div className="text-center mb-6 p-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white">
                <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm opacity-80">Confirming payment of</p>
                <p className="text-2xl font-bold">{formatAmount(parseFloat(amount))}</p>
              </div>

              <h2 className="text-lg font-semibold text-gray-900 mb-2 text-center">Enter Transaction PIN</h2>
              <p className="text-sm text-gray-500 text-center mb-6">
                Enter your 4-digit PIN to complete this payment
              </p>

              {pinError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {pinError}
                </div>
              )}

              {/* PIN Input */}
              <div className="flex justify-center gap-3 mb-6">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold ${
                      transactionPin.length > index
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                        : 'border-gray-200 text-gray-400'
                    }`}
                  >
                    {transactionPin.length > index ? '•' : ''}
                  </div>
                ))}
              </div>

              {/* Number Pad */}
              <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto mb-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((key, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (key === 'del') {
                        setTransactionPin(prev => prev.slice(0, -1));
                      } else if (key !== null && transactionPin.length < 4) {
                        setTransactionPin(prev => prev + key);
                      }
                    }}
                    disabled={key === null}
                    className={`h-14 rounded-xl font-semibold text-xl transition-colors ${
                      key === null
                        ? 'invisible'
                        : key === 'del'
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-indigo-100'
                    }`}
                  >
                    {key === 'del' ? <X className="w-5 h-5 mx-auto" /> : key}
                  </button>
                ))}
              </div>

              <button
                onClick={verifyPinAndPay}
                disabled={transactionPin.length !== 4}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                Confirm Payment
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Security Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <Shield className="w-4 h-4" />
              <span className="text-xs">Secured by Peeap</span>
            </div>
          </div>
        </Card>

        {/* Powered by */}
        <div className="text-center mt-4">
          <a
            href="https://peeap.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/70 hover:text-white"
          >
            Powered by Peeap
          </a>
        </div>
      </div>
    </div>
  );
}
