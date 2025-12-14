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
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase';

type PaymentMode = 'qr' | 'card' | 'mobile';
type PaymentStatus = 'waiting' | 'success' | 'failed';

interface DriverCollectionViewProps {
  amount: number;
  sessionId: string;
  paymentUrl: string;
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
  onPaymentComplete,
  onCancel,
}: DriverCollectionViewProps) {
  // Debug: Log the payment URL being used for QR code
  console.log('[DriverCollectionView] QR Code URL:', paymentUrl, 'Session:', sessionId);

  const [activeMode, setActiveMode] = useState<PaymentMode>('qr');
  const [isScanning, setIsScanning] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcError, setNfcError] = useState<string | null>(null);
  const [cardDetected, setCardDetected] = useState(false);
  const [showMobileCheckout, setShowMobileCheckout] = useState(false);
  const nfcReaderRef = useRef<NFCReader | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Payment status state for visual feedback
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('waiting');
  const [showFlash, setShowFlash] = useState(false);
  const [payerName, setPayerName] = useState<string>('');

  // Swipe gesture
  const y = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check NFC support on mount
  useEffect(() => {
    const checkNFC = async () => {
      if ('NDEFReader' in window) {
        setNfcSupported(true);
      } else {
        setNfcError('NFC not supported on this device');
      }
    };
    checkNFC();
  }, []);

  // Subscribe to payment status updates via Supabase Realtime
  useEffect(() => {
    if (!sessionId) return;

    console.log('[DriverCollectionView] Subscribing to payment status for session:', sessionId);

    const channel = supabase
      .channel(`driver_collection_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'checkout_sessions',
          filter: `external_id=eq.${sessionId}`,
        },
        (payload: any) => {
          console.log('[DriverCollectionView] Received payment update:', payload);

          if (payload.new.status === 'COMPLETE') {
            // Payment successful!
            setPayerName(payload.new.payer_name || 'Customer');
            setPaymentStatus('success');
            setShowFlash(true);
            playSuccessSound();

            // Auto-navigate to success after showing feedback
            setTimeout(() => {
              onPaymentComplete();
            }, 2500);
          } else if (payload.new.status === 'EXPIRED' || payload.new.status === 'CANCELLED' || payload.new.status === 'FAILED') {
            // Payment failed
            setPaymentStatus('failed');
            setShowFlash(true);
            playErrorSound();

            // Return to QR view after showing error
            setTimeout(() => {
              setPaymentStatus('waiting');
              setShowFlash(false);
            }, 2000);
          }
        }
      )
      .subscribe();

    // Also poll as backup every 3 seconds
    const pollInterval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('checkout_sessions')
          .select('status, payer_name')
          .eq('external_id', sessionId)
          .single();

        if (data?.status === 'COMPLETE' && paymentStatus !== 'success') {
          setPayerName(data.payer_name || 'Customer');
          setPaymentStatus('success');
          setShowFlash(true);
          playSuccessSound();
          setTimeout(() => {
            onPaymentComplete();
          }, 2500);
        } else if ((data?.status === 'EXPIRED' || data?.status === 'CANCELLED' || data?.status === 'FAILED') && paymentStatus === 'waiting') {
          setPaymentStatus('failed');
          setShowFlash(true);
          playErrorSound();
          setTimeout(() => {
            setPaymentStatus('waiting');
            setShowFlash(false);
          }, 2000);
        }
      } catch (err) {
        console.error('[DriverCollectionView] Poll error:', err);
      }
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [sessionId, paymentStatus, onPaymentComplete]);

  // Handle card payment via NFC
  const handleCardPayment = useCallback(async (cardData: string) => {
    setCardDetected(true);

    try {
      const response = await fetch('/api/nfc/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          amount,
          cardData,
        }),
      });

      if (response.ok) {
        setPaymentStatus('success');
        setShowFlash(true);
        playSuccessSound();
        setTimeout(() => {
          onPaymentComplete();
        }, 2500);
      } else {
        setNfcError('Payment failed. Try again.');
        setCardDetected(false);
        setPaymentStatus('failed');
        setShowFlash(true);
        playErrorSound();
        setTimeout(() => {
          setPaymentStatus('waiting');
          setShowFlash(false);
        }, 2000);
      }
    } catch (error) {
      console.error('NFC payment error:', error);
      setNfcError('Payment error. Try again.');
      setCardDetected(false);
      setPaymentStatus('failed');
      setShowFlash(true);
      playErrorSound();
      setTimeout(() => {
        setPaymentStatus('waiting');
        setShowFlash(false);
      }, 2000);
    }
  }, [sessionId, amount, onPaymentComplete]);

  // Start NFC scanning
  const startNFCScanning = useCallback(async () => {
    if (!(window as any).NDEFReader) {
      setNfcError('NFC not available');
      return;
    }

    try {
      setIsScanning(true);
      setNfcError(null);

      const ndef = new (window as any).NDEFReader() as NFCReader;
      nfcReaderRef.current = ndef;
      abortControllerRef.current = new AbortController();

      await ndef.scan();

      ndef.addEventListener('reading', (event: any) => {
        const { message, serialNumber } = event;

        let walletId = serialNumber;

        if (message?.records) {
          for (const record of message.records) {
            if (record.recordType === 'text') {
              const textDecoder = new TextDecoder();
              walletId = textDecoder.decode(record.data);
              break;
            }
          }
        }

        handleCardPayment(walletId);
      });

    } catch (error: any) {
      console.error('NFC scanning error:', error);
      setIsScanning(false);

      if (error.name === 'NotAllowedError') {
        setNfcError('NFC permission denied. Please allow NFC access.');
      } else if (error.name === 'NotSupportedError') {
        setNfcError('NFC not supported on this device.');
      } else {
        setNfcError('Could not start NFC. Try again.');
      }
    }
  }, [handleCardPayment]);

  // Stop NFC scanning
  const stopNFCScanning = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  // Start/stop NFC based on active mode
  useEffect(() => {
    if (activeMode === 'card' && nfcSupported && !isScanning) {
      startNFCScanning();
    } else if (activeMode !== 'card' && isScanning) {
      stopNFCScanning();
    }

    return () => {
      stopNFCScanning();
    };
  }, [activeMode, nfcSupported, isScanning, startNFCScanning, stopNFCScanning]);

  const handleSwipe = (info: PanInfo) => {
    const threshold = 80;

    if (info.offset.y < -threshold) {
      if (activeMode === 'qr') {
        setActiveMode('mobile');
        setShowMobileCheckout(true);
      } else if (activeMode === 'card') {
        setActiveMode('qr');
      }
    } else if (info.offset.y > threshold) {
      if (activeMode === 'qr') {
        setActiveMode('card');
      } else if (activeMode === 'mobile') {
        setActiveMode('qr');
        setShowMobileCheckout(false);
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
        <div className="w-10" /> {/* Spacer */}
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
                <QRCode value={paymentUrl} size={220} level="H" />
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

                  {isScanning && (
                    <motion.div
                      className="mt-6 flex items-center gap-2 text-blue-400"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Waiting for card...</span>
                    </motion.div>
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
      const response = await fetch('/api/monime/checkout', {
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
