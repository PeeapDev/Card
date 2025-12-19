/**
 * PaymentReceiver Component
 *
 * STANDARDIZED PAYMENT RECEIVING UI
 *
 * RULE: All QR payment UIs should use this component.
 * It provides a consistent experience for receiving payments via QR code.
 *
 * Features:
 * - Creates checkout session automatically
 * - Displays QR code with amount
 * - Shows loading, pending, success, and error states
 * - Auto-detects payment and calls callback
 * - Refresh/regenerate QR option
 * - Celebratory success animation with confetti and sound
 *
 * Usage:
 * ```tsx
 * <PaymentReceiver
 *   walletId={merchantWalletId}
 *   userId={merchantId}
 *   amount={totalAmount}
 *   merchantName="My Store"
 *   onPaymentReceived={(session) => {
 *     console.log('Payment received!', session);
 *     processSale();
 *   }}
 *   showSuccessAnimation={true}
 *   successDuration={1500}
 * />
 * ```
 */

import { useEffect, useState, useCallback } from 'react';
import QRCode from 'react-qr-code';
import confetti from 'canvas-confetti';
import {
  CheckCircle,
  Loader2,
  RefreshCw,
  XCircle,
  Clock,
  QrCode as QrCodeIcon,
} from 'lucide-react';
import { usePaymentReceiver, PaymentReceiverConfig, CheckoutSession, VerifiedPayment } from '@/hooks/usePaymentReceiver';

