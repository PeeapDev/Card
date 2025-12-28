import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, PanInfo } from 'framer-motion';
import {
  Smartphone,
  CreditCard,
  X,
  Check,
  Wifi,
  ArrowUp,
  ArrowDown,
  Loader2,
  ChevronUp,
  ChevronDown,
  Volume2,
  Usb,
  Signal,
  Monitor,
  Download,
} from 'lucide-react';
import { clsx } from 'clsx';
import { BrandedQRCode } from '@/components/ui/BrandedQRCode';
import { supabase } from '@/lib/supabase';
import { useNFC, NFCCardData } from '@/hooks/useNFC';
import { NFCStatus } from '@/components/nfc/NFCStatus';
import { NFCIndicator } from '@/components/nfc/NFCIndicator';
import { notificationService } from '@/services/notification.service';

type PaymentMode = 'qr' | 'card' | 'mobile';
type PaymentStatus = 'waiting' | 'success' | 'failed';

interface DriverCollectionViewProps {
  amount: number;
  sessionId: string;
  paymentUrl: string;
  driverId: string; // Driver's user ID to receive payment
  onPaymentComplete: () => void;
  onCancel: () => void;
  vehicleType?: string;
}

// NFC Reader interface for TypeScript
interface NFCReader {
  scan(): Promise<void>;
  addEventListener(event: string, callback: (event: any) => void): void;
}

// Sound effects URLs (using Web Audio API beeps)
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

    // Second beep (higher pitch)
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

