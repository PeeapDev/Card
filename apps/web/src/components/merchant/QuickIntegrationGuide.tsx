/**
 * Quick Integration Guide Component
 *
 * Shows merchants simple copy-paste code snippets for payment integration
 * Uses the new SDK with publicKey authentication
 */

import { useState } from 'react';
import { Copy, Check, ExternalLink, AlertTriangle, Info, Globe, Edit2, Save } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface QuickIntegrationGuideProps {
  publicKey: string;
  testPublicKey?: string;
  merchantName: string;
  merchantLogo?: string;
  brandColor?: string;
  isLive?: boolean;
}

export function QuickIntegrationGuide({
  publicKey,
  testPublicKey,
  merchantName,
  merchantLogo,
  brandColor = '#4F46E5',
  isLive = false,
}: QuickIntegrationGuideProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [amount, setAmount] = useState('50');
  const [currency, setCurrency] = useState('SLE');
  const [description, setDescription] = useState('Payment');
  const [useTestMode, setUseTestMode] = useState(!isLive);
  const [redirectUrl, setRedirectUrl] = useState('');
  const [savedRedirectUrl, setSavedRedirectUrl] = useState('');
  const [isEditingUrl, setIsEditingUrl] = useState(false);

  const activeKey = useTestMode && testPublicKey ? testPublicKey : publicKey;
  const modeLabel = useTestMode ? 'TEST' : 'LIVE';

  // Check if URL is saved
  const isUrlSaved = savedRedirectUrl.trim() !== '';

  // Save redirect URL
  const handleSaveUrl = () => {
    if (redirectUrl.trim()) {
      setSavedRedirectUrl(redirectUrl.trim());
      setIsEditingUrl(false);
    }
  };

  // Edit saved URL
  const handleEditUrl = () => {
    setRedirectUrl(savedRedirectUrl);
    setIsEditingUrl(true);
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  // Get redirect URL for code - use saved URL
  const getRedirectUrlForCode = () => savedRedirectUrl;

  // SDK Script Code (Recommended - V0 Compatible)
  const sdkCode = `<!-- STEP 1: Add Peeap SDK Script -->
<script src="https://checkout.peeap.com/embed/peeap-v0.js"></script>

<!-- STEP 2: Initialize SDK -->
<script>
// Initialize Peeap SDK with your ${modeLabel} key
PeeapV0.init({
  publicKey: '${activeKey}',

  // Called when payment succeeds
  onSuccess: function(payment) {
    // Payment completed - user was redirected back from Peeap
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
</script>

<!-- STEP 3: Add Payment Button -->
<button onclick="payWithPeeap()" style="background:${brandColor};color:white;padding:15px 30px;border:none;border-radius:8px;font-weight:600;cursor:pointer;">
  Pay ${formatAmount(amount, currency)}
</button>

<script>
function payWithPeeap() {
  PeeapV0.pay({
    amount: ${amount},           // Amount in NEW Leone (SLE)
    currency: '${currency}',
    description: '${description}',
    reference: 'order_' + Date.now(), // Your unique order ID
    redirectUrl: '${getRedirectUrlForCode()}' // Where to redirect after payment
  });
}
</script>`;

  // Direct API Code
  const apiCode = `<!-- Direct API Integration (No SDK) -->
<button id="pay-btn" style="background:${brandColor};color:white;padding:15px 30px;border:none;border-radius:8px;font-weight:600;cursor:pointer;">
  Pay ${formatAmount(amount, currency)}
</button>

<script>
document.getElementById('pay-btn').addEventListener('click', async function() {
  const btn = this;
  btn.disabled = true;
  btn.textContent = 'Processing...';

  try {
    const response = await fetch('https://api.peeap.com/api/checkout/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicKey: '${activeKey}',
        amount: ${amount},
        currency: '${currency}',
        description: '${description}',
        reference: 'order_' + Date.now(),
        redirectUrl: '${getRedirectUrlForCode()}'
      })
    });

    const data = await response.json();

    if (data.paymentUrl) {
      window.location.href = data.paymentUrl;
    } else {
      throw new Error(data.error || 'Failed to create checkout');
    }
  } catch (error) {
    btn.disabled = false;
    btn.textContent = 'Pay ${formatAmount(amount, currency)}';
    alert('Payment error: ' + error.message);
  }
});
</script>`;

  // cURL command for backend
  const curlCode = `# Create a checkout session
curl -X POST https://api.peeap.com/api/checkout/create \\
  -H "Content-Type: application/json" \\
  -d '{
    "publicKey": "${activeKey}",
    "amount": ${amount},
    "currency": "${currency}",
    "description": "${description}",
    "reference": "order_123",
    "redirectUrl": "${getRedirectUrlForCode()}"
  }'

# Response:
# {
#   "sessionId": "cs_xxx",
#   "paymentUrl": "https://checkout.peeap.com/checkout/pay/cs_xxx",
#   "expiresAt": "2024-...",
#   "amount": ${amount},
#   "currency": "${currency}",
#   "isTestMode": ${useTestMode}
# }
#
# Redirect your user to the paymentUrl to complete payment`;

  // Node.js/JavaScript backend code
  const nodeCode = `// Node.js / JavaScript Backend Integration
const createCheckout = async (orderDetails) => {
  const response = await fetch('https://api.peeap.com/api/checkout/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      publicKey: '${activeKey}',
      amount: orderDetails.amount,
      currency: '${currency}',
      description: orderDetails.description,
      reference: orderDetails.orderId,
      redirectUrl: '${getRedirectUrlForCode()}',
      // Optional customer info
      customerEmail: orderDetails.email,
      customerPhone: orderDetails.phone,
      customerName: orderDetails.name,
      // Optional metadata
      metadata: {
        orderId: orderDetails.orderId,
        customField: 'value'
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Checkout creation failed');
  }

  return data.paymentUrl; // Redirect user to this URL
};

// Usage:
// const paymentUrl = await createCheckout({
//   amount: 100,
//   description: 'Order #12345',
//   orderId: '12345',
//   email: 'customer@email.com'
// });
// res.redirect(paymentUrl);`;

  return (
    <div className="space-y-6">
      {/* Step 1: Website URL Setup (Required First) */}
      {!isUrlSaved || isEditingUrl ? (
        <Card className="p-6 border-2 border-indigo-500 bg-indigo-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-indigo-900">Step 1: Enter Your Website URL</h3>
              <p className="text-sm text-indigo-700">Where should users go after completing payment?</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Redirect URL (Your payment success page)
              </label>
              <input
                type="url"
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                className="w-full px-4 py-3 border-2 border-indigo-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-lg"
                placeholder="https://yoursite.com/payment-success"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveUrl();
                }}
              />
              <p className="text-xs text-gray-500 mt-2">
                Example: https://mystore.com/thank-you or https://myapp.com/payment-complete
              </p>
            </div>

            <button
              onClick={handleSaveUrl}
              disabled={!redirectUrl.trim()}
              className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                redirectUrl.trim()
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Save className="w-5 h-5" />
              Save & Show Integration Code
            </button>

            {isEditingUrl && (
              <button
                onClick={() => setIsEditingUrl(false)}
                className="w-full py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            )}
          </div>
        </Card>
      ) : (
        /* Saved URL Display */
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-800">Redirect URL Configured</p>
                <p className="text-sm text-green-700 font-mono">{savedRedirectUrl}</p>
              </div>
            </div>
            <button
              onClick={handleEditUrl}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-700 hover:bg-green-100 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Change
            </button>
          </div>
        </Card>
      )}

      {/* Show everything else only after URL is saved */}
      {isUrlSaved && !isEditingUrl && (
        <>
      {/* Currency Notice */}
      <Card className="p-4 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-800 mb-1">Sierra Leone Currency Note</h4>
            <p className="text-sm text-amber-700">
              Sierra Leone redenominated its currency in 2022. Use <strong>SLE</strong> (New Leone) with whole numbers.
              <br />
              Example: <code className="bg-amber-100 px-1 rounded">amount: 50</code> = Le 50.00 (fifty new Leones)
            </p>
          </div>
        </div>
      </Card>

      {/* Configuration */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Payment Configuration</h3>

        {/* Mode Toggle */}
        {testPublicKey && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Mode: </span>
                <span className={`text-sm font-bold ${useTestMode ? 'text-orange-600' : 'text-green-600'}`}>
                  {useTestMode ? 'TEST MODE' : 'LIVE MODE'}
                </span>
              </div>
              <button
                onClick={() => setUseTestMode(!useTestMode)}
                className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                  useTestMode
                    ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                Switch to {useTestMode ? 'Live' : 'Test'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {useTestMode
                ? 'Test mode uses sandbox - no real payments are processed'
                : 'Live mode processes real payments'
              }
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (New Leone - SLE)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Display: {formatAmount(amount, currency)}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="SLE">SLE - New Leone (Sierra Leone)</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="NGN">NGN - Nigerian Naira</option>
              <option value="GHS">GHS - Ghanaian Cedi</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Payment for..."
            />
          </div>
        </div>

        {/* Your Keys */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Your {modeLabel} Public Key:</strong>{' '}
            <code className="bg-gray-200 px-2 py-0.5 rounded text-xs">{activeKey}</code>
          </p>
        </div>
      </Card>

      {/* Method 1: SDK (Recommended) */}
      <Card className="p-6 border-2 border-indigo-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Method 1: SDK Integration (Recommended)</h3>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">Best for v0.dev</span>
          </div>
        </div>
        <p className="text-gray-600 text-sm mb-4">
          Works everywhere - v0.dev, Vercel previews, Wix, WordPress, any website. Copy and paste!
        </p>

        <div className="relative">
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto max-h-96">
            <pre className="text-sm whitespace-pre-wrap">{sdkCode}</pre>
          </div>
          <button
            onClick={() => copyToClipboard(sdkCode, 'sdk')}
            className="absolute top-2 right-2 p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1"
          >
            {copiedCode === 'sdk' ? (
              <>
                <Check className="w-4 h-4" />
                <span className="text-xs">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span className="text-xs">Copy</span>
              </>
            )}
          </button>
        </div>
      </Card>

      {/* Method 2: Direct API */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Method 2: Direct API (No SDK)</h3>
        <p className="text-gray-600 text-sm mb-4">
          Simple fetch-based integration without the SDK.
        </p>

        <div className="relative">
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto max-h-80">
            <pre className="text-sm whitespace-pre-wrap">{apiCode}</pre>
          </div>
          <button
            onClick={() => copyToClipboard(apiCode, 'api')}
            className="absolute top-2 right-2 p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            {copiedCode === 'api' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </Card>

      {/* Method 3: Backend (cURL) */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Method 3: Backend Integration (cURL)</h3>
        <p className="text-gray-600 text-sm mb-4">
          Create checkout sessions from your server.
        </p>

        <div className="relative">
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm whitespace-pre-wrap">{curlCode}</pre>
          </div>
          <button
            onClick={() => copyToClipboard(curlCode, 'curl')}
            className="absolute top-2 right-2 p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            {copiedCode === 'curl' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </Card>

      {/* Method 4: Node.js */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Method 4: Node.js / JavaScript Backend</h3>
        <p className="text-gray-600 text-sm mb-4">
          Full backend integration with customer info and metadata.
        </p>

        <div className="relative">
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto max-h-80">
            <pre className="text-sm whitespace-pre-wrap">{nodeCode}</pre>
          </div>
          <button
            onClick={() => copyToClipboard(nodeCode, 'node')}
            className="absolute top-2 right-2 p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            {copiedCode === 'node' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </Card>

      {/* Redirect URL Documentation */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="w-full">
            <h4 className="font-semibold text-blue-800 mb-2">Redirect URL Parameters</h4>
            <p className="text-sm text-blue-700 mb-3">
              After payment completes, users are redirected to your <code className="bg-blue-100 px-1 rounded">redirectUrl</code> with these URL parameters:
            </p>

            <div className="bg-white rounded-lg p-4 mb-4 border border-blue-200">
              <p className="text-xs text-gray-500 mb-2">Example redirect URL:</p>
              <code className="text-xs text-blue-800 break-all">
                https://yoursite.com/payment-success?status=success&session_id=cs_xxx&reference=ORDER-123&amount=50&currency=SLE&payment_method=mobile_money
              </code>
            </div>

            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b border-blue-200">
                  <th className="text-left py-2 text-blue-800 font-semibold">Parameter</th>
                  <th className="text-left py-2 text-blue-800 font-semibold">Description</th>
                  <th className="text-left py-2 text-blue-800 font-semibold">Example</th>
                </tr>
              </thead>
              <tbody className="text-blue-700">
                <tr className="border-b border-blue-100">
                  <td className="py-2"><code className="bg-blue-100 px-1 rounded">status</code></td>
                  <td className="py-2">Payment result</td>
                  <td className="py-2"><code className="text-green-600">success</code></td>
                </tr>
                <tr className="border-b border-blue-100">
                  <td className="py-2"><code className="bg-blue-100 px-1 rounded">session_id</code></td>
                  <td className="py-2">Peeap checkout session ID</td>
                  <td className="py-2"><code>cs_332f4e5b...</code></td>
                </tr>
                <tr className="border-b border-blue-100">
                  <td className="py-2"><code className="bg-blue-100 px-1 rounded">reference</code></td>
                  <td className="py-2">Your order reference</td>
                  <td className="py-2"><code>ORDER-12345</code></td>
                </tr>
                <tr className="border-b border-blue-100">
                  <td className="py-2"><code className="bg-blue-100 px-1 rounded">amount</code></td>
                  <td className="py-2">Payment amount</td>
                  <td className="py-2"><code>50</code></td>
                </tr>
                <tr className="border-b border-blue-100">
                  <td className="py-2"><code className="bg-blue-100 px-1 rounded">currency</code></td>
                  <td className="py-2">Currency code</td>
                  <td className="py-2"><code>SLE</code></td>
                </tr>
                <tr>
                  <td className="py-2"><code className="bg-blue-100 px-1 rounded">payment_method</code></td>
                  <td className="py-2">How user paid</td>
                  <td className="py-2"><code>mobile_money</code>, <code>scan_to_pay</code>, <code>qr_code</code></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* AI Integration Guide - Success Page */}
      <Card className="p-6 bg-emerald-50 border-emerald-200">
        <h4 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs">AI</span>
          Building a Payment Success Page (For AI Integrations)
        </h4>
        <p className="text-sm text-emerald-700 mb-4">
          When building with AI tools (v0.dev, Cursor, Claude, etc.), use these guidelines to create a success page:
        </p>

        <div className="space-y-3 text-sm text-emerald-800">
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 bg-emerald-200 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
            <p><strong>Parse URL parameters</strong> - Extract status, session_id, reference, amount, currency, and payment_method from the URL query string</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 bg-emerald-200 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
            <p><strong>Display payment status</strong> - Show success/failure message with appropriate styling (green for success)</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 bg-emerald-200 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
            <p><strong>Show transaction details</strong> - Display reference, amount, currency, and payment method</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 bg-emerald-200 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
            <p><strong>Include order summary</strong> - Show items purchased, quantities, and totals from your order data</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 bg-emerald-200 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">5</span>
            <p><strong>Add navigation</strong> - Provide a "Back to Shop" or "Continue" button</p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-white rounded-lg border border-emerald-200">
          <p className="text-xs text-gray-500 mb-2 font-medium">Sample Success Page Structure:</p>
          <pre className="text-xs text-emerald-800 whitespace-pre-wrap overflow-x-auto">{`<!-- Payment Success Page Template -->
<div class="success-page">
  <h1>Payment Success</h1>
  <a href="/">Back to Shop</a>

  <div class="transaction-details">
    <h2>Transaction Details</h2>
    <p><strong>Reference:</strong> {session_id}</p>
    <p><strong>Status:</strong> {status}</p>
    <p><strong>Amount:</strong> Le {amount}</p>
    <p><strong>Currency:</strong> {currency}</p>
    <p><strong>Payment Method:</strong> {payment_method}</p>
  </div>

  <div class="order-summary">
    <h2>Items Purchased</h2>
    <!-- Loop through your order items -->
    <div class="item">
      <span>Product Name x1</span>
      <span>Le 50</span>
    </div>
    <div class="total">
      <strong>Total:</strong> Le {amount}
    </div>
  </div>

  <div class="customer-info">
    <h2>Shipping & Customer</h2>
    <p><strong>Name:</strong> Customer Name</p>
    <p><strong>Email:</strong> customer@email.com</p>
    <p><strong>Phone:</strong> +232 xxx xxxx</p>
    <p><strong>Address:</strong> Delivery address</p>
  </div>
</div>`}</pre>
        </div>

        <div className="mt-4 p-3 bg-emerald-100 rounded-lg">
          <p className="text-xs text-emerald-800">
            <strong>Tip for AI tools:</strong> Copy this prompt: "Create a payment success page that reads status, session_id, reference, amount, currency, and payment_method from URL query parameters. Display transaction details, order summary with items, and customer shipping info. Use a clean, modern design with a green success theme."
          </p>
        </div>
      </Card>

      {/* JavaScript Code Sample */}
      <Card className="p-6">
        <h4 className="font-semibold mb-3">JavaScript: Parse Redirect URL Parameters</h4>
        <p className="text-sm text-gray-600 mb-4">
          Use this code to read payment details from the redirect URL on your success page:
        </p>
        <div className="relative">
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm whitespace-pre-wrap">{`// Parse payment details from URL
const urlParams = new URLSearchParams(window.location.search);

const paymentDetails = {
  status: urlParams.get('status'),           // 'success'
  sessionId: urlParams.get('session_id'),    // 'cs_xxx'
  reference: urlParams.get('reference'),     // Your order reference
  amount: urlParams.get('amount'),           // '50'
  currency: urlParams.get('currency'),       // 'SLE'
  paymentMethod: urlParams.get('payment_method') // 'mobile_money', 'scan_to_pay', 'qr_code'
};

// Check if payment was successful
if (paymentDetails.status === 'success') {
  // Show success message, update order status, etc.
} else {
  // Handle failure case
}

// Format amount for display
const formatAmount = (amount, currency) => {
  const symbols = { SLE: 'Le', USD: '$', EUR: '€', GBP: '£' };
  return \`\${symbols[currency] || currency} \${parseFloat(amount).toFixed(2)}\`;
};

// Display: "Le 50.00"
          </div>
          <button
            onClick={() => copyToClipboard(`// Parse payment details from URL
const urlParams = new URLSearchParams(window.location.search);

const paymentDetails = {
  status: urlParams.get('status'),
  sessionId: urlParams.get('session_id'),
  reference: urlParams.get('reference'),
  amount: urlParams.get('amount'),
  currency: urlParams.get('currency'),
  paymentMethod: urlParams.get('payment_method')
};

if (paymentDetails.status === 'success') {
}`, 'urlparse')}
            className="absolute top-2 right-2 p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            {copiedCode === 'urlparse' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </Card>

      {/* Support Info */}
      <Card className="p-6 bg-indigo-50 border-indigo-200">
        <h3 className="text-lg font-semibold mb-2 text-indigo-900">Need Help?</h3>
        <p className="text-indigo-700 text-sm mb-3">
          These code snippets work on ANY website or platform. Just copy and paste!
        </p>
        <div className="flex gap-3">
          <a
            href="https://docs.peeap.com"
            target="_blank"
            className="text-indigo-600 hover:text-indigo-700 text-sm flex items-center gap-1"
          >
            <ExternalLink className="w-4 h-4" />
            View Full Documentation
          </a>
        </div>
      </Card>
        </>
      )}
    </div>
  );
}

// Helper function
function formatAmount(amount: string | number, currency: string): string {
  const amt = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;

  const formatted = amt.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const symbols: Record<string, string> = {
    SLE: 'Le',
    USD: '$',
    EUR: '\u20AC',
    GBP: '\u00A3',
    NGN: '\u20A6',
    GHS: '\u20B5',
  };

  return `${symbols[currency] || currency} ${formatted}`;
}
