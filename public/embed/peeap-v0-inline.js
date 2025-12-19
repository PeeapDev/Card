/**
 * PEEAP V0 INLINE SDK v2.1.0
 *
 * FOR V0.DEV AND OTHER SANDBOXED ENVIRONMENTS
 *
 * This version works entirely without API calls - just direct redirects.
 * Copy this ENTIRE script inline into your v0 project.
 *
 * ============================================================================
 * ⚠️  IMPORTANT: CREATE A SUCCESS PAGE FIRST!
 * ============================================================================
 * Before integrating payments, you MUST create a "Thank You" / Success page.
 * Set the redirectUrl option to point to your success page.
 *
 * Your success page will receive these URL parameters:
 *   ?peeap_status=success&peeap_ref=order_123&session_id=cs_xxx
 *
 * Example:
 *   PeeapV0.payDirect({
 *     publicKey: 'pk_live_xxx',
 *     amount: 50,
 *     currency: 'SLE',
 *     description: 'Order #123',
 *     reference: 'order_123',
 *     redirectUrl: 'https://yoursite.com/payment-success'  // <-- YOUR SUCCESS PAGE
 *   });
 * ============================================================================
 *
 * TECHNICAL NOTE: Uses window.open() instead of window.location.href
 * v0.dev runs previews in sandboxed iframes that block top-level navigation.
 * window.location.href will show "This content is blocked" error.
 * window.open() opens in a new tab, bypassing the sandbox restriction.
 *
 * USAGE IN V0.DEV:
 * ================
 * 1. First, create a success page at /payment-success (or similar)
 * 2. Copy this entire script into a <script> tag in your component
 * 3. Set redirectUrl to your success page URL
 *
 * TWO MODES:
 * ==========
 * Mode 1: Direct Link (No API - works in v0.dev)
 *   PeeapV0.payDirect({
 *     publicKey: 'pk_live_xxx',
 *     amount: 50,
 *     currency: 'SLE',
 *     description: 'Order #123',
 *     redirectUrl: '/payment-success'
 *   });
 *
 * Mode 2: Pre-generated Session (from your backend)
 *   PeeapV0.openCheckout('cs_xxxxx');
 */

