/**
 * Tap-to-Pay Settings Component
 *
 * Displays NFC reader connection options:
 * - Chrome Extension (for USB readers)
 * - Bluetooth NFC readers
 * - Web NFC (mobile devices)
 *
 * Shows real-time connection status with live indicator lights.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor,
  Download,
  CheckCircle2,
  XCircle,
  Wifi,
  CreditCard,
  RefreshCw,
  ExternalLink,
  Loader2,
  AlertCircle,
  Usb,
  Chrome,
  Copy,
  Check,
  X,
  Puzzle,
  Bluetooth,
  Smartphone,
} from 'lucide-react';
import { useNFC } from '@/hooks/useNFC';
import nfcExtensionService, { NFCExtensionStatus } from '@/services/nfc-extension.service';

interface NFCAgentSettingsProps {
  className?: string;
  compact?: boolean;
}

export function NFCAgentSettings({ className = '', compact = false }: NFCAgentSettingsProps) {
  const {
    status,
    lastCardRead,
    checkStatus,
    pairBluetoothReader,
    connectBluetoothReader,
    disconnectBluetoothReader,
    unpairBluetoothReader,
  } = useNFC();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [extensionStatus, setExtensionStatus] = useState<NFCExtensionStatus>({
    available: false,
    connected: false,
    scanning: false,
    deviceName: null,
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isBluetoothPairing, setIsBluetoothPairing] = useState(false);
  const [isBluetoothConnecting, setIsBluetoothConnecting] = useState(false);
  const [bluetoothError, setBluetoothError] = useState<string | null>(null);

  // Listen for extension status changes
  useEffect(() => {
    const unsubscribe = nfcExtensionService.onStatusChange((status) => {
      setExtensionStatus(status);
    });

    // Initial detection
    nfcExtensionService.detectExtension();

    return unsubscribe;
  }, []);

  // Check if running in Chrome
  const isChrome = nfcExtensionService.isChromeBrowser();

  // Extension states
  const extensionAvailable = extensionStatus.available;
  const readerConnected = extensionStatus.connected;
  const readerName = extensionStatus.deviceName;

  // Fallback states
  const usbConnected = status.usbReader.connected;
  const webNFCSupported = status.webNFC.supported;

  // Bluetooth states
  const bluetoothSupported = status.bluetooth.supported;
  const bluetoothPaired = status.bluetooth.paired;
  const bluetoothConnected = status.bluetooth.connected;
  const bluetoothDeviceName = status.bluetooth.deviceName;

  // Overall connection
  const anyConnected = readerConnected || bluetoothConnected || usbConnected || status.webNFC.scanning;

  // Bluetooth handlers
  const handlePairBluetooth = async () => {
    setIsBluetoothPairing(true);
    setBluetoothError(null);
    try {
      const result = await pairBluetoothReader();
      if (!result.success) {
        setBluetoothError(result.error || 'Failed to pair');
      }
    } finally {
      setIsBluetoothPairing(false);
    }
  };

  const handleConnectBluetooth = async () => {
    setIsBluetoothConnecting(true);
    setBluetoothError(null);
    try {
      const result = await connectBluetoothReader();
      if (!result.success) {
        setBluetoothError(result.error || 'Failed to connect');
      }
    } finally {
      setIsBluetoothConnecting(false);
    }
  };

  const handleDisconnectBluetooth = () => {
    disconnectBluetoothReader();
  };

  const handleUnpairBluetooth = () => {
    unpairBluetoothReader();
    setBluetoothError(null);
  };

  // Card detection (show for 3 seconds after detection)
  const [cardDetected, setCardDetected] = useState(false);
  useEffect(() => {
    if (lastCardRead) {
      setCardDetected(true);
      const timer = setTimeout(() => setCardDetected(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastCardRead]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await nfcExtensionService.detectExtension();
    await checkStatus();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleConnectReader = async () => {
    setIsConnecting(true);
    try {
      const result = await nfcExtensionService.connect();
      if (result.success) {
        await nfcExtensionService.startScan();
      } else {
        alert('Failed to connect: ' + result.error);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Compact version for smaller spaces
  if (compact) {
    return (
      <div className={`bg-gray-50 dark:bg-gray-800 rounded-xl p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              readerConnected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-200 dark:bg-gray-700'
            }`}>
              <Puzzle className={`w-5 h-5 ${readerConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`} />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">NFC Extension</p>
              <p className="text-sm text-gray-500">
                {readerConnected ? readerName || 'Connected' : extensionAvailable ? 'Extension installed' : 'Not installed'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status indicator */}
            <div className={`w-3 h-3 rounded-full ${
              readerConnected ? 'bg-green-500 animate-pulse' : extensionAvailable ? 'bg-yellow-500' : 'bg-red-500'
            }`} />

            {!extensionAvailable ? (
              <button
                onClick={() => setShowInstructions(true)}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg flex items-center gap-1"
              >
                <Chrome className="w-4 h-4" />
                Install
              </button>
            ) : !readerConnected && (
              <button
                onClick={handleConnectReader}
                disabled={isConnecting}
                className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg flex items-center gap-1"
              >
                {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Usb className="w-4 h-4" />}
                Connect
              </button>
            )}
          </div>
        </div>

        {/* Instructions Modal for Compact */}
        {showInstructions && <InstallExtensionModal onClose={() => setShowInstructions(false)} />}
      </div>
    );
  }

  // Full version
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            readerConnected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'
          }`}>
            <Puzzle className={`w-5 h-5 ${readerConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">NFC Chrome Extension</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              One-click install for reliable NFC card reading
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Refresh status"
        >
          <RefreshCw className={`w-5 h-5 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Status Section */}
      <div className="p-6">
        {/* Connection Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Extension Status */}
          <div className={`p-4 rounded-xl border-2 transition-all ${
            extensionAvailable
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
              : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <Chrome className={`w-6 h-6 ${extensionAvailable ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
                {/* Live indicator dot */}
                <motion.div
                  className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
                    extensionAvailable ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  animate={extensionAvailable ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              </div>
              <span className="font-medium text-gray-900 dark:text-white text-sm">Extension</span>
            </div>
            <p className={`text-sm ${extensionAvailable ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
              {extensionAvailable ? 'Installed' : 'Not Installed'}
            </p>
          </div>

          {/* USB Reader Status */}
          <div className={`p-4 rounded-xl border-2 transition-all ${
            readerConnected
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
              : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <Usb className={`w-6 h-6 ${readerConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
                <motion.div
                  className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
                    readerConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  animate={readerConnected ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              </div>
              <span className="font-medium text-gray-900 dark:text-white text-sm">USB</span>
            </div>
            <p className={`text-sm ${readerConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
              {readerConnected ? 'Connected' : 'Not Connected'}
            </p>
            {readerConnected && readerName && (
              <p className="text-xs text-gray-500 mt-1 truncate" title={readerName}>
                {readerName}
              </p>
            )}
          </div>

          {/* Bluetooth Status */}
          <div className={`p-4 rounded-xl border-2 transition-all ${
            bluetoothConnected
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
              : bluetoothPaired
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <Bluetooth className={`w-6 h-6 ${
                  bluetoothConnected ? 'text-green-600 dark:text-green-400' :
                  bluetoothPaired ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                }`} />
                <motion.div
                  className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
                    bluetoothConnected ? 'bg-green-500' :
                    bluetoothPaired ? 'bg-blue-500' : 'bg-gray-400'
                  }`}
                  animate={bluetoothConnected ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              </div>
              <span className="font-medium text-gray-900 dark:text-white text-sm">Bluetooth</span>
            </div>
            <p className={`text-sm ${
              bluetoothConnected ? 'text-green-600 dark:text-green-400' :
              bluetoothPaired ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'
            }`}>
              {bluetoothConnected ? 'Connected' : bluetoothPaired ? 'Paired' : bluetoothSupported ? 'Available' : 'Not Supported'}
            </p>
            {bluetoothDeviceName && (
              <p className="text-xs text-gray-500 mt-1 truncate" title={bluetoothDeviceName}>
                {bluetoothDeviceName}
              </p>
            )}
          </div>

          {/* Card Status */}
          <div className={`p-4 rounded-xl border-2 transition-all ${
            cardDetected
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
              : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <CreditCard className={`w-6 h-6 ${cardDetected ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
                <motion.div
                  className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
                    cardDetected ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                  animate={cardDetected ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                />
              </div>
              <span className="font-medium text-gray-900 dark:text-white text-sm">Card</span>
            </div>
            <p className={`text-sm ${cardDetected ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
              {cardDetected ? 'Card Detected!' : 'Waiting...'}
            </p>
            {cardDetected && lastCardRead && (
              <p className="text-xs text-gray-500 mt-1 font-mono truncate">
                {lastCardRead.uid}
              </p>
            )}
          </div>
        </div>

        {/* Install/Connect Section */}
        <AnimatePresence mode="wait">
          {!extensionAvailable ? (
            <motion.div
              key="install"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Chrome className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Install NFC Extension
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {isChrome
                      ? 'Add the PeeAP NFC Reader extension to Chrome for instant NFC card reading. No downloads or terminal commands required!'
                      : 'The NFC extension requires Google Chrome browser. Please open this page in Chrome to install.'}
                  </p>

                  {isChrome && (
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => setShowInstructions(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                      >
                        <Puzzle className="w-5 h-5" />
                        Install Extension
                      </button>
                    </div>
                  )}

                  {!isChrome && (
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-4 py-2 rounded-lg text-sm">
                      Open this page in Google Chrome to continue
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : !readerConnected ? (
            <motion.div
              key="connect"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Usb className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Extension Ready - Connect Reader
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Plug in your ACR122U NFC reader and click the button below to connect.
                  </p>

                  <button
                    onClick={handleConnectReader}
                    disabled={isConnecting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Usb className="w-5 h-5" />
                        Connect NFC Reader
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="connected"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-green-800 dark:text-green-300">
                    NFC Reader Connected
                  </h4>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {readerName
                      ? `Reader: ${readerName}`
                      : 'Ready to accept NFC card payments'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bluetooth NFC Reader Section */}
        {bluetoothSupported && (
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-xl flex items-center justify-center flex-shrink-0">
                <Bluetooth className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Bluetooth NFC Reader
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {!bluetoothPaired
                    ? 'Pair a Bluetooth NFC reader (like ACR1255U) for wireless card reading.'
                    : bluetoothConnected
                    ? `Connected to ${bluetoothDeviceName || 'Bluetooth Reader'}`
                    : `${bluetoothDeviceName || 'Reader'} is paired. Click to connect.`}
                </p>

                {bluetoothError && (
                  <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                    {bluetoothError}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {!bluetoothPaired ? (
                    <button
                      onClick={handlePairBluetooth}
                      disabled={isBluetoothPairing}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {isBluetoothPairing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Scanning...
                        </>
                      ) : (
                        <>
                          <Bluetooth className="w-4 h-4" />
                          Pair Reader
                        </>
                      )}
                    </button>
                  ) : !bluetoothConnected ? (
                    <>
                      <button
                        onClick={handleConnectBluetooth}
                        disabled={isBluetoothConnecting}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {isBluetoothConnecting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Bluetooth className="w-4 h-4" />
                            Connect
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleUnpairBluetooth}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                      >
                        Forget Device
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleDisconnectBluetooth}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                    >
                      Disconnect
                    </button>
                  )}
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                  Supported: ACR1255U, ACR1252U (Bluetooth), and similar readers
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mobile NFC Section */}
        {webNFCSupported && (
          <div className="mt-6 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-800 rounded-xl flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Mobile NFC Ready
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your device supports NFC. You can tap NFC cards directly on your phone to read them.
                </p>
              </div>
              <div className="flex items-center">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>
        )}

        {/* Instructions Modal */}
        {showInstructions && (
          <InstallExtensionModal onClose={() => setShowInstructions(false)} />
        )}
      </div>
    </div>
  );
}

// Install Extension Modal Component
function InstallExtensionModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyExtensionsUrl = () => {
    navigator.clipboard.writeText('chrome://extensions');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const downloadExtension = async () => {
    setIsDownloading(true);
    try {
      // Fetch the file to ensure it exists and get the blob
      const response = await fetch('/downloads/peeap-nfc-extension.zip');

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error('Downloaded file is empty');
      }

      // Create blob URL and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'peeap-nfc-extension.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert(`Failed to download extension: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or contact support.`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Chrome className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add NFC Extension to Chrome</h3>
              <p className="text-sm text-gray-500">3 simple steps to enable NFC card reading</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">

          {/* Step 1: Download */}
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0 text-lg">
              1
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Download the Extension
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Click the button below to download the PeeAP NFC Reader extension
              </p>
              <button
                onClick={downloadExtension}
                disabled={isDownloading}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-medium transition-colors"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download Extension (.zip)
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 mt-2">
                After downloading, extract the ZIP file to a folder on your computer
              </p>
            </div>
          </div>

          {/* Step 2: Open Extensions */}
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0 text-lg">
              2
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Open Chrome Extensions Page
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Copy and paste this URL into your Chrome address bar:
              </p>
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                <code className="flex-1 text-sm font-mono text-gray-800 dark:text-gray-200">chrome://extensions</code>
                <button
                  onClick={copyExtensionsUrl}
                  className="px-3 py-1.5 bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-green-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Then enable <strong>"Developer mode"</strong> toggle in the top-right corner
              </p>
            </div>
          </div>

          {/* Step 3: Load Extension */}
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0 text-lg">
              3
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Load the Extension
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Click <strong>"Load unpacked"</strong> button and select the extracted extension folder
              </p>

              {/* Visual guide */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-bold text-blue-600">1</div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Click "Load unpacked" button</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-bold text-blue-600">2</div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Navigate to the extracted folder</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-bold text-blue-600">3</div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Click "Select Folder"</span>
                </div>
              </div>
            </div>
          </div>

          {/* Success Notice */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-300">
                  You're all set!
                </p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  After installing, click the extension icon in Chrome toolbar and connect your NFC reader.
                  This page will automatically detect when the extension is ready.
                </p>
              </div>
            </div>
          </div>

          {/* Supported Readers */}
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-3">Supported NFC Readers:</p>
            <div className="flex flex-wrap justify-center gap-2">
              <span className="px-4 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm font-medium">ACR122U</span>
              <span className="px-4 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm font-medium">ACR1252U</span>
              <span className="px-4 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm font-medium">PC/SC Compatible</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              window.location.reload();
            }}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
          >
            Check Connection
          </button>
        </div>
      </div>
    </div>
  );
}
