/**
 * QR Payment Tab
 *
 * Displays QR code for Scan to Pay via Peeap app
 */

import { useEffect, useState, useCallback } from 'react';
import { Loader2, RefreshCw, Smartphone, CheckCircle } from 'lucide-react';
import { BrandedQRCode } from '@/components/ui/BrandedQRCode';
import { APP_URL, getApiEndpoint } from '@/config/urls';
import { createPollingWithBackoff, PollingController } from '@/utils/polling';

interface QRPaymentTabProps {
  sessionId: string;
  amount: number;
  currency: string;
  merchantName: string;
  onPaymentComplete: (result: any) => void;
  onError: (error: { message: string; code?: string }) => void;
}

export function QRPaymentTab({
  sessionId,
  amount,
  currency,
  merchantName,
  onPaymentComplete,
  onError,
}: QRPaymentTabProps) {
  const [isPolling, setIsPolling] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [pollingController, setPollingController] = useState<PollingController | null>(null);

  // Generate QR code value - points to scan-pay page
  const qrValue = `${APP_URL}/scan-pay/${sessionId}`;

  // Poll for session status
  useEffect(() => {
    const controller = createPollingWithBackoff(
      async () => {
        try {
          const response = await fetch(getApiEndpoint(`/checkout/sessions/${sessionId}`));
          const data = await response.json();

          setLastChecked(new Date());

          if (data.status === 'COMPLETE') {
            onPaymentComplete(data);
            return true; // Stop polling
          }

          if (data.status === 'EXPIRED' || data.status === 'CANCELLED') {
            onError({ message: 'Payment session has expired', code: 'SESSION_EXPIRED' });
            return true; // Stop polling
          }

          return false; // Continue polling
        } catch (err) {
          console.error('[QRPaymentTab] Polling error:', err);
          return false; // Continue polling on error
        }
      },
      {
        initialInterval: 2000,
        maxInterval: 10000,
        backoffMultiplier: 1.3,
      }
    );

    setPollingController(controller);

    return () => {
      controller.stop();
    };
  }, [sessionId, onPaymentComplete, onError]);

  // Manual refresh
  const handleRefresh = useCallback(() => {
    pollingController?.reset?.();
    setLastChecked(new Date());
  }, [pollingController]);

  return (
    <div className="flex flex-col items-center py-6 px-4">
      {/* QR Code */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <BrandedQRCode
          value={qrValue}
          size={200}
          showLogo={true}
          logoSizePercent={20}
        />
      </div>

      {/* Instructions */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Scan with Peeap App
        </h3>
        <p className="text-sm text-gray-600">
          Open the Peeap app on your phone and use "Scan to Pay" to complete this payment
        </p>
      </div>

      {/* Steps */}
      <div className="w-full max-w-xs space-y-3 mb-6">
        <Step number={1} text="Open Peeap app on your phone" />
        <Step number={2} text="Tap 'Scan to Pay'" />
        <Step number={3} text="Scan this QR code" />
        <Step number={4} text="Confirm and enter PIN" />
      </div>

      {/* Polling Status */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        {isPolling ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Waiting for payment...</span>
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Payment received!</span>
          </>
        )}
      </div>

      {/* Manual refresh */}
      <button
        onClick={handleRefresh}
        className="mt-4 flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
      >
        <RefreshCw className="w-4 h-4" />
        Refresh status
      </button>
    </div>
  );
}

// Step component
function Step({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-medium">
        {number}
      </div>
      <span className="text-sm text-gray-700">{text}</span>
    </div>
  );
}
