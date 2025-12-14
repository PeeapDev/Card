/**
 * NFC Status Component
 *
 * Displays NFC reader status and allows connecting to readers.
 * Can be used in different variants:
 * - 'compact': Small indicator for headers/toolbars
 * - 'card': Full card with all details
 * - 'inline': Inline status for payment forms
 * - 'minimal': Just an icon with tooltip
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi,
  WifiOff,
  Usb,
  Smartphone,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Signal,
} from 'lucide-react';
import { useNFC } from '@/hooks/useNFC';
import { clsx } from 'clsx';

export type NFCStatusVariant = 'compact' | 'card' | 'inline' | 'minimal';

interface NFCStatusProps {
  variant?: NFCStatusVariant;
  showConnectButton?: boolean;
  onReaderReady?: () => void;
  className?: string;
}

export function NFCStatus({
  variant = 'compact',
  showConnectButton = true,
  onReaderReady,
  className,
}: NFCStatusProps) {
  const {
    status,
    isChecking,
    error,
    checkStatus,
    startWebNFC,
    stopWebNFC,
    connectUSBReader,
    disconnectUSBReader,
    startUSBScanning,
    stopUSBScanning,
  } = useNFC();

  const [expanded, setExpanded] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const handleConnectUSB = async () => {
    setConnecting(true);
    const success = await connectUSBReader();
    if (success) {
      startUSBScanning();
      onReaderReady?.();
    }
    setConnecting(false);
  };

  const handleStartWebNFC = async () => {
    setConnecting(true);
    const success = await startWebNFC();
    if (success) {
      onReaderReady?.();
    }
    setConnecting(false);
  };

  const handleDisconnect = async () => {
    stopWebNFC();
    stopUSBScanning();
    await disconnectUSBReader();
  };

  // Determine overall status
  const isConnected = status.webNFC.scanning || status.usbReader.connected;
  const isScanning = status.isScanning;
  const hasError = !!error;

  // Minimal variant - just an icon
  if (variant === 'minimal') {
    return (
      <div className={clsx('relative group', className)} title={getStatusText()}>
        {isChecking ? (
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        ) : isScanning ? (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <Wifi className="w-5 h-5 text-green-500" />
          </motion.div>
        ) : isConnected ? (
          <Wifi className="w-5 h-5 text-blue-500" />
        ) : status.anyReaderAvailable ? (
          <WifiOff className="w-5 h-5 text-yellow-500" />
        ) : (
          <WifiOff className="w-5 h-5 text-gray-400" />
        )}

        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {getStatusText()}
        </div>
      </div>
    );
  }

  // Compact variant - small pill/badge
  if (variant === 'compact') {
    return (
      <div className={clsx('inline-flex items-center gap-2', className)}>
        <button
          onClick={() => setExpanded(!expanded)}
          className={clsx(
            'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
            isScanning
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : isConnected
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
              : hasError
              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              : status.anyReaderAvailable
              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          )}
        >
          {isChecking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isScanning ? (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              <Signal className="w-4 h-4" />
            </motion.div>
          ) : isConnected ? (
            <Wifi className="w-4 h-4" />
          ) : (
            <WifiOff className="w-4 h-4" />
          )}

          <span className="hidden sm:inline">
            {isScanning
              ? 'NFC Ready'
              : isConnected
              ? 'NFC Connected'
              : status.anyReaderAvailable
              ? 'NFC Available'
              : 'No NFC'}
          </span>

          {expanded ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>

        {/* Expanded dropdown */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50"
            >
              <NFCStatusDetails
                showConnectButton={showConnectButton}
                onConnectUSB={handleConnectUSB}
                onStartWebNFC={handleStartWebNFC}
                onDisconnect={handleDisconnect}
                onRefresh={checkStatus}
                connecting={connecting}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Inline variant - horizontal status bar
  if (variant === 'inline') {
    return (
      <div
        className={clsx(
          'flex items-center justify-between p-3 rounded-lg border',
          isScanning
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : isConnected
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            : hasError
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
          className
        )}
      >
        <div className="flex items-center gap-3">
          {isChecking ? (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          ) : isScanning ? (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="w-8 h-8 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center"
            >
              <Wifi className="w-5 h-5 text-green-600 dark:text-green-400" />
            </motion.div>
          ) : isConnected ? (
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
              <Wifi className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          ) : (
            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <WifiOff className="w-5 h-5 text-gray-400" />
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {getStatusText()}
            </p>
            {status.usbReader.deviceName && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {status.usbReader.deviceName}
              </p>
            )}
          </div>
        </div>

        {showConnectButton && !isScanning && (
          <div className="flex items-center gap-2">
            {status.webNFC.supported && !status.webNFC.scanning && (
              <button
                onClick={handleStartWebNFC}
                disabled={connecting}
                className="p-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg"
                title="Use Mobile NFC"
              >
                <Smartphone className="w-5 h-5" />
              </button>
            )}
            {status.usbReader.supported && !status.usbReader.connected && (
              <button
                onClick={handleConnectUSB}
                disabled={connecting}
                className="p-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg"
                title="Connect USB Reader"
              >
                {connecting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Usb className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
        )}

        {isConnected && (
          <button
            onClick={handleDisconnect}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Disconnect
          </button>
        )}
      </div>
    );
  }

  // Card variant - full card with all details
  return (
    <div
      className={clsx(
        'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6',
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          NFC Reader Status
        </h3>
        <button
          onClick={checkStatus}
          disabled={isChecking}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <RefreshCw className={clsx('w-5 h-5', isChecking && 'animate-spin')} />
        </button>
      </div>

      <NFCStatusDetails
        showConnectButton={showConnectButton}
        onConnectUSB={handleConnectUSB}
        onStartWebNFC={handleStartWebNFC}
        onDisconnect={handleDisconnect}
        onRefresh={checkStatus}
        connecting={connecting}
      />
    </div>
  );

  function getStatusText() {
    if (isChecking) return 'Checking NFC...';
    if (isScanning) return 'Scanning for cards...';
    if (status.usbReader.connected) return `Connected: ${status.usbReader.deviceName}`;
    if (status.webNFC.scanning) return 'Mobile NFC active';
    if (hasError) return error;
    if (status.anyReaderAvailable) return 'NFC reader available';
    return 'No NFC reader detected';
  }
}

// Detailed status component (used in card and dropdown)
function NFCStatusDetails({
  showConnectButton,
  onConnectUSB,
  onStartWebNFC,
  onDisconnect,
  onRefresh,
  connecting,
}: {
  showConnectButton: boolean;
  onConnectUSB: () => void;
  onStartWebNFC: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
  connecting: boolean;
}) {
  const { status, error } = useNFC();

  return (
    <div className="space-y-4">
      {/* Web NFC Status */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              'w-10 h-10 rounded-full flex items-center justify-center',
              status.webNFC.scanning
                ? 'bg-green-100 dark:bg-green-800'
                : status.webNFC.supported
                ? 'bg-blue-100 dark:bg-blue-800'
                : 'bg-gray-100 dark:bg-gray-600'
            )}
          >
            <Smartphone
              className={clsx(
                'w-5 h-5',
                status.webNFC.scanning
                  ? 'text-green-600 dark:text-green-400'
                  : status.webNFC.supported
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-400'
              )}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Mobile NFC
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {status.webNFC.scanning
                ? 'Active - Scanning'
                : status.webNFC.supported
                ? 'Available'
                : 'Not supported'}
            </p>
          </div>
        </div>

        {status.webNFC.scanning ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : status.webNFC.supported ? (
          showConnectButton && (
            <button
              onClick={onStartWebNFC}
              disabled={connecting}
              className="px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              Start
            </button>
          )
        ) : (
          <XCircle className="w-5 h-5 text-gray-400" />
        )}
      </div>

      {/* USB Reader Status */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              'w-10 h-10 rounded-full flex items-center justify-center',
              status.usbReader.scanning
                ? 'bg-green-100 dark:bg-green-800'
                : status.usbReader.connected
                ? 'bg-blue-100 dark:bg-blue-800'
                : status.usbReader.supported
                ? 'bg-yellow-100 dark:bg-yellow-800'
                : 'bg-gray-100 dark:bg-gray-600'
            )}
          >
            <Usb
              className={clsx(
                'w-5 h-5',
                status.usbReader.scanning
                  ? 'text-green-600 dark:text-green-400'
                  : status.usbReader.connected
                  ? 'text-blue-600 dark:text-blue-400'
                  : status.usbReader.supported
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-gray-400'
              )}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              USB Reader (ACR122U)
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {status.usbReader.scanning
                ? `Scanning - ${status.usbReader.deviceName}`
                : status.usbReader.connected
                ? status.usbReader.deviceName || 'Connected'
                : status.usbReader.supported
                ? 'Not connected'
                : 'Not supported'}
            </p>
          </div>
        </div>

        {status.usbReader.scanning ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          >
            <Signal className="w-5 h-5 text-green-500" />
          </motion.div>
        ) : status.usbReader.connected ? (
          <CheckCircle className="w-5 h-5 text-blue-500" />
        ) : status.usbReader.supported ? (
          showConnectButton && (
            <button
              onClick={onConnectUSB}
              disabled={connecting}
              className="px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-1"
            >
              {connecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </button>
          )
        ) : (
          <XCircle className="w-5 h-5 text-gray-400" />
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Disconnect button */}
      {(status.webNFC.scanning || status.usbReader.connected) && (
        <button
          onClick={onDisconnect}
          className="w-full py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Disconnect All
        </button>
      )}

      {/* Last checked */}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        Last checked: {status.lastCheck.toLocaleTimeString()}
      </p>
    </div>
  );
}

export default NFCStatus;
