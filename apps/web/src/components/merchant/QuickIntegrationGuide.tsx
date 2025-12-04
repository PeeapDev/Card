/**
 * Quick Integration Guide Component
 *
 * Shows merchants simple copy-paste code snippets for payment integration
 * Works with any website builder (Wix, Squarespace, WordPress, etc.)
 */

import { useState } from 'react';
import { Copy, Check, ExternalLink, Play } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface QuickIntegrationGuideProps {
  merchantId: string;
  merchantName: string;
  merchantLogo?: string;
  brandColor?: string;
}

export function QuickIntegrationGuide({
  merchantId,
  merchantName,
  merchantLogo,
  brandColor = '#4F46E5',
}: QuickIntegrationGuideProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [amount, setAmount] = useState('50000');
  const [currency, setCurrency] = useState('SLE');
  const [description, setDescription] = useState('Payment');

  const baseUrl = window.location.origin;
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Build checkout URL
  const buildCheckoutUrl = (customAmount?: string) => {
    const params = new URLSearchParams({
      merchant_id: merchantId,
      amount: customAmount || amount,
      currency,
      description,
      merchant_name: merchantName,
      success_url: `${baseUrl}/success.html`,
      cancel_url: `${baseUrl}/cancel.html`,
    });

    if (merchantLogo) {
      params.append('merchant_logo', merchantLogo);
    }

    params.append('brand_color', brandColor.replace('#', ''));

    return `${apiUrl}/checkout/quick?${params.toString()}`;
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  // Code snippets
  const simpleLink = buildCheckoutUrl();

  const buttonHtml = `<!-- Peeap Payment Button -->
<a href="${buildCheckoutUrl()}"
   style="display:inline-block;background:${brandColor};color:white;padding:15px 30px;text-decoration:none;border-radius:8px;font-weight:600;font-family:system-ui,-apple-system,sans-serif;transition:all 0.2s;"
   onmouseover="this.style.background='${adjustColor(brandColor, -20)}';this.style.transform='translateY(-2px)';this.style.boxShadow='0 10px 20px rgba(79,70,229,0.3)'"
   onmouseout="this.style.background='${brandColor}';this.style.transform='translateY(0)';this.style.boxShadow='none'">
  💳 Pay ${formatAmount(amount, currency)}
</a>`;

  const jsCode = `<!-- Add this button to your page -->
<button id="pay-button"
        style="background:${brandColor};color:white;padding:15px 30px;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:16px;">
  Pay Now
</button>

<script>
document.getElementById('pay-button').addEventListener('click', function() {
  // Get your dynamic amount (e.g., from cart total)
  var amount = ${amount}; // ${formatAmount(amount, currency)}
  var description = '${description}';

  // Build checkout URL
  var checkoutUrl = '${apiUrl}/checkout/quick?' +
    'merchant_id=${merchantId}' +
    '&amount=' + amount +
    '&currency=${currency}' +
    '&description=' + encodeURIComponent(description) +
    '&merchant_name=${encodeURIComponent(merchantName)}' +
    '&success_url=' + encodeURIComponent(window.location.origin + '/success.html') +
    '&cancel_url=' + encodeURIComponent(window.location.origin + '/cancel.html');

  // Redirect to checkout
  window.location.href = checkoutUrl;
});
</script>`;

  const formHtml = `<form action="${apiUrl}/checkout/quick" method="GET">
  <input type="hidden" name="merchant_id" value="${merchantId}">
  <input type="hidden" name="merchant_name" value="${merchantName}">
  <input type="hidden" name="currency" value="${currency}">

  <label>Amount (${currency}):</label>
  <input type="number" name="amount" value="${amount}" required>

  <label>Description:</label>
  <input type="text" name="description" value="${description}" required>

  <button type="submit"
          style="background:${brandColor};color:white;padding:15px 30px;border:none;border-radius:8px;font-weight:600;cursor:pointer;margin-top:10px;">
    Proceed to Payment
  </button>
</form>`;

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Payment Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (minor units)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="50000"
            />
            <p className="text-xs text-gray-500 mt-1">
              Current: {formatAmount(amount, currency)}
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
              <option value="SLE">SLE - Sierra Leone Leone</option>
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
      </Card>

      {/* Method 1: Simple Link */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">✨ Method 1: Simple Payment Link</h3>
          <a
            href={buildCheckoutUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-sm"
          >
            <Play className="w-4 h-4" />
            Test Now
          </a>
        </div>
        <p className="text-gray-600 text-sm mb-4">
          Copy this link and use it anywhere - email, SMS, social media, or your website.
        </p>

        <div className="relative">
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <code className="text-sm break-all">{simpleLink}</code>
          </div>
          <button
            onClick={() => copyToClipboard(simpleLink, 'link')}
            className="absolute top-2 right-2 p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            {copiedCode === 'link' ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </Card>

      {/* Method 2: HTML Button */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">🔘 Method 2: HTML Button</h3>
          <div className="flex gap-2">
            <a
              href={buildCheckoutUrl()}
              target="_blank"
              rel="noopener noreferrer"
              style={{ backgroundColor: brandColor }}
              className="text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90"
            >
              💳 Pay {formatAmount(amount, currency)}
            </a>
          </div>
        </div>
        <p className="text-gray-600 text-sm mb-4">
          Add a beautiful styled button to any HTML page. Works on WordPress, Wix, Squarespace, etc.
        </p>

        <div className="relative">
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{buttonHtml}</pre>
          </div>
          <button
            onClick={() => copyToClipboard(buttonHtml, 'button')}
            className="absolute top-2 right-2 p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            {copiedCode === 'button' ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </Card>

      {/* Method 3: JavaScript */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">⚡ Method 3: JavaScript (Dynamic)</h3>
        <p className="text-gray-600 text-sm mb-4">
          Perfect for shopping carts where the amount changes dynamically.
        </p>

        <div className="relative">
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{jsCode}</pre>
          </div>
          <button
            onClick={() => copyToClipboard(jsCode, 'js')}
            className="absolute top-2 right-2 p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            {copiedCode === 'js' ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </Card>

      {/* Method 4: Form */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">📝 Method 4: HTML Form</h3>
        <p className="text-gray-600 text-sm mb-4">
          Works without JavaScript. Let customers enter the amount.
        </p>

        <div className="relative">
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{formHtml}</pre>
          </div>
          <button
            onClick={() => copyToClipboard(formHtml, 'form')}
            className="absolute top-2 right-2 p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            {copiedCode === 'form' ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </Card>

      {/* Platform Guides */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">🛠️ Platform-Specific Guides</h3>

        <div className="space-y-4">
          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-semibold cursor-pointer">WordPress</summary>
            <div className="mt-3 text-sm text-gray-600">
              <ol className="list-decimal ml-5 space-y-2">
                <li>Go to your page/post editor</li>
                <li>Add a "Custom HTML" block</li>
                <li>Paste Method 2 (HTML Button) code</li>
                <li>Publish your page</li>
              </ol>
            </div>
          </details>

          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-semibold cursor-pointer">Wix / Squarespace / Webflow</summary>
            <div className="mt-3 text-sm text-gray-600">
              <ol className="list-decimal ml-5 space-y-2">
                <li>Add an "Embed" or "Custom Code" element</li>
                <li>Paste Method 2 (HTML Button) code</li>
                <li>Save and publish</li>
              </ol>
            </div>
          </details>

          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-semibold cursor-pointer">Shopify</summary>
            <div className="mt-3 text-sm text-gray-600">
              <ol className="list-decimal ml-5 space-y-2">
                <li>Go to your product page template</li>
                <li>Add Method 3 (JavaScript) code</li>
                <li>Use Shopify variables for dynamic pricing</li>
              </ol>
            </div>
          </details>

          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-semibold cursor-pointer">Email / WhatsApp / SMS</summary>
            <div className="mt-3 text-sm text-gray-600">
              <p>Simply copy Method 1 (Simple Link) and send it directly!</p>
              <p className="mt-2">Example message:</p>
              <div className="bg-gray-50 p-3 rounded mt-2">
                Hi! To complete your payment of {formatAmount(amount, currency)}, please click: <br />
                <a href={buildCheckoutUrl()} className="text-indigo-600">
                  {buildCheckoutUrl().substring(0, 50)}...
                </a>
              </div>
            </div>
          </details>
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
            href="/docs"
            target="_blank"
            className="text-indigo-600 hover:text-indigo-700 text-sm flex items-center gap-1"
          >
            <ExternalLink className="w-4 h-4" />
            View Full Documentation
          </a>
        </div>
      </Card>
    </div>
  );
}

// Helper functions
function formatAmount(amount: string | number, currency: string): string {
  const amt = typeof amount === 'string' ? parseFloat(amount) : amount;
  const formatted = (amt / 100).toFixed(2);

  const symbols: Record<string, string> = {
    SLE: 'Le',
    USD: '$',
    EUR: '€',
    GBP: '£',
    NGN: '₦',
    GHS: '₵',
  };

  return `${symbols[currency] || currency} ${formatted}`;
}

function adjustColor(color: string, amount: number): string {
  const clamp = (num: number) => Math.min(Math.max(num, 0), 255);
  const num = parseInt(color.replace('#', ''), 16);
  const r = clamp((num >> 16) + amount);
  const g = clamp(((num >> 8) & 0x00ff) + amount);
  const b = clamp((num & 0x0000ff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
