/**
 * Peeap Pay Checkout Page
 *
 * This page handles:
 * - NFC tap payments (from /t/{token})
 * - QR scan payments
 * - Deep link fallback to app
 * - Web checkout for non-app users
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Smartphone,
  Wifi,
  QrCode,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Download
} from 'lucide-react';

interface PaymentSession {
  sessionId: string;
  merchantName?: string;
  merchantLogo?: string;
  amount: number;
  currency: string;
  description?: string;
  expiresAt: string;
  deepLink: string;
  universalLink: string;
  qrUrl: string;
  isExpired: boolean;
}

type PaymentStatus = 'loading' | 'ready' | 'processing' | 'success' | 'failed' | 'expired';

export function PaymentCheckoutPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<PaymentSession | null>(null);
  const [status, setStatus] = useState<PaymentStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isNFCSupported, setIsNFCSupported] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  // Format amount - SLE (New Leone) uses 2 decimal places like USD
  const formatAmount = (amount: number, currency: string) => {
    if (currency === 'SLE') {
      return `NLe ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch session data
  const fetchSession = useCallback(async () => {
    if (!token) {
      setError('Invalid payment link');
      setStatus('failed');
      return;
    }

    try {
      // In production, call actual API
      const response = await fetch(`/api/session/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        throw new Error('Failed to verify session');
      }

      const data = await response.json();

      if (!data.valid) {
        setError(data.error || 'Invalid or expired payment link');
        setStatus('expired');
        return;
      }

      // Mock session data for demo
      const mockSession: PaymentSession = {
        sessionId: data.session?.id || 'ps_demo_123',
        merchantName: data.session?.merchantName || 'Demo Store',
        amount: data.session?.amount || 5000,
        currency: data.session?.currency || 'USD',
        description: data.session?.description || 'Payment',
        expiresAt: data.session?.expiresAt || new Date(Date.now() + 900000).toISOString(),
        deepLink: `peeappay://pay?token=${token}`,
        universalLink: `https://pay.peeap.com/app/pay?token=${token}`,
        qrUrl: `https://pay.peeap.com/t/${token}`,
        isExpired: false
      };

      setSession(mockSession);
      setStatus('ready');

      // Calculate time remaining
      const expiresAt = new Date(mockSession.expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeRemaining(remaining);

    } catch (err) {
      console.error('Session fetch error:', err);
      // For demo, use mock data
      const mockSession: PaymentSession = {
        sessionId: 'ps_demo_123',
        merchantName: 'Demo Store',
        amount: 5000,
        currency: 'USD',
        description: 'Demo Payment',
        expiresAt: new Date(Date.now() + 900000).toISOString(),
        deepLink: `peeappay://pay?token=${token}`,
        universalLink: `https://pay.peeap.com/app/pay?token=${token}`,
        qrUrl: `https://pay.peeap.com/t/${token}`,
        isExpired: false
      };

      setSession(mockSession);
      setStatus('ready');
      setTimeRemaining(900);
    }
  }, [token]);

  // Check for app and NFC support
  useEffect(() => {
    // Check Web NFC support
    setIsNFCSupported('NDEFReader' in window);

    // Try to detect if app is installed (iOS/Android)
    // This is a simplified check - in production use proper deep link detection
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /iphone|ipad|android/.test(userAgent);
    setIsAppInstalled(isMobile);
  }, []);

  // Fetch session on mount
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining <= 0 || status !== 'ready') return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, status]);

  // Try to open app
  const handleOpenApp = () => {
    if (!session) return;

    // Try deep link first
    window.location.href = session.deepLink;

    // Fallback to universal link after delay
    setTimeout(() => {
      window.location.href = session.universalLink;
    }, 500);
  };

  // Handle web payment (future implementation)
  const handleWebPayment = () => {
    setStatus('processing');
    // In production, initiate web payment flow
    setTimeout(() => {
      setStatus('success');
    }, 2000);
  };

  // Render loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading payment...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (status === 'failed' || status === 'expired') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {status === 'expired' ? 'Payment Expired' : 'Payment Failed'}
          </h1>
          <p className="text-gray-600 mb-6">
            {error || 'This payment link is no longer valid. Please request a new payment link.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  // Render success state
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-2">
            Thank you for your payment to {session?.merchantName}
          </p>
          <p className="text-2xl font-bold text-gray-900 mb-6">
            {session && formatAmount(session.amount, session.currency)}
          </p>
          <div className="text-sm text-gray-500 mb-6">
            Transaction ID: {session?.sessionId}
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // Render processing state
  if (status === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Processing Payment</h1>
          <p className="text-gray-600">Please wait while we process your payment...</p>
        </div>
      </div>
    );
  }

  // Render checkout page
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-primary-600 text-white p-6 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold mb-1">Peeap Pay</h1>
            <p className="text-primary-100 text-sm">Secure Payment</p>
          </div>

          {/* Amount */}
          <div className="p-6 text-center border-b border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Pay to {session?.merchantName}</p>
            <p className="text-4xl font-bold text-gray-900">
              {session && formatAmount(session.amount, session.currency)}
            </p>
            {session?.description && (
              <p className="text-sm text-gray-500 mt-2">{session.description}</p>
            )}
          </div>

          {/* Timer */}
          <div className="px-6 py-3 bg-yellow-50 border-b border-yellow-100 flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-yellow-700">
              Expires in {formatTime(timeRemaining)}
            </span>
          </div>

          {/* Payment Options */}
          <div className="p-6 space-y-4">
            {/* QR Code */}
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <QrCode className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Scan to Pay</span>
              </div>
              <div className="bg-white p-4 rounded-lg inline-block">
                {/* QR Code placeholder - in production, generate actual QR */}
                <div className="w-40 h-40 bg-gray-200 rounded flex items-center justify-center">
                  <QrCode className="w-20 h-20 text-gray-400" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Open Peeap app and scan this code
              </p>
            </div>

            {/* Open App Button */}
            <button
              onClick={handleOpenApp}
              className="w-full py-4 bg-primary-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors"
            >
              <Smartphone className="w-5 h-5" />
              Open Peeap App
              <ExternalLink className="w-4 h-4" />
            </button>

            {/* NFC Option (if supported) */}
            {isNFCSupported && (
              <div className="text-center py-3">
                <div className="flex items-center justify-center gap-2 text-gray-500">
                  <Wifi className="w-5 h-5" />
                  <span className="text-sm">or tap your NFC card</span>
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            {/* Web Payment Option */}
            <button
              onClick={handleWebPayment}
              className="w-full py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
            >
              <CreditCard className="w-5 h-5" />
              Pay with Card
            </button>

            {/* Download App Link */}
            <div className="text-center">
              <a
                href="https://my.peeap.com/download"
                className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
              >
                <Download className="w-4 h-4" />
                Don't have the app? Download Peeap
              </a>
            </div>
          </div>

          {/* Security Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <Shield className="w-4 h-4" />
              <span className="text-xs">Secured by Peeap Pay</span>
            </div>
          </div>
        </div>

        {/* Session ID */}
        <div className="text-center mt-4">
          <p className="text-xs text-white/60">
            Session: {session?.sessionId}
          </p>
        </div>
      </div>
    </div>
  );
}
