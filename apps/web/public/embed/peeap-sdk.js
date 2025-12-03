/**
 * ============================================================================
 * PEEAP PAYMENT SDK v1.0.0
 * ============================================================================
 *
 * A comprehensive payment integration SDK for accepting payments via Peeap.
 * This SDK can be integrated into any website, web app, or used with AI platforms
 * like Lovable, v0, Bolt, and others.
 *
 * ============================================================================
 * QUICK START
 * ============================================================================
 *
 * 1. Add this script to your HTML:
 *    <script src="https://your-domain.com/embed/peeap-sdk.js"></script>
 *
 * 2. Initialize the SDK:
 *    PeeapSDK.init({ businessId: 'your-business-id' });
 *
 * 3. Create a payment:
 *    PeeapSDK.createPayment({ amount: 100, currency: 'SLE' });
 *
 * ============================================================================
 * SUPPORTED CURRENCIES
 * ============================================================================
 *
 * | Code | Name                    | Symbol | Country        |
 * |------|-------------------------|--------|----------------|
 * | SLE  | Sierra Leonean Leone    | Le     | Sierra Leone   |
 * | USD  | US Dollar               | $      | United States  |
 * | EUR  | Euro                    | €      | European Union |
 * | GBP  | British Pound           | £      | United Kingdom |
 * | NGN  | Nigerian Naira          | ₦      | Nigeria        |
 * | GHS  | Ghanaian Cedi           | ₵      | Ghana          |
 * | KES  | Kenyan Shilling         | KSh    | Kenya          |
 * | ZAR  | South African Rand      | R      | South Africa   |
 * | XOF  | West African CFA Franc  | CFA    | West Africa    |
 *
 * ============================================================================
 * PAYMENT METHODS
 * ============================================================================
 *
 * | Method         | Description                              |
 * |----------------|------------------------------------------|
 * | mobile_money   | Mobile money (Orange Money, Africell)    |
 * | bank_transfer  | Direct bank transfer                     |
 * | card           | Credit/Debit card (Visa, Mastercard)     |
 * | wallet         | Peeap wallet balance                     |
 * | qr_code        | Scan QR code to pay                      |
 *
 * ============================================================================
 * API ENDPOINTS
 * ============================================================================
 *
 * Base URL: https://your-domain.com/api
 *
 * | Endpoint                        | Method | Description                    |
 * |---------------------------------|--------|--------------------------------|
 * | /payments/initialize            | POST   | Create a new payment session   |
 * | /payments/:id                   | GET    | Get payment status             |
 * | /payments/:id/verify            | POST   | Verify payment completion      |
 * | /payments/:id/cancel            | POST   | Cancel a pending payment       |
 * | /businesses/:id/checkout        | GET    | Get business checkout page     |
 *
 * ============================================================================
 * CONFIGURATION OPTIONS
 * ============================================================================
 */

