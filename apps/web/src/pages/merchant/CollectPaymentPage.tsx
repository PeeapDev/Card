import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Loader2,
  Clock,
  AlertCircle,
  Settings,
  Gauge,
  Calculator,
  Car,
  Sun,
  Moon,
} from 'lucide-react';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { clsx } from 'clsx';
import { APP_URL, isDevelopment } from '@/config/urls';
import { TransportSetupWizard, DriverProfile } from '@/components/transport/TransportSetupWizard';
import { DriverCollectionView } from '@/components/transport/DriverCollectionView';
import { PhoneFrame } from '@/components/ui/PhoneFrame';

interface DriverProfileData {
  id: string;
  user_id: string;
  vehicle_type: string;
  vehicle_name: string;
  operating_area: string;
  payment_methods: {
    qr: boolean;
    card: boolean;
    mobile: boolean;
  };
  created_at: string;
}

interface CheckoutSession {
  sessionId: string;
  paymentUrl: string;
  amount: number;
  currency: string;
  expiresAt: string;
}

interface RecentCollection {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  payment_method?: string;
}

type PageState = 'loading' | 'setup' | 'select-mode' | 'collect';
type FareType = 'fixed' | 'meter';
type CollectStep = 'form' | 'driving' | 'success' | 'error';

export function CollectPaymentPage() {
  const { user } = useAuth();

  // Page state
  const [pageState, setPageState] = useState<PageState>('loading');
  const [fareType, setFareType] = useState<FareType | null>(null);

  // Driver profile
  const [driverProfile, setDriverProfile] = useState<DriverProfileData | null>(null);

  // Collection step state
  const [collectStep, setCollectStep] = useState<CollectStep>('form');

  // Form state
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  // Session state
  const [currentSession, setCurrentSession] = useState<CheckoutSession | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Recent collections
  const [recentCollections, setRecentCollections] = useState<RecentCollection[]>([]);

  // Theme toggle (dark/light)
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  // Check if driver has completed setup
  useEffect(() => {
    async function checkDriverProfile() {
      if (!user?.id) return;

      try {
        const { data: profiles, error } = await supabase
          .from('driver_profiles')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching driver profile:', error);
          setPageState('setup');
          return;
        }

        if (profiles && profiles.length > 0) {
          setDriverProfile(profiles[0]);
          setPageState('select-mode');
        } else {
          setPageState('setup');
        }
      } catch (err) {
        console.error('Error checking driver profile:', err);
        setPageState('setup');
      }
    }

    checkDriverProfile();
  }, [user?.id]);

  // Fetch recent collections
  useEffect(() => {
    async function fetchRecentCollections() {
      if (!user?.id || pageState !== 'collect') return;

      try {
        const { data, error } = await supabase
          .from('checkout_sessions')
          .select('id, amount, status, created_at, payment_method')
          .eq('metadata->>driverId', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        setRecentCollections(data || []);
      } catch (err) {
        console.error('Error fetching recent collections:', err);
      }
    }

    fetchRecentCollections();
  }, [user?.id, pageState, collectStep]);

  // Subscribe to payment status when in driving mode
  useEffect(() => {
    if (collectStep !== 'driving' || !currentSession?.sessionId) return;

    let isCompleted = false; // Prevent duplicate triggers

    const checkStatus = async () => {
      try {
        const { data } = await supabase
          .from('checkout_sessions')
          .select('status')
          .eq('external_id', currentSession.sessionId)
          .single();

        if (isCompleted) return;

        if (data?.status === 'COMPLETE') {
          isCompleted = true;
          setCollectStep('success');
        } else if (data?.status === 'EXPIRED' || data?.status === 'CANCELLED') {
          setError('Payment was cancelled or expired');
          setCollectStep('error');
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    };

    // Check immediately
    checkStatus();

    const channel = supabase
      .channel(`collection_${currentSession.sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'checkout_sessions',
          filter: `external_id=eq.${currentSession.sessionId}`,
        },
        (payload: any) => {
          if (isCompleted) return;

          if (payload.new.status === 'COMPLETE') {
            isCompleted = true;
            setCollectStep('success');
          } else if (payload.new.status === 'EXPIRED' || payload.new.status === 'CANCELLED') {
            setError('Payment was cancelled or expired');
            setCollectStep('error');
          }
        }
      )
      .subscribe();

    // Fast polling backup - every 1 second for transport speed
    const pollInterval = setInterval(checkStatus, 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [collectStep, currentSession?.sessionId]);

  // Handle setup wizard completion
  const handleSetupComplete = async (profile: DriverProfile) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('driver_profiles')
        .insert({
          user_id: user.id,
          vehicle_type: profile.vehicleType,
          vehicle_name: profile.vehicleName,
          operating_area: profile.operatingArea,
          payment_methods: profile.paymentMethods,
        })
        .select()
        .single();

      if (error) throw error;

      setDriverProfile(data);
      setPageState('select-mode');
    } catch (err) {
      console.error('Error saving driver profile:', err);
      setPageState('select-mode');
    }
  };

  // Generate a unique session ID
  const generateSessionId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'cs_';
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Handle fare type selection and start collection
  const handleStartCollection = async () => {
    if (!user?.id || !amount) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setCreating(true);
    setError('');

    try {
      // Create checkout session directly in Supabase
      // This bypasses the need for a merchant business for driver collection
      const sessionId = generateSessionId();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

      const { data: session, error: insertError } = await supabase
        .from('checkout_sessions')
        .insert({
          external_id: sessionId,
          merchant_id: null, // Driver collection doesn't need merchant business
          status: 'OPEN',
          amount: amountNum,
          currency_code: 'SLE',
          description: description || `${driverProfile?.vehicle_name || 'Transport'} fare`,
          merchant_name: `${user.firstName || 'Driver'} ${user.lastName || ''}`.trim(),
          payment_methods: driverProfile?.payment_methods || { qr: true, card: true, mobile: true },
          metadata: {
            collectionType: 'driver',
            fareType: fareType,
            driverId: user.id,
            vehicleType: driverProfile?.vehicle_type,
            operatingArea: driverProfile?.operating_area,
          },
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message || 'Failed to create payment session');
      }

      // Build the payment URL - use /scan-pay/{sessionId} format for Scan to Pay compatibility
      // In dev mode, use local network IP so phone can scan QR codes
      const baseUrl = isDevelopment
        ? `http://${window.location.hostname}:${window.location.port}`
        : APP_URL;

      setCurrentSession({
        sessionId: sessionId,
        paymentUrl: `${baseUrl}/scan-pay/${sessionId}`,
        amount: amountNum,
        currency: 'SLE',
        expiresAt: expiresAt,
      });
      setCollectStep('driving');
    } catch (err: any) {
      setError(err.message || 'Failed to create payment session');
    } finally {
      setCreating(false);
    }
  };

  // Reset to mode selection
  const resetToModeSelection = () => {
    setCollectStep('form');
    setFareType(null);
    setAmount('');
    setDescription('');
    setCurrentSession(null);
    setError('');
    setPageState('select-mode');
  };

  // Reset form only
  const resetForm = () => {
    setCollectStep('form');
    setAmount('');
    setDescription('');
    setCurrentSession(null);
    setError('');
  };

  // Format time ago
  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return new Date(date).toLocaleDateString();
  };

  // Loading state
  if (pageState === 'loading') {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </MerchantLayout>
    );
  }

  // Setup wizard
  if (pageState === 'setup') {
    return (
      <MerchantLayout>
        <div className="max-w-xl mx-auto py-6">
          <TransportSetupWizard
            onComplete={handleSetupComplete}
            userName={user?.firstName}
          />
        </div>
      </MerchantLayout>
    );
  }

  // Driver Collection View (full screen on mobile, phone frame on desktop)
  if (collectStep === 'driving' && currentSession && user?.id) {
    return (
      <PhoneFrame>
        <DriverCollectionView
          amount={currentSession.amount}
          sessionId={currentSession.sessionId}
          paymentUrl={currentSession.paymentUrl}
          driverId={user.id}
          onPaymentComplete={() => setCollectStep('success')}
          onCancel={resetForm}
          vehicleType={driverProfile?.vehicle_type}
        />
      </PhoneFrame>
    );
  }

  // Success screen (phone frame on desktop)
  if (collectStep === 'success' && currentSession) {
    const successContent = (
      <div className="h-full bg-gradient-to-b from-green-500 to-green-600 text-white flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-full flex items-center justify-center mb-6 md:mb-8"
        >
          <CheckCircle className="w-12 h-12 md:w-16 md:h-16 text-green-500" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Payment Received!</h2>
          <p className="text-4xl md:text-5xl font-bold mb-4">
            Le {currentSession.amount.toLocaleString()}
          </p>
          <p className="text-green-100 mb-6 md:mb-8 text-sm md:text-base">
            The payment has been credited to your wallet
          </p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          onClick={resetToModeSelection}
          className="w-full max-w-xs py-4 bg-white text-green-600 rounded-2xl font-semibold text-base md:text-lg hover:bg-green-50 transition-colors"
        >
          <DollarSign className="w-5 h-5 inline mr-2" />
          Collect Another
        </motion.button>
      </div>
    );

    return <PhoneFrame>{successContent}</PhoneFrame>;
  }

  // Error screen (phone frame on desktop)
  if (collectStep === 'error') {
    const errorContent = (
      <div className="h-full bg-gradient-to-b from-red-500 to-red-600 text-white flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 md:w-24 md:h-24 bg-white/20 rounded-full flex items-center justify-center mb-6 md:mb-8">
          <XCircle className="w-12 h-12 md:w-16 md:h-16" />
        </div>

        <h2 className="text-2xl md:text-3xl font-bold mb-2">Payment Failed</h2>
        <p className="text-red-100 mb-6 md:mb-8 text-center text-sm md:text-base">
          {error || 'The payment could not be completed'}
        </p>

        <button
          onClick={resetToModeSelection}
          className="w-full max-w-xs py-4 bg-white text-red-600 rounded-2xl font-semibold text-base md:text-lg"
        >
          Try Again
        </button>
      </div>
    );

    return <PhoneFrame>{errorContent}</PhoneFrame>;
  }

  // Mode Selection Screen - Mobile-first design (phone frame on desktop)
  if (pageState === 'select-mode') {
    const modeSelectContent = (
      <div className="h-full bg-gray-900 text-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <button
            onClick={() => window.history.back()}
            className="p-2 rounded-full hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-base font-semibold">Collect Payment</p>
          </div>
          <button
            onClick={() => setPageState('setup')}
            className="p-2 rounded-full hover:bg-gray-800 transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Vehicle Info */}
        <div className="text-center py-4 border-b border-gray-800">
          <div className="w-14 h-14 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <Car className="w-7 h-7 text-primary-400" />
          </div>
          <p className="text-lg font-semibold">{driverProfile?.vehicle_name}</p>
          <p className="text-gray-400 text-xs">{driverProfile?.operating_area}</p>
        </div>

        {/* Fare Type Selection */}
        <div className="flex-1 p-4 flex flex-col justify-center">
          <p className="text-gray-400 text-xs text-center mb-4">Select fare type</p>

          <div className="space-y-3 w-full">
            {/* Fixed Price */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setFareType('fixed');
                setPageState('collect');
              }}
              className="w-full p-4 rounded-2xl bg-gray-800 hover:bg-gray-750 active:bg-gray-700 transition-colors flex items-center gap-3"
            >
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Calculator className="w-6 h-6 text-green-400" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-semibold">Fixed Price</h3>
                <p className="text-xs text-gray-400">Set amount before trip</p>
              </div>
            </motion.button>

            {/* Put & Take */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setFareType('meter');
                setPageState('collect');
              }}
              className="w-full p-4 rounded-2xl bg-gray-800 hover:bg-gray-750 active:bg-gray-700 transition-colors flex items-center gap-3"
            >
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Gauge className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-semibold">Put & Take</h3>
                <p className="text-xs text-gray-400">Enter amount after trip</p>
              </div>
            </motion.button>
          </div>
        </div>

        {/* Recent Collections */}
        {recentCollections.length > 0 && (
          <div className="border-t border-gray-800 p-3">
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Recent</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {recentCollections.slice(0, 5).map((collection) => (
                <div
                  key={collection.id}
                  className={clsx(
                    'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium',
                    collection.status === 'COMPLETE'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-800 text-gray-400'
                  )}
                >
                  Le {collection.amount.toLocaleString()}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );

    return <PhoneFrame>{modeSelectContent}</PhoneFrame>;
  }

  // Handle keypad input
  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      setAmount(prev => prev.slice(0, -1));
    } else if (key === 'clear') {
      setAmount('');
    } else {
      setAmount(prev => prev + key);
    }
  };

  // Collection Form - Mobile-first with custom keypad (phone frame on desktop)
  const collectFormContent = (
    <div className={clsx(
      'h-full flex flex-col',
      isDarkTheme ? 'bg-black text-white' : 'bg-white text-gray-900'
    )}>
      {/* Header with theme toggle */}
      <div className="flex items-center justify-between px-3 pt-3">
        <button
          onClick={resetToModeSelection}
          className={clsx('p-2 rounded-full transition-colors', isDarkTheme ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100')}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <p className={clsx('text-xs', isDarkTheme ? 'text-gray-500' : 'text-gray-400')}>
          {fareType === 'fixed' ? 'Fixed Price' : 'Put & Take'}
        </p>
        {/* Theme Toggle */}
        <button
          onClick={() => setIsDarkTheme(!isDarkTheme)}
          className={clsx(
            'p-2 rounded-full transition-colors',
            isDarkTheme ? 'hover:bg-gray-800 text-yellow-400' : 'hover:bg-gray-100 text-gray-700'
          )}
        >
          {isDarkTheme ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* Amount Display - CENTERED & BIG with neon glow in dark mode */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <motion.span
          key={amount}
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          className={clsx(
            'text-8xl font-bold tabular-nums',
            isDarkTheme && 'text-cyan-400'
          )}
          style={isDarkTheme ? {
            textShadow: '0 0 20px rgba(34, 211, 238, 0.5), 0 0 40px rgba(34, 211, 238, 0.3), 0 0 60px rgba(34, 211, 238, 0.1)'
          } : {}}
        >
          {amount || '0'}
        </motion.span>

        {/* Error Message */}
        {error && (
          <div className="mt-4 mx-3 p-2 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs">{error}</span>
          </div>
        )}
      </div>

      {/* Numeric Keypad - Compact at bottom */}
      <div className="px-3 pb-3">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <motion.button
              key={num}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleKeyPress(num.toString())}
              className={clsx(
                'h-14 rounded-2xl text-2xl font-semibold flex items-center justify-center transition-colors',
                isDarkTheme
                  ? 'bg-gray-900 active:bg-gray-800 text-white'
                  : 'bg-gray-100 active:bg-gray-200 text-gray-900'
              )}
            >
              {num}
            </motion.button>
          ))}
          {/* Bottom row: Clear, 0, Backspace */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => handleKeyPress('clear')}
            className={clsx(
              'h-14 rounded-2xl text-sm font-medium flex items-center justify-center transition-colors',
              isDarkTheme
                ? 'bg-gray-900 active:bg-gray-800 text-gray-500'
                : 'bg-gray-100 active:bg-gray-200 text-gray-500'
            )}
          >
            Clear
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => handleKeyPress('0')}
            className={clsx(
              'h-14 rounded-2xl text-2xl font-semibold flex items-center justify-center transition-colors',
              isDarkTheme
                ? 'bg-gray-900 active:bg-gray-800 text-white'
                : 'bg-gray-100 active:bg-gray-200 text-gray-900'
            )}
          >
            0
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => handleKeyPress('backspace')}
            className={clsx(
              'h-14 rounded-2xl text-lg font-medium flex items-center justify-center transition-colors',
              isDarkTheme
                ? 'bg-gray-900 active:bg-gray-800 text-white'
                : 'bg-gray-100 active:bg-gray-200 text-gray-900'
            )}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414a2 2 0 011.414-.586H19a2 2 0 012 2v10a2 2 0 01-2 2h-8.172a2 2 0 01-1.414-.586L3 12z" />
            </svg>
          </motion.button>
        </div>

        {/* Pay Button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleStartCollection}
          disabled={!amount || creating || parseFloat(amount) <= 0}
          className={clsx(
            'w-full mt-3 py-4 rounded-2xl text-xl font-bold transition-all flex items-center justify-center gap-2',
            amount && parseFloat(amount) > 0 && !creating
              ? isDarkTheme
                ? 'bg-cyan-500 text-black active:bg-cyan-400'
                : 'bg-primary-500 text-white active:bg-primary-600'
              : isDarkTheme
                ? 'bg-gray-900 text-gray-600 cursor-not-allowed'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          )}
          style={amount && parseFloat(amount) > 0 && !creating && isDarkTheme ? {
            boxShadow: '0 0 20px rgba(34, 211, 238, 0.4), 0 0 40px rgba(34, 211, 238, 0.2)'
          } : {}}
        >
          {creating ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Starting...</span>
            </>
          ) : (
            <span>Pay Le {amount || '0'}</span>
          )}
        </motion.button>
      </div>

      {/* Safe area bottom padding */}
      <div className="h-2" />
    </div>
  );

  return <PhoneFrame>{collectFormContent}</PhoneFrame>;
}
