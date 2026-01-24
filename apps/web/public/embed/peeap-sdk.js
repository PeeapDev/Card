/**
 * PEEAP PAYMENT SDK v2.3.0
 *
 * Simple, reliable payment integration for any website.
 * Redirects to hosted checkout at checkout.peeap.com
 *
 * Supports:
 * - Mobile Money payments (via Monime) - LIVE mode only
 * - Card payments (Peeap closed-loop cards with PIN)
 * - QR Code payments (Peeap app scan)
 *
 * SECURITY:
 * - Uses public key (pk_xxx) for frontend - safe to expose
 * - Secret key (sk_xxx) stays server-side only
 * - Auto-generates idempotency key to prevent duplicate payments
 *
 * ENDPOINTS:
 * - API: https://api.peeap.com
 * - Checkout: https://checkout.peeap.com
 *
 * Usage:
 *   <script src="https://checkout.peeap.com/embed/peeap-sdk.js"></script>
 *   <script>
 *     PeeapSDK.init({
 *       publicKey: 'pk_live_xxxxx',
 *       onSuccess: function(payment) { console.log('Paid!', payment); },
 *       onError: function(error) { console.error('Error:', error); }
 *     });
 *
 *     // Create payment and redirect to hosted checkout:
 *     PeeapSDK.createPayment({ amount: 100, currency: 'SLE' }); // Le 100
 *   </script>
 */

