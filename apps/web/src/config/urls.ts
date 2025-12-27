/**
 * URL Configuration
 *
 * Centralized configuration for all API and app URLs.
 * Uses environment variables with fallback defaults for development.
 */

// Core API URLs
export const API_URL = import.meta.env.VITE_API_URL || 'https://api.peeap.com';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || API_URL;

// Supabase
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// App URLs
export const APP_URL = import.meta.env.VITE_APP_URL || 'https://my.peeap.com';
export const CHECKOUT_URL = import.meta.env.VITE_CHECKOUT_URL || 'https://checkout.peeap.com';
export const MERCHANT_URL = import.meta.env.VITE_MERCHANT_URL || 'https://merchant.peeap.com';
export const PAY_URL = import.meta.env.VITE_PAY_URL || 'https://pay.peeap.com';

// Monime Payment Gateway
export const MONIME_PAYMENT_URL = import.meta.env.VITE_MONIME_PAYMENT_URL || 'https://pay.monime.io';
export const MONIME_API_URL = import.meta.env.VITE_MONIME_API_URL || 'https://api.monime.io';

// Upgrade URL (for subscription upgrades)
export const UPGRADE_URL = import.meta.env.VITE_UPGRADE_URL || 'https://plus.peeap.com/upgrade';

// Analytics API (for tracking)
export const ANALYTICS_API_URL = import.meta.env.VITE_ANALYTICS_API_URL || API_URL;

// App Store URLs
export const APP_STORE_URL = import.meta.env.VITE_APP_STORE_URL || 'https://apps.apple.com/app/peeap/id123456789';
export const PLAY_STORE_URL = import.meta.env.VITE_PLAY_STORE_URL || 'https://play.google.com/store/apps/details?id=com.peeap.app';

// Helper to get the current environment
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

// Helper to build API endpoints
export function getApiEndpoint(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  // Ensure path starts with /api for the API server
  const apiPath = cleanPath.startsWith('/api') ? cleanPath : `/api${cleanPath}`;
  return `${API_URL}${apiPath}`;
}

// Helper to build checkout URLs
export function getCheckoutUrl(sessionId: string): string {
  return `${CHECKOUT_URL}/pay/${sessionId}`;
}

// Helper to build payment URLs
export function getPaymentUrl(token: string): string {
  return `${PAY_URL}/t/${token}`;
}

// Helper to build app deep links
export function getAppPaymentLink(token: string): string {
  return `${PAY_URL}/app/pay?token=${token}`;
}
