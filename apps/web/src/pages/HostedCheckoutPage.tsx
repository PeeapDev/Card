/**
 * Hosted Checkout Page
 *
 * Clean, modern checkout page inspired by Stripe
 * URL format: /checkout/pay/:sessionId
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import {
  Smartphone,
  QrCode,
  CreditCard,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Shield,
  LogIn,
  UserPlus,
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cardService } from '@/services/card.service';
import { supabase } from '@/lib/supabase';

// Types
interface CheckoutSession {
  id: string;
  externalId: string;
  merchantId: string;
  status: 'OPEN' | 'COMPLETE' | 'EXPIRED' | 'CANCELLED';
  amount: number;
  currencyCode: string;
  description?: string;
  merchantName?: string;
  merchantLogoUrl?: string;
  brandColor?: string;
  paymentMethods: {
    qr?: boolean;
    card?: boolean;
    mobile?: boolean;
  };
  successUrl?: string;
  cancelUrl?: string;
  expiresAt: string;
  createdAt: string;
  isTestMode?: boolean;
}

type PaymentMethod = 'qr' | 'card' | 'mobile';
type CheckoutStep =
  | 'loading'
  | 'select_method'
  | 'qr_display'
  | 'card_form'
  | 'login_prompt'
  | 'processing'
  | 'success'
  | 'error'
  | 'expired';

// Currency definitions
const CURRENCIES: Record<string, { symbol: string; name: string; decimals: number }> = {
  SLE: { symbol: 'Le', name: 'Sierra Leonean New Leone', decimals: 2 },
  USD: { symbol: '$', name: 'US Dollar', decimals: 2 },
  EUR: { symbol: '€', name: 'Euro', decimals: 2 },
  GBP: { symbol: '£', name: 'British Pound', decimals: 2 },
  NGN: { symbol: '₦', name: 'Nigerian Naira', decimals: 2 },
  GHS: { symbol: '₵', name: 'Ghanaian Cedi', decimals: 2 },
};

export function HostedCheckoutPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, login, register, isLoading: authLoading } = useAuth();

  // State
  const [step, setStep] = useState<CheckoutStep>('loading');
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardPin, setCardPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Login form state
  const [loginMode, setLoginMode] = useState<'login' | 'register'>('login');
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [paymentMethodUsed, setPaymentMethodUsed] = useState<string>('');

  // Format amount with currency
  const formatAmount = (amt: number, curr: string): string => {
    const currency = CURRENCIES[curr] || CURRENCIES.SLE;
    return `${currency.symbol} ${amt.toLocaleString(undefined, {
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals,
    })}`;
  };

  // Build success redirect URL
  const buildSuccessRedirectUrl = (baseUrl: string, sessionData: any, paymentMethod: string): string => {
    const url = new URL(baseUrl);
    url.searchParams.set('status', 'success');
    url.searchParams.set('session_id', sessionData.external_id || sessionData.externalId || sessionId || '');
    url.searchParams.set('reference', sessionData.reference || '');
    url.searchParams.set('amount', String(sessionData.amount || 0));
    url.searchParams.set('currency', sessionData.currency_code || sessionData.currencyCode || 'SLE');
    url.searchParams.set('payment_method', paymentMethod);
    return url.toString();
  };

  // Handle Monime redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status') || searchParams.get('status');
    const retry = urlParams.get('retry') || searchParams.get('retry');
    const message = urlParams.get('message') || searchParams.get('message');

    if (status === 'success' && sessionId) {
      completeSessionOnRedirect();
    } else if (retry === 'true' && message) {
      setRetryMessage(decodeURIComponent(message));
      window.history.replaceState({}, '', `/checkout/pay/${sessionId}`);
    }

    const globalMessage = (window as any).__CHECKOUT_MESSAGE__;
    if (globalMessage) {
      setRetryMessage(globalMessage);
      delete (window as any).__CHECKOUT_MESSAGE__;
    }
  }, [searchParams, sessionId]);

  // Play payment sound
  const playSound = (type: 'success' | 'error') => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      if (type === 'success') {
        // Pleasant success chime (two ascending notes)
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.15); // E5
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.3); // G5
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.8);
      } else {
        // Error buzz (two descending notes)
        oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
      }
    } catch (e) {
      console.log('Could not play sound:', e);
    }
  };

  const completeSessionOnRedirect = async () => {
    if (!sessionId) return;

    setStep('processing');

    try {
      const baseApiUrl = import.meta.env.VITE_API_URL || 'https://api.peeap.com';
      const apiUrl = baseApiUrl.endsWith('/api') ? baseApiUrl : `${baseApiUrl}/api`;

      // First, check current session status
      const checkResponse = await fetch(`${apiUrl}/checkout/sessions/${sessionId}`);
      const sessionData = await checkResponse.json();

      console.log('[Checkout] Session status on redirect:', sessionData.status);

      // If already COMPLETE, just show success
      if (sessionData.status === 'COMPLETE') {
        console.log('[Checkout] Session already complete, showing success');
        const updatedSession = {
          ...sessionData,
          successUrl: sessionData.success_url || sessionData.successUrl,
          merchantName: sessionData.merchant_name || sessionData.merchantName,
          amount: sessionData.amount,
          currencyCode: sessionData.currency_code || sessionData.currencyCode || 'SLE',
        };
        setSession(updatedSession);
        setPaymentMethodUsed('mobile_money');
        playSound('success');
        setStep('success');
        window.history.replaceState({}, '', `/checkout/pay/${sessionId}`);

        const successUrl = sessionData.success_url || sessionData.successUrl;
        if (successUrl) {
          setTimeout(() => {
            window.location.href = buildSuccessRedirectUrl(successUrl, sessionData, 'mobile_money');
          }, 3000);
        }
        return;
      }

      // If session is still OPEN, complete it
      if (sessionData.status === 'OPEN') {
        console.log('[Checkout] Completing session...');
        const response = await fetch(`${apiUrl}/checkout/sessions/${sessionId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentMethod: 'mobile_money' }),
        });

        const data = await response.json();

        if (!response.ok) {
          // If error is "Session is not open", it may have been completed by webhook
          if (data.error?.includes('not open')) {
            console.log('[Checkout] Session may have been completed by webhook, checking again...');
            const recheckResponse = await fetch(`${apiUrl}/checkout/sessions/${sessionId}`);
            const recheckData = await recheckResponse.json();
            if (recheckData.status === 'COMPLETE') {
              const updatedSession = {
                ...recheckData,
                successUrl: recheckData.success_url || recheckData.successUrl,
                merchantName: recheckData.merchant_name || recheckData.merchantName,
                amount: recheckData.amount,
                currencyCode: recheckData.currency_code || recheckData.currencyCode || 'SLE',
              };
              setSession(updatedSession);
              setPaymentMethodUsed('mobile_money');
              playSound('success');
              setStep('success');
              window.history.replaceState({}, '', `/checkout/pay/${sessionId}`);
              return;
            }
          }
          throw new Error(data.error || 'Failed to complete session');
        }

        // Successfully completed, fetch updated session
        const finalResponse = await fetch(`${apiUrl}/checkout/sessions/${sessionId}`);
        const finalData = await finalResponse.json();

        const updatedSession = {
          ...finalData,
          successUrl: finalData.success_url || finalData.successUrl,
          merchantName: finalData.merchant_name || finalData.merchantName,
          amount: finalData.amount,
          currencyCode: finalData.currency_code || finalData.currencyCode || 'SLE',
        };
        setSession(updatedSession);
        setPaymentMethodUsed('mobile_money');
        playSound('success');
        setStep('success');

        window.history.replaceState({}, '', `/checkout/pay/${sessionId}`);

        const successUrl = finalData.success_url || finalData.successUrl;
        if (successUrl) {
          setTimeout(() => {
            window.location.href = buildSuccessRedirectUrl(successUrl, finalData, 'mobile_money');
          }, 3000);
        }
      } else {
        // Session is in unexpected state (EXPIRED, CANCELLED, etc.)
        throw new Error(`Payment session is ${sessionData.status.toLowerCase()}`);
      }
    } catch (err: any) {
      console.error('[Checkout] Error completing session:', err);
      playSound('error');
      setError(err.message || 'Failed to complete payment');
      setStep('error');
    }
  };

  // Load checkout session
  useEffect(() => {
    if (!searchParams.get('status')) {
      loadSession();
    }
  }, [sessionId]);

  // Auto-trigger Monime when user logs in
  useEffect(() => {
    if (isAuthenticated && user && selectedMethod === 'mobile' && step === 'login_prompt') {
      triggerMonimePayment();
    }
  }, [isAuthenticated, user, selectedMethod, step]);

  const loadSession = async () => {
    if (!sessionId) {
      setError('Invalid checkout session');
      setStep('error');
      return;
    }

    try {
      const baseApiUrl = import.meta.env.VITE_API_URL || 'https://api.peeap.com';
      const apiUrl = baseApiUrl.endsWith('/api') ? baseApiUrl : `${baseApiUrl}/api`;
      const response = await fetch(`${apiUrl}/checkout/sessions/${sessionId}`);

      if (!response.ok) {
        throw new Error('Session not found');
      }

      const rawData = await response.json();
      const metadata = rawData.metadata || {};
      const isTestMode = metadata.isTestMode === true;

      const data: CheckoutSession = {
        id: rawData.id,
        externalId: rawData.external_id || rawData.externalId,
        merchantId: rawData.merchant_id || rawData.merchantId,
        amount: rawData.amount,
        currencyCode: rawData.currency_code || rawData.currencyCode || 'SLE',
        description: rawData.description,
        status: rawData.status,
        expiresAt: rawData.expires_at || rawData.expiresAt,
        createdAt: rawData.created_at || rawData.createdAt,
        merchantName: rawData.merchant_name || rawData.merchantName,
        merchantLogoUrl: rawData.merchant_logo_url || rawData.merchantLogoUrl,
        brandColor: rawData.brand_color || rawData.brandColor || '#635BFF',
        successUrl: rawData.success_url || rawData.successUrl,
        cancelUrl: rawData.cancel_url || rawData.cancelUrl,
        paymentMethods: rawData.payment_methods || rawData.paymentMethods || { qr: true, card: true, mobile: true },
        isTestMode: isTestMode,
      };

      if (new Date(data.expiresAt) < new Date()) {
        setSession(data);
        setStep('expired');
        return;
      }

      if (data.status === 'COMPLETE') {
        setError('This checkout session has already been completed');
        setStep('error');
        return;
      }

      if (data.status === 'CANCELLED') {
        setError('This checkout session was cancelled');
        setStep('error');
        return;
      }

      setSession(data);
      setStep('select_method');
    } catch (err: any) {
      setError(err.message || 'Failed to load checkout session');
      setStep('error');
    }
  };

  // Handle payment completion (for QR scan payments)
  const handlePaymentComplete = useCallback((data: any) => {
    console.log('[Checkout] Payment COMPLETE detected! Showing success...');

    // Play success sound
    playSound('success');

    // Update session with completed data
    const updatedSession: CheckoutSession = {
      id: data.id,
      externalId: data.external_id || data.externalId,
      merchantId: data.merchant_id || data.merchantId,
      amount: data.amount,
      currencyCode: data.currency_code || data.currencyCode || 'SLE',
      description: data.description,
      status: 'COMPLETE',
      expiresAt: data.expires_at || data.expiresAt,
      createdAt: data.created_at || data.createdAt,
      merchantName: data.merchant_name || data.merchantName,
      merchantLogoUrl: data.merchant_logo_url || data.merchantLogoUrl,
      brandColor: data.brand_color || data.brandColor || '#635BFF',
      successUrl: data.success_url || data.successUrl,
      cancelUrl: data.cancel_url || data.cancelUrl,
      paymentMethods: data.payment_methods || { qr: true, card: true, mobile: true },
      isTestMode: data.metadata?.isTestMode === true,
    };

    setSession(updatedSession);
    setPaymentMethodUsed('scan_to_pay');
    setStep('success');

    // Redirect after showing success animation
    const successUrl = data.success_url || data.successUrl;
    if (successUrl) {
      console.log('[Checkout] Will redirect to:', successUrl, 'in 4 seconds');
      setTimeout(() => {
        const redirectUrl = buildSuccessRedirectUrl(successUrl, data, 'scan_to_pay');
        console.log('[Checkout] Redirecting now to:', redirectUrl);
        window.location.href = redirectUrl;
      }, 4000);
    }
  }, []);

  // Subscribe to real-time updates AND poll as backup when QR is displayed
  useEffect(() => {
    let subscription: any = null;
    let pollInterval: NodeJS.Timeout | null = null;
    let isPolling = false;
    let hasCompleted = false;

    if (step === 'qr_display' && sessionId && session?.id) {
      console.log('[Checkout] Setting up payment detection for session:', sessionId, '(internal:', session.id, ')');

      // Subscribe to real-time updates on the checkout_sessions table
      // Try both external_id and id filters
      subscription = supabase
        .channel(`checkout_session_${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'checkout_sessions',
            filter: `external_id=eq.${sessionId}`,
          },
          (payload: any) => {
            console.log('[Checkout] Real-time update received:', payload);
            if (!hasCompleted && payload.new && payload.new.status === 'COMPLETE') {
              hasCompleted = true;
              handlePaymentComplete(payload.new);
            }
          }
        )
        .subscribe((status: string) => {
          console.log('[Checkout] Subscription status:', status);
        });

      // AGGRESSIVE polling - check every 1.5 seconds via API AND direct Supabase
      const checkPaymentStatus = async () => {
        if (isPolling || hasCompleted) return;
        isPolling = true;

        try {
          // Method 1: Check via API
          const baseApiUrl = import.meta.env.VITE_API_URL || 'https://api.peeap.com';
          const apiUrl = baseApiUrl.endsWith('/api') ? baseApiUrl : `${baseApiUrl}/api`;
          const response = await fetch(`${apiUrl}/checkout/sessions/${sessionId}`);

          if (response.ok) {
            const data = await response.json();
            console.log('[Checkout] API poll - status:', data.status);

            if (data.status === 'COMPLETE' && !hasCompleted) {
              hasCompleted = true;
              if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
              }
              handlePaymentComplete(data);
              return;
            }
          }

          // Method 2: Direct Supabase query as fallback
          const { data: directData, error: directError } = await supabase
            .from('checkout_sessions')
            .select('*')
            .eq('external_id', sessionId)
            .single();

          if (!directError && directData) {
            console.log('[Checkout] Direct DB poll - status:', directData.status);
            if (directData.status === 'COMPLETE' && !hasCompleted) {
              hasCompleted = true;
              if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
              }
              handlePaymentComplete(directData);
            }
          }
        } catch (err) {
          console.error('[Checkout] Error polling payment status:', err);
        } finally {
          isPolling = false;
        }
      };

      // Poll every 1.5 seconds (more aggressive)
      checkPaymentStatus();
      pollInterval = setInterval(checkPaymentStatus, 1500);
    }

    return () => {
      if (subscription) {
        console.log('[Checkout] Cleaning up real-time subscription');
        supabase.removeChannel(subscription);
      }
      if (pollInterval) {
        console.log('[Checkout] Cleaning up polling interval');
        clearInterval(pollInterval);
      }
    };
  }, [step, sessionId, session?.id, handlePaymentComplete]);

  const handleMethodSelect = async (method: PaymentMethod) => {
    setSelectedMethod(method);

    if (method === 'qr') {
      setStep('qr_display');
    } else if (method === 'card') {
      setStep('card_form');
    } else if (method === 'mobile') {
      if (isAuthenticated && user) {
        triggerMonimePayment();
      } else {
        setStep('login_prompt');
      }
    }
  };

  const handleBackToMethods = () => {
    setSelectedMethod(null);
    setStep('select_method');
    setError(null);
    setCardNumber('');
    setCardholderName('');
    setCardExpiry('');
    setCardPin('');
    setShowPin(false);
  };

  const getQRCodeData = (): string => {
    // Generate a web URL for the scan-pay page
    // This URL works when scanned with any QR scanner (camera app, etc.)
    // The scan-pay page will handle login and payment confirmation
    if (!session) return '';

    // Use the web URL that works universally
    // The /scan-pay page will handle authentication and payment
    return `${window.location.origin}/scan-pay/${sessionId}`;
  };

  // Card payment handler
  const handleCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    setPaymentLoading(true);
    setError(null);

    try {
      const cardResult = await cardService.lookupCardForPayment(cardNumber);

      if (!cardResult) {
        throw new Error('Card not found. Please check your card number.');
      }

      const enteredName = cardholderName.trim().toLowerCase();
      const actualName = cardResult.cardholderName.toLowerCase();
      if (!actualName.includes(enteredName) && !enteredName.includes(actualName.split(' ')[0])) {
        throw new Error('Cardholder name does not match.');
      }

      const [expiryMonth, expiryYear] = cardExpiry.split('/').map(s => parseInt(s.trim(), 10));
      if (!expiryMonth || !expiryYear || expiryMonth < 1 || expiryMonth > 12) {
        throw new Error('Invalid expiry date. Use MM/YY.');
      }

      const currentDate = new Date();
      const currentYear = currentDate.getFullYear() % 100;
      const currentMonth = currentDate.getMonth() + 1;

      if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
        throw new Error('This card has expired.');
      }

      if (cardResult.walletBalance < session.amount) {
        throw new Error(`Insufficient funds. Available: ${formatAmount(cardResult.walletBalance, cardResult.currency)}`);
      }

      const baseApiUrl = import.meta.env.VITE_API_URL || 'https://api.peeap.com';
      const apiUrl = baseApiUrl.endsWith('/api') ? baseApiUrl : `${baseApiUrl}/api`;

      const response = await fetch(`${apiUrl}/checkout/sessions/${sessionId}/card-pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: cardResult.cardId,
          walletId: cardResult.walletId,
          pin: cardPin,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Payment failed');
      }

      const result = await response.json();

      if (result.status === 'COMPLETE' || result.success) {
        playSound('success');
        setPaymentMethodUsed('peeap_card');
        setStep('success');
        if (session.successUrl) {
          setTimeout(() => {
            window.location.href = buildSuccessRedirectUrl(session.successUrl!, session, 'peeap_card');
          }, 3000);
        } else {
          setStep('success');
        }
      } else {
        throw new Error('Payment was not successful');
      }
    } catch (err: any) {
      playSound('error');
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
    }
    return cleaned;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      await login({ email: phoneOrEmail, password });
    } catch (err: any) {
      setLoginError(err.message || 'Login failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      await register({ email, phone, password, firstName, lastName });
    } catch (err: any) {
      setLoginError(err.message || 'Registration failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  const triggerMonimePayment = async () => {
    if (!session) return;

    setStep('processing');
    setError(null);

    try {
      const baseApiUrl = import.meta.env.VITE_API_URL || 'https://api.peeap.com';
      const apiUrl = baseApiUrl.endsWith('/api') ? baseApiUrl : `${baseApiUrl}/api`;

      const response = await fetch(`${apiUrl}/checkout/sessions/${sessionId}/mobile-pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.id ? { 'X-User-Id': user.id } : {}),
        },
        body: JSON.stringify({
          userId: user?.id,
          userEmail: user?.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment session');
      }

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        throw new Error('No payment URL received');
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
      setStep('error');
    }
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.substring(0, 19);
  };

  const brandColor = session?.brandColor || '#635BFF';

  // Loading state
  if (step === 'loading' || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  // Expired state
  if (step === 'expired') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Session Expired</h1>
          <p className="text-gray-500 mb-6">Please request a new payment link from the merchant.</p>
          {session?.cancelUrl && (
            <button
              onClick={() => window.location.href = session.cancelUrl!}
              className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Return to Merchant
            </button>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Payment Error</h1>
          <p className="text-gray-500 mb-6">{error || 'Something went wrong'}</p>
          <div className="space-y-3">
            <button
              onClick={handleBackToMethods}
              className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Try Again
            </button>
            {session?.cancelUrl && (
              <button
                onClick={() => window.location.href = session.cancelUrl!}
                className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Return to Merchant
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Success state with celebration animation
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Confetti animation */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            >
              <div
                className="w-3 h-3 rounded-sm"
                style={{
                  backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'][Math.floor(Math.random() * 8)],
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            </div>
          ))}
        </div>

        {/* Success card */}
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center relative z-10 animate-success-pop">
          {/* Animated checkmark */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-green-100 rounded-full animate-ping-slow opacity-75"></div>
            <div className="absolute inset-0 bg-green-100 rounded-full"></div>
            <div className="absolute inset-2 bg-green-500 rounded-full flex items-center justify-center animate-success-check">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-3">Thank You!</h1>
          <p className="text-gray-600 mb-4">Payment Successful</p>

          {session && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 mb-6">
              <p className="text-4xl font-bold text-green-600 mb-1">
                {formatAmount(session.amount, session.currencyCode)}
              </p>
              {session?.merchantName && (
                <p className="text-gray-500 text-sm">Paid to {session.merchantName}</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mb-6">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Redirecting you back...</span>
          </div>

          {session?.successUrl && (
            <button
              onClick={() => window.location.href = buildSuccessRedirectUrl(session.successUrl!, session, paymentMethodUsed || 'unknown')}
              className="w-full py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-[1.02] shadow-lg"
            >
              Return to {session.merchantName || 'Merchant'}
            </button>
          )}

          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 text-gray-400 text-xs">
              <Shield className="w-3 h-3" />
              <span>Secured by Peeap</span>
            </div>
          </div>
        </div>

        {/* CSS for animations */}
        <style>{`
          @keyframes confetti {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
          @keyframes success-pop {
            0% { transform: scale(0.5); opacity: 0; }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes success-check {
            0% { transform: scale(0) rotate(-45deg); }
            50% { transform: scale(1.2) rotate(0deg); }
            100% { transform: scale(1) rotate(0deg); }
          }
          @keyframes ping-slow {
            0% { transform: scale(1); opacity: 0.75; }
            100% { transform: scale(1.5); opacity: 0; }
          }
          .animate-confetti { animation: confetti linear forwards; }
          .animate-success-pop { animation: success-pop 0.5s ease-out forwards; }
          .animate-success-check { animation: success-check 0.6s ease-out 0.2s forwards; transform: scale(0); }
          .animate-ping-slow { animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
        `}</style>
      </div>
    );
  }

  // Processing state
  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Processing Payment</h1>
          <p className="text-gray-500">Please wait...</p>
          <p className="text-xs text-gray-400 mt-4">Do not close this window</p>
        </div>
      </div>
    );
  }

  // Login/Register form
  if (step === 'login_prompt') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center">
                <button onClick={handleBackToMethods} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-gray-500" />
                </button>
                <div className="ml-3">
                  <p className="font-semibold text-gray-900">{session?.merchantName || 'Checkout'}</p>
                  <p className="text-sm text-gray-500">Sign in to continue</p>
                </div>
              </div>
            </div>

            {/* Amount */}
            {session && (
              <div className="px-6 py-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-100">
                <p className="text-sm text-gray-600 mb-1">Total amount</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatAmount(session.amount, session.currencyCode)}
                </p>
              </div>
            )}

            {/* Tab Toggle */}
            <div className="px-6 pt-6">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setLoginMode('login')}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all ${
                    loginMode === 'login' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setLoginMode('register')}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all ${
                    loginMode === 'register' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
                  }`}
                >
                  Create Account
                </button>
              </div>
            </div>

            {loginError && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {loginError}
              </div>
            )}

            {/* Login Form */}
            {loginMode === 'login' && (
              <form onSubmit={handleLogin} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email or Phone</label>
                  <input
                    type="text"
                    value={phoneOrEmail}
                    onChange={(e) => setPhoneOrEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full py-3 px-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full py-3 px-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {loginLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                  {loginLoading ? 'Signing in...' : `Pay ${session ? formatAmount(session.amount, session.currencyCode) : ''}`}
                </button>
              </form>
            )}

            {/* Register Form */}
            {loginMode === 'register' && (
              <form onSubmit={handleRegister} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      className="w-full py-3 px-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className="w-full py-3 px-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full py-3 px-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+232 76 123456"
                    className="w-full py-3 px-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create password"
                    className="w-full py-3 px-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {loginLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                  {loginLoading ? 'Creating...' : `Create Account & Pay`}
                </button>
              </form>
            )}

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                <Shield className="w-4 h-4" />
                <span>Secured by Peeap</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // QR Display
  if (step === 'qr_display') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center">
                <button onClick={handleBackToMethods} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-gray-500" />
                </button>
                <div className="ml-3 flex-1 text-center">
                  <p className="font-semibold text-gray-900">{session?.merchantName || 'Checkout'}</p>
                </div>
              </div>
            </div>

            {session && (
              <div className="px-6 py-6 bg-gradient-to-r from-indigo-50 to-purple-50 text-center border-b border-gray-100">
                <p className="text-sm text-gray-600 mb-1">Total amount</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatAmount(session.amount, session.currencyCode)}
                </p>
              </div>
            )}

            <div className="p-8 text-center">
              <div className="inline-block p-4 bg-white rounded-2xl shadow-lg border border-gray-100">
                <QRCode value={getQRCodeData()} size={200} level="M" />
              </div>
              <p className="text-gray-600 mt-6 text-sm">
                Scan this QR code with your Peeap app
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 text-indigo-600">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-sm font-medium">Waiting for payment</span>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                <Shield className="w-4 h-4" />
                <span>Secured by Peeap</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Card Form
  if (step === 'card_form') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center">
                <button onClick={handleBackToMethods} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-gray-500" />
                </button>
                <div className="ml-3">
                  <p className="font-semibold text-gray-900">{session?.merchantName || 'Checkout'}</p>
                  <p className="text-sm text-gray-500">Pay with Peeap Card</p>
                </div>
              </div>
            </div>

            {session && (
              <div className="px-6 py-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-100">
                <p className="text-sm text-gray-600 mb-1">Total amount</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatAmount(session.amount, session.currencyCode)}
                </p>
              </div>
            )}

            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleCardPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Card Number</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="1234 5678 9012 3456"
                  className="w-full py-3 px-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-lg tracking-wide"
                  maxLength={19}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Cardholder Name</label>
                <input
                  type="text"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                  placeholder="JOHN DOE"
                  className="w-full py-3 px-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Expiry</label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    placeholder="MM/YY"
                    className="w-full py-3 px-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-center"
                    maxLength={5}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">PIN</label>
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      value={cardPin}
                      onChange={(e) => setCardPin(e.target.value.replace(/\D/g, '').substring(0, 4))}
                      placeholder="****"
                      className="w-full py-3 px-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-center tracking-widest"
                      maxLength={4}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={paymentLoading || cardNumber.replace(/\s/g, '').length < 16 || !cardholderName || cardExpiry.length < 5 || cardPin.length !== 4}
                className="w-full py-3.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 transition-colors"
              >
                {paymentLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Lock className="w-5 h-5" />
                )}
                {paymentLoading ? 'Processing...' : `Pay ${session ? formatAmount(session.amount, session.currencyCode) : ''}`}
              </button>
            </form>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                <Shield className="w-4 h-4" />
                <span>Your payment is secure and encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main checkout page - Payment method selection
  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Test Mode Banner */}
        {session.isTestMode && (
          <div className="mb-4 py-2 px-4 bg-amber-400 text-amber-900 text-center text-sm font-medium rounded-lg flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            TEST MODE - No real payments
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-6 text-center border-b border-gray-100">
            {session.merchantLogoUrl ? (
              <img src={session.merchantLogoUrl} alt={session.merchantName} className="h-12 mx-auto mb-3" />
            ) : (
              <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-7 h-7 text-indigo-600" />
              </div>
            )}
            <h1 className="text-lg font-semibold text-gray-900">{session.merchantName || 'Checkout'}</h1>
          </div>

          {/* Amount Display */}
          <div className="px-6 py-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-100">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Total amount</p>
              <p className="text-4xl font-bold text-gray-900">
                {formatAmount(session.amount, session.currencyCode)}
              </p>
              {session.description && (
                <p className="text-sm text-gray-500 mt-2">{session.description}</p>
              )}
            </div>
          </div>

          {/* Payment Methods */}
          <div className="p-6">
            {retryMessage && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-800">{retryMessage}</p>
                  <button onClick={() => setRetryMessage(null)} className="text-xs text-amber-600 mt-1 underline">
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <p className="text-sm font-medium text-gray-700 mb-4">Select payment method</p>

            <div className="space-y-3">
              {/* QR Code */}
              {session.paymentMethods?.qr !== false && (
                <button
                  onClick={() => handleMethodSelect('qr')}
                  className="w-full flex items-center p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group"
                >
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                    <QrCode className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className="ml-4 flex-1 text-left">
                    <p className="font-semibold text-gray-900">QR Code</p>
                    <p className="text-sm text-gray-500">Scan with Peeap app</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                </button>
              )}

              {/* Peeap Card */}
              {session.paymentMethods?.card !== false && (
                <button
                  onClick={() => handleMethodSelect('card')}
                  className="w-full flex items-center p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group"
                >
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                    <CreditCard className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4 flex-1 text-left">
                    <p className="font-semibold text-gray-900">Peeap Card</p>
                    <p className="text-sm text-gray-500">Pay with your card</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                </button>
              )}

              {/* Mobile Money */}
              {session.paymentMethods?.mobile !== false && (
                <button
                  onClick={() => !session.isTestMode && handleMethodSelect('mobile')}
                  disabled={session.isTestMode}
                  className={`w-full flex items-center p-4 rounded-xl border-2 transition-all group relative ${
                    session.isTestMode
                      ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                      : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    session.isTestMode ? 'bg-gray-200' : 'bg-orange-100 group-hover:bg-orange-200'
                  } transition-colors`}>
                    <Smartphone className={`w-6 h-6 ${session.isTestMode ? 'text-gray-400' : 'text-orange-600'}`} />
                  </div>
                  <div className="ml-4 flex-1 text-left">
                    <p className={`font-semibold ${session.isTestMode ? 'text-gray-400' : 'text-gray-900'}`}>
                      Mobile Money
                    </p>
                    <p className={`text-sm ${session.isTestMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {session.isTestMode ? 'Not available in test mode' : 'Orange Money, Africell'}
                    </p>
                  </div>
                  {!session.isTestMode && (
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                  )}
                  {session.isTestMode && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-gray-200 text-gray-500 text-xs font-medium rounded-full">
                      Live Only
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
              <Shield className="w-4 h-4" />
              <span>Secured by Peeap</span>
            </div>
          </div>
        </div>

        <p className="text-center mt-4 text-sm text-gray-400">
          Powered by <a href="https://peeap.com" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-600">Peeap</a>
        </p>
      </div>
    </div>
  );
}