(function(window) {
  'use strict';

  // SDK State
  var config = {
    publicKey: null,
    businessId: null, // Deprecated - for backwards compatibility
    mode: 'live',
    currency: 'SLE',
    theme: 'light',
    apiUrl: 'https://api.peeap.com',      // API endpoint
    checkoutUrl: 'https://checkout.peeap.com', // Hosted checkout
    baseUrl: 'https://api.peeap.com'      // Legacy - same as apiUrl
  };

  // Stored callbacks
  var callbacks = {
    onSuccess: function(payment) { console.log('[PeeapSDK] Payment success:', payment); },
    onError: function(error) { console.error('[PeeapSDK] Payment error:', error); },
    onCancel: function() { console.log('[PeeapSDK] Payment cancelled'); },
    onClose: function() { console.log('[PeeapSDK] Closed'); }
  };

  var initialized = false;

  // Utility: Generate reference ID
  function generateReference() {
    return 'ref_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
  }

  // Utility: Generate idempotency key to prevent duplicate payments
  function generateIdempotencyKey() {
    return 'idem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 12);
  }

  // The SDK Object
  var PeeapSDK = {
    version: '2.3.0',

    /**
     * Initialize the SDK
     * @param {Object} options
     * @param {string} options.publicKey - Required. Your public key (pk_live_xxx or pk_test_xxx)
     * @param {string} [options.businessId] - Deprecated. Use publicKey instead
     * @param {string} [options.mode='live'] - 'live' or 'test'
     * @param {string} [options.currency='SLE'] - Default currency
     * @param {string} [options.theme='light'] - 'light' or 'dark'
     * @param {Function} [options.onSuccess] - Called on successful payment
     * @param {Function} [options.onError] - Called on payment error
     * @param {Function} [options.onCancel] - Called when user cancels
     * @param {Function} [options.onClose] - Called when modal closes
     */
    init: function(options) {
      if (!options) {
        console.error('[PeeapSDK] init() requires options object');
        return this;
      }

      // Support both publicKey and legacy businessId
      var key = options.publicKey || options.businessId;
      if (!key) {
        console.error('[PeeapSDK] init() requires publicKey');
        return this;
      }

      // Store config
      config.publicKey = key;
      config.businessId = key; // Backwards compatibility
      config.mode = options.mode || 'live';
      config.currency = options.currency || 'SLE';
      config.theme = options.theme || 'light';

      // Allow custom URLs for development/testing
      if (options.apiUrl) {
        config.apiUrl = options.apiUrl;
        config.baseUrl = options.apiUrl;
      }
      if (options.checkoutUrl) {
        config.checkoutUrl = options.checkoutUrl;
      }
      if (options.baseUrl) {
        config.baseUrl = options.baseUrl;
        config.apiUrl = options.baseUrl;
      }

      // Store callbacks
      if (typeof options.onSuccess === 'function') {
        callbacks.onSuccess = options.onSuccess;
      }
      if (typeof options.onError === 'function') {
        callbacks.onError = options.onError;
      }
      if (typeof options.onCancel === 'function') {
        callbacks.onCancel = options.onCancel;
      }
      if (typeof options.onClose === 'function') {
        callbacks.onClose = options.onClose;
      }

      initialized = true;
      console.log('[PeeapSDK] Initialized with key:', key.substring(0, 10) + '...');

      return this;
    },

    /**
     * Create a payment - calls API directly and redirects to Monime
     * @param {Object} options
     * @param {number} options.amount - Required. Amount to charge (in whole units, e.g. 100 = Le 100.00)
     * @param {string} [options.currency] - Currency code
     * @param {string} [options.reference] - Your order reference
     * @param {string} [options.description] - Payment description
     * @param {Object} [options.customer] - Customer info (email, phone, name)
     * @param {Object} [options.metadata] - Custom metadata
     * @param {string} [options.redirectUrl] - URL to redirect after payment
     * @param {string} [options.paymentMethod] - 'mobile_money', 'card', 'bank_transfer'
     * @returns {Promise}
     */
    createPayment: function(options) {
      var self = this;

      return new Promise(function(resolve, reject) {
        // Validation
        if (!initialized) {
          var error = { message: 'SDK not initialized. Call PeeapSDK.init() first.', code: 'NOT_INITIALIZED' };
          callbacks.onError(error);
          reject(error);
          return;
        }

        if (!options || !options.amount) {
          var error = { message: 'Amount is required', code: 'INVALID_AMOUNT' };
          callbacks.onError(error);
          reject(error);
          return;
        }

        if (typeof options.amount !== 'number' || options.amount <= 0) {
          var error = { message: 'Amount must be a positive number', code: 'INVALID_AMOUNT' };
          callbacks.onError(error);
          reject(error);
          return;
        }

        // Build payment data
        var reference = options.reference || generateReference();
        var idempotencyKey = generateIdempotencyKey();
        var currency = options.currency || config.currency;

        // SLE is a whole number currency - no conversion needed
        var amount = Math.round(options.amount);

        console.log('[PeeapSDK] Creating payment:', {
          amount: amount,
          currency: currency,
          reference: reference,
          idempotencyKey: idempotencyKey
        });

        // Call API to create checkout session
        fetch(config.apiUrl + '/api/checkout/create', {
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
          return response.json().then(function(data) {
            return { ok: response.ok, data: data };
          });
        })
        .then(function(result) {
          if (!result.ok) {
            var error = {
              message: result.data.error || 'Failed to create checkout',
              code: 'API_ERROR',
              details: result.data
            };
            callbacks.onError(error);
            reject(error);
            return;
          }

          var data = result.data;

          console.log('[PeeapSDK] Checkout created:', data);

          // If we got a payment URL, redirect to hosted checkout
          if (data.paymentUrl) {
            console.log('[PeeapSDK] Redirecting to hosted checkout:', data.paymentUrl);

            // Resolve before redirect
            resolve({
              reference: reference,
              paymentId: data.paymentId,
              sessionId: data.sessionId,
              paymentUrl: data.paymentUrl,
              status: 'pending'
            });

            // Redirect to Peeap hosted checkout page
            window.location.href = data.paymentUrl;
          } else {
            var error = {
              message: 'No payment URL returned',
              code: 'NO_PAYMENT_URL'
            };
            callbacks.onError(error);
            reject(error);
          }
        })
        .catch(function(err) {
          var error = {
            message: err.message || 'Network error',
            code: 'NETWORK_ERROR'
          };
          callbacks.onError(error);
          reject(error);
        });
      });
    },

    /**
     * Alias for createPayment
     */
    checkout: function(options) {
      return this.createPayment(options);
    },

    /**
     * Create a payment button
     * @param {Object} options - Same as createPayment plus text, style, size
     * @returns {HTMLElement}
     */
    createButton: function(options) {
      var self = this;
      var button = document.createElement('button');

      var styles = {
        primary: 'background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);color:#fff;border:none;',
        secondary: 'background:#fff;color:#6366f1;border:2px solid #6366f1;',
        minimal: 'background:transparent;color:#6366f1;border:none;text-decoration:underline;'
      };

      var sizes = {
        small: 'padding:8px 16px;font-size:14px;',
        medium: 'padding:12px 24px;font-size:16px;',
        large: 'padding:16px 32px;font-size:18px;'
      };

      var baseStyle =
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
        'font-weight:600;border-radius:8px;cursor:pointer;' +
        'display:inline-flex;align-items:center;gap:8px;' +
        'transition:all 0.2s ease;';

      button.style.cssText = baseStyle +
        (styles[options.style] || styles.primary) +
        (sizes[options.size] || sizes.medium);

      button.innerHTML =
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">' +
        '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>' +
        '</svg>' +
        (options.text || 'Pay with Peeap');

      button.onclick = function(e) {
        e.preventDefault();
        self.createPayment(options);
      };

      return button;
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
     * Get current config (excludes sensitive data)
     * @returns {Object}
     */
    getConfig: function() {
      return {
        publicKey: config.publicKey,
        mode: config.mode,
        currency: config.currency,
        theme: config.theme
      };
    },

    /**
     * Validate a Peeap card before requesting PIN
     * Use this to check if card details are correct before showing PIN input
     *
     * @param {Object} options
     * @param {string} options.cardNumber - The 12-digit Peeap card number
     * @param {string|number} options.expiryMonth - Card expiry month (1-12)
     * @param {string|number} options.expiryYear - Card expiry year (2-digit or 4-digit)
     * @returns {Promise<Object>} - { valid, cardLastFour, cardholderFirstName, hasPinSet }
     */
    validateCard: function(options) {
      var self = this;

      return new Promise(function(resolve, reject) {
        if (!initialized) {
          var error = { message: 'SDK not initialized. Call PeeapSDK.init() first.', code: 'NOT_INITIALIZED' };
          callbacks.onError(error);
          reject(error);
          return;
        }

        if (!options || !options.cardNumber) {
          var error = { message: 'Card number is required', code: 'CARD_NUMBER_REQUIRED' };
          callbacks.onError(error);
          reject(error);
          return;
        }

        if (!options.expiryMonth || !options.expiryYear) {
          var error = { message: 'Card expiry is required', code: 'EXPIRY_REQUIRED' };
          callbacks.onError(error);
          reject(error);
          return;
        }

        console.log('[PeeapSDK] Validating card:', options.cardNumber.substring(0, 4) + '****');

        fetch(config.apiUrl + '/checkout/card-validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            cardNumber: options.cardNumber,
            expiryMonth: options.expiryMonth,
            expiryYear: options.expiryYear
          })
        })
        .then(function(response) {
          return response.json().then(function(data) {
            return { ok: response.ok, data: data };
          });
        })
        .then(function(result) {
          if (!result.ok || !result.data.valid) {
            var error = {
              message: result.data.error || 'Card validation failed',
              code: result.data.code || 'VALIDATION_FAILED'
            };
            callbacks.onError(error);
            reject(error);
            return;
          }

          console.log('[PeeapSDK] Card validated:', result.data);
          resolve(result.data);
        })
        .catch(function(err) {
          var error = {
            message: err.message || 'Network error',
            code: 'NETWORK_ERROR'
          };
          callbacks.onError(error);
          reject(error);
        });
      });
    },

    /**
     * Process a card payment using Peeap card
     *
     * @param {Object} options
     * @param {number} options.amount - Amount in whole units (e.g., 100 = Le 100.00)
     * @param {string} options.cardNumber - The 12-digit Peeap card number
     * @param {string|number} options.expiryMonth - Card expiry month (1-12)
     * @param {string|number} options.expiryYear - Card expiry year (2-digit or 4-digit)
     * @param {string} options.pin - The 4-digit transaction PIN
     * @param {string} [options.currency] - Currency code (default: SLE)
     * @param {string} [options.reference] - Your order reference
     * @param {string} [options.description] - Payment description
     * @returns {Promise<Object>} - Payment result with paymentId, status, etc.
     */
    cardPayment: function(options) {
      var self = this;

      return new Promise(function(resolve, reject) {
        if (!initialized) {
          var error = { message: 'SDK not initialized. Call PeeapSDK.init() first.', code: 'NOT_INITIALIZED' };
          callbacks.onError(error);
          reject(error);
          return;
        }

        // Validation
        if (!options || !options.amount) {
          var error = { message: 'Amount is required', code: 'INVALID_AMOUNT' };
          callbacks.onError(error);
          reject(error);
          return;
        }

        if (typeof options.amount !== 'number' || options.amount <= 0) {
          var error = { message: 'Amount must be a positive number', code: 'INVALID_AMOUNT' };
          callbacks.onError(error);
          reject(error);
          return;
        }

        if (!options.cardNumber) {
          var error = { message: 'Card number is required', code: 'CARD_NUMBER_REQUIRED' };
          callbacks.onError(error);
          reject(error);
          return;
        }

        if (!options.expiryMonth || !options.expiryYear) {
          var error = { message: 'Card expiry is required', code: 'EXPIRY_REQUIRED' };
          callbacks.onError(error);
          reject(error);
          return;
        }

        if (!options.pin) {
          var error = { message: 'PIN is required', code: 'PIN_REQUIRED' };
          callbacks.onError(error);
          reject(error);
          return;
        }

        if (!/^\d{4}$/.test(options.pin)) {
          var error = { message: 'PIN must be 4 digits', code: 'INVALID_PIN_FORMAT' };
          callbacks.onError(error);
          reject(error);
          return;
        }

        var reference = options.reference || generateReference();
        var idempotencyKey = generateIdempotencyKey();
        var currency = options.currency || config.currency;
        // SLE is a whole number currency - no conversion needed
        var amount = Math.round(options.amount);

        console.log('[PeeapSDK] Processing card payment:', {
          amount: amount,
          currency: currency,
          reference: reference,
          cardNumber: options.cardNumber.substring(0, 4) + '****'
        });

        fetch(config.apiUrl + '/checkout/card-pay', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            publicKey: config.publicKey,
            cardNumber: options.cardNumber,
            expiryMonth: options.expiryMonth,
            expiryYear: options.expiryYear,
            pin: options.pin,
            amount: amount,
            currency: currency,
            reference: reference,
            idempotencyKey: idempotencyKey,
            description: options.description || '',
            redirectUrl: options.redirectUrl || null
          })
        })
        .then(function(response) {
          return response.json().then(function(data) {
            return { ok: response.ok, data: data };
          });
        })
        .then(function(result) {
          if (!result.ok || !result.data.success) {
            var error = {
              message: result.data.error || 'Payment failed',
              code: result.data.code || 'PAYMENT_FAILED',
              details: result.data
            };
            callbacks.onError(error);
            reject(error);
            return;
          }

          var payment = {
            reference: reference,
            paymentId: result.data.paymentId,
            transactionId: result.data.transactionId,
            amount: options.amount,
            amountFormatted: result.data.amountFormatted,
            currency: currency,
            status: result.data.status,
            cardLastFour: result.data.cardLastFour,
            completedAt: result.data.completedAt
          };

          console.log('[PeeapSDK] Card payment successful:', payment);
          callbacks.onSuccess(payment);
          resolve(payment);
        })
        .catch(function(err) {
          var error = {
            message: err.message || 'Network error',
            code: 'NETWORK_ERROR'
          };
          callbacks.onError(error);
          reject(error);
        });
      });
    }
  };

  // Export to global scope
  window.PeeapSDK = PeeapSDK;
  window.Peeap = PeeapSDK; // Alias

  console.log('[PeeapSDK] v' + PeeapSDK.version + ' loaded');

  // ============================================================
  // PEEAP CHECKOUT - Modal-based embedded checkout
  // ============================================================
  // Usage:
  //   PeeapCheckout.init({ publicKey: 'pk_xxx' });
  //   PeeapCheckout.open({
  //     amount: 50000,
  //     currency: 'SLE',
  //     onSuccess: function(result) { ... },
  //     onError: function(error) { ... }
  //   });
  // ============================================================

  var checkoutConfig = {
    publicKey: null,
    embedUrl: 'https://my.peeap.com',
    apiUrl: 'https://api.peeap.com'
  };

  var checkoutCallbacks = {
    onSuccess: function() {},
    onError: function() {},
    onClose: function() {}
  };

  var modalElement = null;
  var iframeElement = null;
  var currentSessionId = null;
  var checkoutInitialized = false;

  // Inject modal CSS
  function injectModalStyles() {
    if (document.getElementById('peeap-checkout-styles')) return;

    var css = document.createElement('style');
    css.id = 'peeap-checkout-styles';
    css.textContent = [
      '.peeap-modal-overlay {',
      '  position: fixed;',
      '  top: 0; left: 0; right: 0; bottom: 0;',
      '  background: rgba(0, 0, 0, 0.6);',
      '  z-index: 999999;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  opacity: 0;',
      '  transition: opacity 0.3s ease;',
      '}',
      '.peeap-modal-overlay.peeap-visible {',
      '  opacity: 1;',
      '}',
      '.peeap-modal-container {',
      '  width: 100%;',
      '  max-width: 420px;',
      '  max-height: 90vh;',
      '  margin: 16px;',
      '  background: #fff;',
      '  border-radius: 16px;',
      '  overflow: hidden;',
      '  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);',
      '  transform: scale(0.95) translateY(20px);',
      '  transition: transform 0.3s ease;',
      '}',
      '.peeap-modal-overlay.peeap-visible .peeap-modal-container {',
      '  transform: scale(1) translateY(0);',
      '}',
      '.peeap-iframe {',
      '  width: 100%;',
      '  height: 600px;',
      '  border: none;',
      '  display: block;',
      '}',
      '@media (max-width: 480px) {',
      '  .peeap-modal-container {',
      '    max-width: 100%;',
      '    max-height: 100%;',
      '    margin: 0;',
      '    border-radius: 0;',
      '  }',
      '  .peeap-iframe {',
      '    height: 100vh;',
      '  }',
      '}'
    ].join('\n');
    document.head.appendChild(css);
  }

  // Handle messages from iframe
  function handleCheckoutMessage(event) {
    // Validate origin
    if (!event.origin.includes('peeap.com') && !event.origin.includes('localhost')) {
      return;
    }

    var data = event.data;
    if (!data || !data.type || !data.type.startsWith('PEEAP_')) return;

    console.log('[PeeapCheckout] Received message:', data.type);

    switch (data.type) {
      case 'PEEAP_READY':
        console.log('[PeeapCheckout] Checkout ready');
        break;

      case 'PEEAP_HEIGHT':
        if (iframeElement && data.height) {
          iframeElement.style.height = Math.min(data.height, window.innerHeight * 0.9) + 'px';
        }
        break;

      case 'PEEAP_SUCCESS':
        console.log('[PeeapCheckout] Payment success:', data.result);
        checkoutCallbacks.onSuccess(data.result);
        PeeapCheckout.close();
        break;

      case 'PEEAP_ERROR':
        console.error('[PeeapCheckout] Payment error:', data.error);
        checkoutCallbacks.onError(data.error);
        break;

      case 'PEEAP_CLOSE':
        PeeapCheckout.close();
        break;
    }
  }

  // PeeapCheckout object
  var PeeapCheckout = {
    version: '1.0.0',

    /**
     * Initialize PeeapCheckout
     * @param {Object} options
     * @param {string} options.publicKey - Your public key (pk_xxx)
     * @param {string} [options.embedUrl] - Custom embed URL (for testing)
     * @param {string} [options.apiUrl] - Custom API URL (for testing)
     */
    init: function(options) {
      if (!options || !options.publicKey) {
        console.error('[PeeapCheckout] init() requires publicKey');
        return this;
      }

      checkoutConfig.publicKey = options.publicKey;

      if (options.embedUrl) {
        checkoutConfig.embedUrl = options.embedUrl;
      }
      if (options.apiUrl) {
        checkoutConfig.apiUrl = options.apiUrl;
      }

      // Inject styles
      injectModalStyles();

      // Listen for messages from iframe
      window.addEventListener('message', handleCheckoutMessage);

      checkoutInitialized = true;
      console.log('[PeeapCheckout] Initialized');

      return this;
    },

    /**
     * Open the checkout modal
     * @param {Object} options
     * @param {number} options.amount - Amount to charge
     * @param {string} [options.currency='SLE'] - Currency code
     * @param {string} [options.description] - Payment description
     * @param {string} [options.reference] - Your order reference
     * @param {Object} [options.customer] - Customer info (email, phone)
     * @param {Object} [options.metadata] - Custom metadata
     * @param {Function} [options.onSuccess] - Success callback
     * @param {Function} [options.onError] - Error callback
     * @param {Function} [options.onClose] - Close callback
     */
    open: function(options) {
      var self = this;

      if (!checkoutInitialized) {
        console.error('[PeeapCheckout] Not initialized. Call PeeapCheckout.init() first.');
        return;
      }

      if (!options || !options.amount) {
        console.error('[PeeapCheckout] Amount is required');
        return;
      }

      // Store callbacks
      if (typeof options.onSuccess === 'function') {
        checkoutCallbacks.onSuccess = options.onSuccess;
      }
      if (typeof options.onError === 'function') {
        checkoutCallbacks.onError = options.onError;
      }
      if (typeof options.onClose === 'function') {
        checkoutCallbacks.onClose = options.onClose;
      }

      // Create checkout session
      var reference = options.reference || generateReference();
      var idempotencyKey = generateIdempotencyKey();

      console.log('[PeeapCheckout] Creating session...');

      fetch(checkoutConfig.apiUrl + '/api/checkout/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          publicKey: checkoutConfig.publicKey,
          amount: Math.round(options.amount),
          currency: options.currency || 'SLE',
          description: options.description || '',
          reference: reference,
          idempotencyKey: idempotencyKey,
          customerEmail: options.customer ? options.customer.email : null,
          customerPhone: options.customer ? options.customer.phone : null,
          metadata: options.metadata || {},
          allowedOrigin: window.location.origin
        })
      })
      .then(function(response) {
        return response.json();
      })
      .then(function(data) {
        if (!data.sessionId) {
          throw new Error(data.error || 'Failed to create checkout session');
        }

        currentSessionId = data.sessionId;
        console.log('[PeeapCheckout] Session created:', currentSessionId);

        // Create and show modal
        self._createModal(data.sessionId);
      })
      .catch(function(error) {
        console.error('[PeeapCheckout] Failed to create session:', error);
        checkoutCallbacks.onError({
          message: error.message || 'Failed to open checkout',
          code: 'SESSION_ERROR'
        });
      });
    },

    /**
     * Close the checkout modal
     */
    close: function() {
      if (modalElement) {
        modalElement.classList.remove('peeap-visible');
        setTimeout(function() {
          if (modalElement && modalElement.parentNode) {
            modalElement.parentNode.removeChild(modalElement);
          }
          modalElement = null;
          iframeElement = null;
        }, 300);

        checkoutCallbacks.onClose();
      }
      currentSessionId = null;
    },

    /**
     * Create the modal element
     * @private
     */
    _createModal: function(sessionId) {
      var self = this;

      // Remove existing modal if any
      if (modalElement) {
        this.close();
      }

      // Create modal structure
      modalElement = document.createElement('div');
      modalElement.className = 'peeap-modal-overlay';
      modalElement.onclick = function(e) {
        if (e.target === modalElement) {
          self.close();
        }
      };

      var container = document.createElement('div');
      container.className = 'peeap-modal-container';

      // Create iframe
      var embedUrl = checkoutConfig.embedUrl + '/embed/checkout?session=' +
        encodeURIComponent(sessionId) + '&origin=' +
        encodeURIComponent(window.location.origin);

      iframeElement = document.createElement('iframe');
      iframeElement.className = 'peeap-iframe';
      iframeElement.src = embedUrl;
      iframeElement.allow = 'payment';
      iframeElement.setAttribute('allowpaymentrequest', 'true');

      container.appendChild(iframeElement);
      modalElement.appendChild(container);
      document.body.appendChild(modalElement);

      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      // Animate in
      requestAnimationFrame(function() {
        modalElement.classList.add('peeap-visible');
      });

      // Restore body scroll on close
      var originalClose = this.close;
      this.close = function() {
        document.body.style.overflow = '';
        originalClose.call(self);
      };
    },

    /**
     * Check if checkout is currently open
     */
    isOpen: function() {
      return modalElement !== null;
    }
  };

  // Export PeeapCheckout to global scope
  window.PeeapCheckout = PeeapCheckout;

  console.log('[PeeapCheckout] v' + PeeapCheckout.version + ' loaded');

})(typeof window !== 'undefined' ? window : this);