export function DriverCollectionView({
  amount,
  sessionId,
  paymentUrl,
  driverId,
  onPaymentComplete,
  onCancel,
}: DriverCollectionViewProps) {
  // Debug: Log the payment URL being used for QR code
  console.log('[DriverCollectionView] QR Code URL:', paymentUrl, 'Session:', sessionId, 'Driver:', driverId);

  // Use global NFC context
  const {
    status: nfcStatus,
    error: nfcError,
    startWebNFC,
    stopWebNFC,
    connectUSBReader,
    startUSBScanning,
    stopUSBScanning,
    onCardDetected,
  } = useNFC();

  const [activeMode, setActiveMode] = useState<PaymentMode>('qr');
  const [cardDetected, setCardDetected] = useState(false);
  const [showMobileCheckout, setShowMobileCheckout] = useState(false);
  const [processingNFCPayment, setProcessingNFCPayment] = useState(false);

  // Payment status state for visual feedback
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('waiting');
  const [showFlash, setShowFlash] = useState(false);
  const [payerName, setPayerName] = useState<string>('');

  // Swipe gesture
  const y = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Derived NFC state from context
  const nfcSupported = nfcStatus.anyReaderAvailable || nfcStatus.webNFC.supported || nfcStatus.usbReader.supported || nfcStatus.agent?.available;
  const isScanning = nfcStatus.isScanning;
  const agentConnected = nfcStatus.agent?.connected;

  // Subscribe to payment notification via Supabase Realtime broadcast channel
  // This is faster and more reliable than polling the database
  useEffect(() => {
    if (!sessionId || !driverId) return;

    console.log('[DriverCollectionView] Setting up payment notification channel for driver:', driverId);
    let isCompleted = false;

    // Use a broadcast channel for instant notifications
    // The payer will send a message when payment completes
    const channel = supabase
      .channel(`driver_payment_${sessionId}`)
      .on('broadcast', { event: 'payment_complete' }, (payload: any) => {
        console.log('[DriverCollectionView] Received payment notification:', payload);

        if (isCompleted) return;
        isCompleted = true;

        const { payerName: payer, amount: paidAmount, status } = payload.payload || {};

        if (status === 'success') {
          setPayerName(payer || 'Customer');
          setPaymentStatus('success');
          setShowFlash(true);
          playSuccessSound();

          setTimeout(() => {
            onPaymentComplete();
          }, 1500); // Fast feedback for transport
        }
      })
      .subscribe((status) => {
        console.log('[DriverCollectionView] Channel status:', status);
      });

    // Also check for existing completed payment (in case we missed the broadcast)
    const checkExistingPayment = async () => {
      try {
        // Check transactions table directly for completed payment
        const { data: txn } = await supabase
          .from('transactions')
          .select('id, metadata, created_at')
          .eq('recipient_user_id', driverId)
          .eq('amount', amount)
          .eq('status', 'COMPLETED')
          .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Last 60 seconds
          .order('created_at', { ascending: false })
          .limit(1);

        if (txn && txn.length > 0 && !isCompleted) {
          const metadata = txn[0].metadata as any;
          if (metadata?.checkoutSessionId === sessionId || metadata?.sessionId === sessionId) {
            isCompleted = true;
            setPayerName(metadata?.payerName || 'Customer');
            setPaymentStatus('success');
            setShowFlash(true);
            playSuccessSound();
            setTimeout(() => {
              onPaymentComplete();
            }, 1500);
          }
        }
      } catch (err) {
        // Ignore errors on initial check
      }
    };

    // Check once on mount after a short delay
    const initialCheck = setTimeout(checkExistingPayment, 500);

    // Light polling as backup - check every 2 seconds
    const pollInterval = setInterval(checkExistingPayment, 2000);

    return () => {
      clearTimeout(initialCheck);
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [sessionId, driverId, amount, paymentStatus, onPaymentComplete]);

  // Handle NFC card payment - Direct wallet-to-wallet transfer via Supabase
  const handleNFCCardPayment = useCallback(async (cardData: NFCCardData) => {
    if (processingNFCPayment) return;

    setCardDetected(true);
    setProcessingNFCPayment(true);
    console.log('[DriverCollectionView] NFC card detected:', cardData);

    try {
      // The card data contains the payer's wallet ID (UUID format)
      const payerWalletId = cardData.data;

      if (!payerWalletId || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(payerWalletId)) {
        throw new Error('Invalid card - no wallet ID found');
      }

      // Get payer's wallet and verify balance
      const { data: payerWallet, error: payerError } = await supabase
        .from('wallets')
        .select('id, user_id, balance, currency')
        .eq('id', payerWalletId)
        .single();

      if (payerError || !payerWallet) {
        throw new Error('Wallet not found');
      }

      if (payerWallet.balance < amount) {
        throw new Error('Insufficient balance');
      }

      // Get driver's wallet (create driver wallet if needed)
      let { data: driverWallet, error: driverWalletError } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', driverId)
        .eq('wallet_type', 'driver')
        .single();

      if (driverWalletError || !driverWallet) {
        // Try primary wallet as fallback
        const { data: primaryWallet } = await supabase
          .from('wallets')
          .select('id, balance')
          .eq('user_id', driverId)
          .eq('wallet_type', 'primary')
          .single();

        if (primaryWallet) {
          driverWallet = primaryWallet;
        } else {
          throw new Error('Driver wallet not found');
        }
      }

      // Deduct from payer's wallet
      const { error: deductError } = await supabase
        .from('wallets')
        .update({ balance: payerWallet.balance - amount })
        .eq('id', payerWalletId);

      if (deductError) {
        throw new Error('Failed to deduct payment');
      }

      // Credit driver's wallet
      const { error: creditError } = await supabase
        .from('wallets')
        .update({ balance: driverWallet.balance + amount })
        .eq('id', driverWallet.id);

      if (creditError) {
        // Rollback payer's deduction
        await supabase
          .from('wallets')
          .update({ balance: payerWallet.balance })
          .eq('id', payerWalletId);
        throw new Error('Failed to credit driver');
      }

      // Create transaction record
      const transactionRef = `NFC${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      await supabase
        .from('transactions')
        .insert({
          reference: transactionRef,
          type: 'TRANSFER',
          amount: amount,
          currency_code: payerWallet.currency || 'SLE',
          status: 'COMPLETED',
          description: 'NFC card fare payment',
          sender_wallet_id: payerWalletId,
          recipient_wallet_id: driverWallet.id,
          sender_user_id: payerWallet.user_id,
          recipient_user_id: driverId,
          metadata: {
            paymentMethod: 'nfc_card',
            cardUid: cardData.uid,
            sessionId: sessionId,
          },
        });

      // Update checkout session if exists
      if (sessionId) {
        await supabase
          .from('checkout_sessions')
          .update({
            status: 'COMPLETE',
            payment_method: 'nfc_card',
            completed_at: new Date().toISOString(),
          })
          .eq('external_id', sessionId);
      }

      // Send notification to driver about NFC payment received
      try {
        await notificationService.sendPaymentReceived({
          userId: driverId,
          amount: amount,
          currency: payerWallet.currency || 'SLE',
          senderName: 'NFC Card Payment',
          transactionId: transactionRef,
        });
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
        // Don't fail the payment if notification fails
      }

      // Success! Instant feedback for transport speed
      setPayerName('Card Payment');
      setPaymentStatus('success');
      setShowFlash(true);
      playSuccessSound();
      setTimeout(() => {
        onPaymentComplete();
      }, 1500); // Faster for transport business

    } catch (error: any) {
      console.error('NFC payment error:', error);
      setCardDetected(false);
      setPaymentStatus('failed');
      setShowFlash(true);
      playErrorSound();
      setTimeout(() => {
        setPaymentStatus('waiting');
        setShowFlash(false);
        setProcessingNFCPayment(false);
      }, 2000);
    }
  }, [sessionId, amount, driverId, onPaymentComplete, processingNFCPayment]);

  // Subscribe to NFC card detection
  useEffect(() => {
    if (activeMode !== 'card') return;

    const unsubscribe = onCardDetected(handleNFCCardPayment);
    return unsubscribe;
  }, [activeMode, onCardDetected, handleNFCCardPayment]);

  // Start NFC scanning when entering card mode
  const startNFCScanning = useCallback(async () => {
    // Try Web NFC first (mobile)
    if (nfcStatus.webNFC.supported && !nfcStatus.webNFC.scanning) {
      await startWebNFC();
    }
    // If USB reader is connected, start scanning
    if (nfcStatus.usbReader.connected && !nfcStatus.usbReader.scanning) {
      startUSBScanning();
    }
  }, [nfcStatus, startWebNFC, startUSBScanning]);

  // Stop NFC scanning
  const stopNFCScanning = useCallback(() => {
    stopWebNFC();
    stopUSBScanning();
  }, [stopWebNFC, stopUSBScanning]);

  // Start/stop NFC based on active mode
  useEffect(() => {
    if (activeMode === 'card' && nfcSupported && !isScanning) {
      startNFCScanning();
    } else if (activeMode !== 'card' && isScanning) {
      stopNFCScanning();
    }

    return () => {
      if (activeMode === 'card') {
        stopNFCScanning();
      }
    };
  }, [activeMode, nfcSupported, isScanning, startNFCScanning, stopNFCScanning]);

  const handleSwipe = (info: PanInfo) => {
    const threshold = 80;

    if (info.offset.y < -threshold) {
      if (activeMode === 'qr') {
        switchToMode('mobile');
      } else if (activeMode === 'card') {
        switchToMode('qr');
      }
    } else if (info.offset.y > threshold) {
      if (activeMode === 'qr') {
        switchToMode('card');
      } else if (activeMode === 'mobile') {
        switchToMode('qr');
      }
    }
  };

  const switchToMode = (mode: PaymentMode) => {
    setActiveMode(mode);
    if (mode === 'mobile') {
      setShowMobileCheckout(true);
    } else {
      setShowMobileCheckout(false);
    }
    // Immediately start NFC scanning when switching to card mode if reader is connected
    if (mode === 'card') {
      if (nfcStatus.usbReader.connected && !nfcStatus.usbReader.scanning) {
        console.log('[DriverCollectionView] Starting USB scanning on card mode switch');
        startUSBScanning();
      }
      if (nfcStatus.webNFC.supported && !nfcStatus.webNFC.scanning) {
        startWebNFC();
      }
    }
  };

  // Payment Success Overlay
  if (paymentStatus === 'success' && showFlash) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full bg-green-500 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden"
      >
        {/* Animated background pulse */}
        <motion.div
          className="absolute inset-0 bg-green-400"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 0.8,
            repeat: 2,
          }}
        />

        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-8 z-10 shadow-2xl"
        >
          <Check className="w-20 h-20 text-green-500" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center z-10"
        >
          <h2 className="text-4xl font-bold mb-2">Payment Received!</h2>
          <p className="text-6xl font-bold mb-4">
            Le {amount.toLocaleString()}
          </p>
          {payerName && (
            <p className="text-green-100 text-lg">
              from {payerName}
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="absolute bottom-8 flex items-center gap-2 text-green-100"
        >
          <Volume2 className="w-5 h-5" />
          <span>Payment confirmed</span>
        </motion.div>
      </motion.div>
    );
  }

  // Payment Failed Overlay
  if (paymentStatus === 'failed' && showFlash) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full bg-red-500 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden"
      >
        {/* Animated background pulse */}
        <motion.div
          className="absolute inset-0 bg-red-400"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 0.5,
            repeat: 2,
          }}
        />

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ duration: 0.4 }}
          className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mb-8 z-10"
        >
          <X className="w-20 h-20 text-white" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center z-10"
        >
          <h2 className="text-3xl font-bold mb-2">Payment Failed</h2>
          <p className="text-red-100">
            Please try again
          </p>
        </motion.div>
      </motion.div>
    );
  }

  // Mobile Money checkout overlay
  if (showMobileCheckout) {
    return (
      <MobileMoneyCheckout
        amount={amount}
        paymentUrl={paymentUrl}
        onClose={() => {
          setShowMobileCheckout(false);
          setActiveMode('qr');
        }}
        onComplete={() => {
          setPaymentStatus('success');
          setShowFlash(true);
          playSuccessSound();
          setTimeout(() => {
            onPaymentComplete();
          }, 2500);
        }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full bg-gradient-to-b from-gray-900 to-black text-white flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 z-10">
        <button
          onClick={onCancel}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="text-center">
          <p className="text-sm text-gray-400">Collecting</p>
          <p className="text-2xl font-bold">Le {amount.toLocaleString()}</p>
        </div>
        {/* NFC Status Indicator */}
        <div className="bg-white/10 rounded-lg">
          <NFCIndicator showLabel={false} />
        </div>
      </div>

      {/* Waiting indicator */}
      <div className="mx-auto mb-2">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="flex items-center gap-2 text-cyan-400 text-sm"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Waiting for payment...</span>
        </motion.div>
      </div>

      {/* Mode indicator - Top (Mobile Money) */}
      <motion.button
        onClick={() => switchToMode('mobile')}
        className={clsx(
          'mx-auto py-3 px-6 rounded-full flex items-center gap-2 transition-all',
          activeMode === 'mobile'
            ? 'bg-orange-500 text-white scale-110'
            : 'bg-white/10 text-gray-400 hover:bg-white/20'
        )}
        animate={{ y: activeMode === 'mobile' ? 10 : 0 }}
      >
        <Smartphone className="w-5 h-5" />
        <span className="font-medium">Orange Money</span>
        {activeMode !== 'mobile' && <ChevronUp className="w-4 h-4 ml-1" />}
      </motion.button>

      {/* Main swipeable area */}
      <motion.div
        className="flex-1 flex flex-col items-center justify-center px-6"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.3}
        onDragEnd={(_, info) => handleSwipe(info)}
        style={{ y }}
      >
        <AnimatePresence mode="wait">
          {activeMode === 'qr' && (
            <motion.div
              key="qr"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center"
            >
              {/* Swipe up hint */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="flex flex-col items-center text-gray-500 mb-4"
              >
                <ArrowUp className="w-5 h-5" />
                <span className="text-xs">Swipe for Mobile Money</span>
              </motion.div>

              {/* QR Code with pulsing border */}
              <motion.div
                className="bg-white p-6 rounded-3xl shadow-2xl relative"
                animate={{
                  boxShadow: [
                    '0 0 0 0 rgba(34, 211, 238, 0.4)',
                    '0 0 0 15px rgba(34, 211, 238, 0)',
                  ],
                }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <BrandedQRCode value={paymentUrl} size={220} />
              </motion.div>

              <p className="mt-6 text-gray-400 text-center">
                Customer scans to pay
              </p>

              {/* Swipe down hint */}
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="flex flex-col items-center text-gray-500 mt-4"
              >
                <span className="text-xs">Swipe for Card</span>
                <ArrowDown className="w-5 h-5" />
              </motion.div>
            </motion.div>
          )}

          {activeMode === 'card' && (
            <motion.div
              key="card"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="flex flex-col items-center"
            >
              {/* Card Detected Success */}
              {cardDetected ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-4">
                    <Check className="w-12 h-12 text-white" />
                  </div>
                  <p className="text-xl font-semibold text-green-400">Card Detected!</p>
                  <p className="text-gray-400 mt-2">Processing payment...</p>
                </motion.div>
              ) : (
                <>
                  {/* NFC Card Scanning Animation */}
                  <div className="relative w-64 h-40 mb-8">
                    <motion.div
                      className="absolute inset-0 border-2 border-blue-400 rounded-2xl"
                      animate={{
                        boxShadow: isScanning ? [
                          '0 0 0 0 rgba(59, 130, 246, 0.4)',
                          '0 0 0 20px rgba(59, 130, 246, 0)',
                        ] : 'none',
                      }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    />

                    {isScanning && (
                      <>
                        <motion.div
                          className="absolute inset-0 border-2 border-blue-400 rounded-2xl"
                          initial={{ scale: 1, opacity: 0.8 }}
                          animate={{ scale: 1.3, opacity: 0 }}
                          transition={{ repeat: Infinity, duration: 1.5, delay: 0 }}
                        />
                        <motion.div
                          className="absolute inset-0 border-2 border-blue-400 rounded-2xl"
                          initial={{ scale: 1, opacity: 0.8 }}
                          animate={{ scale: 1.3, opacity: 0 }}
                          transition={{ repeat: Infinity, duration: 1.5, delay: 0.5 }}
                        />
                        <motion.div
                          className="absolute inset-0 border-2 border-blue-400 rounded-2xl"
                          initial={{ scale: 1, opacity: 0.8 }}
                          animate={{ scale: 1.3, opacity: 0 }}
                          transition={{ repeat: Infinity, duration: 1.5, delay: 1 }}
                        />
                      </>
                    )}

                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        animate={isScanning ? { scale: [1, 1.05, 1] } : {}}
                        transition={{ repeat: Infinity, duration: 2 }}
                      >
                        <CreditCard className="w-20 h-20 text-blue-400" />
                      </motion.div>
                    </div>

                    <div className="absolute top-3 right-3">
                      <motion.div
                        animate={isScanning ? { opacity: [1, 0.5, 1] } : { opacity: 0.5 }}
                        transition={{ repeat: Infinity, duration: 1 }}
                      >
                        <Wifi className="w-6 h-6 text-blue-400 rotate-90" />
                      </motion.div>
                    </div>
                  </div>

                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-blue-400 mb-2">
                      {isScanning ? 'Ready to Scan' : nfcSupported ? 'Starting NFC...' : 'Card Payment'}
                    </h3>
                    <p className="text-gray-400">
                      {nfcError || (nfcSupported
                        ? 'Hold card near the back of device'
                        : 'NFC not available - Use QR instead')}
                    </p>
                  </div>

                  {/* NFC Reader Status */}
                  <div className="mt-4 w-full max-w-xs">
                    {/* Show agent status if connected */}
                    {agentConnected && (
                      <div className="flex items-center justify-center gap-2 mb-3 p-3 bg-green-500/20 border border-green-500/50 rounded-xl">
                        <Monitor className="w-5 h-5 text-green-400" />
                        <span className="text-green-400 font-medium">
                          {nfcStatus.agent?.readerName || 'NFC Agent Connected'}
                        </span>
                      </div>
                    )}

                    {/* Show install prompt if no agent and no USB reader */}
                    {!agentConnected && !nfcStatus.usbReader.connected && !nfcStatus.webNFC.supported && (
                      <div className="mb-3 p-4 bg-blue-500/20 border border-blue-500/50 rounded-xl text-center">
                        <Monitor className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                        <p className="text-blue-300 text-sm mb-3">
                          For the best NFC experience, install the PeeAP NFC Agent
                        </p>
                        <a
                          href="/downloads/peeap-nfc-agent.zip"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm"
                        >
                          <Download className="w-4 h-4" />
                          Download NFC Agent
                        </a>
                        <p className="text-blue-400/60 text-xs mt-2">
                          Works reliably on any computer
                        </p>
                      </div>
                    )}

                    {/* Show USB connect button if USB reader is supported but not connected and no agent */}
                    {!agentConnected && nfcStatus.usbReader.supported && !nfcStatus.usbReader.connected && !isScanning && (
                      <motion.button
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={async () => {
                          console.log('[DriverCollectionView] Connecting USB reader...');
                          const success = await connectUSBReader();
                          if (success) {
                            console.log('[DriverCollectionView] USB connected, starting scan');
                            startUSBScanning();
                          }
                        }}
                        className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 mb-3"
                      >
                        <Usb className="w-5 h-5" />
                        Connect USB NFC Reader
                      </motion.button>
                    )}

                    <NFCStatus
                      variant="inline"
                      showConnectButton={true}
                      onReaderReady={() => {
                        console.log('[DriverCollectionView] NFC reader ready');
                        startNFCScanning();
                      }}
                    />
                  </div>

                  {isScanning && (
                    <motion.div
                      className="mt-4 flex items-center gap-2 text-blue-400"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Waiting for card...</span>
                    </motion.div>
                  )}

                  {nfcError && (
                    <div className="mt-3 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm text-center">
                      {nfcError}
                      {nfcError.includes('denied') && (
                        <p className="text-xs mt-1 text-red-300">
                          Try closing other apps using the NFC reader, or reconnect the USB cable
                        </p>
                      )}
                    </div>
                  )}

                  {nfcError && nfcSupported && (
                    <button
                      onClick={startNFCScanning}
                      className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-full font-medium"
                    >
                      Try Again
                    </button>
                  )}
                </>
              )}

              {!cardDetected && (
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="flex flex-col items-center text-gray-500 mt-8"
                >
                  <ArrowUp className="w-5 h-5" />
                  <span className="text-xs">Swipe up for QR Code</span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Mode indicator - Bottom (Card) */}
      <motion.button
        onClick={() => switchToMode('card')}
        className={clsx(
          'mx-auto mb-8 py-3 px-6 rounded-full flex items-center gap-2 transition-all',
          activeMode === 'card'
            ? 'bg-blue-500 text-white scale-110'
            : 'bg-white/10 text-gray-400 hover:bg-white/20'
        )}
        animate={{ y: activeMode === 'card' ? -10 : 0 }}
      >
        {activeMode !== 'card' && <ChevronDown className="w-4 h-4 mr-1" />}
        <CreditCard className="w-5 h-5" />
        <span className="font-medium">Card / NFC</span>
      </motion.button>
    </div>
  );
}

// Mobile Money Checkout Component
interface MobileMoneyCheckoutProps {
  amount: number;
  paymentUrl: string;
  onClose: () => void;
  onComplete: () => void;
}

function MobileMoneyCheckout({
  amount,
  paymentUrl,
  onClose,
  onComplete,
}: MobileMoneyCheckoutProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<'input' | 'processing' | 'success' | 'error'>('input');

  const handleSubmit = async () => {
    if (!phoneNumber || phoneNumber.length < 8) return;

    setProcessing(true);
    setStatus('processing');

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.peeap.com';
      const response = await fetch(`${API_URL}/monime/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          phone: phoneNumber,
          paymentUrl,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setTimeout(() => {
          onComplete();
        }, 2000);
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      className="h-full bg-gradient-to-b from-orange-500 to-orange-600 text-white flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
        <div className="text-center">
          <p className="text-sm text-orange-100">Mobile Money Payment</p>
          <p className="text-2xl font-bold">Le {amount.toLocaleString()}</p>
        </div>
        <div className="w-10" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {status === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-sm"
            >
              <div className="flex justify-center mb-8">
                <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                  <Smartphone className="w-10 h-10 text-orange-500" />
                </div>
              </div>

              <label className="block text-sm text-orange-100 mb-2">
                Customer Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="076 XXX XXXX"
                className="w-full px-4 py-4 text-xl bg-white/20 border-2 border-white/30 rounded-xl text-white placeholder-orange-200 focus:outline-none focus:border-white"
              />

              <button
                onClick={handleSubmit}
                disabled={!phoneNumber || phoneNumber.length < 8}
                className="w-full mt-6 py-4 bg-white text-orange-600 rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-50 transition-colors"
              >
                Send Payment Request
              </button>

              <p className="text-center text-orange-100 text-sm mt-4">
                Customer will receive a prompt to confirm payment
              </p>
            </motion.div>
          )}

          {status === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-20 h-20 border-4 border-white/30 border-t-white rounded-full mx-auto mb-6"
              />
              <h3 className="text-xl font-semibold mb-2">Processing Payment</h3>
              <p className="text-orange-100">
                Waiting for customer to confirm...
              </p>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <Check className="w-10 h-10 text-green-500" />
              </motion.div>
              <h3 className="text-2xl font-bold mb-2">Payment Received!</h3>
              <p className="text-xl">Le {amount.toLocaleString()}</p>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <X className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Payment Failed</h3>
              <p className="text-orange-100 mb-6">
                Please try again or use another payment method
              </p>
              <button
                onClick={() => setStatus('input')}
                className="px-6 py-3 bg-white/20 rounded-xl font-medium hover:bg-white/30 transition-colors"
              >
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
