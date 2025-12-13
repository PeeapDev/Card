import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import analyticsTracking from '@/services/analytics.tracking.service';

/**
 * Analytics Tracker Component
 * Automatically tracks page views when route changes
 */
export function AnalyticsTracker() {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    // Initialize analytics on first load
    analyticsTracking.init(user?.id);
  }, []);

  useEffect(() => {
    // Track page view on route change
    analyticsTracking.trackPageView(
      location.pathname,
      document.title,
      user?.id
    );

    // Mark as not a bounce when user navigates
    analyticsTracking.markNotBounce();
  }, [location.pathname, user?.id]);

  return null; // This component doesn't render anything
}

export default AnalyticsTracker;
