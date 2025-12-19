/**
 * PaymentSuccess Component
 *
 * Displays a celebratory success animation when payment is received.
 * Features:
 * - Confetti burst animation
 * - Success sound effect
 * - Auto-redirect after configurable delay
 * - Clean, minimal design
 */

import { useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle } from 'lucide-react';

interface PaymentSuccessProps {
  /** Amount that was paid */
  amount: number;
  /** Currency symbol (default: NLe) */
  currencySymbol?: string;
  /** Merchant/recipient name */
  merchantName?: string;
  /** Message to display */
  message?: string;
  /** How long to show success (ms, default: 1500) */
  displayDuration?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Whether to auto-redirect */
  autoRedirect?: boolean;
  /** URL to redirect to (if autoRedirect) */
  redirectUrl?: string;
  /** Show confetti (default: true) */
  showConfetti?: boolean;
  /** Play sound (default: true) */
  playSound?: boolean;
}

// Success sound as base64 (short, pleasant chime)
const SUCCESS_SOUND_BASE64 = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYlgL6TAAAAAAAAAAAAAAAAAAAAAP/7UMQAA8AAAaQAAAAgAAA0gAAABExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//tQxBKAAADSAAAAAAAAANIAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=';

export function PaymentSuccess({
  amount,
  currencySymbol = 'NLe',
  merchantName,
  message = 'Payment Successful!',
  displayDuration = 1500,
  onComplete,
  autoRedirect = false,
  redirectUrl,
  showConfetti = true,
  playSound = true,
}: PaymentSuccessProps) {
  const hasPlayedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Format currency
  const formatCurrency = (amt: number) => {
    return `${currencySymbol} ${amt.toLocaleString()}`;
  };

  // Fire confetti
  const fireConfetti = useCallback(() => {
    if (!showConfetti) return;

    // First burst - center
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10B981', '#34D399', '#6EE7B7', '#FFD700', '#FFA500'],
    });

    // Second burst - left side
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#10B981', '#34D399', '#6EE7B7'],
      });
    }, 150);

    // Third burst - right side
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#10B981', '#34D399', '#6EE7B7'],
      });
    }, 300);
  }, [showConfetti]);

  // Play success sound
  const playSuccessSound = useCallback(() => {
    if (!playSound) return;

    try {
      // Try Web Audio API for better mobile support
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Create a simple success tone
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Pleasant two-tone success sound
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      // Fallback to audio element
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio(SUCCESS_SOUND_BASE64);
        }
        audioRef.current.volume = 0.5;
        audioRef.current.play().catch(() => {});
      } catch (e2) {
        console.log('Could not play success sound');
      }
    }
  }, [playSound]);

  // Trigger effects on mount
  useEffect(() => {
    if (hasPlayedRef.current) return;
    hasPlayedRef.current = true;

    // Fire confetti and play sound immediately
    fireConfetti();
    playSuccessSound();

    // Set up auto-complete/redirect
    const timer = setTimeout(() => {
      if (autoRedirect && redirectUrl) {
        window.location.href = redirectUrl;
      } else if (onComplete) {
        onComplete();
      }
    }, displayDuration);

    return () => clearTimeout(timer);
  }, [fireConfetti, playSuccessSound, displayDuration, autoRedirect, redirectUrl, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/30">
      <div className="text-center animate-in zoom-in-95 duration-300">
        {/* Success Icon with pulse animation */}
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-25" />
          <CheckCircle className="w-24 h-24 mx-auto text-green-500 relative z-10" strokeWidth={1.5} />
        </div>

        {/* Success Message */}
        <h1 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
          {message}
        </h1>

        {/* Amount */}
        <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
          {formatCurrency(amount)}
        </p>

        {/* Merchant Name */}
        {merchantName && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Paid to {merchantName}
          </p>
        )}

        {/* Loading indicator for redirect */}
        <div className="mt-6 flex justify-center">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to trigger payment success animation
 */
export function usePaymentSuccess() {
  const triggerConfetti = useCallback(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10B981', '#34D399', '#6EE7B7', '#FFD700', '#FFA500'],
    });
  }, []);

  const playSuccessSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log('Could not play success sound');
    }
  }, []);

  return { triggerConfetti, playSuccessSound };
}

export default PaymentSuccess;
