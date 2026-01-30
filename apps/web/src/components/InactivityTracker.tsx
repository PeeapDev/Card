/**
 * InactivityTracker Component
 *
 * Monitors user activity and locks the session after a configured
 * period of inactivity. Users can unlock with their wallet PIN or logout.
 * The timeout is configured in Site Settings by superadmins.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Lock, LogOut, ArrowRight, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SETTINGS_ID = '00000000-0000-0000-0000-000000000002';
const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
  'wheel',
];

// Check interval in milliseconds (check every 30 seconds)
const CHECK_INTERVAL = 30 * 1000;

// Refresh settings interval (every 5 minutes)
const SETTINGS_REFRESH_INTERVAL = 5 * 60 * 1000;

// Default timeout if not set in settings (15 minutes)
const DEFAULT_TIMEOUT_MINUTES = 15;

interface InactivityTrackerProps {
  children: React.ReactNode;
}

export function InactivityTracker({ children }: InactivityTrackerProps) {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();

  const [timeoutMinutes, setTimeoutMinutes] = useState<number>(DEFAULT_TIMEOUT_MINUTES);
  const [isLocked, setIsLocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const lastActivityRef = useRef<number>(Date.now());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const settingsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef<boolean>(false);

  // Fetch session timeout setting from database
  const fetchTimeoutSetting = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('session_timeout_minutes')
        .eq('id', SETTINGS_ID)
        .single();

      if (error) {
        console.error('Error fetching session timeout setting:', error);
        return;
      }

      const timeout = data?.session_timeout_minutes ?? DEFAULT_TIMEOUT_MINUTES;
      setTimeoutMinutes(timeout > 0 ? timeout : DEFAULT_TIMEOUT_MINUTES);
    } catch (err) {
      console.error('Error fetching session timeout:', err);
    }
  }, []);

  // Handle user activity
  const handleActivity = useCallback(() => {
    if (!isLocked) {
      lastActivityRef.current = Date.now();
      warningShownRef.current = false;
    }
  }, [isLocked]);

  // Lock screen instead of logout
  const lockScreen = useCallback(() => {
    setIsLocked(true);
    setPin('');
    setError('');
  }, []);

  // Perform full logout
  const performLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/login', {
        state: {
          message: 'You have been logged out.',
          type: 'info'
        }
      });
    } catch (err) {
      console.error('Error during logout:', err);
      navigate('/login');
    }
  }, [logout, navigate]);

  // Unlock with PIN
  const unlockWithPin = async () => {
    if (pin.length !== 4) {
      setError('Please enter your 4-digit PIN');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Verify PIN against user's wallet PIN
      const { data } = await supabaseAdmin
        .from('users')
        .select('wallet_pin')
        .eq('id', user?.id)
        .single();

      if (data?.wallet_pin === pin) {
        setIsLocked(false);
        setPin('');
        lastActivityRef.current = Date.now();
        warningShownRef.current = false;
      } else {
        setError('Incorrect PIN. Please try again.');
        setPin('');
      }
    } catch (err) {
      console.error('Error verifying PIN:', err);
      setError('Failed to verify PIN. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Check for inactivity
  const checkInactivity = useCallback(() => {
    if (!isAuthenticated || timeoutMinutes <= 0 || isLocked) {
      return;
    }

    const now = Date.now();
    const lastActivity = lastActivityRef.current;
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const elapsed = now - lastActivity;

    // Check if timeout exceeded
    if (elapsed >= timeoutMs) {
      console.log('Session timeout reached, locking screen');
      lockScreen();
      return;
    }

    // Show warning 1 minute before lock (if timeout > 2 minutes)
    const warningThreshold = timeoutMs - 60 * 1000;
    if (timeoutMinutes > 2 && elapsed >= warningThreshold && !warningShownRef.current) {
      warningShownRef.current = true;
      console.log('Session will lock in 1 minute due to inactivity');
    }
  }, [isAuthenticated, timeoutMinutes, isLocked, lockScreen]);

  // Set up activity listeners
  useEffect(() => {
    if (!isAuthenticated || timeoutMinutes <= 0) {
      return;
    }

    // Add event listeners for user activity
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Also track visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User returned to tab, check if they should be locked
        checkInactivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, timeoutMinutes, handleActivity, checkInactivity]);

  // Set up inactivity check interval
  useEffect(() => {
    if (!isAuthenticated || timeoutMinutes <= 0) {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      return;
    }

    // Reset last activity on mount/login
    lastActivityRef.current = Date.now();

    // Check for inactivity periodically
    checkIntervalRef.current = setInterval(checkInactivity, CHECK_INTERVAL);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, timeoutMinutes, checkInactivity]);

  // Fetch settings on mount and periodically refresh (visibility-aware)
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    // Initial fetch
    fetchTimeoutSetting();

    const startPolling = () => {
      if (settingsIntervalRef.current) return;
      settingsIntervalRef.current = setInterval(fetchTimeoutSetting, SETTINGS_REFRESH_INTERVAL);
    };

    const stopPolling = () => {
      if (settingsIntervalRef.current) {
        clearInterval(settingsIntervalRef.current);
        settingsIntervalRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    };

    // Start polling only if visible
    if (!document.hidden) {
      startPolling();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, fetchTimeoutSetting]);

  // Reset activity timestamp when user changes (login/logout)
  useEffect(() => {
    if (user) {
      lastActivityRef.current = Date.now();
      warningShownRef.current = false;
      setIsLocked(false);
    }
  }, [user]);

  // Handle Enter key in PIN input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      unlockWithPin();
    }
  };

  return (
    <>
      {children}

      {/* Lock Screen Overlay */}
      <AnimatePresence>
        {isLocked && isAuthenticated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4"
          >
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full max-w-md"
            >
              <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 shadow-2xl">
                {/* Lock Icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center border border-green-500/30">
                    <Lock className="w-10 h-10 text-green-400" />
                  </div>
                </div>

                {/* Title */}
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-white mb-2">Session Locked</h1>
                  <p className="text-gray-400">
                    Your session was locked due to inactivity.
                    {user?.email && (
                      <span className="block text-sm mt-1 text-gray-500">
                        {user.email}
                      </span>
                    )}
                  </p>
                </div>

                {/* PIN Input */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Enter your wallet PIN to continue
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type={showPin ? 'text' : 'password'}
                        value={pin}
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setPin(cleaned);
                          setError('');
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="••••"
                        maxLength={4}
                        autoFocus
                        className="w-full pl-12 pr-12 py-4 bg-gray-700/50 border border-gray-600 rounded-xl text-white text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder:tracking-normal"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      >
                        {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">{error}</span>
                    </motion.div>
                  )}

                  {/* Unlock Button */}
                  <button
                    onClick={unlockWithPin}
                    disabled={isLoading || pin.length !== 4}
                    className="w-full py-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        Unlock
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>

                  {/* Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-700" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-gray-800/50 text-gray-500">or</span>
                    </div>
                  </div>

                  {/* Logout Button */}
                  <button
                    onClick={performLogout}
                    className="w-full py-3 bg-transparent border border-gray-600 text-gray-400 hover:text-white hover:border-gray-500 font-medium rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out and log in again
                  </button>
                </div>

                {/* Security Note */}
                <p className="text-center text-xs text-gray-500 mt-6">
                  For your security, sessions are automatically locked after {timeoutMinutes} minutes of inactivity.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default InactivityTracker;
