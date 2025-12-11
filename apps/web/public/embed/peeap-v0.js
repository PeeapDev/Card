/**
 * PEEAP V0 INTEGRATION SCRIPT v1.0.0
 *
 * Specifically designed for v0.dev, Vercel previews, and other
 * restricted/sandboxed environments with strict CSP policies.
 *
 * This script uses ONLY redirect-based payment flow:
 * - No iframes
 * - No popups
 * - No external script dependencies
 * - Works in any sandboxed environment
 *
 * Usage:
 *   // Option 1: Inline script (copy this entire file into your code)
 *
 *   // Option 2: External script
 *   <script src="https://checkout.peeap.com/embed/peeap-v0.js"></script>
 *
 *   // Initialize
 *   PeeapV0.init({
 *     publicKey: 'pk_live_xxxxx',
 *     onSuccess: function(data) { console.log('Paid!', data); },
 *     onError: function(err) { console.error('Error:', err); }
 *   });
 *
 *   // Create payment (redirects to hosted checkout)
 *   PeeapV0.pay({
 *     amount: 100,
 *     currency: 'SLE',
 *     description: 'Order #123',
 *     reference: 'order_123',
 *     redirectUrl: 'https://yoursite.com/payment-complete'
 *   });
 */

(function(window) {
  'use strict';

  var VERSION = '1.0.0';
  var API_URL = 'https://api.peeap.com';
  var CHECKOUT_URL = 'https://checkout.peeap.com';

  // Configuration
  var config = {
    publicKey: null,
    currency: 'SLE',
    redirectUrl: null
  };

  // Callbacks
  var callbacks = {
    onSuccess: function(data) { console.log('[PeeapV0] Payment success:', data); },
    onError: function(error) { console.error('[PeeapV0] Payment error:', error); },
    onCancel: function() { console.log('[PeeapV0] Payment cancelled'); }
  };

  var initialized = false;

  // Utility: Generate reference
  function generateReference() {
    return 'ref_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
  }

  // Utility: Generate idempotency key
  function generateIdempotencyKey() {
    return 'idem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 12);
  }

  // Check if running in restricted environment
  function isRestrictedEnvironment() {
    try {
      // Check if in iframe
      if (window.self !== window.top) return true;

      // Check for v0.dev or vercel preview domains
      var hostname = window.location.hostname;
      if (hostname.includes('v0.dev')) return true;
      if (hostname.includes('vercel.app') && hostname.includes('-')) return true;
      if (hostname.includes('vscode.dev')) return true;
      if (hostname.includes('stackblitz')) return true;
      if (hostname.includes('codesandbox')) return true;

      return false;
    } catch (e) {
      return true; // If we can't check, assume restricted
    }
  }

  // Store payment state in sessionStorage for redirect flow
  function storePaymentState(reference, data) {
    try {
      sessionStorage.setItem('peeap_payment_' + reference, JSON.stringify({
        ...data,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('[PeeapV0] Could not store payment state:', e);
    }
  }

  // Retrieve payment state after redirect
  function getPaymentState(reference) {
    try {
      var data = sessionStorage.getItem('peeap_payment_' + reference);
      if (data) {
        sessionStorage.removeItem('peeap_payment_' + reference);
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('[PeeapV0] Could not retrieve payment state:', e);
    }
    return null;
  }

  // Check URL for payment callback parameters
  function checkForPaymentCallback() {
    try {
      var params = new URLSearchParams(window.location.search);
      var reference = params.get('peeap_ref') || params.get('reference') || params.get('ref');
      var status = params.get('peeap_status') || params.get('status');

      if (reference && status) {
        var paymentState = getPaymentState(reference);

        if (status === 'success' || status === 'completed') {
          callbacks.onSuccess({
            reference: reference,
            status: 'completed',
            ...paymentState
          });
        } else if (status === 'cancelled' || status === 'canceled') {
          callbacks.onCancel();
        } else if (status === 'failed' || status === 'error') {
          callbacks.onError({
            message: params.get('error') || 'Payment failed',
            code: 'PAYMENT_FAILED',
            reference: reference
          });
        }

        // Clean URL without reloading
        if (window.history && window.history.replaceState) {
          var cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }

        return true;
      }
    } catch (e) {
      console.warn('[PeeapV0] Error checking for callback:', e);
    }
    return false;
  }

  // The V0-specific SDK object
  var PeeapV0 = {
    version: VERSION,

    /**
     * Initialize the SDK
     * @param {Object} options
     * @param {string} options.publicKey - Required. Your public key (pk_live_xxx or pk_test_xxx)
     * @param {string} [options.currency='SLE'] - Default currency
     * @param {string} [options.redirectUrl] - Default redirect URL after payment
     * @param {Function} [options.onSuccess] - Called on successful payment
     * @param {Function} [options.onError] - Called on payment error
     * @param {Function} [options.onCancel] - Called when user cancels
     */
    init: function(options) {
      if (!options) {
        console.error('[PeeapV0] init() requires options object');
        return this;
      }

      if (!options.publicKey) {
        console.error('[PeeapV0] init() requires publicKey');
        return this;
      }

      // Validate key format
      if (!options.publicKey.startsWith('pk_live_') && !options.publicKey.startsWith('pk_test_')) {
        console.error('[PeeapV0] Invalid publicKey format. Must start with pk_live_ or pk_test_');
        return this;
      }

      config.publicKey = options.publicKey;
      config.currency = options.currency || 'SLE';
      config.redirectUrl = options.redirectUrl || null;

      if (typeof options.onSuccess === 'function') {
        callbacks.onSuccess = options.onSuccess;
      }
      if (typeof options.onError === 'function') {
        callbacks.onError = options.onError;
      }
      if (typeof options.onCancel === 'function') {
        callbacks.onCancel = options.onCancel;
      }

      initialized = true;

      // Log environment info
      var envInfo = isRestrictedEnvironment() ? '(restricted environment detected)' : '';
      console.log('[PeeapV0] v' + VERSION + ' initialized ' + envInfo);

      // Check for payment callback on page load
      checkForPaymentCallback();

      return this;
    },

    /**
     * Create a payment and redirect to hosted checkout
     * @param {Object} options
     * @param {number} options.amount - Required. Amount to charge
     * @param {string} [options.currency] - Currency code (default: SLE)
     * @param {string} [options.description] - Payment description
     * @param {string} [options.reference] - Your order reference
     * @param {string} [options.redirectUrl] - URL to redirect after payment
     * @param {Object} [options.customer] - Customer info { email, phone, name }
     * @param {Object} [options.metadata] - Custom metadata
     */
    pay: function(options) {
      var self = this;

      if (!initialized) {
        var error = { message: 'SDK not initialized. Call PeeapV0.init() first.', code: 'NOT_INITIALIZED' };
        callbacks.onError(error);
        return Promise.reject(error);
      }

      if (!options || !options.amount) {
        var error = { message: 'Amount is required', code: 'INVALID_AMOUNT' };
        callbacks.onError(error);
        return Promise.reject(error);
      }

      if (typeof options.amount !== 'number' || options.amount <= 0) {
        var error = { message: 'Amount must be a positive number', code: 'INVALID_AMOUNT' };
        callbacks.onError(error);
        return Promise.reject(error);
      }

      var reference = options.reference || generateReference();
      var idempotencyKey = generateIdempotencyKey();
      var currency = options.currency || config.currency;
      var amount = Math.round(options.amount);

      // Build redirect URL with callback parameters
      var redirectUrl = options.redirectUrl || config.redirectUrl || window.location.href.split('?')[0];

      // Append peeap parameters to redirect URL
      var redirectUrlWithParams = redirectUrl;
      if (redirectUrl.indexOf('?') === -1) {
        redirectUrlWithParams += '?peeap_ref=' + encodeURIComponent(reference);
      } else {
        redirectUrlWithParams += '&peeap_ref=' + encodeURIComponent(reference);
      }

      console.log('[PeeapV0] Creating payment:', {
        amount: amount,
        currency: currency,
        reference: reference
      });

      // Store payment state for redirect flow
      storePaymentState(reference, {
        amount: amount,
        currency: currency,
        description: options.description,
        reference: reference
      });

      // Make API call to create checkout session
      return fetch(API_URL + '/api/checkout/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          publicKey: config.publicKey,
          amount: amount,
          currency: currency,
          reference: reference,
          idempotencyKey: idempotencyKey,
          description: options.description || '',
          customerEmail: options.customer ? options.customer.email : null,
          customerPhone: options.customer ? options.customer.phone : null,
          customerName: options.customer ? options.customer.name : null,
          paymentMethod: options.paymentMethod || 'mobile_money',
          redirectUrl: redirectUrlWithParams,
          metadata: options.metadata || null
        })
      })
      .then(function(response) {
        return response.json().then(function(data) {
          return { ok: response.ok, status: response.status, data: data };
        });
      })
      .then(function(result) {
        if (!result.ok) {
          var error = {
            message: result.data.error || 'Failed to create checkout session',
            code: 'API_ERROR',
            status: result.status,
            details: result.data
          };
          callbacks.onError(error);
          throw error;
        }

        var data = result.data;
        console.log('[PeeapV0] Checkout session created:', data.sessionId);

        // Redirect to hosted checkout
        if (data.paymentUrl) {
          console.log('[PeeapV0] Redirecting to:', data.paymentUrl);
          window.location.href = data.paymentUrl;

          return {
            reference: reference,
            sessionId: data.sessionId,
            paymentUrl: data.paymentUrl,
            status: 'redirecting'
          };
        } else {
          var error = { message: 'No payment URL returned', code: 'NO_PAYMENT_URL' };
          callbacks.onError(error);
          throw error;
        }
      })
      .catch(function(err) {
        if (err.code) {
          throw err; // Already formatted error
        }
        var error = {
          message: err.message || 'Network error. Please check your connection.',
          code: 'NETWORK_ERROR'
        };
        callbacks.onError(error);
        throw error;
      });
    },

    /**
     * Alias for pay()
     */
    createPayment: function(options) {
      return this.pay(options);
    },

    /**
     * Generate a payment link (URL) without redirecting
     * Useful for creating payment buttons or sharing links
     * @param {Object} options - Same as pay()
     * @returns {Promise<string>} Payment URL
     */
    createPaymentLink: function(options) {
      var self = this;

      if (!initialized) {
        return Promise.reject({ message: 'SDK not initialized', code: 'NOT_INITIALIZED' });
      }

      if (!options || !options.amount) {
        return Promise.reject({ message: 'Amount is required', code: 'INVALID_AMOUNT' });
      }

      var reference = options.reference || generateReference();
      var idempotencyKey = generateIdempotencyKey();
      var currency = options.currency || config.currency;
      var amount = Math.round(options.amount);

      return fetch(API_URL + '/api/checkout/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          publicKey: config.publicKey,
          amount: amount,
          currency: currency,
          reference: reference,
          idempotencyKey: idempotencyKey,
          description: options.description || '',
          customerEmail: options.customer ? options.customer.email : null,
          customerPhone: options.customer ? options.customer.phone : null,
          paymentMethod: options.paymentMethod || 'mobile_money',
          redirectUrl: options.redirectUrl || null,
          metadata: options.metadata || null
        })
      })
      .then(function(response) {
        return response.json();
      })
      .then(function(data) {
        if (data.paymentUrl) {
          return {
            paymentUrl: data.paymentUrl,
            sessionId: data.sessionId,
            reference: reference,
            expiresAt: data.expiresAt
          };
        }
        throw { message: 'Failed to create payment link', code: 'API_ERROR' };
      });
    },

    /**
     * Format an amount with currency symbol
     * @param {number} amount
     * @param {string} [currency]
     * @returns {string}
     */
    formatAmount: function(amount, currency) {
      var symbols = {
        SLE: 'Le', USD: '$', EUR: '\u20AC', GBP: '\u00A3',
        NGN: '\u20A6', GHS: '\u20B5', KES: 'KSh', ZAR: 'R'
      };
      var curr = currency || config.currency || 'SLE';
      var symbol = symbols[curr] || curr;
      return symbol + ' ' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    /**
     * Check if SDK is initialized
     * @returns {boolean}
     */
    isInitialized: function() {
      return initialized;
    },

    /**
     * Check if running in a restricted environment
     * @returns {boolean}
     */
    isRestricted: function() {
      return isRestrictedEnvironment();
    },

    /**
     * Get SDK info
     * @returns {Object}
     */
    getInfo: function() {
      return {
        version: VERSION,
        type: 'v0-compatible',
        initialized: initialized,
        restricted: isRestrictedEnvironment(),
        publicKey: config.publicKey ? config.publicKey.substring(0, 12) + '...' : null
      };
    }
  };

  // Export to global scope
  window.PeeapV0 = PeeapV0;

  // Also provide as Peeap for convenience (if main SDK not loaded)
  if (!window.PeeapSDK) {
    window.PeeapSDK = PeeapV0;
    window.Peeap = PeeapV0;
  }

  console.log('[PeeapV0] v' + VERSION + ' loaded (redirect-only mode for restricted environments)');

})(typeof window !== 'undefined' ? window : this);