(function(window) {
  'use strict';

  var VERSION = '2.1.0';
  var CHECKOUT_URL = 'https://checkout.peeap.com';
  var API_URL = 'https://api.peeap.com';

  var config = {
    publicKey: null,
    currency: 'SLE',
    redirectUrl: null,
    merchantName: null
  };

  var callbacks = {
    onSuccess: function(data) { console.log('[PeeapV0] Payment success:', data); },
    onError: function(error) { console.error('[PeeapV0] Payment error:', error); },
    onCancel: function() { console.log('[PeeapV0] Payment cancelled'); }
  };

  var initialized = false;

  function generateReference() {
    return 'ref_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
  }

  function checkForPaymentCallback() {
    try {
      var params = new URLSearchParams(window.location.search);
      var reference = params.get('peeap_ref') || params.get('reference');
      var status = params.get('peeap_status') || params.get('status');
      var sessionId = params.get('session_id');

      if ((reference || sessionId) && status) {
        if (status === 'success' || status === 'completed') {
          callbacks.onSuccess({ reference: reference, sessionId: sessionId, status: 'completed' });
        } else if (status === 'cancelled' || status === 'canceled') {
          callbacks.onCancel();
        } else if (status === 'failed' || status === 'error') {
          callbacks.onError({ message: params.get('error') || 'Payment failed', code: 'PAYMENT_FAILED' });
        }

        // Clean URL
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        return true;
      }
    } catch (e) {
      console.warn('[PeeapV0] Error checking callback:', e);
    }
    return false;
  }

  var PeeapV0 = {
    version: VERSION,

    /**
     * Initialize the SDK
     */
    init: function(options) {
      if (!options || !options.publicKey) {
        console.error('[PeeapV0] init() requires publicKey');
        return this;
      }

      config.publicKey = options.publicKey;
      config.currency = options.currency || 'SLE';
      config.redirectUrl = options.redirectUrl || null;
      config.merchantName = options.merchantName || null;

      if (typeof options.onSuccess === 'function') callbacks.onSuccess = options.onSuccess;
      if (typeof options.onError === 'function') callbacks.onError = options.onError;
      if (typeof options.onCancel === 'function') callbacks.onCancel = options.onCancel;

      initialized = true;
      console.log('[PeeapV0] v' + VERSION + ' initialized (inline mode)');

      checkForPaymentCallback();
      return this;
    },

    /**
     * DIRECT PAY - Works in v0.dev without API calls
     * Creates checkout session and redirects in one step via server-side redirect
     */
    payDirect: function(options) {
      if (!initialized && !options.publicKey) {
        callbacks.onError({ message: 'SDK not initialized and no publicKey provided', code: 'NOT_INITIALIZED' });
        return;
      }

      var publicKey = options.publicKey || config.publicKey;
      var amount = options.amount;
      var currency = options.currency || config.currency || 'SLE';
      var description = options.description || 'Payment';
      var reference = options.reference || generateReference();
      var redirectUrl = options.redirectUrl || config.redirectUrl || window.location.href.split('?')[0];

      if (!amount || amount <= 0) {
        callbacks.onError({ message: 'Valid amount is required', code: 'INVALID_AMOUNT' });
        return;
      }

      // Build direct checkout URL with all parameters
      // The checkout page will create the session server-side
      var checkoutUrl = CHECKOUT_URL + '/checkout/quick?' +
        'pk=' + encodeURIComponent(publicKey) +
        '&amount=' + encodeURIComponent(Math.round(amount)) +
        '&currency=' + encodeURIComponent(currency) +
        '&description=' + encodeURIComponent(description) +
        '&reference=' + encodeURIComponent(reference) +
        '&redirect_url=' + encodeURIComponent(redirectUrl + (redirectUrl.indexOf('?') === -1 ? '?' : '&') + 'peeap_ref=' + reference);

      if (options.customerEmail) {
        checkoutUrl += '&email=' + encodeURIComponent(options.customerEmail);
      }
      if (options.customerPhone) {
        checkoutUrl += '&phone=' + encodeURIComponent(options.customerPhone);
      }

      // IMPORTANT: Use window.open() instead of window.location.href
      // v0.dev runs previews in sandboxed iframes that block top-level navigation
      // window.location.href will show "This content is blocked" error
      console.log('[PeeapV0] Opening quick checkout in new tab:', checkoutUrl);
      window.open(checkoutUrl, '_blank');
    },

    /**
     * Open checkout with pre-generated session ID
     * Use when you have a session ID from your backend
     */
    openCheckout: function(sessionId) {
      if (!sessionId) {
        callbacks.onError({ message: 'Session ID is required', code: 'INVALID_SESSION' });
        return;
      }

      var checkoutUrl = CHECKOUT_URL + '/checkout/pay/' + sessionId;
      // Use window.open() for v0.dev sandbox compatibility
      console.log('[PeeapV0] Opening checkout in new tab:', checkoutUrl);
      window.open(checkoutUrl, '_blank');
    },

    /**
     * Generate a payment link URL (no redirect)
     */
    getPaymentLink: function(options) {
      var publicKey = options.publicKey || config.publicKey;
      var amount = options.amount;
      var currency = options.currency || config.currency || 'SLE';
      var description = options.description || 'Payment';
      var reference = options.reference || generateReference();

      return CHECKOUT_URL + '/checkout/quick?' +
        'pk=' + encodeURIComponent(publicKey) +
        '&amount=' + encodeURIComponent(Math.round(amount)) +
        '&currency=' + encodeURIComponent(currency) +
        '&description=' + encodeURIComponent(description) +
        '&reference=' + encodeURIComponent(reference);
    },

    /**
     * Standard pay method - tries API first, falls back to direct
     */
    pay: function(options) {
      var self = this;

      // In restricted environments, use direct method
      if (this.isRestricted()) {
        console.log('[PeeapV0] Restricted environment detected, using direct checkout');
        return this.payDirect(options);
      }

      // Try API method
      var publicKey = options.publicKey || config.publicKey;
      var amount = Math.round(options.amount);
      var currency = options.currency || config.currency;
      var reference = options.reference || generateReference();
      var redirectUrl = options.redirectUrl || config.redirectUrl || window.location.href.split('?')[0];

      return fetch(API_URL + '/api/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: publicKey,
          amount: amount,
          currency: currency,
          reference: reference,
          description: options.description || '',
          redirectUrl: redirectUrl + (redirectUrl.indexOf('?') === -1 ? '?' : '&') + 'peeap_ref=' + reference
        })
      })
      .then(function(response) { return response.json(); })
      .then(function(data) {
        if (data.paymentUrl) {
          // Use window.open() for consistency and sandbox compatibility
          window.open(data.paymentUrl, '_blank');
          return { sessionId: data.sessionId, paymentUrl: data.paymentUrl };
        }
        throw new Error(data.error || 'Failed to create session');
      })
      .catch(function(err) {
        console.warn('[PeeapV0] API failed, falling back to direct:', err.message);
        self.payDirect(options);
      });
    },

    isRestricted: function() {
      try {
        if (window.self !== window.top) return true;
        var hostname = window.location.hostname;
        if (hostname.includes('v0.dev')) return true;
        if (hostname.includes('vercel.app') && hostname.includes('-')) return true;
        if (hostname.includes('stackblitz')) return true;
        if (hostname.includes('codesandbox')) return true;
        return false;
      } catch (e) {
        return true;
      }
    },

    formatAmount: function(amount, currency) {
      var symbols = { SLE: 'Le', USD: '$', EUR: '€', GBP: '£', NGN: '₦', GHS: '₵' };
      var curr = currency || config.currency || 'SLE';
      return (symbols[curr] || curr) + ' ' + amount.toLocaleString('en-US', { minimumFractionDigits: 2 });
    },

    isInitialized: function() { return initialized; },
    getInfo: function() {
      return { version: VERSION, type: 'v0-inline', initialized: initialized, restricted: this.isRestricted() };
    }
  };

  window.PeeapV0 = PeeapV0;
  if (!window.Peeap) window.Peeap = PeeapV0;

  console.log('[PeeapV0] v' + VERSION + ' loaded (inline mode for sandboxed environments)');

})(typeof window !== 'undefined' ? window : this);
