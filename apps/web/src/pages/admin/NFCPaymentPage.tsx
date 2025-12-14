/**
 * NFC Payment Page
 *
 * Allows admin to process payments using NFC cards.
 * Supports:
 * - Web NFC API (mobile devices with NFC)
 * - ACR122U USB NFC reader (desktop via Web USB)
 *
 * The NFC card contains a wallet ID or user ID that is read and used to process payment.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi,
  CreditCard,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  DollarSign,
  User,
  Wallet,
  Usb,
  Smartphone,
  RefreshCw,
  Volume2,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { MotionCard } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { currencyService, Currency } from '@/services/currency.service';

// NFC Reader types
interface NFCReaderInterface {
  scan(options?: { signal?: AbortSignal }): Promise<void>;
  addEventListener(event: string, callback: (event: any) => void): void;
  removeEventListener(event: string, callback: (event: any) => void): void;
}

// USB types for ACR122U - using custom names to avoid conflict with built-in WebUSB types
interface ACRUSBDevice {
  opened: boolean;
  productName?: string;
  configuration: ACRUSBConfiguration | null;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<ACRUSBOutTransferResult>;
  transferIn(endpointNumber: number, length: number): Promise<ACRUSBInTransferResult>;
}

interface ACRUSBConfiguration {
  configurationValue: number;
}

interface ACRUSBOutTransferResult {
  bytesWritten: number;
  status: 'ok' | 'stall' | 'babble';
}

interface ACRUSBInTransferResult {
  data: DataView | undefined;
  status: 'ok' | 'stall' | 'babble';
}

// Note: Using (navigator as any).usb to access Web USB API

type ReaderMode = 'web-nfc' | 'usb-acr122u' | 'none';
type PaymentStatus = 'idle' | 'scanning' | 'card-detected' | 'processing' | 'success' | 'error';
type PaymentResultStatus = 'success' | 'failed';

interface CardInfo {
  type: 'wallet' | 'user';
  id: string;
  name?: string;
  balance?: number;
  currency?: string;
}

// Sound effects
const playSuccessSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 1200;
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      osc2.start(audioContext.currentTime);
      osc2.stop(audioContext.currentTime + 0.3);
    }, 150);
  } catch (e) {
    console.log('Could not play success sound:', e);
  }
};

const playErrorSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 200;
    oscillator.type = 'square';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.4);
  } catch (e) {
    console.log('Could not play error sound:', e);
  }
};

const playBeepSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 1000;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) {
    console.log('Could not play beep sound:', e);
  }
};

// NFC Reader Status interface
interface NFCReaderStatus {
  webNFC: {
    supported: boolean;
    available: boolean;
    error?: string;
  };
  webUSB: {
    supported: boolean;
    connectedDevice: string | null;
    error?: string;
  };
  lastCheck: Date;
}

export function NFCPaymentPage() {
  const { user } = useAuth();
  const [readerMode, setReaderMode] = useState<ReaderMode>('none');
  const [webNFCSupported, setWebNFCSupported] = useState(false);
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [cardInfo, setCardInfo] = useState<CardInfo | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  // NFC Reader Status
  const [readerStatus, setReaderStatus] = useState<NFCReaderStatus>({
    webNFC: { supported: false, available: false },
    webUSB: { supported: false, connectedDevice: null },
    lastCheck: new Date(),
  });
  const [checkingStatus, setCheckingStatus] = useState(true);

  // USB device ref
  const usbDeviceRef = useRef<ACRUSBDevice | null>(null);
  const nfcReaderRef = useRef<NFCReaderInterface | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Recent transactions for this session
  const [recentPayments, setRecentPayments] = useState<Array<{
    id: string;
    amount: number;
    recipient: string;
    time: Date;
    status: 'success' | 'failed';
  }>>([]);

  // Check NFC reader status
  const checkReaderStatus = useCallback(async () => {
    setCheckingStatus(true);
    const newStatus: NFCReaderStatus = {
      webNFC: { supported: false, available: false },
      webUSB: { supported: false, connectedDevice: null },
      lastCheck: new Date(),
    };

    // Check Web NFC support
    if ('NDEFReader' in window) {
      newStatus.webNFC.supported = true;
      // Try to check if NFC is actually available (requires user gesture usually)
      try {
        // We can't actually test without user gesture, but we can check the API exists
        newStatus.webNFC.available = true;
      } catch (err: any) {
        newStatus.webNFC.error = err.message;
      }
    }

    // Check Web USB support
    if (navigator.usb) {
      newStatus.webUSB.supported = true;
      try {
        // Get already paired devices
        const devices = await (navigator.usb as any).getDevices?.();
        if (devices && devices.length > 0) {
          // Look for ACR122U (vendor ID 0x072F)
          const acr122u = devices.find((d: any) => d.vendorId === 0x072F);
          if (acr122u) {
            newStatus.webUSB.connectedDevice = acr122u.productName || 'ACR122U NFC Reader';
          } else {
            // Found other USB device
            newStatus.webUSB.connectedDevice = devices[0].productName || 'Unknown USB Device';
          }
        }
      } catch (err: any) {
        newStatus.webUSB.error = err.message;
      }
    }

    setReaderStatus(newStatus);
    setWebNFCSupported(newStatus.webNFC.supported);
    setCheckingStatus(false);
  }, []);

  useEffect(() => {
    // Initial status check
    checkReaderStatus();

    // Load default currency
    currencyService.getDefaultCurrency().then(setDefaultCurrency);

    // Listen for USB device connect/disconnect
    const handleUSBConnect = () => {
      console.log('[NFC] USB device connected');
      checkReaderStatus();
    };
    const handleUSBDisconnect = () => {
      console.log('[NFC] USB device disconnected');
      checkReaderStatus();
    };

    if (navigator.usb) {
      (navigator.usb as any).addEventListener?.('connect', handleUSBConnect);
      (navigator.usb as any).addEventListener?.('disconnect', handleUSBDisconnect);
    }

    return () => {
      // Cleanup
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (usbDeviceRef.current) {
        usbDeviceRef.current.close().catch(() => {});
      }
      if (navigator.usb) {
        (navigator.usb as any).removeEventListener?.('connect', handleUSBConnect);
        (navigator.usb as any).removeEventListener?.('disconnect', handleUSBDisconnect);
      }
    };
  }, [checkReaderStatus]);

  const currencySymbol = defaultCurrency?.symbol || 'Le';

  const formatCurrency = (amt: number): string => {
    return `${currencySymbol} ${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Start Web NFC scanning
  const startWebNFC = useCallback(async () => {
    if (!webNFCSupported) {
      setError('Web NFC is not supported on this device');
      return;
    }

    try {
      setReaderMode('web-nfc');
      setStatus('scanning');
      setError(null);

      const ndef = new (window as any).NDEFReader() as NFCReaderInterface;
      nfcReaderRef.current = ndef;
      abortControllerRef.current = new AbortController();

      ndef.addEventListener('reading', async (event: any) => {
        playBeepSound();
        console.log('[NFC] Card detected:', event);

        const { message, serialNumber } = event;
        let cardData = serialNumber;

        // Try to read NDEF text records
        if (message?.records) {
          for (const record of message.records) {
            if (record.recordType === 'text') {
              const textDecoder = new TextDecoder();
              cardData = textDecoder.decode(record.data);
              break;
            }
            if (record.recordType === 'url') {
              const textDecoder = new TextDecoder();
              const url = textDecoder.decode(record.data);
              // Extract ID from URL if it's a peeap payment URL
              const match = url.match(/\/(wallet|user|pay)\/([a-f0-9-]+)/i);
              if (match) {
                cardData = match[2];
              }
            }
          }
        }

        await handleCardDetected(cardData);
      });

      ndef.addEventListener('readingerror', () => {
        console.error('[NFC] Read error');
        setError('Failed to read NFC card. Try again.');
      });

      await ndef.scan({ signal: abortControllerRef.current.signal });
      console.log('[NFC] Scanning started');
    } catch (err: any) {
      console.error('[NFC] Error:', err);
      if (err.name === 'NotAllowedError') {
        setError('NFC permission denied. Please allow NFC access.');
      } else if (err.name === 'NotSupportedError') {
        setError('NFC is not supported on this device.');
      } else {
        setError(err.message || 'Failed to start NFC scanning');
      }
      setStatus('idle');
      setReaderMode('none');
    }
  }, [webNFCSupported]);

  // Connect to ACR122U via Web USB
  const connectACR122U = useCallback(async () => {
    try {
      setReaderMode('usb-acr122u');
      setStatus('scanning');
      setError(null);

      const usb = (navigator as any).usb;
      if (!usb) {
        throw new Error('Web USB is not supported in this browser');
      }

      // Request USB device - ACR122U vendor ID is 0x072F
      const device = await usb.requestDevice({
        filters: [
          { vendorId: 0x072F }, // ACS (ACR122U manufacturer)
        ],
      }) as ACRUSBDevice;

      await device.open();

      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }

      await device.claimInterface(0);

      usbDeviceRef.current = device;
      console.log('[USB] ACR122U connected:', device.productName);

      // Start polling for cards
      pollACR122U(device);
    } catch (err: any) {
      console.error('[USB] Error:', err);
      if (err.name === 'NotFoundError') {
        setError('No ACR122U reader found. Please connect the reader and try again.');
      } else if (err.name === 'SecurityError') {
        setError('USB access denied. Please allow USB access.');
      } else {
        setError(err.message || 'Failed to connect to ACR122U');
      }
      setStatus('idle');
      setReaderMode('none');
    }
  }, []);

  // Poll ACR122U for cards
  const pollACR122U = async (device: ACRUSBDevice) => {
    const POLL_INTERVAL = 500; // ms

    const poll = async () => {
      if (!device.opened || status === 'processing' || status === 'success') {
        return;
      }

      try {
        // ACR122U command to get card UID
        // PC_to_RDR_XfrBlock command with APDU: FF CA 00 00 00
        const getUidCommand = new Uint8Array([
          0x6B, // bMessageType: PC_to_RDR_XfrBlock
          0x05, 0x00, 0x00, 0x00, // dwLength
          0x00, // bSlot
          0x00, // bSeq
          0x00, // bBWI
          0x00, 0x00, // wLevelParameter
          0xFF, 0xCA, 0x00, 0x00, 0x00, // APDU: Get UID
        ]);

        await device.transferOut(2, getUidCommand);
        const result = await device.transferIn(1, 64);

        if (result.data && result.data.byteLength > 10) {
          const response = new Uint8Array(result.data.buffer);
          // Check if we got a valid response (SW1 SW2 = 90 00)
          const dataLength = response[1];
          if (dataLength > 2) {
            const sw1 = response[10 + dataLength - 2];
            const sw2 = response[10 + dataLength - 1];

            if (sw1 === 0x90 && sw2 === 0x00) {
              // Extract UID
              const uid = Array.from(response.slice(10, 10 + dataLength - 2))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

              if (uid && uid !== '00000000') {
                playBeepSound();
                console.log('[USB] Card detected, UID:', uid);

                // Now read NDEF data from the card
                const cardData = await readNDEFFromACR122U(device, uid);
                await handleCardDetected(cardData || uid);
                return; // Stop polling after successful read
              }
            }
          }
        }
      } catch (err) {
        // Card not present or read error - continue polling
      }

      // Continue polling
      if (device.opened && status === 'scanning') {
        setTimeout(poll, POLL_INTERVAL);
      }
    };

    poll();
  };

  // Read NDEF data from card via ACR122U
  const readNDEFFromACR122U = async (device: ACRUSBDevice, uid: string): Promise<string | null> => {
    try {
      // For NTAG/MIFARE Ultralight cards, read pages starting from page 4 (NDEF data)
      // This is a simplified version - full NDEF parsing would require more code

      // Read page 4-7 (16 bytes)
      const readCommand = new Uint8Array([
        0x6B, // bMessageType
        0x05, 0x00, 0x00, 0x00, // dwLength
        0x00, 0x00, 0x00, 0x00, 0x00, // slot, seq, BWI, level
        0xFF, 0xB0, 0x00, 0x04, 0x10, // APDU: Read Binary, page 4, 16 bytes
      ]);

      await device.transferOut(2, readCommand);
      const result = await device.transferIn(1, 64);

      if (result.data && result.data.byteLength > 12) {
        const response = new Uint8Array(result.data.buffer);
        const dataLength = response[1];

        if (dataLength > 2) {
          // Try to decode as text
          const textDecoder = new TextDecoder();
          const rawData = response.slice(10, 10 + dataLength - 2);

          // Look for NDEF text record (starts with 0x03 length 0xD1 0x01)
          let textStart = 0;
          for (let i = 0; i < rawData.length - 3; i++) {
            if (rawData[i] === 0xD1 && rawData[i + 1] === 0x01) {
              // Found text record header
              const textLength = rawData[i + 2] - 3; // Subtract header overhead
              textStart = i + 6; // Skip header
              if (textStart + textLength <= rawData.length) {
                const text = textDecoder.decode(rawData.slice(textStart, textStart + textLength));
                if (text && /^[a-f0-9-]+$/i.test(text)) {
                  return text;
                }
              }
            }
          }

          // Try to find any UUID-like string in the data
          const fullText = textDecoder.decode(rawData);
          const uuidMatch = fullText.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
          if (uuidMatch) {
            return uuidMatch[0];
          }
        }
      }
    } catch (err) {
      console.error('[USB] NDEF read error:', err);
    }

    return null;
  };

  // Handle card detected - look up wallet/user
  const handleCardDetected = async (cardData: string) => {
    setStatus('card-detected');
    console.log('[NFC] Processing card data:', cardData);

    try {
      // Check if it's a UUID (wallet or user ID)
      const isUUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(cardData);

      if (isUUID) {
        // Try as wallet ID first
        const { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select('id, user_id, balance, currency, wallet_type')
          .eq('id', cardData)
          .single();

        if (wallet && !walletError) {
          // Get user info
          const { data: walletUser } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', wallet.user_id)
            .single();

          setCardInfo({
            type: 'wallet',
            id: wallet.id,
            name: walletUser ? `${walletUser.first_name} ${walletUser.last_name}` : 'Unknown User',
            balance: wallet.balance,
            currency: wallet.currency,
          });
          return;
        }

        // Try as user ID
        const { data: cardUser, error: userError } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .eq('id', cardData)
          .single();

        if (cardUser && !userError) {
          // Get user's primary wallet
          const { data: userWallet } = await supabase
            .from('wallets')
            .select('id, balance, currency')
            .eq('user_id', cardUser.id)
            .eq('wallet_type', 'primary')
            .single();

          setCardInfo({
            type: 'user',
            id: cardUser.id,
            name: `${cardUser.first_name} ${cardUser.last_name}`,
            balance: userWallet?.balance,
            currency: userWallet?.currency,
          });
          return;
        }
      }

      // If not a UUID, try looking up by NFC tag serial number
      // This would require a nfc_tags table mapping serial numbers to wallets
      const { data: nfcTag } = await supabase
        .from('nfc_tags')
        .select('wallet_id, user_id')
        .eq('serial_number', cardData)
        .eq('status', 'active')
        .single();

      if (nfcTag) {
        if (nfcTag.wallet_id) {
          const { data: tagWallet } = await supabase
            .from('wallets')
            .select('id, user_id, balance, currency')
            .eq('id', nfcTag.wallet_id)
            .single();

          if (tagWallet) {
            const { data: tagUser } = await supabase
              .from('users')
              .select('first_name, last_name')
              .eq('id', tagWallet.user_id)
              .single();

            setCardInfo({
              type: 'wallet',
              id: tagWallet.id,
              name: tagUser ? `${tagUser.first_name} ${tagUser.last_name}` : 'Unknown User',
              balance: tagWallet.balance,
              currency: tagWallet.currency,
            });
            return;
          }
        }
      }

      // Card not recognized
      setError('Card not recognized. The card may not be registered in the system.');
      setStatus('error');
      playErrorSound();
    } catch (err: any) {
      console.error('[NFC] Card lookup error:', err);
      setError('Failed to look up card. Please try again.');
      setStatus('error');
      playErrorSound();
    }
  };

  // Process payment
  const processPayment = async () => {
    if (!cardInfo || !amount || !user) {
      setError('Missing payment information');
      return;
    }

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setError('Invalid amount');
      return;
    }

    if (cardInfo.balance !== undefined && cardInfo.balance < paymentAmount) {
      setError('Insufficient balance');
      return;
    }

    setStatus('processing');
    setError(null);

    try {
      // Get admin's wallet for receiving payment
      const { data: adminWallet } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', user.id)
        .eq('wallet_type', 'primary')
        .single();

      if (!adminWallet) {
        throw new Error('Admin wallet not found');
      }

      // Get payer's wallet
      let payerWalletId = cardInfo.type === 'wallet' ? cardInfo.id : null;
      let payerWalletBalance = cardInfo.balance || 0;

      if (!payerWalletId) {
        const { data: payerWallet } = await supabase
          .from('wallets')
          .select('id, balance')
          .eq('user_id', cardInfo.id)
          .eq('wallet_type', 'primary')
          .single();

        if (!payerWallet) {
          throw new Error('Payer wallet not found');
        }
        payerWalletId = payerWallet.id;
        payerWalletBalance = payerWallet.balance;
      }

      if (payerWalletBalance < paymentAmount) {
        throw new Error('Insufficient balance');
      }

      // Deduct from payer
      const { error: deductError } = await supabase
        .from('wallets')
        .update({ balance: payerWalletBalance - paymentAmount })
        .eq('id', payerWalletId);

      if (deductError) throw deductError;

      // Credit admin
      const { error: creditError } = await supabase
        .from('wallets')
        .update({ balance: adminWallet.balance + paymentAmount })
        .eq('id', adminWallet.id);

      if (creditError) {
        // Rollback
        await supabase
          .from('wallets')
          .update({ balance: payerWalletBalance })
          .eq('id', payerWalletId);
        throw creditError;
      }

      // Create transaction record
      const txnRef = `NFC${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const { data: transaction, error: txnError } = await supabase
        .from('transactions')
        .insert({
          reference: txnRef,
          type: 'TRANSFER',
          amount: paymentAmount,
          currency_code: cardInfo.currency || 'SLE',
          status: 'COMPLETED',
          description: description || 'NFC Payment',
          sender_wallet_id: payerWalletId,
          recipient_wallet_id: adminWallet.id,
          metadata: {
            paymentMethod: 'nfc',
            cardType: cardInfo.type,
            payerName: cardInfo.name,
          },
        })
        .select()
        .single();

      if (txnError) {
        console.error('Transaction record error:', txnError);
      }

      setTransactionId(transaction?.id || txnRef);
      setStatus('success');
      playSuccessSound();

      // Add to recent payments
      setRecentPayments(prev => [{
        id: txnRef,
        amount: paymentAmount,
        recipient: cardInfo.name || 'Unknown',
        time: new Date(),
        status: 'success' as const,
      }, ...prev].slice(0, 10));

    } catch (err: any) {
      console.error('[NFC] Payment error:', err);
      setError(err.message || 'Payment failed');
      setStatus('error');
      playErrorSound();

      setRecentPayments(prev => [{
        id: `ERR${Date.now()}`,
        amount: parseFloat(amount),
        recipient: cardInfo?.name || 'Unknown',
        time: new Date(),
        status: 'failed' as const,
      }, ...prev].slice(0, 10));
    }
  };

  // Reset for new payment
  const resetPayment = () => {
    setStatus('scanning');
    setCardInfo(null);
    setAmount('');
    setDescription('');
    setError(null);
    setTransactionId(null);

    // Restart scanning
    if (readerMode === 'usb-acr122u' && usbDeviceRef.current) {
      pollACR122U(usbDeviceRef.current);
    }
  };

  // Stop scanning
  const stopScanning = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (usbDeviceRef.current) {
      usbDeviceRef.current.close().catch(() => {});
      usbDeviceRef.current = null;
    }
    setStatus('idle');
    setReaderMode('none');
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">NFC Payment</h1>
          <p className="text-gray-500 dark:text-gray-400">Accept payments using NFC cards</p>
        </div>

        {/* Reader Selection */}
        {status === 'idle' && (
          <MotionCard className="p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wifi className="w-10 h-10 text-primary-600 dark:text-primary-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Select NFC Reader
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Choose how you want to read NFC cards
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Web NFC (Mobile) */}
              <button
                onClick={startWebNFC}
                disabled={!webNFCSupported}
                className={`p-6 rounded-xl border-2 transition-all ${
                  webNFCSupported
                    ? 'border-gray-200 dark:border-gray-700 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                }`}
              >
                <Smartphone className="w-12 h-12 text-primary-600 dark:text-primary-400 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Mobile NFC
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {webNFCSupported
                    ? 'Use your phone\'s built-in NFC reader'
                    : 'Web NFC not supported on this device'}
                </p>
              </button>

              {/* ACR122U USB */}
              <button
                onClick={connectACR122U}
                className="p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all"
              >
                <Usb className="w-12 h-12 text-primary-600 dark:text-primary-400 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  ACR122U Reader
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Connect USB NFC reader (ACR122U)
                </p>
              </button>
            </div>
          </MotionCard>
        )}

        {/* Scanning State */}
        {status === 'scanning' && (
          <MotionCard className="p-8">
            <div className="text-center">
              <motion.div
                className="w-32 h-32 mx-auto mb-6 relative"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <div className="absolute inset-0 bg-primary-100 dark:bg-primary-900/30 rounded-full" />
                <motion.div
                  className="absolute inset-0 border-4 border-primary-500 rounded-full"
                  animate={{
                    scale: [1, 1.3],
                    opacity: [0.8, 0],
                  }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <CreditCard className="w-16 h-16 text-primary-600 dark:text-primary-400" />
                </div>
              </motion.div>

              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Waiting for Card
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {readerMode === 'web-nfc'
                  ? 'Hold NFC card near your device'
                  : 'Place NFC card on the ACR122U reader'}
              </p>

              <button
                onClick={stopScanning}
                className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Cancel
              </button>
            </div>
          </MotionCard>
        )}

        {/* Card Detected - Enter Amount */}
        {(status === 'card-detected' || status === 'processing') && cardInfo && (
          <MotionCard className="p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {cardInfo.name}
              </h2>
              {cardInfo.balance !== undefined && (
                <p className="text-gray-500 dark:text-gray-400">
                  Balance: {formatCurrency(cardInfo.balance)}
                </p>
              )}
            </div>

            <div className="space-y-4 max-w-sm mx-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={status === 'processing'}
                    className="w-full pl-12 pr-4 py-3 text-2xl font-bold text-center border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Payment for..."
                  disabled={status === 'processing'}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={resetPayment}
                  disabled={status === 'processing'}
                  className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={processPayment}
                  disabled={status === 'processing' || !amount || parseFloat(amount) <= 0}
                  className="flex-1 py-3 px-4 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {status === 'processing' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Charge {amount ? formatCurrency(parseFloat(amount)) : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </MotionCard>
        )}

        {/* Success State */}
        {status === 'success' && (
          <MotionCard className="p-8 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle className="w-12 h-12 text-white" />
              </motion.div>

              <h2 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">
                Payment Successful!
              </h2>
              <p className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                {formatCurrency(parseFloat(amount))}
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                from {cardInfo?.name}
              </p>

              {transactionId && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Transaction ID: {transactionId.slice(0, 12)}...
                </p>
              )}

              <button
                onClick={resetPayment}
                className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center gap-2 mx-auto"
              >
                <RefreshCw className="w-5 h-5" />
                New Payment
              </button>
            </div>
          </MotionCard>
        )}

        {/* Error State */}
        {status === 'error' && !cardInfo && (
          <MotionCard className="p-8 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <div className="text-center">
              <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-12 h-12 text-white" />
              </div>

              <h2 className="text-2xl font-bold text-red-700 dark:text-red-400 mb-2">
                Error
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {error || 'Something went wrong'}
              </p>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={stopScanning}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Back
                </button>
                <button
                  onClick={resetPayment}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          </MotionCard>
        )}

        {/* Recent Payments */}
        {recentPayments.length > 0 && (
          <MotionCard className="p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Recent Payments (This Session)
            </h3>
            <div className="space-y-2">
              {recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    payment.status === 'success'
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : 'bg-red-50 dark:bg-red-900/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {payment.status === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {payment.recipient}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {payment.time.toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </MotionCard>
        )}
      </div>
    </AdminLayout>
  );
}