interface PaymentReceiverProps extends PaymentReceiverConfig {
  /** QR code size in pixels (default: 180) */
  qrSize?: number;
  /** Show amount above QR code (default: true) */
  showAmount?: boolean;
  /** Custom currency symbol */
  currencySymbol?: string;
  /** Show refresh button (default: true) */
  showRefresh?: boolean;
  /** Custom class name for container */
  className?: string;
  /** Compact mode - smaller UI */
  compact?: boolean;
  /** Show celebratory success animation (default: true) */
  showSuccessAnimation?: boolean;
  /** Duration to show success before callback (ms, default: 1500) */
  successDuration?: number;
  /** Play success sound (default: true) */
  playSound?: boolean;
  /** Show confetti (default: true) */
  showConfetti?: boolean;
  /** Full screen success overlay (default: false) */
  fullScreenSuccess?: boolean;
}

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
const fireConfetti = () => {
  // Center burst
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#10B981', '#34D399', '#6EE7B7', '#FFD700', '#FFA500'],
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

export function PaymentReceiver({
  qrSize = 180,
  showAmount = true,
  currencySymbol = 'NLe',
  showRefresh = true,
  className = '',
  compact = false,
  showSuccessAnimation = true,
  successDuration = 1500,
  playSound = true,
  showConfetti = true,
  fullScreenSuccess = false,
  ...config
}: PaymentReceiverProps) {
  const [showingSuccess, setShowingSuccess] = useState(false);
  const [successTriggered, setSuccessTriggered] = useState(false);

  // Wrap the original callback to show success animation first
  const handlePaymentReceived = useCallback((session: VerifiedPayment) => {
    if (showSuccessAnimation && !successTriggered) {
      setSuccessTriggered(true);
      setShowingSuccess(true);

      // Trigger effects
      if (showConfetti) fireConfetti();
      if (playSound) playSuccessSound();

      // Call original callback after animation
      setTimeout(() => {
        setShowingSuccess(false);
        config.onPaymentReceived?.(session);
      }, successDuration);
    } else {
      config.onPaymentReceived?.(session);
    }
  }, [showSuccessAnimation, successTriggered, showConfetti, playSound, successDuration, config.onPaymentReceived]);

  const payment = usePaymentReceiver({
    ...config,
    onPaymentReceived: handlePaymentReceived,
  });

  // Format currency
  const formatCurrency = (amount: number) => {
    return `${currencySymbol} ${amount.toLocaleString()}`;
  };

  // Container padding based on compact mode
  const padding = compact ? 'p-3' : 'p-4';

  // Full screen success overlay
  if (showingSuccess && fullScreenSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/30">
        <div className="text-center animate-in zoom-in-95 duration-300">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-25" />
            <CheckCircle className="w-24 h-24 mx-auto text-green-500 relative z-10" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
            Payment Successful!
          </h1>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {formatCurrency(config.amount)}
          </p>
          {config.merchantName && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Paid to {config.merchantName}
            </p>
          )}
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

  return (
    <div className={`text-center ${className}`}>
      {/* Success State (inline or after animation) */}
      {(payment.isPaid || showingSuccess) && (
        <div className={`${padding} ${compact ? 'py-4' : 'py-8'} ${showingSuccess ? 'animate-in zoom-in-95 duration-300' : ''}`}>
          <div className="relative inline-block mb-3">
            {showingSuccess && <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-25" />}
            <CheckCircle className={`${compact ? 'w-12 h-12' : 'w-16 h-16'} mx-auto text-green-500 relative`} />
          </div>
          <p className={`${compact ? 'text-base' : 'text-lg'} font-semibold text-green-600`}>
            Payment Received!
          </p>
          {showAmount && (
            <p className="text-sm text-gray-500 mt-1">
              {formatCurrency(config.amount)}
            </p>
          )}
        </div>
      )}

      {/* Creating Session */}
      {payment.isCreating && !showingSuccess && (
        <div className={`${padding} ${compact ? 'py-4' : 'py-8'}`}>
          <Loader2 className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} mx-auto text-primary-500 animate-spin mb-3`} />
          <p className="text-sm text-gray-600">Creating payment session...</p>
        </div>
      )}

      {/* QR Ready - Waiting for Payment */}
      {payment.isReady && payment.checkoutUrl && !showingSuccess && !payment.isPaid && (
        <>
          {/* Amount Display */}
          {showAmount && (
            <div className="mb-3">
              <p className="text-xs text-gray-500">Amount to pay</p>
              <p className={`${compact ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 dark:text-white`}>
                {formatCurrency(config.amount)}
              </p>
            </div>
          )}

          {/* QR Code */}
          <div className={`${compact ? 'p-3' : 'p-4'} bg-white rounded-xl shadow-lg inline-block`}>
            <QRCode
              value={payment.checkoutUrl}
              size={qrSize}
              level="M"
            />
          </div>

          {/* Waiting Indicator */}
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Waiting for payment...</span>
          </div>

          <p className="mt-2 text-xs text-gray-500">
            Customer scans to open checkout
          </p>

          {/* Refresh Button */}
          {showRefresh && (
            <button
              onClick={() => payment.createSession()}
              className="mt-3 text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 mx-auto"
            >
              <RefreshCw className="w-3 h-3" />
              Generate new QR
            </button>
          )}
        </>
      )}

      {/* Expired State */}
      {payment.isExpired && (
        <div className={`${padding} ${compact ? 'py-4' : 'py-8'}`}>
          <Clock className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} mx-auto text-yellow-500 mb-3`} />
          <p className="text-sm font-medium text-yellow-600 mb-2">Session Expired</p>
          <button
            onClick={() => payment.createSession()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
          >
            Create New Session
          </button>
        </div>
      )}

      {/* Error State */}
      {payment.isError && (
        <div className={`${padding} ${compact ? 'py-4' : 'py-8'}`}>
          <XCircle className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} mx-auto text-red-500 mb-3`} />
          <p className="text-sm font-medium text-red-600 mb-1">Payment Error</p>
          {payment.error && (
            <p className="text-xs text-gray-500 mb-3">{payment.error}</p>
          )}
          <button
            onClick={() => payment.createSession()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Idle State (if autoStart is false) */}
      {payment.status === 'idle' && (
        <div className={`${padding} ${compact ? 'py-4' : 'py-8'}`}>
          <QrCodeIcon className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} mx-auto text-gray-400 mb-3`} />
          <p className="text-sm text-gray-500 mb-3">Ready to receive payment</p>
          <button
            onClick={() => payment.createSession()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
          >
            Generate QR Code
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Minimal PaymentReceiver - Just the QR code, no extra UI
 * Use when you want to build custom UI around it
 */
export function PaymentReceiverMinimal({
  qrSize = 200,
  ...config
}: PaymentReceiverProps) {
  const payment = usePaymentReceiver(config);

  if (payment.isCreating) {
    return (
      <div style={{ width: qrSize, height: qrSize }} className="flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (payment.isPaid) {
    return (
      <div style={{ width: qrSize, height: qrSize }} className="flex items-center justify-center">
        <CheckCircle className="w-16 h-16 text-green-500" />
      </div>
    );
  }

  if (payment.checkoutUrl) {
    return (
      <div className="p-4 bg-white rounded-xl inline-block">
        <QRCode value={payment.checkoutUrl} size={qrSize} level="M" />
      </div>
    );
  }

  return (
    <div style={{ width: qrSize, height: qrSize }} className="flex items-center justify-center bg-gray-100 rounded-xl">
      <QrCodeIcon className="w-12 h-12 text-gray-400" />
    </div>
  );
}

export default PaymentReceiver;