(function(global) {
  'use strict';

  /**
   * SDK Configuration
   * @typedef {Object} PeeapConfig
   * @property {string} businessId - Required. Your unique business ID from the Peeap dashboard
   * @property {string} [mode='live'] - Payment mode: 'live' for real payments, 'test' for sandbox
   * @property {string} [currency='SLE'] - Default currency code (see supported currencies above)
   * @property {string} [locale='en'] - Language locale: 'en', 'fr', etc.
   * @property {string} [theme='light'] - UI theme: 'light' or 'dark'
   * @property {string} [primaryColor] - Custom primary color (hex, e.g., '#6366f1')
   * @property {Function} [onSuccess] - Callback when payment succeeds
   * @property {Function} [onError] - Callback when payment fails
   * @property {Function} [onCancel] - Callback when user cancels payment
   * @property {Function} [onClose] - Callback when payment modal closes
   */

  /**
   * Payment Request Object
   * @typedef {Object} PaymentRequest
   * @property {number} amount - Required. Payment amount (in smallest currency unit or decimal)
   * @property {string} [currency='SLE'] - Currency code
   * @property {string} [reference] - Your unique order/invoice reference
   * @property {string} [description] - Payment description shown to customer
   * @property {Object} [customer] - Customer information
   * @property {string} [customer.email] - Customer email
   * @property {string} [customer.phone] - Customer phone number
   * @property {string} [customer.name] - Customer full name
   * @property {Object} [metadata] - Custom metadata (key-value pairs)
   * @property {string} [redirectUrl] - URL to redirect after payment
   * @property {string} [callbackUrl] - Webhook URL for payment notifications
   * @property {string[]} [paymentMethods] - Allowed payment methods
   */

  /**
   * Payment Response Object
   * @typedef {Object} PaymentResponse
   * @property {string} id - Unique payment ID
   * @property {string} reference - Your reference or auto-generated
   * @property {number} amount - Payment amount
   * @property {string} currency - Currency code
   * @property {string} status - Payment status: 'pending', 'processing', 'completed', 'failed', 'cancelled'
   * @property {string} paymentMethod - Method used for payment
   * @property {string} checkoutUrl - URL to hosted checkout page
   * @property {Object} customer - Customer information
   * @property {Object} metadata - Your custom metadata
   * @property {string} createdAt - ISO timestamp
   * @property {string} completedAt - ISO timestamp (if completed)
   */

  // Default configuration
  var defaultConfig = {
    mode: 'live',
    currency: 'SLE',
    locale: 'en',
    theme: 'light',
    apiVersion: 'v1'
  };

  // Supported currencies with details
  var CURRENCIES = {
    SLE: { name: 'Sierra Leonean Leone', symbol: 'Le', decimals: 2 },
    USD: { name: 'US Dollar', symbol: '$', decimals: 2 },
    EUR: { name: 'Euro', symbol: '€', decimals: 2 },
    GBP: { name: 'British Pound', symbol: '£', decimals: 2 },
    NGN: { name: 'Nigerian Naira', symbol: '₦', decimals: 2 },
    GHS: { name: 'Ghanaian Cedi', symbol: '₵', decimals: 2 },
    KES: { name: 'Kenyan Shilling', symbol: 'KSh', decimals: 2 },
    ZAR: { name: 'South African Rand', symbol: 'R', decimals: 2 },
    XOF: { name: 'West African CFA Franc', symbol: 'CFA', decimals: 0 }
  };

  // Payment method definitions
  var PAYMENT_METHODS = {
    mobile_money: { name: 'Mobile Money', icon: 'phone' },
    bank_transfer: { name: 'Bank Transfer', icon: 'bank' },
    card: { name: 'Card Payment', icon: 'credit-card' },
    wallet: { name: 'Peeap Wallet', icon: 'wallet' },
    qr_code: { name: 'QR Code', icon: 'qr-code' }
  };

  // SDK State
  var state = {
    initialized: false,
    config: {},
    baseUrl: '',
    modal: null
  };

  /**
   * ============================================================================
   * PEEAP SDK MAIN OBJECT
   * ============================================================================
   */
  var PeeapSDK = {
    /**
     * SDK Version
     */
    version: '1.0.0',

    /**
     * Available currencies
     */
    currencies: CURRENCIES,

    /**
     * Available payment methods
     */
    paymentMethods: PAYMENT_METHODS,

    /**
     * Initialize the SDK with your configuration
     *
     * @param {PeeapConfig} config - Configuration options
     * @returns {PeeapSDK} - Returns SDK instance for chaining
     *
     * @example
     * // Basic initialization
     * PeeapSDK.init({
     *   businessId: 'biz_abc123xyz'
     * });
     *
     * @example
     * // Full configuration
     * PeeapSDK.init({
     *   businessId: 'biz_abc123xyz',
     *   mode: 'test',
     *   currency: 'SLE',
     *   theme: 'dark',
     *   primaryColor: '#6366f1',
     *   onSuccess: function(payment) {
     *     console.log('Payment successful!', payment);
     *     window.location.href = '/order-confirmation?ref=' + payment.reference;
     *   },
     *   onError: function(error) {
     *     console.error('Payment failed:', error);
     *     alert('Payment failed: ' + error.message);
     *   },
     *   onCancel: function() {
     *     console.log('Payment cancelled by user');
     *   }
     * });
     */
    init: function(config) {
      if (!config || !config.businessId) {
        throw new Error('PeeapSDK: businessId is required');
      }

      // Merge with defaults
      state.config = Object.assign({}, defaultConfig, config);

      // Determine base URL
      state.baseUrl = config.baseUrl || this._getBaseUrl();

      state.initialized = true;

      console.log('PeeapSDK initialized for business:', config.businessId);

      return this;
    },

    /**
     * Create a new payment and open the checkout
     *
     * @param {PaymentRequest} options - Payment options
     * @returns {Promise<PaymentResponse>} - Payment response
     *
     * @example
     * // Simple payment
     * PeeapSDK.createPayment({
     *   amount: 50000,
     *   currency: 'SLE',
     *   description: 'Order #12345'
     * });
     *
     * @example
     * // Payment with customer info and metadata
     * PeeapSDK.createPayment({
     *   amount: 150.00,
     *   currency: 'USD',
     *   reference: 'INV-2024-001',
     *   description: 'Premium Subscription - 1 Year',
     *   customer: {
     *     email: 'customer@example.com',
     *     phone: '+23276123456',
     *     name: 'John Doe'
     *   },
     *   metadata: {
     *     orderId: '12345',
     *     productIds: ['prod_1', 'prod_2'],
     *     subscriptionPlan: 'premium'
     *   },
     *   paymentMethods: ['mobile_money', 'card'],
     *   callbackUrl: 'https://yoursite.com/api/webhooks/peeap'
     * }).then(function(payment) {
     *   console.log('Payment initiated:', payment.id);
     * });
     */
    createPayment: function(options) {
      var self = this;

      if (!state.initialized) {
        throw new Error('PeeapSDK: SDK not initialized. Call PeeapSDK.init() first.');
      }

      if (!options || !options.amount) {
        throw new Error('PeeapSDK: amount is required');
      }

      var paymentData = {
        businessId: state.config.businessId,
        amount: options.amount,
        currency: options.currency || state.config.currency,
        reference: options.reference || this._generateReference(),
        description: options.description || '',
        customer: options.customer || {},
        metadata: options.metadata || {},
        mode: state.config.mode,
        redirectUrl: options.redirectUrl,
        callbackUrl: options.callbackUrl,
        paymentMethods: options.paymentMethods
      };

      return this._initializePayment(paymentData).then(function(payment) {
        // Open checkout modal or redirect
        if (options.inline !== true) {
          self._openCheckout(payment);
        }
        return payment;
      });
    },

    /**
     * Open the checkout modal for an existing payment
     *
     * @param {string} paymentId - The payment ID to resume
     * @returns {Promise<PaymentResponse>}
     *
     * @example
     * PeeapSDK.openCheckout('pay_abc123xyz');
     */
    openCheckout: function(paymentId) {
      if (!state.initialized) {
        throw new Error('PeeapSDK: SDK not initialized');
      }

      return this._getPayment(paymentId).then(function(payment) {
        this._openCheckout(payment);
        return payment;
      }.bind(this));
    },

    /**
     * Verify a payment status
     *
     * @param {string} paymentId - The payment ID to verify
     * @returns {Promise<PaymentResponse>}
     *
     * @example
     * PeeapSDK.verifyPayment('pay_abc123xyz')
     *   .then(function(payment) {
     *     if (payment.status === 'completed') {
     *       console.log('Payment verified!');
     *     }
     *   });
     */
    verifyPayment: function(paymentId) {
      return this._request('POST', '/payments/' + paymentId + '/verify');
    },

    /**
     * Get payment details
     *
     * @param {string} paymentId - The payment ID
     * @returns {Promise<PaymentResponse>}
     */
    getPayment: function(paymentId) {
      return this._getPayment(paymentId);
    },

    /**
     * Cancel a pending payment
     *
     * @param {string} paymentId - The payment ID to cancel
     * @returns {Promise<PaymentResponse>}
     */
    cancelPayment: function(paymentId) {
      return this._request('POST', '/payments/' + paymentId + '/cancel');
    },

    /**
     * Create a payment button element
     *
     * @param {Object} options - Button options
     * @param {number} options.amount - Payment amount
     * @param {string} [options.currency] - Currency code
     * @param {string} [options.text='Pay with Peeap'] - Button text
     * @param {string} [options.style='primary'] - Button style: 'primary', 'secondary', 'minimal'
     * @param {string} [options.size='medium'] - Button size: 'small', 'medium', 'large'
     * @returns {HTMLElement} - The button element
     *
     * @example
     * var button = PeeapSDK.createButton({
     *   amount: 100,
     *   currency: 'SLE',
     *   text: 'Pay Le 100',
     *   style: 'primary',
     *   size: 'large'
     * });
     * document.getElementById('payment-container').appendChild(button);
     */
    createButton: function(options) {
      var self = this;
      var button = document.createElement('button');

      var styles = {
        primary: 'background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; border: none;',
        secondary: 'background: white; color: #6366f1; border: 2px solid #6366f1;',
        minimal: 'background: transparent; color: #6366f1; border: none; text-decoration: underline;'
      };

      var sizes = {
        small: 'padding: 8px 16px; font-size: 14px;',
        medium: 'padding: 12px 24px; font-size: 16px;',
        large: 'padding: 16px 32px; font-size: 18px;'
      };

      var baseStyle = 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; ' +
        'font-weight: 600; border-radius: 8px; cursor: pointer; transition: all 0.2s ease; ' +
        'display: inline-flex; align-items: center; gap: 8px;';

      button.style.cssText = baseStyle +
        (styles[options.style] || styles.primary) +
        (sizes[options.size] || sizes.medium);

      button.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>' +
        (options.text || 'Pay with Peeap');

      button.onclick = function() {
        self.createPayment({
          amount: options.amount,
          currency: options.currency,
          description: options.description,
          customer: options.customer,
          metadata: options.metadata
        });
      };

      return button;
    },

    /**
     * Render an inline checkout form
     *
     * @param {string|HTMLElement} container - Container element or selector
     * @param {Object} options - Checkout options
     *
     * @example
     * PeeapSDK.renderCheckout('#checkout-container', {
     *   amount: 100,
     *   currency: 'SLE',
     *   showAmount: true,
     *   allowAmountEdit: false
     * });
     */
    renderCheckout: function(container, options) {
      var containerEl = typeof container === 'string'
        ? document.querySelector(container)
        : container;

      if (!containerEl) {
        throw new Error('PeeapSDK: Container element not found');
      }

      var iframe = document.createElement('iframe');
      iframe.src = state.baseUrl + '/checkout/embed?' + this._buildQueryString({
        businessId: state.config.businessId,
        amount: options.amount,
        currency: options.currency || state.config.currency,
        mode: state.config.mode,
        theme: state.config.theme
      });
      iframe.style.cssText = 'width: 100%; min-height: 500px; border: none; border-radius: 12px;';
      iframe.allow = 'payment';

      containerEl.innerHTML = '';
      containerEl.appendChild(iframe);

      // Listen for messages from iframe
      window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'peeap_payment') {
          if (event.data.status === 'success' && state.config.onSuccess) {
            state.config.onSuccess(event.data.payment);
          } else if (event.data.status === 'error' && state.config.onError) {
            state.config.onError(event.data.error);
          } else if (event.data.status === 'cancel' && state.config.onCancel) {
            state.config.onCancel();
          }
        }
      });
    },

    /**
     * Format amount with currency symbol
     *
     * @param {number} amount - Amount to format
     * @param {string} [currency] - Currency code
     * @returns {string} - Formatted amount
     *
     * @example
     * PeeapSDK.formatAmount(50000, 'SLE'); // "Le 50,000.00"
     * PeeapSDK.formatAmount(99.99, 'USD'); // "$99.99"
     */
    formatAmount: function(amount, currency) {
      var curr = CURRENCIES[currency || state.config.currency || 'SLE'];
      var formatted = amount.toLocaleString('en-US', {
        minimumFractionDigits: curr.decimals,
        maximumFractionDigits: curr.decimals
      });
      return curr.symbol + ' ' + formatted;
    },

    /**
     * Check if SDK is initialized
     * @returns {boolean}
     */
    isInitialized: function() {
      return state.initialized;
    },

    /**
     * Get current configuration
     * @returns {PeeapConfig}
     */
    getConfig: function() {
      return Object.assign({}, state.config);
    },

    // =========================================================================
    // PRIVATE METHODS
    // =========================================================================

    _getBaseUrl: function() {
      // Try to detect from script src
      var scripts = document.getElementsByTagName('script');
      for (var i = 0; i < scripts.length; i++) {
        var src = scripts[i].src;
        if (src && src.indexOf('peeap-sdk.js') !== -1) {
          return src.replace('/embed/peeap-sdk.js', '');
        }
      }
      return window.location.origin;
    },

    _generateReference: function() {
      return 'ref_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    _buildQueryString: function(params) {
      return Object.keys(params)
        .filter(function(k) { return params[k] !== undefined && params[k] !== null; })
        .map(function(k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
        .join('&');
    },

    _request: function(method, endpoint, data) {
      var url = state.baseUrl + '/api' + endpoint;

      return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('X-Business-Id', state.config.businessId);
        xhr.setRequestHeader('X-Mode', state.config.mode);

        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            var error = new Error('Request failed');
            try {
              error = Object.assign(error, JSON.parse(xhr.responseText));
            } catch (e) {}
            reject(error);
          }
        };

        xhr.onerror = function() {
          reject(new Error('Network error'));
        };

        xhr.send(data ? JSON.stringify(data) : null);
      });
    },

    _initializePayment: function(data) {
      return this._request('POST', '/payments/initialize', data);
    },

    _getPayment: function(paymentId) {
      return this._request('GET', '/payments/' + paymentId);
    },

    _openCheckout: function(payment) {
      var self = this;

      // Build checkout URL with all payment data
      var checkoutParams = this._buildQueryString({
        amount: payment.amount,
        currency: payment.currency,
        reference: payment.reference,
        description: payment.description,
        mode: state.config.mode,
        email: payment.customer ? payment.customer.email : null,
        phone: payment.customer ? payment.customer.phone : null
      });

      var checkoutUrl = payment.checkoutUrl ||
        (state.baseUrl + '/checkout/' + state.config.businessId + '?' + checkoutParams);

      // Create modal overlay
      var overlay = document.createElement('div');
      overlay.id = 'peeap-checkout-overlay';
      overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; ' +
        'background: rgba(0, 0, 0, 0.5); z-index: 999999; display: flex; align-items: center; ' +
        'justify-content: center; animation: peeapFadeIn 0.2s ease;';

      // Create modal container
      var modal = document.createElement('div');
      modal.style.cssText = 'background: white; border-radius: 16px; max-width: 450px; width: 95%; ' +
        'max-height: 90vh; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); ' +
        'animation: peeapSlideUp 0.3s ease;';

      // Create iframe
      var iframe = document.createElement('iframe');
      iframe.src = checkoutUrl;
      iframe.style.cssText = 'width: 100%; height: 600px; border: none;';
      iframe.allow = 'payment';

      modal.appendChild(iframe);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // Add animation styles
      var style = document.createElement('style');
      style.textContent = '@keyframes peeapFadeIn { from { opacity: 0; } to { opacity: 1; } } ' +
        '@keyframes peeapSlideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }';
      document.head.appendChild(style);

      // Close on overlay click
      overlay.onclick = function(e) {
        if (e.target === overlay) {
          self._closeCheckout();
          if (state.config.onCancel) state.config.onCancel();
        }
      };

      // Listen for messages from checkout
      state.messageHandler = function(event) {
        if (event.data && event.data.type === 'peeap_payment') {
          self._closeCheckout();
          if (event.data.status === 'success' && state.config.onSuccess) {
            state.config.onSuccess(event.data.payment);
          } else if (event.data.status === 'error' && state.config.onError) {
            state.config.onError(event.data.error);
          } else if (event.data.status === 'cancel' && state.config.onCancel) {
            state.config.onCancel();
          }
          if (state.config.onClose) state.config.onClose();
        }
      };
      window.addEventListener('message', state.messageHandler);

      state.modal = overlay;
    },

    _closeCheckout: function() {
      if (state.modal) {
        state.modal.remove();
        state.modal = null;
      }
      if (state.messageHandler) {
        window.removeEventListener('message', state.messageHandler);
        state.messageHandler = null;
      }
    }
  };

  // ============================================================================
  // AUTO-INITIALIZATION FROM SCRIPT ATTRIBUTES
  // ============================================================================
  //
  // You can auto-initialize by adding data attributes to the script tag:
  //
  // <script src="peeap-sdk.js"
  //   data-business-id="biz_abc123"
  //   data-mode="test"
  //   data-currency="SLE">
  // </script>
  //
  (function autoInit() {
    var scripts = document.getElementsByTagName('script');
    var currentScript = scripts[scripts.length - 1];

    var businessId = currentScript.getAttribute('data-business-id');
    if (businessId) {
      PeeapSDK.init({
        businessId: businessId,
        mode: currentScript.getAttribute('data-mode') || 'live',
        currency: currentScript.getAttribute('data-currency') || 'SLE',
        theme: currentScript.getAttribute('data-theme') || 'light'
      });

      // Auto-create button if container specified
      var containerId = currentScript.getAttribute('data-container');
      var amount = currentScript.getAttribute('data-amount');
      if (containerId && amount) {
        document.addEventListener('DOMContentLoaded', function() {
          var container = document.getElementById(containerId);
          if (container) {
            var button = PeeapSDK.createButton({
              amount: parseFloat(amount),
              currency: currentScript.getAttribute('data-currency') || 'SLE',
              text: currentScript.getAttribute('data-button-text') || 'Pay with Peeap',
              style: currentScript.getAttribute('data-button-style') || 'primary',
              size: currentScript.getAttribute('data-button-size') || 'medium'
            });
            container.appendChild(button);
          }
        });
      }
    }
  })();

  // Export to global scope
  global.PeeapSDK = PeeapSDK;
  global.Peeap = PeeapSDK; // Alias

})(typeof window !== 'undefined' ? window : this);

