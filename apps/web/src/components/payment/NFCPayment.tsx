/**
 * NFC Payment Component
 *
 * Handles NFC tap-to-pay functionality
 */

import { useState, useEffect } from 'react';
import {
  Smartphone,
  Wifi,
  WifiOff,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { nfcEngine, NFCTransactionToken, NFCCapabilities } from '@/services/nfc-engine';

interface NFCPaymentProps {
  userId: string;
  walletId: string;
  amount?: number;
  mode: 'receive' | 'send';
  maxAmount?: number;
  onTokenGenerated?: (token: NFCTransactionToken) => void;
  onPaymentReceived?: (transactionId: string) => void;
  onError?: (error: string) => void;
}

export function NFCPayment({
  userId,
  walletId,
  amount,
  mode,
  maxAmount,
  onTokenGenerated,
  onPaymentReceived,
  onError,
}: NFCPaymentProps) {
  const [capabilities, setCapabilities] = useState<NFCCapabilities | null>(null);
  const [token, setToken] = useState<NFCTransactionToken | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ready' | 'scanning' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const caps = nfcEngine.checkNFCCapabilities();
    setCapabilities(caps);
  }, []);

  const generateToken = async () => {
    setLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      let newToken: NFCTransactionToken;

      if (mode === 'receive') {
        newToken = await nfcEngine.generateReceiveToken(userId, walletId, amount);
      } else {
        newToken = await nfcEngine.generateSendToken(userId, walletId, maxAmount || 100);
      }

      setToken(newToken);
      setStatus('ready');
      onTokenGenerated?.(newToken);

      // Set countdown
      const expiresAt = new Date(newToken.expiresAt).getTime();
      setTimeLeft(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Failed to generate NFC token');
      onError?.(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          setStatus('idle');
          setMessage('Token expired. Generate a new one.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const startScanning = async () => {
    if (!capabilities?.canRead) {
      setStatus('error');
      setMessage('NFC reading not available on this device');
      return;
    }

    setScanning(true);
    setStatus('scanning');
    setMessage('Hold your device near another NFC device...');

    const reader = await nfcEngine.startNFCReader(
      async (receivedToken) => {
        // Received NFC data
        setScanning(false);
        setStatus('success');
        setMessage('Payment received!');

        // If we're in send mode, process the payment
        if (mode === 'send' && token) {
          const result = await nfcEngine.processPayment({
            token: receivedToken.token,
            senderId: userId,
            senderWalletId: walletId,
            amount: receivedToken.amount || maxAmount || 0,
          });

          if (result.success) {
            onPaymentReceived?.(result.transactionId!);
          } else {
            setStatus('error');
            setMessage(result.error || 'Payment failed');
            onError?.(result.error || 'Payment failed');
          }
        }
      },
      (error) => {
        setScanning(false);
        setStatus('error');
        setMessage(error);
        onError?.(error);
      }
    );

    if (!reader) {
      setScanning(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isExpired = timeLeft !== null && timeLeft <= 0;

  // NFC not available
  if (capabilities && !capabilities.available) {
    return (
      <div className="flex flex-col items-center p-6 bg-gray-50 rounded-xl">
        <WifiOff className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">NFC Not Available</h3>
        <p className="text-sm text-gray-500 text-center">
          {capabilities.reason || 'NFC is not supported on this device'}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Try using QR code payment instead
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-6">
      {/* NFC Icon Animation */}
      <div className={`relative mb-6 ${scanning ? 'animate-pulse' : ''}`}>
        <div
          className={`w-32 h-32 rounded-full flex items-center justify-center ${
            status === 'success'
              ? 'bg-green-100'
              : status === 'error'
              ? 'bg-red-100'
              : status === 'scanning'
              ? 'bg-blue-100'
              : 'bg-gray-100'
          }`}
        >
          {status === 'success' ? (
            <CheckCircle className="w-16 h-16 text-green-600" />
          ) : status === 'error' ? (
            <XCircle className="w-16 h-16 text-red-600" />
          ) : status === 'scanning' ? (
            <Wifi className="w-16 h-16 text-blue-600 animate-pulse" />
          ) : (
            <Smartphone className="w-16 h-16 text-gray-400" />
          )}
        </div>

        {/* Scanning waves */}
        {scanning && (
          <>
            <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-ping opacity-25" />
            <div
              className="absolute inset-0 rounded-full border-4 border-blue-400 animate-ping opacity-25"
              style={{ animationDelay: '0.5s' }}
            />
          </>
        )}
      </div>

      {/* Status message */}
      <div className="text-center mb-4">
        {loading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating NFC token...
          </div>
        ) : status === 'ready' && token ? (
          <>
            <p className="text-lg font-medium text-gray-900">
              {mode === 'receive' ? 'Ready to Receive' : 'Ready to Pay'}
            </p>
            {amount && (
              <p className="text-2xl font-bold text-primary-600 mt-1">
                ${amount.toFixed(2)}
              </p>
            )}
          </>
        ) : status === 'scanning' ? (
          <p className="text-gray-600">{message}</p>
        ) : status === 'success' ? (
          <p className="text-green-600 font-medium">{message}</p>
        ) : status === 'error' ? (
          <p className="text-red-600">{message}</p>
        ) : (
          <p className="text-gray-500">Generate an NFC token to start</p>
        )}
      </div>

      {/* Timer */}
      {token && timeLeft !== null && timeLeft > 0 && (
        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm mb-4 ${
            timeLeft < 30
              ? 'bg-red-100 text-red-700'
              : timeLeft < 60
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          Expires in {formatTime(timeLeft)}
        </div>
      )}

      {/* Token info */}
      {token && !isExpired && (
        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-center">
          <p className="text-xs text-gray-400">Token ID</p>
          <p className="text-sm font-mono text-gray-600">{token.token.slice(0, 20)}...</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {!token || isExpired ? (
          <button
            onClick={generateToken}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wifi className="w-5 h-5" />
                Generate NFC Token
              </>
            )}
          </button>
        ) : (
          <>
            <button
              onClick={generateToken}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </button>

            {capabilities?.canRead && mode === 'send' && (
              <button
                onClick={startScanning}
                disabled={scanning}
                className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {scanning ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Wifi className="w-5 h-5" />
                    Start Scanning
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-400">
          {mode === 'receive'
            ? 'Show this to the sender or tap devices together'
            : 'Tap your device to the recipient\'s device to pay'}
        </p>
      </div>
    </div>
  );
}
