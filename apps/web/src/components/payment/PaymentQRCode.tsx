/**
 * Payment QR Code Component
 *
 * Generates and displays QR codes for receiving payments
 */

import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import {
  RefreshCw,
  Copy,
  Share2,
  CheckCircle,
  Clock,
  DollarSign,
  QrCode,
} from 'lucide-react';
import { qrEngine, GeneratedQR } from '@/services/qr-engine';
import { currencyService, Currency } from '@/services/currency.service';

interface PaymentQRCodeProps {
  userId: string;
  walletId: string;
  amount?: number;
  description?: string;
  type?: 'static' | 'dynamic' | 'merchant';
  merchantName?: string;
  onGenerated?: (qr: GeneratedQR) => void;
  size?: number;
  currency?: string;
}

export function PaymentQRCode({
  userId,
  walletId,
  amount,
  description,
  type = 'static',
  merchantName,
  onGenerated,
  size = 200,
  currency,
}: PaymentQRCodeProps) {
  const [qrData, setQrData] = useState<GeneratedQR | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [currencySymbol, setCurrencySymbol] = useState<string>('');

  // Fetch currency symbol
  useEffect(() => {
    const fetchSymbol = async () => {
      if (currency) {
        const sym = await currencyService.getCurrencySymbol(currency);
        setCurrencySymbol(sym);
      } else {
        const defaultCurrency = await currencyService.getDefaultCurrency();
        setCurrencySymbol(defaultCurrency.symbol);
      }
    };
    fetchSymbol();
  }, [currency]);

  const generateQR = async () => {
    setLoading(true);
    setError(null);

    // Validate inputs
    if (!userId || !walletId) {
      setError('Missing user or wallet information');
      setLoading(false);
      return;
    }

    try {
      let generated: GeneratedQR;

      if (type === 'dynamic' && amount) {
        generated = await qrEngine.generateDynamicQR(userId, walletId, amount, description);
      } else if (type === 'merchant' && merchantName) {
        generated = await qrEngine.generateMerchantQR(userId, walletId, merchantName, amount);
      } else {
        generated = await qrEngine.generateStaticQR(userId, walletId);
      }

      setQrData(generated);
      onGenerated?.(generated);

      // Set up countdown for dynamic QR
      if (generated.expiresAt) {
        const expiresAt = new Date(generated.expiresAt).getTime();
        setTimeLeft(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));
      }
    } catch (err: any) {
      console.error('Failed to generate QR:', err);
      setError(err.message || 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateQR();
  }, [userId, walletId, amount, type]);

  // Countdown timer for dynamic QR
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopy = async () => {
    if (qrData?.deepLink) {
      await navigator.clipboard.writeText(qrData.deepLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (qrData?.deepLink && navigator.share) {
      try {
        await navigator.share({
          title: 'Payment Request',
          text: amount ? `Pay ${currencySymbol}${amount.toFixed(2)}` : 'Send me money',
          url: qrData.deepLink,
        });
      } catch (error) {
        // User cancelled or share failed
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-500">Generating QR code...</p>
      </div>
    );
  }

  if (!qrData || error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <QrCode className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium">Failed to generate QR code</p>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <button
          onClick={generateQR}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  const isExpired = timeLeft !== null && timeLeft <= 0;

  return (
    <div className="flex flex-col items-center">
      {/* Amount display */}
      {amount && (
        <div className="mb-4 text-center">
          <p className="text-sm text-gray-500">Amount to receive</p>
          <p className="text-3xl font-bold text-gray-900">
            {currencySymbol}{amount.toFixed(2)}
          </p>
        </div>
      )}

      {/* QR Code - Use deepLink (URL) for universal scanability */}
      <div
        className={`p-4 bg-white rounded-xl shadow-lg ${
          isExpired ? 'opacity-50' : ''
        }`}
      >
        <QRCode
          value={qrData.deepLink}
          size={size}
          level="M"
          style={{
            filter: isExpired ? 'blur(4px)' : 'none',
          }}
        />
      </div>

      {/* Expiration countdown */}
      {timeLeft !== null && (
        <div
          className={`mt-4 flex items-center gap-2 px-3 py-2 rounded-lg ${
            isExpired
              ? 'bg-red-100 text-red-700'
              : timeLeft < 60
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          {isExpired ? (
            <span>QR code expired</span>
          ) : (
            <span>Expires in {formatTime(timeLeft)}</span>
          )}
        </div>
      )}

      {/* Reference */}
      <p className="mt-4 text-xs text-gray-400">
        Ref: {qrData.reference}
      </p>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={generateQR}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>

        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          {copied ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Link
            </>
          )}
        </button>

        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        )}
      </div>

      {/* Description */}
      {description && (
        <p className="mt-4 text-sm text-gray-500 text-center">{description}</p>
      )}
    </div>
  );
}