/**
 * ============================================================================
 * INTEGRATION EXAMPLES FOR AI PLATFORMS (Lovable, v0, Bolt, etc.)
 * ============================================================================
 *
 * EXAMPLE 1: Simple Payment Button (React/Next.js)
 * ------------------------------------------------
 *
 * import { useEffect } from 'react';
 *
 * export default function PaymentButton({ amount, productName }) {
 *   useEffect(() => {
 *     // Load Peeap SDK
 *     const script = document.createElement('script');
 *     script.src = 'https://your-domain.com/embed/peeap-sdk.js';
 *     script.onload = () => {
 *       window.PeeapSDK.init({
 *         businessId: 'YOUR_BUSINESS_ID',
 *         mode: 'live',
 *         onSuccess: (payment) => {
 *           // Redirect to success page or update UI
 *           window.location.href = `/order-success?ref=${payment.reference}`;
 *         },
 *         onError: (error) => {
 *           alert('Payment failed: ' + error.message);
 *         }
 *       });
 *     };
 *     document.head.appendChild(script);
 *   }, []);
 *
 *   const handlePayment = () => {
 *     window.PeeapSDK.createPayment({
 *       amount: amount,
 *       currency: 'SLE',
 *       description: `Payment for ${productName}`,
 *       metadata: { productName }
 *     });
 *   };
 *
 *   return (
 *     <button onClick={handlePayment}>
 *       Pay Le {amount.toLocaleString()}
 *     </button>
 *   );
 * }
 *
 *
 * EXAMPLE 2: E-commerce Checkout (Vue.js)
 * ---------------------------------------
 *
 * <template>
 *   <div class="checkout">
 *     <h2>Order Summary</h2>
 *     <p>Total: {{ formatCurrency(total) }}</p>
 *     <button @click="processPayment" :disabled="loading">
 *       {{ loading ? 'Processing...' : 'Complete Purchase' }}
 *     </button>
 *   </div>
 * </template>
 *
 * <script>
 * export default {
 *   data() {
 *     return { loading: false };
 *   },
 *   computed: {
 *     total() {
 *       return this.$store.getters.cartTotal;
 *     }
 *   },
 *   mounted() {
 *     window.PeeapSDK.init({
 *       businessId: 'YOUR_BUSINESS_ID',
 *       currency: 'SLE',
 *       onSuccess: this.handleSuccess,
 *       onError: this.handleError
 *     });
 *   },
 *   methods: {
 *     processPayment() {
 *       this.loading = true;
 *       window.PeeapSDK.createPayment({
 *         amount: this.total,
 *         reference: `ORDER-${Date.now()}`,
 *         customer: {
 *           email: this.$store.state.user.email,
 *           name: this.$store.state.user.name
 *         },
 *         metadata: {
 *           cartItems: this.$store.state.cart
 *         }
 *       });
 *     },
 *     handleSuccess(payment) {
 *       this.$store.dispatch('clearCart');
 *       this.$router.push(`/order/${payment.reference}`);
 *     },
 *     handleError(error) {
 *       this.loading = false;
 *       this.$toast.error(error.message);
 *     }
 *   }
 * };
 * </script>
 *
 *
 * EXAMPLE 3: Subscription Service (Plain HTML)
 * --------------------------------------------
 *
 * <!DOCTYPE html>
 * <html>
 * <head>
 *   <title>Subscribe to Premium</title>
 *   <script src="https://your-domain.com/embed/peeap-sdk.js"></script>
 * </head>
 * <body>
 *   <h1>Premium Subscription</h1>
 *   <div id="plans">
 *     <button onclick="subscribe('monthly', 50000)">Monthly - Le 50,000</button>
 *     <button onclick="subscribe('yearly', 500000)">Yearly - Le 500,000</button>
 *   </div>
 *
 *   <script>
 *     PeeapSDK.init({
 *       businessId: 'YOUR_BUSINESS_ID',
 *       onSuccess: function(payment) {
 *         // Send to your server to activate subscription
 *         fetch('/api/activate-subscription', {
 *           method: 'POST',
 *           headers: { 'Content-Type': 'application/json' },
 *           body: JSON.stringify({ paymentId: payment.id })
 *         }).then(function() {
 *           window.location.href = '/dashboard';
 *         });
 *       }
 *     });
 *
 *     function subscribe(plan, amount) {
 *       PeeapSDK.createPayment({
 *         amount: amount,
 *         currency: 'SLE',
 *         description: 'Premium Subscription - ' + plan,
 *         metadata: { plan: plan, type: 'subscription' }
 *       });
 *     }
 *   </script>
 * </body>
 * </html>
 *
 *
 * EXAMPLE 4: Donation Platform
 * ----------------------------
 *
 * // Initialize with custom amounts
 * PeeapSDK.init({ businessId: 'YOUR_BUSINESS_ID' });
 *
 * // Preset donation amounts
 * const amounts = [10000, 50000, 100000, 500000];
 *
 * // Custom amount
 * document.getElementById('donate-form').onsubmit = function(e) {
 *   e.preventDefault();
 *   const amount = document.getElementById('amount').value;
 *   const name = document.getElementById('donor-name').value;
 *
 *   PeeapSDK.createPayment({
 *     amount: parseInt(amount),
 *     currency: 'SLE',
 *     description: 'Donation',
 *     customer: { name: name },
 *     metadata: {
 *       type: 'donation',
 *       campaign: 'school-supplies-2024'
 *     }
 *   });
 * };
 *
 *
 * ============================================================================
 * WEBHOOK INTEGRATION
 * ============================================================================
 *
 * Set up a webhook endpoint to receive payment notifications:
 *
 * // Node.js/Express example
 * app.post('/api/webhooks/peeap', (req, res) => {
 *   const { event, data } = req.body;
 *
 *   switch (event) {
 *     case 'payment.completed':
 *       // Payment was successful
 *       await fulfillOrder(data.reference);
 *       break;
 *     case 'payment.failed':
 *       // Payment failed
 *       await notifyCustomer(data.customer.email, 'Payment failed');
 *       break;
 *     case 'payment.refunded':
 *       // Payment was refunded
 *       await processRefund(data.id);
 *       break;
 *   }
 *
 *   res.status(200).send('OK');
 * });
 *
 * ============================================================================
 */
