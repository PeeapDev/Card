/**
 * NFC Payment Terminal Component
 *
 * Channel-agnostic payment terminal with QR code AND NFC/Tap-to-Pay support.
 *
 * Features:
 * - Creates Payment Intent via API
 * - Displays QR code for scan-to-pay
 * - Connects to NFC reader via Web NFC API
 * - Handles contactless card/phone taps
 * - Real-time payment status updates
 * - Success animations with confetti
 *
 * Usage:
 * ```tsx
 * <NFCPaymentTerminal
 *   amount={5000}
 *   merchantId={merchantId}
 *   merchantName="My Store"
 *   apiKey={secretKey}
 *   onPaymentSuccess={(payment) => {
 *     console.log('Payment received!', payment);
 *   }}
 * />
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import QRCode from 'react-qr-code';
import confetti from 'canvas-confetti';
import {
  CheckCircle,
  Loader2,
  RefreshCw,
  XCircle,
  Clock,
  QrCode as QrCodeIcon,
  Smartphone,
  Wifi,
  WifiOff,
  CreditCard,
  Nfc,
  AlertCircle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { API_URL, APP_URL } from '@/config/urls';

// Types
interface PaymentIntent {
  id: string;
  external_id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: string;
  qr_code_url?: string;
  expires_at?: string;
}

interface NFCPaymentTerminalProps {
  /** Amount in cents/minor units */
  amount: number;
  /** Currency code (default: SLE) */
  currency?: string;
  /** Merchant ID for the payment */
  merchantId: string;
  /** Merchant display name */
  merchantName?: string;
  /** API Key for creating payment intents */
  apiKey: string;
  /** Description for the payment */
  description?: string;
  /** Terminal ID for tracking */
  terminalId?: string;
  /** Custom metadata */
  metadata?: Record<string, any>;
  /** Callback when payment succeeds */
  onPaymentSuccess?: (payment: any) => void;
  /** Callback when payment fails */
  onPaymentFailed?: (error: string) => void;
  /** Callback when payment is cancelled */
  onPaymentCancelled?: () => void;
  /** Auto-start (create payment intent on mount) */
  autoStart?: boolean;
  /** Show sound toggle (default: true) */
  showSoundToggle?: boolean;
  /** Enable sound by default (default: true) */
  soundEnabled?: boolean;
  /** QR code size in pixels (default: 200) */
  qrSize?: number;
  /** Compact mode */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

type TerminalStatus =
  | 'idle'
  | 'creating'
  | 'ready'
  | 'nfc_connecting'
  | 'nfc_connected'
  | 'nfc_reading'
  | 'processing'
  | 'success'
  | 'failed'
  | 'expired'
  | 'cancelled';

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

// Play tap detected sound
const playTapSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch (e) {
    console.log('Could not play tap sound');
  }
};

// Fire confetti burst
const fireConfetti = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#10B981', '#34D399', '#6EE7B7', '#FFD700', '#FFA500'],
  });

  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#10B981', '#34D399', '#6EE7B7'],
    });
  }, 150);

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

// Check if Web NFC is supported
const isWebNFCSupported = () => {
  return 'NDEFReader' in window;
};

