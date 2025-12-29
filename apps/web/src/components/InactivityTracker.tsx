/**
 * InactivityTracker Component
 *
 * Monitors user activity and automatically logs out users after a configured
 * period of inactivity. The timeout is configured in Site Settings by superadmins.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

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

interface InactivityTrackerProps {
  children: React.ReactNode;
}

export function InactivityTracker({ children }: InactivityTrackerProps) {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();

  const [timeoutMinutes, setTimeoutMinutes] = useState<number>(0);
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

      const timeout = data?.session_timeout_minutes ?? 0;
      setTimeoutMinutes(timeout);
    } catch (err) {
      console.error('Error fetching session timeout:', err);
    }
  }, []);

  // Handle user activity
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
  }, []);

  // Perform logout
  const performLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/login', {
        state: {
          message: 'You have been logged out due to inactivity.',
          type: 'info'
        }
      });
    } catch (err) {
      console.error('Error during auto-logout:', err);
      // Force navigation even if logout fails
      navigate('/login');
    }
  }, [logout, navigate]);

  // Check for inactivity
  const checkInactivity = useCallback(() => {
    if (!isAuthenticated || timeoutMinutes <= 0) {
      return;
    }

    const now = Date.now();
    const lastActivity = lastActivityRef.current;
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const elapsed = now - lastActivity;

    // Check if timeout exceeded
    if (elapsed >= timeoutMs) {
      console.log('Session timeout reached, logging out user');
      performLogout();
      return;
    }

    // Show warning 1 minute before logout (if timeout > 2 minutes)
    const warningThreshold = timeoutMs - 60 * 1000;
    if (timeoutMinutes > 2 && elapsed >= warningThreshold && !warningShownRef.current) {
      warningShownRef.current = true;
      // Could show a toast/notification here
      console.log('Session will expire in 1 minute due to inactivity');
    }
  }, [isAuthenticated, timeoutMinutes, performLogout]);

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
        // User returned to tab, check if they should be logged out
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
    }
  }, [user]);

  return <>{children}</>;
}

export default InactivityTracker;
