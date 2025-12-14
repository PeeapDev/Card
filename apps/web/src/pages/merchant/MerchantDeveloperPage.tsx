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
  Repeat,
  Link2,
  FileText,
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

// Integration tab type
type IntegrationTab = 'standard' | 'v0' | 'server' | 'subscriptions';

// Business Detail Component
function BusinessDetail() {
  const [business, setBusiness] = useState<MerchantBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSecretKeys, setShowSecretKeys] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [togglingMode, setTogglingMode] = useState(false);
  const [modeError, setModeError] = useState('');
  const [integrationTab, setIntegrationTab] = useState<IntegrationTab>('standard');

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

  // Generate the complete SDK integration script - v0 (Production Ready)
  const getFullSDKScript = () => {
    const apiUrl = 'https://api.peeap.com';
    const checkoutUrl = 'https://checkout.peeap.com';
    const publicKey = activeKeys.public;
    const isLive = business.is_live_mode;

    return `/**
 * ============================================================================
 * PEEAP PAYMENT SDK - Production Ready
 * ============================================================================
 * Business: ${business.name}
 * Mode: ${isLive ? 'LIVE' : 'SANDBOX (Test Mode)'}
 *
 * ⚠️  IMPORTANT: SIERRA LEONE CURRENCY (READ CAREFULLY)
 * ============================================================================
 * Sierra Leone REDENOMINATED its currency in 2022:
 *
 *   OLD Currency: Leone (SLL) - e.g., 10,000 old Leones
 *   NEW Currency: New Leone (SLE) - e.g., 10 new Leones
 *
 *   CONVERSION: 1,000 old Leones = 1 new Leone (removed 3 zeros)
 *
 * USE THESE VALUES:
 *   ✅ currency: 'SLE'     (correct - New Leone)
 *   ✅ amount: 50          (means Le 50.00 new Leones)
 *   ✅ amount: 100         (means Le 100.00 new Leones)
 *
 * DO NOT USE:
 *   ❌ currency: 'NLE'     (old code - will be auto-converted to SLE)
 *   ❌ currency: 'SLL'     (old currency - will be auto-converted)
 *   ❌ amount: 50000       (this is old Leone thinking!)
 *   ❌ amount: 1000000     (way too high for new Leone)
 *
 * TYPICAL NEW LEONE AMOUNTS:
 *   - Small purchase: 5-50 SLE
 *   - Medium purchase: 50-500 SLE
 *   - Large purchase: 500-5000 SLE
 *   - Very large: 5000+ SLE
 *
 * If your amount seems 1000x too high, divide by 1000!
 * ============================================================================
 *
 * LIVE MODE (pk_live_xxx):
 *   - Real payments processed
 *   - Mobile Money (Monime): ENABLED
 *   - Peeap Card: ENABLED
 *   - QR Code: ENABLED
 *
 * SANDBOX MODE (pk_test_xxx):
 *   - Test payments only (no real money)
 *   - Mobile Money (Monime): DISABLED (grayed out)
 *   - Peeap Card: ENABLED (use test cards)
 *   - QR Code: ENABLED (simulated)
 * ============================================================================
 */

<!-- STEP 1: Add SDK Script -->
<script src="${checkoutUrl}/embed/peeap-sdk.js"></script>

<!-- STEP 2: Initialize & Create Payment -->
<script>
// Initialize Peeap SDK
PeeapSDK.init({
  publicKey: '${publicKey}',
  baseUrl: '${apiUrl}',  // Required for CORS

  // Success callback
  onSuccess: function(payment) {
    // TODO: Redirect to your success page
    // window.location.href = '/order-complete?ref=' + payment.reference;
  },

  // Error callback
  onError: function(error) {
    console.error('Payment failed:', error.message);
    // TODO: Show error to user
    alert('Payment failed: ' + error.message);
  },

  // Cancel callback (optional)
  onCancel: function() {
  }
});

// Function to trigger payment
function payWithPeeap(amount, description, reference) {
  PeeapSDK.createPayment({
    amount: amount,           // New Leone (SLE): 50 = Le 50.00
    currency: 'SLE',
    description: description || 'Payment',
    reference: reference      // Optional: your order ID
  });
}
</script>

<!-- STEP 3: Add Payment Button -->
<button onclick="payWithPeeap(50, 'Order #12345', 'order_12345')">
  Pay Le 50.00
</button>

/**
 * ============================================================================
 * ALTERNATIVE: Server-Side Integration
 * ============================================================================
 * For backend integrations (Node.js, Python, PHP, etc.)
 * POST to: ${apiUrl}/checkout/create
 */

// Node.js Example
const response = await fetch('${apiUrl}/checkout/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    publicKey: '${publicKey}',
    amount: 50,  // New Leone (SLE): 50 = Le 50.00
    currency: 'SLE',
    description: 'Order #12345',
    redirectUrl: 'https://yoursite.com/payment-complete'
  })
});
const { paymentUrl } = await response.json();
// Redirect user to: paymentUrl

/**
 * ============================================================================
 * API Response Format
 * ============================================================================
 */
// Success Response:
{
  "sessionId": "cs_${isLive ? 'live' : 'test'}_abc123...",
  "paymentUrl": "${checkoutUrl}/checkout/pay/cs_${isLive ? 'live' : 'test'}_abc123...",
  "amount": 50,
  "currency": "SLE",
  "expiresAt": "2025-01-20T15:30:00Z",
  "isTestMode": ${!isLive}
}

/**
 * ============================================================================
 * Webhooks (Optional)
 * ============================================================================
 * Receive payment notifications at your endpoint
 */
// POST /your-webhook-endpoint
{
  "event": "payment.completed",
  "data": {
    "reference": "order_12345",
    "amount": 50,
    "currency": "SLE",
    "status": "completed"
  }
}`;
  };

  // V0/Restricted Environment SDK Script
  const getV0SDKScript = () => {
    const apiUrl = 'https://api.peeap.com';
    const checkoutUrl = 'https://checkout.peeap.com';
    const publicKey = activeKeys.public;
    const isLive = business.is_live_mode;

    return `/**
 * ============================================================================
 * PEEAP V0 INTEGRATION - For Restricted Environments
 * ============================================================================
 * Business: ${business.name}
 * Mode: ${isLive ? 'LIVE' : 'SANDBOX (Test Mode)'}
 *
 * ⚠️  IMPORTANT: SIERRA LEONE CURRENCY (READ CAREFULLY)
 * ============================================================================
 * Sierra Leone REDENOMINATED its currency in 2022:
 *
 *   OLD: Leone (SLL) - e.g., 10,000 old Leones
 *   NEW: New Leone (SLE) - e.g., 10 new Leones
 *   CONVERSION: 1,000 old = 1 new (removed 3 zeros)
 *
 * CORRECT:
 *   ✅ currency: 'SLE', amount: 50    (Le 50 new Leones)
 *
 * WRONG (will be auto-corrected but avoid):
 *   ❌ currency: 'NLE' or 'SLL'
 *   ❌ amount: 50000 (old Leone thinking - too high!)
 * ============================================================================
 *
 * USE THIS FOR:
 *   - v0.dev projects
 *   - Vercel preview deployments
 *   - CodeSandbox / StackBlitz
 *   - Any iframe/sandboxed environment
 *   - Environments with strict CSP policies
 *
 * This SDK uses REDIRECT-ONLY flow (no iframes, no popups)
 * ============================================================================
 */

<!-- STEP 1: Add V0-Compatible SDK Script -->
<script src="${checkoutUrl}/embed/peeap-v0.js"></script>

<!-- STEP 2: Initialize & Create Payment -->
<script>
// Initialize Peeap V0 SDK
PeeapV0.init({
  publicKey: '${publicKey}',

  // Called when payment succeeds (after redirect back)
  onSuccess: function(payment) {
    // Update your UI or redirect
  },

  // Called on error
  onError: function(error) {
    console.error('Payment failed:', error.message);
    alert('Payment failed: ' + error.message);
  },

  // Called when user cancels
  onCancel: function() {
  }
});

// Function to trigger payment (redirects to hosted checkout)
function payWithPeeap(amount, description, reference) {
  PeeapV0.pay({
    amount: amount,           // New Leone (SLE): 50 = Le 50.00
    currency: 'SLE',
    description: description || 'Payment',
    reference: reference,     // Optional: your order ID
    // After payment, user returns to current page with ?peeap_ref=xxx&peeap_status=success
  });
}
</script>

<!-- STEP 3: Add Payment Button -->
<button onclick="payWithPeeap(50, 'Order #12345', 'order_12345')">
  Pay Le 50.00
</button>

/**
 * ============================================================================
 * HOW IT WORKS (Redirect Flow)
 * ============================================================================
 * 1. User clicks payment button
 * 2. SDK creates checkout session via API
 * 3. User is REDIRECTED to ${checkoutUrl}/checkout/pay/{sessionId}
 * 4. User completes payment on hosted checkout
 * 5. User is redirected back to your site with callback params:
 *    ?peeap_ref=order_12345&peeap_status=success
 * 6. SDK detects callback params and triggers onSuccess
 *
 * This completely avoids all CSP/iframe/sandbox restrictions!
 * ============================================================================
 */

/**
 * ============================================================================
 * OPTIONAL: Custom Redirect URL
 * ============================================================================
 */
PeeapV0.pay({
  amount: 100,
  currency: 'SLE',
  description: 'Premium Plan',
  reference: 'plan_001',
  redirectUrl: 'https://yoursite.com/payment-complete'  // Custom return URL
});

/**
 * ============================================================================
 * OPTIONAL: Generate Payment Link Without Redirect
 * ============================================================================
 */
PeeapV0.createPaymentLink({
  amount: 100,
  currency: 'SLE',
  description: 'Invoice #1234'
}).then(function(result) {
  // Share this URL or open in new tab
});`;
  };

  // Server-Side Integration Script
  const getServerSDKScript = () => {
    const apiUrl = 'https://api.peeap.com';
    const checkoutUrl = 'https://checkout.peeap.com';
    const publicKey = activeKeys.public;
    const secretKey = showSecretKeys ? activeKeys.secret : 'sk_****_your_secret_key';
    const isLive = business.is_live_mode;

    return `/**
 * ============================================================================
 * PEEAP SERVER-SIDE INTEGRATION
 * ============================================================================
 * Business: ${business.name}
 * Mode: ${isLive ? 'LIVE' : 'SANDBOX (Test Mode)'}
 *
 * For backend integrations: Node.js, Python, PHP, Ruby, Go, etc.
 * This is the most secure integration method.
 *
 * ⚠️  CURRENCY NOTE: Sierra Leone redenominated in 2022
 * ============================================================================
 *   - Use 'SLE' (New Leone) - NOT 'NLE' or 'SLL'
 *   - amount: 50 means Le 50.00 (new Leones)
 *   - Old amounts (50000, 100000) are 1000x too high!
 *   - API auto-converts NLE/SLL to SLE
 * ============================================================================
 */

// ============================================================================
// NODE.JS / JAVASCRIPT
// ============================================================================

// Create Checkout Session
async function createCheckoutSession(orderData) {
  const response = await fetch('${apiUrl}/api/checkout/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // For server-side, you can use secret key for additional security
      // 'Authorization': 'Bearer ${secretKey}'
    },
    body: JSON.stringify({
      publicKey: '${publicKey}',
      amount: orderData.amount,        // e.g., 100 = Le 100.00
      currency: orderData.currency || 'SLE',
      description: orderData.description,
      reference: orderData.orderId,    // Your order ID
      redirectUrl: orderData.redirectUrl,
      customerEmail: orderData.email,
      customerPhone: orderData.phone,
      metadata: {
        orderId: orderData.orderId,
        customerId: orderData.customerId
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create checkout');
  }

  return data;
  // Returns: { sessionId, paymentUrl, expiresAt }
}

// Usage in Express.js
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, description } = req.body;

    // Create your order in database first
    const order = await db.orders.create({ amount, description, status: 'pending' });

    // Create Peeap checkout session
    const checkout = await createCheckoutSession({
      amount: amount,
      description: description,
      orderId: order.id,
      redirectUrl: \`\${process.env.APP_URL}/order/\${order.id}/complete\`
    });

    // Redirect user to payment page
    res.redirect(checkout.paymentUrl);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ============================================================================
// PYTHON (requests)
// ============================================================================

import requests

def create_checkout_session(amount, description, reference, redirect_url=None):
    response = requests.post(
        '${apiUrl}/api/checkout/create',
        json={
            'publicKey': '${publicKey}',
            'amount': amount,
            'currency': 'SLE',
            'description': description,
            'reference': reference,
            'redirectUrl': redirect_url
        }
    )

    if response.status_code != 200:
        raise Exception(response.json().get('error', 'Failed to create checkout'))

    return response.json()

# Usage
checkout = create_checkout_session(
    amount=100,
    description='Premium Plan',
    reference='order_123',
    redirect_url='https://yoursite.com/payment-complete'
)
print(f"Redirect user to: {checkout['paymentUrl']}")


// ============================================================================
// PHP (cURL)
// ============================================================================

<?php
function createCheckoutSession($amount, $description, $reference, $redirectUrl = null) {
    $ch = curl_init('${apiUrl}/api/checkout/create');

    $data = [
        'publicKey' => '${publicKey}',
        'amount' => $amount,
        'currency' => 'SLE',
        'description' => $description,
        'reference' => $reference,
        'redirectUrl' => $redirectUrl
    ];

    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($data),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $result = json_decode($response, true);

    if ($httpCode !== 200) {
        throw new Exception($result['error'] ?? 'Failed to create checkout');
    }

    return $result;
}

// Usage
$checkout = createCheckoutSession(100, 'Order #123', 'order_123', 'https://yoursite.com/complete');
header('Location: ' . $checkout['paymentUrl']);
exit;
?>


// ============================================================================
// WEBHOOK VERIFICATION (Recommended)
// ============================================================================

// Verify webhook signature (Node.js example)
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Webhook endpoint
app.post('/webhooks/peeap', express.json(), (req, res) => {
  const signature = req.headers['x-peeap-signature'];

  if (!verifyWebhookSignature(req.body, signature, '${secretKey}')) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { event, data } = req.body;

  switch (event) {
    case 'payment.completed':
      // Mark order as paid
      await db.orders.update(data.reference, { status: 'paid' });
      break;

    case 'payment.failed':
      // Handle failed payment
      await db.orders.update(data.reference, { status: 'failed' });
      break;
  }

  res.json({ received: true });
});


// ============================================================================
// API RESPONSE FORMATS
// ============================================================================

// Create Checkout Response:
{
  "sessionId": "cs_${isLive ? 'live' : 'test'}_abc123...",
  "paymentUrl": "${checkoutUrl}/checkout/pay/cs_${isLive ? 'live' : 'test'}_abc123...",
  "expiresAt": "2025-01-20T15:30:00Z",
  "amount": 100,
  "currency": "SLE",
  "isTestMode": ${!isLive}
}

// Webhook Payload:
{
  "event": "payment.completed",
  "timestamp": "2025-01-20T14:30:00Z",
  "data": {
    "reference": "order_123",
    "sessionId": "cs_${isLive ? 'live' : 'test'}_abc123",
    "amount": 100,
    "currency": "SLE",
    "status": "completed",
    "paidAt": "2025-01-20T14:30:00Z",
    "paymentMethod": "mobile_money"
  }
}`;
  };

  // Subscription Billing SDK Script
  const getSubscriptionSDKScript = () => {
    const apiUrl = 'https://api.peeap.com';
    const checkoutUrl = 'https://checkout.peeap.com';
    const publicKey = activeKeys.public;
    const isLive = business.is_live_mode;

    return `/**
 * ============================================================================
 * PEEAP SUBSCRIPTION BILLING API
 * ============================================================================
 * Business: ${business.name}
 * Mode: ${isLive ? 'LIVE' : 'SANDBOX (Test Mode)'}
 *
 * Stripe-like recurring billing for your customers.
 * Supports: Cards, Mobile Money, and Peeap Wallet auto-charge.
 * ============================================================================
 */

// ============================================================================
// 1. CREATE SUBSCRIPTION PLAN (Dashboard or API)
// ============================================================================

// Create a subscription plan via API
const planResponse = await fetch('${apiUrl}/api/subscriptions/plans', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${activeKeys.secret}'
  },
  body: JSON.stringify({
    name: 'Premium Monthly',
    description: 'Full access to all features',
    amount: 100,                    // Le 100.00 per billing cycle
    currency: 'SLE',
    interval: 'monthly',            // 'daily' | 'weekly' | 'monthly' | 'yearly'
    interval_count: 1,              // Charge every 1 month
    trial_period_days: 7,           // Optional: 7-day free trial
    features: [                     // Features to display on checkout
      'Unlimited access',
      'Priority support',
      'Advanced analytics'
    ]
  })
});

const { plan } = await planResponse.json();
// plan.id = 'plan_abc123...'


// ============================================================================
// 2. SUBSCRIBE CUSTOMER (Redirect to Hosted Checkout)
// ============================================================================

// Option A: Use Subscription Link (No Code)
// Share this URL: ${checkoutUrl}/subscribe/{plan_id}
// Example: ${checkoutUrl}/subscribe/plan_abc123

// Option B: Embed Subscribe Button
<a href="${checkoutUrl}/subscribe/{plan_id}" class="subscribe-button">
  Subscribe Now
</a>

// Option C: Create Subscription via API with Redirect
const subscribeResponse = await fetch('${apiUrl}/api/subscriptions/subscribe', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${publicKey}'
  },
  body: JSON.stringify({
    plan_id: 'plan_abc123',
    customer_email: 'customer@example.com',
    customer_name: 'John Doe',
    redirect_url: 'https://yoursite.com/subscription-success'
  })
});

const { checkout_url } = await subscribeResponse.json();
// Redirect customer to: checkout_url


// ============================================================================
// 3. CUSTOMER CHECKOUT FLOW
// ============================================================================

/**
 * On the hosted checkout page, customer will:
 * 1. See plan details and features
 * 2. Enter payment method (Card, Mobile Money, or use Peeap Wallet)
 * 3. Accept recurring billing consent with checkboxes
 * 4. Complete initial payment (or start trial)
 *
 * Payment Methods:
 * - Card: Tokenized and auto-charged on renewal
 * - Peeap Wallet: Auto-deducted on renewal
 * - Mobile Money: Payment request sent each billing cycle (user confirms)
 */


// ============================================================================
// 4. WEBHOOK EVENTS
// ============================================================================

// Configure webhook at: ${apiUrl}/merchant/developer/business/{id}
// Events you'll receive:

// subscription.created - New subscription started
{
  "event": "subscription.created",
  "data": {
    "id": "sub_xyz789",
    "plan_id": "plan_abc123",
    "customer_email": "customer@example.com",
    "status": "active",  // or 'trialing'
    "current_period_start": "2025-01-01",
    "current_period_end": "2025-02-01",
    "trial_end": "2025-01-08"  // if applicable
  }
}

// subscription.renewed - Auto-renewal successful
{
  "event": "subscription.renewed",
  "data": {
    "subscription_id": "sub_xyz789",
    "invoice_id": "inv_123",
    "amount": 100,
    "currency": "SLE",
    "period_start": "2025-02-01",
    "period_end": "2025-03-01"
  }
}

// subscription.payment_failed - Renewal payment failed
{
  "event": "subscription.payment_failed",
  "data": {
    "subscription_id": "sub_xyz789",
    "invoice_id": "inv_123",
    "failure_reason": "insufficient_funds",
    "retry_count": 1,
    "next_retry_at": "2025-02-02T00:00:00Z"
  }
}

// subscription.canceled - Customer canceled
{
  "event": "subscription.canceled",
  "data": {
    "subscription_id": "sub_xyz789",
    "canceled_at": "2025-01-15T10:00:00Z",
    "cancel_at_period_end": true,
    "effective_end_date": "2025-02-01"
  }
}


// ============================================================================
// 5. MANAGE SUBSCRIPTIONS (API)
// ============================================================================

// Cancel subscription
await fetch('${apiUrl}/api/subscriptions/{subscription_id}/cancel', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ${activeKeys.secret}' },
  body: JSON.stringify({
    cancel_at_period_end: true  // false = immediate cancel
  })
});

// Pause subscription (skip next billing)
await fetch('${apiUrl}/api/subscriptions/{subscription_id}/pause', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ${activeKeys.secret}' }
});

// Resume paused subscription
await fetch('${apiUrl}/api/subscriptions/{subscription_id}/resume', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ${activeKeys.secret}' }
});

// Get subscription details
const sub = await fetch('${apiUrl}/api/subscriptions/{subscription_id}', {
  headers: { 'Authorization': 'Bearer ${activeKeys.secret}' }
}).then(r => r.json());


// ============================================================================
// 6. CUSTOMER PORTAL (Let customers manage their subscriptions)
// ============================================================================

// Redirect customer to self-service portal
const portalUrl = '${checkoutUrl}/subscriptions?email={customer_email}';
// Customer can view, cancel, and update payment methods


// ============================================================================
// BILLING CYCLE BEHAVIOR
// ============================================================================

/**
 * 3 Days Before Due:
 *   - "Pending Payment" notification appears in customer's transaction list
 *   - Mobile Money: Payment request SMS sent
 *
 * On Due Date:
 *   - Card/Wallet: Auto-charged immediately
 *   - Mobile Money: Another payment request sent
 *
 * Payment Failed:
 *   - Retry 1: After 1 day
 *   - Retry 2: After 3 days
 *   - Retry 3: After 7 days
 *   - After 3 failures: 7-day grace period, then auto-cancel
 *
 * Customer Notifications:
 *   - Email + In-app notification for upcoming payments
 *   - Email + In-app notification for failed payments
 *   - Email confirmation for successful renewals
 */`;
  };

  // Get current script based on selected tab
  const getCurrentScript = () => {
    switch (integrationTab) {
      case 'v0':
        return getV0SDKScript();
      case 'server':
        return getServerSDKScript();
      case 'subscriptions':
        return getSubscriptionSDKScript();
      default:
        return getFullSDKScript();
    }
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

      {/* Enabled Features */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium text-gray-900">Enabled Features</h3>
            <p className="text-sm text-gray-500">Additional payment capabilities for your business</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Subscriptions Feature */}
          <div className={`p-4 rounded-lg border-2 ${
            business.enabled_features?.includes('subscriptions')
              ? 'border-green-200 bg-green-50'
              : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${
                  business.enabled_features?.includes('subscriptions')
                    ? 'bg-green-100'
                    : 'bg-gray-100'
                }`}>
                  <Repeat className={`w-5 h-5 ${
                    business.enabled_features?.includes('subscriptions')
                      ? 'text-green-600'
                      : 'text-gray-400'
                  }`} />
                </div>
                <span className="font-medium text-gray-900">Subscriptions</span>
              </div>
              {business.enabled_features?.includes('subscriptions') ? (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Active</span>
              ) : (
                <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">Inactive</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Create recurring billing plans and auto-charge customers
            </p>
            {business.enabled_features?.includes('subscriptions') ? (
              <a
                href="/merchant/subscriptions"
                className="text-sm text-green-600 hover:text-green-700 font-medium"
              >
                Manage Plans →
              </a>
            ) : (
              <p className="text-xs text-gray-400">Contact admin to enable</p>
            )}
          </div>

          {/* Payment Links Feature */}
          <div className={`p-4 rounded-lg border-2 ${
            business.enabled_features?.includes('payment_links')
              ? 'border-green-200 bg-green-50'
              : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${
                  business.enabled_features?.includes('payment_links')
                    ? 'bg-green-100'
                    : 'bg-gray-100'
                }`}>
                  <Link2 className={`w-5 h-5 ${
                    business.enabled_features?.includes('payment_links')
                      ? 'text-green-600'
                      : 'text-gray-400'
                  }`} />
                </div>
                <span className="font-medium text-gray-900">Payment Links</span>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Active</span>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Create shareable links to collect payments
            </p>
            <span className="text-sm text-gray-400">Included by default</span>
          </div>

          {/* Invoices Feature */}
          <div className={`p-4 rounded-lg border-2 ${
            business.enabled_features?.includes('invoices')
              ? 'border-green-200 bg-green-50'
              : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${
                  business.enabled_features?.includes('invoices')
                    ? 'bg-green-100'
                    : 'bg-gray-100'
                }`}>
                  <FileText className={`w-5 h-5 ${
                    business.enabled_features?.includes('invoices')
                      ? 'text-green-600'
                      : 'text-gray-400'
                  }`} />
                </div>
                <span className="font-medium text-gray-900">Invoices</span>
              </div>
              {business.enabled_features?.includes('invoices') ? (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Active</span>
              ) : (
                <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">Coming Soon</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Send professional invoices with payment tracking
            </p>
            <span className="text-xs text-gray-400">Coming soon</span>
          </div>
        </div>
      </Card>

      {/* Integration Section Header */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Integration</h3>
        <p className="text-sm text-gray-500">Add payment capabilities to your website or application</p>
      </div>

      {/* Complete SDK Documentation with Tabs */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-gray-600" />
            <h3 className="font-medium text-gray-900">Peeap Payment SDK</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">AI-Ready</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">v2.3.0</span>
          </div>
        </div>

        {/* Integration Type Tabs */}
        <div className="flex flex-wrap gap-2 mb-4 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setIntegrationTab('standard')}
            className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
              integrationTab === 'standard'
                ? 'bg-white shadow text-primary-700 ring-1 ring-primary-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Globe className="w-4 h-4" />
              <span>Standard SDK</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">Most websites</p>
          </button>
          <button
            onClick={() => setIntegrationTab('v0')}
            className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
              integrationTab === 'v0'
                ? 'bg-white shadow text-orange-700 ring-1 ring-orange-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>v0 / Restricted</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">v0.dev, sandboxes</p>
          </button>
          <button
            onClick={() => setIntegrationTab('server')}
            className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
              integrationTab === 'server'
                ? 'bg-white shadow text-blue-700 ring-1 ring-blue-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Settings className="w-4 h-4" />
              <span>Server-Side</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">Node, Python, PHP</p>
          </button>
          <button
            onClick={() => setIntegrationTab('subscriptions')}
            className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
              integrationTab === 'subscriptions'
                ? 'bg-white shadow text-green-700 ring-1 ring-green-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Repeat className="w-4 h-4" />
              <span>Subscriptions</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">Recurring billing</p>
          </button>
        </div>

        {/* Tab Description */}
        <div className="mb-4">
          {integrationTab === 'standard' && (
            <div className="p-3 bg-primary-50 border border-primary-100 rounded-lg">
              <p className="text-sm text-primary-800">
                <strong>Standard SDK</strong> - Best for most websites, React, Vue, Next.js, and AI platforms like
                <strong> Lovable</strong>, <strong>Bolt</strong>, and others. Uses hosted checkout with redirect flow.
              </p>
            </div>
          )}
          {integrationTab === 'v0' && (
            <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg">
              <p className="text-sm text-orange-800">
                <strong>V0 / Restricted Environment SDK</strong> - Specifically designed for <strong>v0.dev</strong>,
                Vercel previews, CodeSandbox, StackBlitz, and any environment with strict CSP policies.
                Uses pure redirect flow with no iframes or popups.
              </p>
            </div>
          )}
          {integrationTab === 'server' && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Server-Side Integration</strong> - For backend-first architectures using Node.js, Python, PHP,
                Ruby, or Go. Includes webhook verification and secure API patterns.
              </p>
            </div>
          )}
          {integrationTab === 'subscriptions' && (
            <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Subscription Billing API</strong> - Create recurring billing plans, collect payment methods with
                consent, and auto-charge customers on renewal. Supports Cards, Mobile Money, and Peeap Wallet.
                {!business.enabled_features?.includes('subscriptions') && (
                  <span className="block mt-1 text-yellow-700">
                    Note: Contact admin to enable subscriptions for your business.
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

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
            <p className="text-xs text-gray-500">
              {integrationTab === 'v0' ? 'Environment' : 'Frameworks'}
            </p>
            <p className="font-semibold text-gray-900">
              {integrationTab === 'v0' ? 'Sandboxed' : 'All'}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-xs text-gray-500">Setup Time</p>
            <p className="font-semibold text-gray-900">2 min</p>
          </div>
        </div>

        <div className="relative">
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto max-h-[500px] overflow-y-auto">
            <code>{getCurrentScript()}</code>
          </pre>
          <button
            onClick={() => copyToClipboard(getCurrentScript(), 'sdk')}
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
                Copy Code
              </>
            )}
          </button>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            {integrationTab === 'v0' ? (
              <>
                <strong>Using v0.dev?</strong> Copy this code and paste it directly into your v0 project.
                It's designed to work without triggering CSP blocks or "content blocked" errors.
              </>
            ) : (
              <>
                <strong>Tip:</strong> Paste this entire code into ChatGPT, Claude, Lovable, v0, or any AI platform -
                they will understand the full API and help integrate it into your project.
              </>
            )}
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