export function NFCPaymentTerminal({
  amount,
  currency = 'SLE',
  merchantId,
  merchantName,
  apiKey,
  description,
  terminalId,
  metadata,
  onPaymentSuccess,
  onPaymentFailed,
  onPaymentCancelled,
  autoStart = true,
  showSoundToggle = true,
  soundEnabled: initialSoundEnabled = true,
  qrSize = 200,
  compact = false,
  className = '',
}: NFCPaymentTerminalProps) {
  const [status, setStatus] = useState<TerminalStatus>('idle');
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nfcReader, setNfcReader] = useState<any>(null);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(initialSoundEnabled);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check NFC support on mount
  useEffect(() => {
    setNfcSupported(isWebNFCSupported());
  }, []);

  // Auto-start on mount
  useEffect(() => {
    if (autoStart) {
      createPaymentIntent();
    }
    return () => {
      stopPolling();
      disconnectNFC();
    };
  }, []);

  // Format currency
  const formatCurrency = (amt: number) => {
    const symbols: Record<string, string> = {
      SLE: 'Le',
      USD: '$',
      EUR: '€',
      GBP: '£',
    };
    const symbol = symbols[currency] || currency;
    return `${symbol} ${(amt / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  // Create payment intent
  const createPaymentIntent = async () => {
    setStatus('creating');
    setError(null);

    try {
      const response = await fetch(`${API_URL}/v1/payment-intents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          amount,
          currency,
          description: description || `Payment at ${merchantName || 'Terminal'}`,
          merchant_id: merchantId,
          terminal_id: terminalId,
          payment_methods: ['qr', 'nfc', 'wallet', 'card'],
          metadata: {
            ...metadata,
            terminal_type: 'web_nfc',
          },
          expires_in_minutes: 15,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create payment intent');
      }

      const intent = await response.json();
      setPaymentIntent(intent);
      setStatus('ready');

      // Start polling for payment status
      startPolling(intent.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create payment');
      setStatus('failed');
      onPaymentFailed?.(err.message);
    }
  };

  // Start polling for payment status
  const startPolling = (intentId: string) => {
    stopPolling();

    const poll = async () => {
      try {
        const response = await fetch(`${API_URL}/v1/payment-intents/${intentId}`, {
          headers: {
            'X-API-Key': apiKey,
          },
        });

        if (response.ok) {
          const intent = await response.json();

          if (intent.status === 'succeeded') {
            stopPolling();
            handlePaymentSuccess(intent);
          } else if (intent.status === 'failed') {
            stopPolling();
            setStatus('failed');
            setError(intent.last_payment_error?.message || 'Payment failed');
            onPaymentFailed?.(intent.last_payment_error?.message || 'Payment failed');
          } else if (intent.status === 'canceled') {
            stopPolling();
            setStatus('cancelled');
            onPaymentCancelled?.();
          } else if (new Date(intent.expires_at) < new Date()) {
            stopPolling();
            setStatus('expired');
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    pollingRef.current = setInterval(poll, 2000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  // Handle successful payment
  const handlePaymentSuccess = (intent: any) => {
    setStatus('success');
    if (soundEnabled) {
      playSuccessSound();
    }
    fireConfetti();
    onPaymentSuccess?.(intent);
  };

  // Connect to NFC reader
  const connectNFC = async () => {
    if (!nfcSupported) {
      setError('NFC is not supported on this device/browser');
      return;
    }

    setStatus('nfc_connecting');

    try {
      // Request NFC permission
      const ndef = new (window as any).NDEFReader();
      abortControllerRef.current = new AbortController();

      await ndef.scan({ signal: abortControllerRef.current.signal });

      setNfcReader(ndef);
      setStatus('nfc_connected');

      // Handle NFC readings
      ndef.addEventListener('reading', async ({ message, serialNumber }: any) => {
        if (soundEnabled) {
          playTapSound();
        }
        setStatus('nfc_reading');

        console.log('[NFC] Tag detected:', serialNumber);
        console.log('[NFC] Message:', message);

        // Extract payment data from NFC tag
        const nfcData = {
          serial_number: serialNumber,
          records: [] as any[],
        };

        for (const record of message.records) {
          const textDecoder = new TextDecoder();
          nfcData.records.push({
            type: record.recordType,
            data: textDecoder.decode(record.data),
          });
        }

        // Confirm payment with NFC data
        await confirmPaymentWithNFC(nfcData);
      });

      ndef.addEventListener('readingerror', () => {
        console.error('[NFC] Read error');
        if (soundEnabled) {
          // Play error sound
        }
      });

    } catch (err: any) {
      console.error('[NFC] Connection error:', err);
      setError(err.message || 'Failed to connect NFC reader');
      setStatus('ready');
    }
  };

  // Disconnect NFC reader
  const disconnectNFC = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setNfcReader(null);
    if (status === 'nfc_connected' || status === 'nfc_reading') {
      setStatus('ready');
    }
  };

  // Confirm payment with NFC data
  const confirmPaymentWithNFC = async (nfcData: any) => {
    if (!paymentIntent) return;

    setStatus('processing');

    try {
      const response = await fetch(`${API_URL}/v1/payment-intents/${paymentIntent.id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Secret': paymentIntent.client_secret,
        },
        body: JSON.stringify({
          payment_method_type: 'nfc',
          nfc: {
            serial_number: nfcData.serial_number,
            records: nfcData.records,
            type: 'web_nfc',
          },
        }),
      });

      const result = await response.json();

      if (result.status === 'succeeded') {
        handlePaymentSuccess(result);
      } else if (result.status === 'requires_action') {
        // Handle additional action (e.g., PIN entry)
        setError('Additional verification required');
        setStatus('ready');
      } else if (result.status === 'failed') {
        setStatus('failed');
        setError(result.error?.message || 'Payment failed');
        onPaymentFailed?.(result.error?.message || 'Payment failed');
      } else {
        // Still processing, continue polling
        setStatus('ready');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process NFC payment');
      setStatus('ready');
    }
  };

  // Cancel payment
  const cancelPayment = async () => {
    if (!paymentIntent) return;

    try {
      await fetch(`${API_URL}/v1/payment-intents/${paymentIntent.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({ reason: 'requested_by_merchant' }),
      });

      stopPolling();
      disconnectNFC();
      setStatus('cancelled');
      onPaymentCancelled?.();
    } catch (err) {
      console.error('Failed to cancel payment:', err);
    }
  };

  // Reset and create new payment
  const resetPayment = () => {
    stopPolling();
    disconnectNFC();
    setPaymentIntent(null);
    setError(null);
    createPaymentIntent();
  };

  // Get QR code URL
  const getQRCodeUrl = () => {
    if (!paymentIntent) return '';
    return `${APP_URL}/i/${paymentIntent.external_id || paymentIntent.id}`;
  };

  // Render based on status
  const padding = compact ? 'p-3' : 'p-6';

  return (
    <div className={`bg-white rounded-2xl shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            <span className="font-semibold">Payment Terminal</span>
          </div>
          <div className="flex items-center gap-2">
            {showSoundToggle && (
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </button>
            )}
            {/* NFC Status Indicator */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
              status === 'nfc_connected' || status === 'nfc_reading'
                ? 'bg-green-500/20 text-green-100'
                : nfcSupported
                ? 'bg-white/10 text-white/70'
                : 'bg-red-500/20 text-red-200'
            }`}>
              {status === 'nfc_connected' || status === 'nfc_reading' ? (
                <>
                  <Wifi className="w-3 h-3" />
                  <span>NFC Ready</span>
                </>
              ) : nfcSupported ? (
                <>
                  <WifiOff className="w-3 h-3" />
                  <span>NFC Available</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  <span>No NFC</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="text-center mt-4">
          <p className="text-purple-200 text-sm">Amount</p>
          <p className="text-3xl font-bold">{formatCurrency(amount)}</p>
          {merchantName && (
            <p className="text-purple-200 text-sm mt-1">{merchantName}</p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={padding}>
        {/* Creating State */}
        {status === 'creating' && (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 mx-auto text-purple-600 animate-spin mb-4" />
            <p className="text-gray-600">Creating payment...</p>
          </div>
        )}

        {/* Ready State - Show QR and NFC options */}
        {(status === 'ready' || status === 'nfc_connected' || status === 'nfc_connecting') && paymentIntent && (
          <div className="space-y-6">
            {/* QR Code Section */}
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-3">Scan QR code to pay</p>
              <div className="inline-block p-4 bg-white rounded-xl shadow-md border">
                <QRCode
                  value={getQRCodeUrl()}
                  size={qrSize}
                  level="M"
                />
              </div>
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Waiting for payment...</span>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-sm text-gray-400">OR</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* NFC Section */}
            <div className="text-center">
              {status === 'nfc_connecting' ? (
                <div className="py-4">
                  <Loader2 className="w-8 h-8 mx-auto text-purple-600 animate-spin mb-2" />
                  <p className="text-sm text-gray-600">Connecting to NFC reader...</p>
                </div>
              ) : status === 'nfc_connected' ? (
                <div className="py-4">
                  <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3 animate-pulse">
                    <Nfc className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-green-600 font-medium">NFC Reader Connected</p>
                  <p className="text-sm text-gray-500 mt-1">Tap card or phone to pay</p>
                  <button
                    onClick={disconnectNFC}
                    className="mt-3 text-sm text-gray-500 hover:text-gray-700"
                  >
                    Disconnect
                  </button>
                </div>
              ) : nfcSupported ? (
                <button
                  onClick={connectNFC}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium flex items-center justify-center gap-3 hover:from-purple-700 hover:to-indigo-700 transition-all"
                >
                  <Nfc className="w-5 h-5" />
                  <span>Connect NFC Reader for Tap-to-Pay</span>
                </button>
              ) : (
                <div className="py-4 px-4 bg-gray-50 rounded-xl">
                  <WifiOff className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">
                    NFC not available on this device.
                    <br />
                    <span className="text-xs">Use Chrome on Android for NFC support.</span>
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={resetPayment}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" />
                New Payment
              </button>
              <button
                onClick={cancelPayment}
                className="flex-1 py-3 border border-red-300 text-red-600 rounded-xl font-medium hover:bg-red-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* NFC Reading State */}
        {status === 'nfc_reading' && (
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <Smartphone className="w-10 h-10 text-purple-600" />
            </div>
            <p className="text-lg font-semibold text-gray-900">Card Detected!</p>
            <p className="text-gray-500">Reading payment information...</p>
          </div>
        )}

        {/* Processing State */}
        {status === 'processing' && (
          <div className="text-center py-8">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
              <div className="absolute inset-0 border-4 border-purple-600 rounded-full border-t-transparent animate-spin" />
            </div>
            <p className="text-lg font-semibold text-gray-900">Processing Payment</p>
            <p className="text-gray-500">Please wait...</p>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="text-center py-8">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-50" />
              <div className="absolute inset-0 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-green-600">Payment Successful!</p>
            <p className="text-gray-500 mt-2">{formatCurrency(amount)}</p>
            <button
              onClick={resetPayment}
              className="mt-6 px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700"
            >
              New Payment
            </button>
          </div>
        )}

        {/* Failed State */}
        {status === 'failed' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-lg font-semibold text-red-600">Payment Failed</p>
            {error && <p className="text-sm text-gray-500 mt-1">{error}</p>}
            <button
              onClick={resetPayment}
              className="mt-4 px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Expired State */}
        {status === 'expired' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <p className="text-lg font-semibold text-yellow-600">Session Expired</p>
            <p className="text-sm text-gray-500 mt-1">Please create a new payment</p>
            <button
              onClick={resetPayment}
              className="mt-4 px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700"
            >
              New Payment
            </button>
          </div>
        )}

        {/* Cancelled State */}
        {status === 'cancelled' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-lg font-semibold text-gray-600">Payment Cancelled</p>
            <button
              onClick={resetPayment}
              className="mt-4 px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700"
            >
              New Payment
            </button>
          </div>
        )}

        {/* Idle State */}
        {status === 'idle' && (
          <div className="text-center py-8">
            <QrCodeIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">Ready to accept payment</p>
            <button
              onClick={createPaymentIntent}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700"
            >
              Start Payment
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && status !== 'failed' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default NFCPaymentTerminal;
