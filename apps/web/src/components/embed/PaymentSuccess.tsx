/**
 * Payment Success Component
 *
 * Displays success animation and transaction details
 */

import { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PaymentSuccessProps {
  amount: number;
  currency: string;
  transactionId?: string;
  merchantName: string;
  onComplete?: () => void;
}

// Currency definitions
const CURRENCIES: Record<string, { symbol: string; decimals: number }> = {
  SLE: { symbol: 'Le', decimals: 2 },
  USD: { symbol: '$', decimals: 2 },
  EUR: { symbol: '€', decimals: 2 },
  GBP: { symbol: '£', decimals: 2 },
  NGN: { symbol: '₦', decimals: 2 },
  GHS: { symbol: '₵', decimals: 2 },
};

export function PaymentSuccess({
  amount,
  currency,
  transactionId,
  merchantName,
  onComplete,
}: PaymentSuccessProps) {
  const currencyInfo = CURRENCIES[currency] || CURRENCIES.SLE;

  const formatAmount = (amt: number): string => {
    return `${currencyInfo.symbol} ${amt.toLocaleString(undefined, {
      minimumFractionDigits: currencyInfo.decimals,
      maximumFractionDigits: currencyInfo.decimals,
    })}`;
  };

  // Play confetti on mount
  useEffect(() => {
    // Fire confetti
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: ['#6366f1', '#8b5cf6', '#22c55e'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: ['#6366f1', '#8b5cf6', '#22c55e'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    // Play success sound
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      // Ignore audio errors
    }

    // Auto-complete after 3 seconds
    const timer = setTimeout(() => {
      onComplete?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      {/* Success Icon */}
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6 animate-bounce-once">
        <CheckCircle className="w-12 h-12 text-green-600" />
      </div>

      {/* Success Message */}
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
      <p className="text-gray-600 mb-6">
        You paid {formatAmount(amount)} to {merchantName}
      </p>

      {/* Transaction ID */}
      {transactionId && (
        <div className="bg-gray-50 rounded-lg px-4 py-3 mb-6">
          <p className="text-xs text-gray-500 mb-1">Transaction ID</p>
          <p className="font-mono text-sm text-gray-900">{transactionId}</p>
        </div>
      )}

      {/* Auto-close message */}
      <p className="text-sm text-gray-500">
        This window will close automatically...
      </p>
    </div>
  );
}
