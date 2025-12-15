/**
 * NFC Indicator - Minimal status indicator for headers
 *
 * Shows two small colored dots:
 * 1. Reader status: Green = connected, Red = not connected
 * 2. Card status: Green = card detected, Red = no card (only shows when reader connected)
 */

import { useEffect, useState } from 'react';
import { useNFC } from '@/hooks/useNFC';
import { Wifi, CreditCard } from 'lucide-react';

interface NFCIndicatorProps {
  showLabel?: boolean;
  className?: string;
}

export function NFCIndicator({ showLabel = false, className = '' }: NFCIndicatorProps) {
  const {
    status,
    isChecking,
    connectUSBReader,
    lastCardRead,
    startUSBScanning,
    checkStatus
  } = useNFC();

  // Track card presence with timeout (card detected stays green for 3 seconds)
  const [cardPresent, setCardPresent] = useState(false);
  const [cardTimeout, setCardTimeout] = useState<NodeJS.Timeout | null>(null);

  // Determine connection status
  const isConnected = status.webNFC.scanning || status.usbReader.connected;

  // Handle card detection - show green for 3 seconds
  useEffect(() => {
    if (lastCardRead) {
      setCardPresent(true);

      // Clear existing timeout
      if (cardTimeout) {
        clearTimeout(cardTimeout);
      }

      // Set new timeout to reset card status
      const timeout = setTimeout(() => {
        setCardPresent(false);
      }, 3000);

      setCardTimeout(timeout);
    }

    return () => {
      if (cardTimeout) {
        clearTimeout(cardTimeout);
      }
    };
  }, [lastCardRead]);

  // Auto-start scanning when USB reader is connected
  useEffect(() => {
    if (status.usbReader.connected && !status.usbReader.scanning) {
      startUSBScanning();
    }
  }, [status.usbReader.connected, status.usbReader.scanning, startUSBScanning]);

  // Determine colors and tooltips
  let readerDotColor = 'bg-red-500';
  let readerTooltip = 'No NFC reader connected';

  if (isChecking) {
    readerDotColor = 'bg-yellow-500 animate-pulse';
    readerTooltip = 'Checking NFC status...';
  } else if (isConnected) {
    readerDotColor = 'bg-green-500';
    readerTooltip = status.usbReader.connected
      ? `USB Reader: ${status.usbReader.deviceName || 'Connected'}`
      : 'Web NFC active';
  }

  const cardDotColor = cardPresent ? 'bg-green-500' : 'bg-red-500';
  const cardTooltip = cardPresent ? 'Card detected' : 'No card';

  const handleClick = async () => {
    if (!isConnected && !isChecking) {
      try {
        const connected = await connectUSBReader();
        if (connected) {
          // Start scanning immediately after connecting
          // Don't call checkStatus() here - connectUSBReader already updates the status
          // and calling checkStatus again can cause race conditions
          startUSBScanning();
        }
      } catch (err) {
        console.log('Could not connect USB reader:', err);
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`relative flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group ${className}`}
      title={readerTooltip}
      aria-label={readerTooltip}
    >
      {/* Reader Status Indicator */}
      <div className="relative flex items-center gap-1">
        <Wifi className={`w-4 h-4 rotate-90 ${isConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`} />
        <span
          className={`w-2 h-2 rounded-full ${readerDotColor} ring-1 ring-white dark:ring-gray-900`}
          title={readerTooltip}
        />
      </div>

      {/* Card Status Indicator - only show when reader is connected */}
      {isConnected && (
        <div className="relative flex items-center gap-1">
          <CreditCard className={`w-4 h-4 ${cardPresent ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`} />
          <span
            className={`w-2 h-2 rounded-full ${cardDotColor} ring-1 ring-white dark:ring-gray-900`}
            title={cardTooltip}
          />
        </div>
      )}

      {/* Optional label */}
      {showLabel && (
        <span className={`text-xs font-medium ${isConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
          NFC
        </span>
      )}

      {/* Tooltip on hover */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${readerDotColor}`} />
            <span>{readerTooltip}</span>
          </div>
          {isConnected && (
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${cardDotColor}`} />
              <span>{cardTooltip}</span>
            </div>
          )}
          {!isConnected && !isChecking && (
            <span className="text-gray-400 text-[10px] mt-1">Click to connect reader</span>
          )}
        </div>
      </div>
    </button>
  );
}
