/**
 * QR Scanner Component
 *
 * Production-ready QR code scanner using device camera
 */

import { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import {
  Camera,
  CameraOff,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  FlipHorizontal,
} from 'lucide-react';
import { qrEngine, QRValidationResult } from '@/services/qr-engine';

interface QRScannerProps {
  onScan: (result: QRValidationResult) => void;
  onClose?: () => void;
  autoValidate?: boolean;
}

export function QRScanner({ onScan, onClose, autoValidate = true }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  useEffect(() => {
    // Check camera permission
    checkCameraPermission();
  }, []);

  const checkCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
    } catch (err) {
      setHasPermission(false);
      setError('Camera access denied. Please enable camera permissions.');
    }
  };

  const handleScan = async (result: string) => {
    if (!result || result === lastScanned || validating) return;

    setLastScanned(result);
    setIsScanning(false);

    if (autoValidate) {
      setValidating(true);
      try {
        const validation = await qrEngine.validateQR(result);
        onScan(validation);
      } catch (err) {
        onScan({
          valid: false,
          error: 'Failed to validate QR code',
        });
      } finally {
        setValidating(false);
      }
    } else {
      // Return raw data for manual handling
      onScan({
        valid: true,
        data: {
          type: 'payment',
          version: '1.0',
          userId: '',
          currency: 'USD',
          reference: result,
        },
      });
    }
  };

  const handleError = (err: unknown) => {
    console.error('QR Scanner error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Scanner error occurred';
    setError(errorMessage);
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const resetScanner = () => {
    setLastScanned(null);
    setIsScanning(true);
    setError(null);
  };

  // Permission denied
  if (hasPermission === false) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-100 rounded-xl">
        <CameraOff className="w-16 h-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Camera Access Required</h3>
        <p className="text-sm text-gray-500 text-center mb-4">
          Please enable camera access in your browser settings to scan QR codes.
        </p>
        <button
          onClick={checkCameraPermission}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Loading permission check
  if (hasPermission === null) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader2 className="w-12 h-12 text-primary-600 animate-spin mb-4" />
        <p className="text-gray-500">Requesting camera access...</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Scanner Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Scan QR Code</h3>
        <div className="flex gap-2">
          <button
            onClick={toggleCamera}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            title="Switch camera"
          >
            <FlipHorizontal className="w-5 h-5 text-gray-600" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Scanner View */}
      <div className="relative rounded-xl overflow-hidden bg-black">
        {isScanning ? (
          <>
            <Scanner
              onScan={(result) => {
                if (result && result.length > 0) {
                  handleScan(result[0].rawValue);
                }
              }}
              onError={handleError}
              constraints={{
                facingMode,
              }}
              styles={{
                container: {
                  width: '100%',
                  height: '300px',
                },
                video: {
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                },
              }}
            />

            {/* Scanning overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Corner brackets */}
              <div className="absolute top-8 left-8 w-16 h-16 border-t-4 border-l-4 border-white rounded-tl-lg" />
              <div className="absolute top-8 right-8 w-16 h-16 border-t-4 border-r-4 border-white rounded-tr-lg" />
              <div className="absolute bottom-8 left-8 w-16 h-16 border-b-4 border-l-4 border-white rounded-bl-lg" />
              <div className="absolute bottom-8 right-8 w-16 h-16 border-b-4 border-r-4 border-white rounded-br-lg" />

              {/* Scanning line animation */}
              <div className="absolute left-8 right-8 top-1/2 h-0.5 bg-primary-500 animate-pulse" />
            </div>
          </>
        ) : validating ? (
          <div className="flex flex-col items-center justify-center h-[300px] bg-gray-900">
            <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
            <p className="text-white">Validating QR code...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[300px] bg-gray-900">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <p className="text-white text-lg font-medium">QR Code Scanned!</p>
            <button
              onClick={resetScanner}
              className="mt-4 px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100"
            >
              Scan Another
            </button>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-500">
          Point your camera at a payment QR code
        </p>
      </div>
    </div>
  );
}
