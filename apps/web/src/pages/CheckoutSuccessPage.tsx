/**
 * Checkout Success Page
 *
 * Displayed after a successful payment via hosted checkout
 * Shows payment confirmation with session details
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, Receipt, Home, Store } from 'lucide-react';

// Currency definitions
const CURRENCIES: Record<string, { symbol: string; name: string }> = {
  SLE: { symbol: 'Le', name: 'Sierra Leonean Leone' },
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
  NGN: { symbol: '₦', name: 'Nigerian Naira' },
  GHS: { symbol: '₵', name: 'Ghanaian Cedi' },
};

export function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const [showConfetti, setShowConfetti] = useState(true);

  const sessionId = searchParams.get('session_id');
  const status = searchParams.get('status');
  const amount = searchParams.get('amount');
  const currency = searchParams.get('currency') || 'SLE';
  const reference = searchParams.get('reference');
  const paymentMethod = searchParams.get('payment_method');

  // Hide confetti after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Format amount with currency
  const formatAmount = (value: string | null) => {
    if (!value) return '0';
    const curr = CURRENCIES[currency] || CURRENCIES.SLE;
    const amt = Number(value);
    return `${curr.symbol} ${amt.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatPaymentMethod = (method: string | null) => {
    if (!method) return 'Unknown';
    switch (method) {
      case 'scan_to_pay':
        return 'QR Scan to Pay';
      case 'peeap_card':
        return 'Peeap Card';
      case 'mobile_money':
        return 'Mobile Money';
      default:
        return method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Confetti animation */}
      {showConfetti && (
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
      )}

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

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">Thank you for your payment</p>

        {/* Amount display */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 mb-6">
          <p className="text-4xl font-bold text-green-600 mb-2">
            {formatAmount(amount)}
          </p>
          <p className="text-gray-500 text-sm">{CURRENCIES[currency]?.name || currency}</p>
        </div>

        {/* Payment details */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
          <div className="flex items-center gap-2 mb-3 text-gray-500">
            <Receipt className="w-4 h-4" />
            <span className="text-sm font-medium">Payment Details</span>
          </div>

          <div className="space-y-2 text-sm">
            {paymentMethod && (
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Method</span>
                <span className="font-medium text-gray-900">{formatPaymentMethod(paymentMethod)}</span>
              </div>
            )}
            {sessionId && (
              <div className="flex justify-between">
                <span className="text-gray-500">Session ID</span>
                <span className="font-mono text-xs text-gray-900 truncate max-w-[180px]">
                  {sessionId}
                </span>
              </div>
            )}
            {reference && (
              <div className="flex justify-between">
                <span className="text-gray-500">Reference</span>
                <span className="font-mono text-xs text-gray-900 truncate max-w-[180px]">
                  {reference}
                </span>
              </div>
            )}
            {status && (
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="font-medium text-green-600 capitalize">{status}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <a
            href="/"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all"
          >
            <Home className="w-5 h-5" />
            Go to Homepage
          </a>
          <a
            href="/merchant"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
          >
            <Store className="w-5 h-5" />
            View Merchant Dashboard
          </a>
        </div>

        {/* Security note */}
        <p className="text-xs text-gray-400 mt-6">
          This transaction has been securely processed by Peeap
        </p>
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
