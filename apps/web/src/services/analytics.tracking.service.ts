/**
 * Website Analytics Tracking Service
 * Tracks page views, user sessions, and visitor information
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://card-schooledusl-8238s-projects.vercel.app/api';

interface PageViewData {
  sessionId: string;
  userId?: string;
  pagePath: string;
  pageTitle?: string;
  referrer?: string;
  userAgent?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  screenWidth?: number;
  screenHeight?: number;
  durationSeconds?: number;
  isBounce?: boolean;
}

// Generate or get existing session ID
function getSessionId(): string {
  const storageKey = 'peeap_session_id';
  let sessionId = sessionStorage.getItem(storageKey);

  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem(storageKey, sessionId);
  }

  return sessionId;
}

// Detect device type
function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

// Detect browser
function getBrowser(): string {
  const ua = navigator.userAgent;

  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Opera') || ua.includes('OPR/')) return 'Opera';
  if (ua.includes('MSIE') || ua.includes('Trident/')) return 'Internet Explorer';

  return 'Unknown';
}

// Detect OS
function getOS(): string {
  const ua = navigator.userAgent;

  if (ua.includes('Windows NT 10')) return 'Windows 10';
  if (ua.includes('Windows NT 6.3')) return 'Windows 8.1';
  if (ua.includes('Windows NT 6.2')) return 'Windows 8';
  if (ua.includes('Windows NT 6.1')) return 'Windows 7';
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS X')) return 'macOS';
  if (ua.includes('Linux') && ua.includes('Android')) return 'Android';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';

  return 'Unknown';
}

class AnalyticsTrackingService {
  private sessionId: string;
  private pageStartTime: number = 0;
  private currentPath: string = '';
  private pageViewsSent: Set<string> = new Set();
  private isTracking: boolean = false;

  constructor() {
    this.sessionId = getSessionId();
  }

  /**
   * Initialize tracking - call once when app loads
   */
  init(userId?: string) {
    if (this.isTracking) return;
    this.isTracking = true;

    // Track initial page view
    this.trackPageView(window.location.pathname, document.title, userId);

    // Track page duration on unload
    window.addEventListener('beforeunload', () => {
      this.sendDuration();
    });

    // Track visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.sendDuration();
      }
    });
  }

  /**
   * Track a page view
   */
  async trackPageView(path: string, title?: string, userId?: string) {
    // Avoid duplicate tracking for same path in same session
    const trackKey = `${this.sessionId}_${path}`;
    if (this.pageViewsSent.has(trackKey)) {
      // Just update the start time for duration tracking
      this.pageStartTime = Date.now();
      this.currentPath = path;
      return;
    }

    this.pageViewsSent.add(trackKey);
    this.pageStartTime = Date.now();
    this.currentPath = path;

    const data: PageViewData = {
      sessionId: this.sessionId,
      userId,
      pagePath: path,
      pageTitle: title || document.title,
      referrer: document.referrer || undefined,
      userAgent: navigator.userAgent,
      deviceType: getDeviceType(),
      browser: getBrowser(),
      os: getOS(),
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      isBounce: true, // Will be updated to false if user navigates
    };

    try {
      await fetch(`${API_URL}/analytics/pageview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true, // Ensures request completes even on page unload
      });
    } catch (error) {
      console.error('[Analytics] Failed to track page view:', error);
    }
  }

  /**
   * Update bounce status when user navigates
   */
  markNotBounce() {
    // Could implement an update endpoint to mark session as not bounce
    // For now, subsequent page views in same session indicate not a bounce
  }

  /**
   * Send page duration
   */
  private async sendDuration() {
    if (!this.currentPath || !this.pageStartTime) return;

    const duration = Math.round((Date.now() - this.pageStartTime) / 1000);

    if (duration > 0 && duration < 3600) { // Ignore durations > 1 hour (likely idle)
      try {
        await fetch(`${API_URL}/analytics/pageview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: this.sessionId,
            pagePath: this.currentPath,
            durationSeconds: duration,
            isBounce: false,
          }),
          keepalive: true,
        });
      } catch (error) {
        // Ignore errors on unload
      }
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

export const analyticsTracking = new AnalyticsTrackingService();
export default analyticsTracking;
