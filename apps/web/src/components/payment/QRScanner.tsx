/**
 * QR Scanner Component
 *
 * Production-ready QR code scanner using device camera
 * Uses html5-qrcode for reliable cross-browser camera access
 */

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
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
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeScanner();

    return () => {
      stopScanner();
    };
  }, []);

  useEffect(() => {
    if (hasPermission && !isScanning && !scanSuccess && !validating) {
      startScanning();
    }
  }, [hasPermission, facingMode]);

  const initializeScanner = async () => {
    try {
      // Check if mediaDevices is available (requires HTTPS or localhost)
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        // Camera API not available - likely non-HTTPS
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (!isLocalhost && window.location.protocol !== 'https:') {
          setError('Camera requires HTTPS. Please use a secure connection.');
        } else {
          setError('Camera not available on this browser/device.');
        }
        setHasPermission(false);
        return;
      }

      // Check if camera is available
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');

      if (cameras.length === 0) {
        setError('No camera found on this device');
        setHasPermission(false);
        return;
      }

      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      stream.getTracks().forEach(track => track.stop());

      setHasPermission(true);
    } catch (err: any) {
      console.error('Camera permission error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else if (err.name === 'NotSupportedError' || err.name === 'TypeError') {
        setError('Camera not supported. Try using HTTPS or a different browser.');
      } else {
        setError('Failed to access camera: ' + err.message);
      }
      setHasPermission(false);
    }
  };

  const startScanning = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
      } catch (e) {
        // Ignore
      }
    }

    try {
      const scannerId = 'qr-scanner-element';
      scannerRef.current = new Html5Qrcode(scannerId);

      const config = {
        fps: 10,
        qrbox: undefined, // No scanning box - full screen scanning
        aspectRatio: 1,
        disableFlip: false,
      };

      await scannerRef.current.start(
        { facingMode },
        config,
        handleScanSuccess,
        handleScanError
      );

      setIsScanning(true);
      setError(null);
    } catch (err: any) {
      console.error('Failed to start scanner:', err);
      setError('Failed to start camera: ' + err.message);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.error('Error stopping scanner:', e);
      }
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    if (validating || scanSuccess) return;

    // Stop scanner immediately
    await stopScanner();
    setIsScanning(false);
    setScanSuccess(true);

    if (autoValidate) {
      setValidating(true);
      try {
        const validation = await qrEngine.validateQR(decodedText);
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
      onScan({
        valid: true,
        data: {
          type: 'payment',
          version: '1.0',
          userId: '',
          currency: 'SLE',
          reference: decodedText,
        },
      });
    }
  };

  const handleScanError = (errorMessage: string) => {
    // Ignore "No QR code found" errors as they happen continuously
    if (!errorMessage.includes('No QR code found')) {
    }
  };

  const toggleCamera = async () => {
    await stopScanner();
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    setIsScanning(false);
  };

  const resetScanner = () => {
    setScanSuccess(false);
    setValidating(false);
    setError(null);
    startScanning();
  };

  const retryPermission = () => {
    setError(null);
    setHasPermission(null);
    initializeScanner();
  };

  // Permission denied
  if (hasPermission === false) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-100 dark:bg-gray-800 rounded-xl">
        <CameraOff className="w-16 h-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Camera Access Required</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
          {error || 'Please enable camera access in your browser settings to scan QR codes.'}
        </p>
        <button
          onClick={retryPermission}
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
        <p className="text-gray-500 dark:text-gray-400">Requesting camera access...</p>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Scanner Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">Scan QR Code</h3>
        <div className="flex gap-2">
          <button
            onClick={toggleCamera}
            className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            title="Switch camera"
          >
            <FlipHorizontal className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          )}
        </div>
      </div>

      {/* Scanner View */}
      <div className="relative rounded-xl overflow-hidden bg-black" style={{ minHeight: '300px' }}>
        {!scanSuccess && !validating ? (
          <>
            <div
              id="qr-scanner-element"
              className="w-full"
              style={{ minHeight: '300px' }}
            />

            {!isScanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
                <Loader2 className="w-10 h-10 text-white animate-spin mb-3" />
                <p className="text-white text-sm">Starting camera...</p>
              </div>
            )}
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
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Point your camera at a payment QR code
        </p>
      </div>
    </div>
  );
}
