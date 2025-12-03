/**
 * App Payment Redirect Page
 *
 * Smart redirect page for QR code payments scanned with native camera.
 * Handles:
 * 1. Detecting if Peeap app is installed
 * 2. Deep linking to app if installed
 * 3. Redirecting to app store if not installed (with deferred deep link)
 * 4. Fallback to web checkout if user prefers
 *
 * URL format: /app/pay/:paymentId?amount=50000&currency=SLE
 */

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Smartphone,
  Download,
  ExternalLink,
  Loader2,
  QrCode,
  ArrowRight,
  Apple,
  Play,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

// App store URLs - replace with your actual app store URLs
const APP_STORE_URL = 'https://apps.apple.com/app/peeap/id123456789';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.peeap.app';

// Deep link scheme
const APP_SCHEME = 'peeappay';

// Currency definitions
const CURRENCIES: Record<string, { symbol: string; name: string }> = {
  SLE: { symbol: 'Le', name: 'Sierra Leonean Leone' },
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
};

export function AppPaymentRedirectPage() {
  const { paymentId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [appOpened, setAppOpened] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');

  // URL params
  const amount = searchParams.get('amount');
  const currency = searchParams.get('currency') || 'SLE';
  const description = searchParams.get('description');
  const merchant = searchParams.get('merchant');

  // Format amount
  const formatAmount = (amt: string): string => {
    const curr = CURRENCIES[currency] || CURRENCIES.SLE;
    return `${curr.symbol} ${parseFloat(amt).toLocaleString()}`;
  };

  // Generate deep link URL with all payment params
  const getDeepLink = (): string => {
    const params = new URLSearchParams();
    if (amount) params.set('amount', amount);
    if (currency) params.set('currency', currency);
    if (description) params.set('description', description);
    if (merchant) params.set('merchant', merchant);

    return `${APP_SCHEME}://checkout/${paymentId}?${params.toString()}`;
  };

  // Generate web fallback URL
  const getWebCheckoutUrl = (): string => {
    return `/checkout/${paymentId}?${searchParams.toString()}`;
  };

  // Detect platform
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }
  }, []);

  // Try to open app automatically on mobile
  useEffect(() => {
    if (platform === 'desktop') {
      setIsLoading(false);
      return;
    }

    // Store payment intent for deferred deep linking
    // This will be picked up by the app after installation
    const paymentIntent = {
      paymentId,
      amount,
      currency,
      description,
      merchant,
      timestamp: Date.now(),
      returnUrl: window.location.href,
    };

    // Store in localStorage for the app to retrieve
    localStorage.setItem('pendingPayment', JSON.stringify(paymentIntent));

    // Also store in a cookie that the app can read
    document.cookie = `peeap_payment=${encodeURIComponent(JSON.stringify(paymentIntent))}; path=/; max-age=3600`;

    // Try to open the app
    const deepLink = getDeepLink();
    const startTime = Date.now();

    // Create hidden iframe for iOS deep link attempt
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = deepLink;
    document.body.appendChild(iframe);

    // Also try direct location change for Android
    if (platform === 'android') {
      // Use intent URL for Android
      const intentUrl = `intent://checkout/${paymentId}?${searchParams.toString()}#Intent;scheme=${APP_SCHEME};package=com.peeap.app;end`;
      window.location.href = intentUrl;
    }

    // Check if app opened (if we're still here after 2.5 seconds, app is not installed)
    const timeout = setTimeout(() => {
      const elapsed = Date.now() - startTime;

      // If less than 2 seconds passed and page is still visible, app didn't open
      if (elapsed < 2500 && !document.hidden) {
        setIsLoading(false);
        setAppOpened(false);
      }
    }, 2500);

    // Listen for visibility change (app opening will hide the page)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setAppOpened(true);
        clearTimeout(timeout);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      clearTimeout(timeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    };
  }, [platform, paymentId, amount, currency, description, merchant]);

  // Handle manual app open attempt
  const handleOpenApp = () => {
    const deepLink = getDeepLink();
    window.location.href = deepLink;

    // After a short delay, if we're still here, redirect to store
    setTimeout(() => {
      if (!document.hidden) {
        handleDownloadApp();
      }
    }, 1500);
  };

  // Handle app download
  const handleDownloadApp = () => {
    // Store payment for after install
    const paymentIntent = {
      paymentId,
      amount,
      currency,
      description,
      merchant,
      timestamp: Date.now(),
      returnUrl: window.location.href,
    };
    localStorage.setItem('pendingPayment', JSON.stringify(paymentIntent));

    // Redirect to appropriate store
    if (platform === 'ios') {
      window.location.href = APP_STORE_URL;
    } else if (platform === 'android') {
      window.location.href = PLAY_STORE_URL;
    }
  };

  // Handle web checkout fallback
  const handleWebCheckout = () => {
    navigate(getWebCheckoutUrl());
  };

  // Loading state while attempting to open app
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Opening Peeap...</h1>
          <p className="text-gray-600">
            {platform === 'desktop'
              ? 'Preparing payment...'
              : 'Checking if Peeap app is installed...'}
          </p>
        </Card>
      </div>
    );
  }

  // Desktop view - show QR code to scan with phone
  if (platform === 'desktop') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Scan with Phone</h1>
          <p className="text-gray-600 mb-6">
            Please scan this QR code with your phone to complete the payment
          </p>

          {/* Amount Display */}
          {amount && (
            <div className="p-4 bg-gray-50 rounded-xl mb-6">
              <p className="text-sm text-gray-500">Amount to pay</p>
              <p className="text-3xl font-bold text-gray-900">{formatAmount(amount)}</p>
            </div>
          )}

          <p className="text-sm text-gray-500 mb-4">Or continue on this device:</p>

          <button
            onClick={handleWebCheckout}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 flex items-center justify-center gap-2"
          >
            Continue in Browser
            <ArrowRight className="w-5 h-5" />
          </button>
        </Card>
      </div>
    );
  }

  // Mobile view - app not installed, show download prompt
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="overflow-hidden">
          {/* Header */}
          <div className="bg-white p-6 text-center border-b border-gray-100">
            <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-10 h-10 text-indigo-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Complete Payment</h1>
            <p className="text-gray-500 text-sm">with Peeap App</p>
          </div>

          {/* Amount Display */}
          {amount && (
            <div className="p-6 bg-gray-50 border-b border-gray-100 text-center">
              <p className="text-sm text-gray-500">Amount to pay</p>
              <p className="text-4xl font-bold text-gray-900">{formatAmount(amount)}</p>
              {merchant && <p className="text-sm text-gray-500 mt-1">to {merchant}</p>}
            </div>
          )}

          {/* Download Section */}
          <div className="p-6">
            <div className="bg-indigo-50 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Download className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-indigo-900">Get the Peeap App</p>
                  <p className="text-sm text-indigo-700 mt-1">
                    Download the app to complete this payment securely. Your payment will continue automatically after installation.
                  </p>
                </div>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="space-y-3 mb-6">
              {platform === 'ios' && (
                <button
                  onClick={handleDownloadApp}
                  className="w-full py-4 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 flex items-center justify-center gap-3"
                >
                  <Apple className="w-6 h-6" />
                  <div className="text-left">
                    <p className="text-xs opacity-80">Download on the</p>
                    <p className="text-lg font-bold -mt-1">App Store</p>
                  </div>
                </button>
              )}

              {platform === 'android' && (
                <button
                  onClick={handleDownloadApp}
                  className="w-full py-4 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 flex items-center justify-center gap-3"
                >
                  <Play className="w-6 h-6" />
                  <div className="text-left">
                    <p className="text-xs opacity-80">Get it on</p>
                    <p className="text-lg font-bold -mt-1">Google Play</p>
                  </div>
                </button>
              )}
            </div>

            {/* Already have app button */}
            <button
              onClick={handleOpenApp}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 flex items-center justify-center gap-2 mb-3"
            >
              <ExternalLink className="w-5 h-5" />
              I have the app, open it
            </button>

            {/* Web fallback */}
            <button
              onClick={handleWebCheckout}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
            >
              Continue in Browser Instead
            </button>
          </div>

          {/* How it works */}
          <div className="px-6 pb-6">
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-500 text-center">
                After downloading, the app will automatically open with your payment ready to complete.
              </p>
            </div>
          </div>
        </Card>

        {/* Trust badges */}
        <div className="text-center mt-4">
          <p className="text-sm text-white/70">
            Secure payments powered by Peeap
          </p>
        </div>
      </div>
    </div>
  );
}
