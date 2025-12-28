export default function PaymentLinksAppPage() {
  return (
    <div className="max-w-6xl mx-auto px-8 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-2xl">
            🔗
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payment Links</h1>
            <p className="text-gray-500">Shareable links for quick payments</p>
          </div>
        </div>
      </div>

      {/* Demo Preview */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Interactive Demo</h2>
        <p className="text-gray-600 mb-6">
          Payment links allow you to collect payments without a full checkout. Share via WhatsApp, SMS, or email.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Create Payment Link */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Create Payment Link</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  defaultValue="Consulting Services"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="text"
                  defaultValue="$250.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  readOnly
                />
              </div>
              <button className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium">
                Generate Link
              </button>
            </div>
          </div>

          {/* Generated Link Preview */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Generated Link</h3>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-500 mb-1">Payment Link:</p>
              <code className="text-sm text-primary-600 break-all">
                https://pay.peeap.com/p/abc123xyz
              </code>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                Copy Link
              </button>
              <button className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium">
                Share WhatsApp
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* AI Integration Guide */}
      <section className="mb-12">
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">AI Integration Guide</h2>
          <p className="text-gray-600">
            Copy this prompt to your AI coding assistant to integrate Payment Links.
          </p>
        </div>

        <div className="bg-gray-900 text-gray-100 rounded-lg p-6 mb-6">
          <p className="text-gray-400 text-sm mb-3">Prompt for AI Assistant:</p>
          <pre className="text-sm whitespace-pre-wrap text-green-400">
{`I want to add Peeap Payment Links to my app. Here are the details:

## Installation
npm install @peeap/widgets

## Components Available
1. PaymentLinkCreator - Widget to create payment links
2. PaymentLinkButton - Simple button that opens payment modal
3. PaymentPage - Full hosted payment page component

## Basic Usage - Payment Link Creator
import { PaymentLinkCreator } from '@peeap/widgets'

function CreatePaymentLink() {
  return (
    <PaymentLinkCreator
      apiKey="pk_live_YOUR_API_KEY"
      merchantId="YOUR_MERCHANT_ID"
      onLinkCreated={(link) => {
        console.log('Link URL:', link.url)
        // Copy to clipboard, share via WhatsApp, etc.
      }}
    />
  )
}

## Basic Usage - Payment Button
import { PaymentLinkButton } from '@peeap/widgets'

// Add a "Pay Now" button anywhere
<PaymentLinkButton
  apiKey="pk_live_YOUR_API_KEY"
  amount={50.00}
  currency="USD"
  description="Premium Subscription"
  onSuccess={(payment) => console.log('Paid:', payment)}
>
  Pay $50.00
</PaymentLinkButton>

## PaymentLinkCreator Props
- apiKey (required): Your Peeap public API key
- merchantId (required): Your merchant business ID
- defaultAmount: number - Pre-fill amount
- defaultDescription: string - Pre-fill description
- allowCustomAmount: boolean (default: true)
- expiryOptions: number[] - Expiry hour options
- onLinkCreated: (link) => void
- onError: (error) => void

## PaymentLinkButton Props
- apiKey (required): Your Peeap public API key
- amount (required): Payment amount
- currency: string (default: 'USD')
- description: string - Payment description
- metadata: object - Custom data to attach
- onSuccess: (payment) => void
- onError: (error) => void
- children: ReactNode - Button content

Please integrate this into my app with [describe your requirements].`}
          </pre>
        </div>
      </section>

      {/* Code Examples */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Code Examples</h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Simple Pay Button</h3>
            <pre>
{`import { PaymentLinkButton } from '@peeap/widgets'

// Add payment button to any product or service
<PaymentLinkButton
  apiKey="pk_live_your_key"
  amount={99.00}
  currency="SLL"
  description="Logo Design Service"
  onSuccess={(payment) => {
    // Unlock content, send confirmation, etc.
    router.push('/thank-you')
  }}
  className="bg-blue-600 text-white px-6 py-3 rounded-lg"
>
  Pay Le 99,000
</PaymentLinkButton>`}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Payment Link with WhatsApp Sharing</h3>
            <pre>
{`import { PaymentLinkCreator } from '@peeap/widgets'

function InvoiceActions({ invoiceId, amount, customerPhone }) {
  const handleLinkCreated = (link) => {
    // Open WhatsApp with pre-filled message
    const message = encodeURIComponent(
      \`Hi! Here's your payment link for invoice #\${invoiceId}: \${link.url}\`
    )
    window.open(\`https://wa.me/\${customerPhone}?text=\${message}\`)
  }

  return (
    <PaymentLinkCreator
      apiKey="pk_live_your_key"
      merchantId="your_merchant_id"
      defaultAmount={amount}
      defaultDescription={\`Invoice #\${invoiceId}\`}
      onLinkCreated={handleLinkCreated}
    />
  )
}`}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Subscription Payment Button</h3>
            <pre>
{`// Recurring subscription payment
<PaymentLinkButton
  apiKey="pk_live_your_key"
  amount={29.99}
  currency="USD"
  description="Pro Plan - Monthly"
  metadata={{
    plan: 'pro',
    billing: 'monthly',
    userId: user.id
  }}
  recurring={{
    interval: 'month',
    intervalCount: 1
  }}
  onSuccess={async (payment) => {
    await upgradeUserPlan(user.id, 'pro')
  }}
>
  Subscribe - $29.99/month
</PaymentLinkButton>`}
            </pre>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Common Use Cases</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-2xl mb-2">📱</div>
            <h3 className="font-semibold text-gray-900 mb-1">WhatsApp Payments</h3>
            <p className="text-sm text-gray-600">
              Generate links and share instantly via WhatsApp for quick mobile payments.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-2xl mb-2">🛍️</div>
            <h3 className="font-semibold text-gray-900 mb-1">Social Selling</h3>
            <p className="text-sm text-gray-600">
              Create payment links for products and share on Instagram, Facebook, or Twitter.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-2xl mb-2">💼</div>
            <h3 className="font-semibold text-gray-900 mb-1">Freelancer Deposits</h3>
            <p className="text-sm text-gray-600">
              Collect project deposits or milestone payments without full invoicing.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-2xl mb-2">🎁</div>
            <h3 className="font-semibold text-gray-900 mb-1">Tips & Donations</h3>
            <p className="text-sm text-gray-600">
              Accept tips, donations, or voluntary payments with custom amount entry.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-2xl mb-2">📋</div>
            <h3 className="font-semibold text-gray-900 mb-1">Invoice Follow-up</h3>
            <p className="text-sm text-gray-600">
              Send quick payment links as reminders for unpaid invoices.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-2xl mb-2">🔄</div>
            <h3 className="font-semibold text-gray-900 mb-1">Subscriptions</h3>
            <p className="text-sm text-gray-600">
              Set up recurring payment links for membership or subscription services.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Features</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex gap-3 items-start">
            <span className="text-green-500">✓</span>
            <div>
              <h3 className="font-medium text-gray-900">No Expiry Option</h3>
              <p className="text-sm text-gray-600">Links can stay active indefinitely or expire after set time</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-green-500">✓</span>
            <div>
              <h3 className="font-medium text-gray-900">Custom Amounts</h3>
              <p className="text-sm text-gray-600">Let customers enter their own amount (for donations)</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-green-500">✓</span>
            <div>
              <h3 className="font-medium text-gray-900">Multiple Use</h3>
              <p className="text-sm text-gray-600">Same link can accept multiple payments</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-green-500">✓</span>
            <div>
              <h3 className="font-medium text-gray-900">Payment Tracking</h3>
              <p className="text-sm text-gray-600">See all payments made through each link</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-green-500">✓</span>
            <div>
              <h3 className="font-medium text-gray-900">Mobile Optimized</h3>
              <p className="text-sm text-gray-600">Payment pages work perfectly on mobile browsers</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-green-500">✓</span>
            <div>
              <h3 className="font-medium text-gray-900">Multiple Payment Methods</h3>
              <p className="text-sm text-gray-600">Accept cards, mobile money, and bank transfers</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
