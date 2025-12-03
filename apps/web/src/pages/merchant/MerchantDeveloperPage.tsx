import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import {
  Store,
  Plus,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Settings,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  Key,
  Webhook,
  Activity,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  Globe,
  Mail,
  Phone,
  MapPin,
  Building2,
} from 'lucide-react';
import { StandaloneDeveloperLayout } from '@/components/layout/StandaloneDeveloperLayout';
import { Card } from '@/components/ui/Card';
import { businessService, MerchantBusiness, CreateBusinessDto } from '@/services/business.service';
import { supabase } from '@/lib/supabase';

interface BusinessCategory {
  id: string;
  name: string;
  icon: string | null;
}

// Main Businesses List Component
function BusinessesList() {
  const [businesses, setBusinesses] = useState<MerchantBusiness[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    try {
      const data = await businessService.getMyBusinesses();
      setBusinesses(data);
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getApprovalBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      PENDING: { color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3 h-3" />, label: 'Pending Approval' },
      APPROVED: { color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" />, label: 'Approved' },
      REJECTED: { color: 'bg-red-100 text-red-700', icon: <X className="w-3 h-3" />, label: 'Rejected' },
      SUSPENDED: { color: 'bg-gray-100 text-gray-700', icon: <AlertTriangle className="w-3 h-3" />, label: 'Suspended' },
    };
    const badge = badges[status] || badges.PENDING;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">My Businesses</h2>
          <p className="text-sm text-gray-500">Create and manage your business shops with their own API keys</p>
        </div>
        <button
          onClick={() => navigate('/merchant/developer/create-business')}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Business
        </button>
      </div>

      {/* Businesses Grid */}
      {businesses.length === 0 ? (
        <Card className="p-8 text-center">
          <Store className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No businesses yet</h3>
          <p className="text-gray-500 mb-4">Create your first business to get API keys and start accepting payments.</p>
          <button
            onClick={() => navigate('/merchant/developer/create-business')}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Your First Business
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {businesses.map((business) => (
            <Card
              key={business.id}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/merchant/developer/business/${business.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {business.logo_url ? (
                    <img
                      src={business.logo_url}
                      alt={business.name}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Store className="w-5 h-5 text-primary-600" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium text-gray-900">{business.name}</h3>
                    <p className="text-xs text-gray-500">{business.slug}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>

              <div className="space-y-2 mb-3">
                {business.business_category && (
                  <p className="text-sm text-gray-600">{business.business_category.name}</p>
                )}
                {business.description && (
                  <p className="text-sm text-gray-500 line-clamp-2">{business.description}</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center gap-2">
                  {getApprovalBadge(business.approval_status)}
                </div>
                <div className="flex items-center gap-1">
                  {business.is_live_mode ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      <ToggleRight className="w-3 h-3" />
                      Live
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                      <ToggleLeft className="w-3 h-3" />
                      Test
                    </span>
                  )}
                </div>
              </div>

              {business.approval_status === 'PENDING' && (
                <div className="mt-3 p-2 bg-yellow-50 rounded-lg">
                  <p className="text-xs text-yellow-700">
                    {(business.trial_live_transactions_used || 0) < (business.trial_live_transaction_limit || 2)
                      ? `${(business.trial_live_transaction_limit || 2) - (business.trial_live_transactions_used || 0)} trial live transactions remaining`
                      : 'Awaiting admin approval for unlimited live access'}
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Business Detail Component
function BusinessDetail() {
  const [business, setBusiness] = useState<MerchantBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSecretKeys, setShowSecretKeys] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [togglingMode, setTogglingMode] = useState(false);
  const [modeError, setModeError] = useState('');

  const navigate = useNavigate();
  const businessId = window.location.pathname.split('/').pop();

  useEffect(() => {
    if (businessId) {
      fetchBusiness();
    }
  }, [businessId]);

  const fetchBusiness = async () => {
    try {
      const data = await businessService.getBusiness(businessId!);
      setBusiness(data);
    } catch (error) {
      console.error('Error fetching business:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, keyName: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleMode = async () => {
    if (!business) return;

    setModeError('');
    setTogglingMode(true);

    try {
      await businessService.toggleLiveMode(business.id, !business.is_live_mode);
      fetchBusiness();
    } catch (error: any) {
      setModeError(error.message);
    } finally {
      setTogglingMode(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Business not found</h3>
        <button
          onClick={() => navigate('/merchant/developer')}
          className="mt-4 text-primary-600 hover:text-primary-700"
        >
          Back to businesses
        </button>
      </div>
    );
  }

  const activeKeys = business.is_live_mode
    ? { public: business.live_public_key, secret: business.live_secret_key }
    : { public: business.test_public_key, secret: business.test_secret_key };

  // Check if user can switch to live mode
  // Approved businesses: always allowed
  // Pending businesses: allowed if they have remaining trial transactions
  // Rejected/Suspended: not allowed
  const canSwitchToLive = (): boolean => {
    if (business.approval_status === 'APPROVED') return true;
    if (business.approval_status === 'REJECTED' || business.approval_status === 'SUSPENDED') return false;

    // Pending businesses can use trial live transactions
    const limit = business.trial_live_transaction_limit || 2;
    const used = business.trial_live_transactions_used || 0;
    return used < limit;
  };

  // Get remaining trial transactions for pending businesses
  const getRemainingTrialTransactions = (): number => {
    const limit = business.trial_live_transaction_limit || 2;
    const used = business.trial_live_transactions_used || 0;
    return Math.max(0, limit - used);
  };

  // Generate the complete SDK integration script
  const getFullSDKScript = () => {
    const baseUrl = window.location.origin;
    return `/**
 * ============================================================================
 * PEEAP PAYMENT SDK INTEGRATION
 * ============================================================================
 * Business: ${business.name}
 * Business ID: ${business.id}
 * Mode: ${business.is_live_mode ? 'LIVE' : 'TEST'}
 * Generated: ${new Date().toISOString()}
 * ============================================================================
 *
 * SUPPORTED CURRENCIES:
 * | Code | Name                   | Symbol |
 * |------|------------------------|--------|
 * | SLE  | Sierra Leonean Leone   | Le     |
 * | USD  | US Dollar              | $      |
 * | EUR  | Euro                   | €      |
 * | GBP  | British Pound          | £      |
 * | NGN  | Nigerian Naira         | ₦      |
 * | GHS  | Ghanaian Cedi          | ₵      |
 *
 * PAYMENT METHODS:
 * - mobile_money  : Orange Money, Africell Money
 * - bank_transfer : Direct bank transfer
 * - card          : Visa, Mastercard
 * - wallet        : Peeap wallet balance
 * - qr_code       : Scan QR to pay
 *
 * API ENDPOINTS:
 * POST ${baseUrl}/api/payments/initialize  - Create payment
 * GET  ${baseUrl}/api/payments/:id         - Get payment status
 * POST ${baseUrl}/api/payments/:id/verify  - Verify payment
 *
 * ============================================================================
 */

<!-- STEP 1: Add the SDK script to your HTML -->
<script src="${baseUrl}/embed/peeap-sdk.js"></script>

<!-- STEP 2: Initialize and create payments -->
<script>
// Initialize the SDK with your business credentials
PeeapSDK.init({
  businessId: '${business.id}',
  mode: '${business.is_live_mode ? 'live' : 'test'}',
  currency: 'SLE',  // Default currency
  theme: 'light',   // 'light' or 'dark'

  // Success callback - called when payment completes
  onSuccess: function(payment) {
    console.log('Payment successful!', payment);
    // payment.id        - Unique payment ID
    // payment.reference - Your order reference
    // payment.amount    - Amount paid
    // payment.currency  - Currency code
    // payment.status    - 'completed'

    // Example: Redirect to success page
    window.location.href = '/order-success?ref=' + payment.reference;
  },

  // Error callback - called when payment fails
  onError: function(error) {
    console.error('Payment failed:', error);
    alert('Payment failed: ' + error.message);
  },

  // Cancel callback - called when user cancels
  onCancel: function() {
    console.log('Payment cancelled');
  }
});

// ============================================================================
// EXAMPLE 1: Simple Payment
// ============================================================================
function paySimple() {
  PeeapSDK.createPayment({
    amount: 50000,           // Amount in smallest unit (Le 50,000)
    currency: 'SLE',
    description: 'Order #12345'
  });
}

// ============================================================================
// EXAMPLE 2: Payment with Customer Info
// ============================================================================
function payWithCustomer() {
  PeeapSDK.createPayment({
    amount: 150.00,
    currency: 'USD',
    reference: 'INV-2024-001',      // Your unique order ID
    description: 'Premium Subscription',
    customer: {
      email: 'customer@example.com',
      phone: '+23276123456',
      name: 'John Doe'
    },
    metadata: {                      // Custom data for your records
      orderId: '12345',
      productId: 'prod_abc',
      plan: 'premium'
    },
    callbackUrl: 'https://yoursite.com/api/webhooks/peeap'
  });
}

// ============================================================================
// EXAMPLE 3: Create a Payment Button
// ============================================================================
var button = PeeapSDK.createButton({
  amount: 100000,
  currency: 'SLE',
  text: 'Pay Le 100,000',
  style: 'primary',    // 'primary', 'secondary', 'minimal'
  size: 'large'        // 'small', 'medium', 'large'
});
document.getElementById('payment-button-container').appendChild(button);

// ============================================================================
// EXAMPLE 4: Render Inline Checkout Form
// ============================================================================
PeeapSDK.renderCheckout('#checkout-container', {
  amount: 75000,
  currency: 'SLE',
  showAmount: true
});

// ============================================================================
// EXAMPLE 5: Format Currency for Display
// ============================================================================
var formatted = PeeapSDK.formatAmount(50000, 'SLE'); // "Le 50,000.00"

// ============================================================================
// EXAMPLE 6: Verify Payment Status (Server-side recommended)
// ============================================================================
PeeapSDK.verifyPayment('pay_abc123xyz')
  .then(function(payment) {
    if (payment.status === 'completed') {
      console.log('Payment verified!');
    }
  });
</script>

<!-- ========================================================================
     REACT / NEXT.JS EXAMPLE
     ======================================================================== -->
<!--
import { useEffect } from 'react';

export default function CheckoutButton({ amount, productName }) {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '${baseUrl}/embed/peeap-sdk.js';
    script.onload = () => {
      window.PeeapSDK.init({
        businessId: '${business.id}',
        mode: '${business.is_live_mode ? 'live' : 'test'}',
        onSuccess: (payment) => {
          window.location.href = \`/success?ref=\${payment.reference}\`;
        }
      });
    };
    document.head.appendChild(script);
  }, []);

  const handlePay = () => {
    window.PeeapSDK.createPayment({
      amount,
      currency: 'SLE',
      description: \`Payment for \${productName}\`
    });
  };

  return <button onClick={handlePay}>Pay Now</button>;
}
-->

<!-- ========================================================================
     VUE.JS EXAMPLE
     ======================================================================== -->
<!--
<template>
  <button @click="pay">Pay {{ formatAmount(amount) }}</button>
</template>

<script>
export default {
  props: ['amount'],
  mounted() {
    window.PeeapSDK.init({
      businessId: '${business.id}',
      mode: '${business.is_live_mode ? 'live' : 'test'}',
      onSuccess: this.handleSuccess
    });
  },
  methods: {
    pay() {
      window.PeeapSDK.createPayment({
        amount: this.amount,
        currency: 'SLE'
      });
    },
    handleSuccess(payment) {
      this.$router.push('/success/' + payment.reference);
    },
    formatAmount(amt) {
      return 'Le ' + amt.toLocaleString();
    }
  }
};
</script>
-->

<!-- ========================================================================
     WEBHOOK HANDLER (Node.js/Express)
     ======================================================================== -->
<!--
app.post('/api/webhooks/peeap', async (req, res) => {
  const { event, data } = req.body;

  switch (event) {
    case 'payment.completed':
      await fulfillOrder(data.reference);
      break;
    case 'payment.failed':
      await notifyCustomer(data.customer.email);
      break;
  }

  res.status(200).send('OK');
});
-->`;
  };

  return (
    <div className="space-y-6">
      {/* Header with Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/merchant/developer')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight className="w-5 h-5 text-gray-400 rotate-180" />
          </button>
          {business.logo_url ? (
            <img
              src={business.logo_url}
              alt={business.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Store className="w-6 h-6 text-primary-600" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{business.name}</h2>
            <p className="text-sm text-gray-500">{business.slug}</p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => !business.is_live_mode ? null : handleToggleMode()}
              disabled={togglingMode}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                !business.is_live_mode
                  ? 'bg-white shadow text-orange-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Test Mode
            </button>
            <button
              onClick={() => business.is_live_mode ? null : handleToggleMode()}
              disabled={togglingMode || canSwitchToLive() === false}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                business.is_live_mode
                  ? 'bg-white shadow text-green-700'
                  : 'text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              Live Mode
              {business.approval_status === 'PENDING' && !business.is_live_mode && canSwitchToLive() && (
                <span className="ml-1 text-xs text-orange-500">(Trial)</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {modeError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {modeError}
        </div>
      )}

      {/* Approval Status Banner */}
      {business.approval_status === 'PENDING' && (
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-900">Pending Approval</h3>
              <p className="text-sm text-yellow-700 mt-1">
                You can process unlimited test transactions and {getRemainingTrialTransactions()} trial live transactions.
                After using your trial live transactions, an admin will review your business for full live access.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                <div className="p-2 bg-white rounded-lg">
                  <p className="text-gray-500">Test Transactions</p>
                  <p className="font-semibold text-green-600">Unlimited</p>
                </div>
                <div className="p-2 bg-white rounded-lg">
                  <p className="text-gray-500">Trial Live Transactions</p>
                  <p className="font-semibold text-orange-600">
                    {(business.trial_live_transactions_used || 0)}/{(business.trial_live_transaction_limit || 2)} used
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {business.approval_status === 'REJECTED' && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <X className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-900">Application Rejected</h3>
              <p className="text-sm text-red-700 mt-1">
                {business.approval_notes || 'Your business application was not approved. Please contact support.'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Business Details - Now at the top */}
      <Card className="p-6">
        <h3 className="font-medium text-gray-900 mb-4">Business Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {business.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-gray-400" />
              <span>{business.email}</span>
            </div>
          )}
          {business.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{business.phone}</span>
            </div>
          )}
          {business.website_url && (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="w-4 h-4 text-gray-400" />
              <a href={business.website_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                {business.website_url}
              </a>
            </div>
          )}
          {(business.address || business.city) && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span>{[business.address, business.city, business.country].filter(Boolean).join(', ')}</span>
            </div>
          )}
          {business.business_category && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span>{business.business_category.name}</span>
            </div>
          )}
        </div>
        {business.description && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600">{business.description}</p>
          </div>
        )}
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-medium text-gray-900">{business.status}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Approval</p>
              <p className="font-medium text-gray-900">{business.approval_status}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Webhook className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Webhook</p>
              <p className="font-medium text-gray-900">{business.webhook_url ? 'Configured' : 'Not Set'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Integration Section Header */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Integration</h3>
        <p className="text-sm text-gray-500">Add payment capabilities to your website or application</p>
      </div>

      {/* Complete SDK Documentation */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-gray-600" />
            <h3 className="font-medium text-gray-900">Peeap Payment SDK</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">AI-Ready</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">v1.0.0</span>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Copy and share this complete integration guide. Works with any website, React, Vue, Next.js,
          or AI platforms like <strong>Lovable</strong>, <strong>v0</strong>, <strong>Bolt</strong>, and others.
          The documentation includes all supported currencies, payment methods, API endpoints, and examples.
        </p>

        {/* Quick highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-xs text-gray-500">Currencies</p>
            <p className="font-semibold text-gray-900">6+</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-xs text-gray-500">Payment Methods</p>
            <p className="font-semibold text-gray-900">5</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-xs text-gray-500">Frameworks</p>
            <p className="font-semibold text-gray-900">All</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-xs text-gray-500">Setup Time</p>
            <p className="font-semibold text-gray-900">2 min</p>
          </div>
        </div>

        <div className="relative">
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto max-h-[500px] overflow-y-auto">
            <code>{getFullSDKScript()}</code>
          </pre>
          <button
            onClick={() => copyToClipboard(getFullSDKScript(), 'sdk')}
            className="absolute top-2 right-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {copiedKey === 'sdk' ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy SDK
              </>
            )}
          </button>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Tip:</strong> Paste this entire code into ChatGPT, Claude, Lovable, v0, or any AI platform -
            they will understand the full API and help integrate it into your project.
          </p>
        </div>
      </Card>

      {/* API Keys Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-gray-600" />
            <h3 className="font-medium text-gray-900">
              {business.is_live_mode ? 'Live' : 'Test'} API Keys
            </h3>
          </div>
          <button
            onClick={() => setShowSecretKeys(!showSecretKeys)}
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            {showSecretKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showSecretKeys ? 'Hide' : 'Show'} Secret Keys
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Use these keys for custom API integrations. For most use cases, we recommend using the embeddable scripts above.
        </p>

        <div className="space-y-4">
          {/* Public Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Publishable Key
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm font-mono overflow-x-auto">
                {activeKeys.public}
              </code>
              <button
                onClick={() => copyToClipboard(activeKeys.public, 'public')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                {copiedKey === 'public' ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-500" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Safe to use in frontend code</p>
          </div>

          {/* Secret Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Secret Key
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm font-mono">
                {showSecretKeys ? activeKeys.secret : '••••••••••••••••••••••••••••••••'}
              </code>
              <button
                onClick={() => copyToClipboard(activeKeys.secret, 'secret')}
                className="p-2 hover:bg-gray-100 rounded-lg"
                disabled={!showSecretKeys}
              >
                {copiedKey === 'secret' ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-500" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Keep this secret! Only use in server-side code</p>
          </div>
        </div>
      </Card>

      {/* Webhook Configuration */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Webhook className="w-5 h-5 text-gray-600" />
            <h3 className="font-medium text-gray-900">Webhook Configuration</h3>
          </div>
          <button className="text-sm text-primary-600 hover:text-primary-700">
            Configure
          </button>
        </div>
        {business.webhook_url ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint URL</label>
              <code className="block px-3 py-2 bg-gray-100 rounded-lg text-sm font-mono">
                {business.webhook_url}
              </code>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Signing Secret</label>
              <code className="block px-3 py-2 bg-gray-100 rounded-lg text-sm font-mono">
                {showSecretKeys ? business.webhook_secret : '••••••••••••••••••••••••••••••••'}
              </code>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No webhook configured. Set up a webhook to receive real-time payment notifications.</p>
        )}
      </Card>
    </div>
  );
}

// Main Export
export function MerchantDeveloperPage() {
  return (
    <StandaloneDeveloperLayout
      homeRoute="/merchant"
      homeLabel="Merchant Portal"
      basePath="/merchant/developer"
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Developer Dashboard</h1>
          <p className="text-gray-500">Create businesses and manage your API integration</p>
        </div>
        <Routes>
          <Route index element={<BusinessesList />} />
          <Route path="business/:businessId" element={<BusinessDetail />} />
        </Routes>
      </div>
    </StandaloneDeveloperLayout>
  );
}
