export const metadata = {
  title: 'AI Integration Guide - Peeap',
  description: 'Complete guide for AI assistants to integrate Peeap payment widgets and APIs',
}

export default function AIGuidePage() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl p-8 mb-8">
        <h1 className="text-3xl font-bold mb-2">Peeap AI Integration Guide</h1>
        <p className="text-purple-100">
          This page is designed for AI coding assistants (v0, Cursor, Claude, ChatGPT, Copilot)
          to understand how to integrate Peeap payment widgets and APIs.
        </p>
      </div>

      {/* Quick Reference */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Reference</h2>
        <div className="bg-gray-50 rounded-xl p-6">
          <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
{`PEEAP INTEGRATION SUMMARY
========================

Package: @peeap/widgets
CDN: https://cdn.peeap.com/widgets.js
Docs: https://docs.peeap.com
Currency: Sierra Leone New Leones (NLe), ISO: SLE

AVAILABLE WIDGETS:
- POSTerminal: Point-of-sale system
- InvoiceCreator: Invoice generation
- EventTicketSales: Event ticket sales
- TicketScanner: QR ticket validation
- PaymentLinkCreator: Shareable payment links
- PaymentLinkButton: One-click payment button

PAYMENT CHANNELS (all use Peeap Pay):
1. QR Code Checkout - Mobile scan-to-pay
2. NFC/Tap to Pay - Contactless payments
3. Hosted Checkout - Web payment page
4. Mobile Money - Orange Money, Afrimoney
5. Card Payments - Visa, Mastercard`}
          </pre>
        </div>
      </section>

      {/* Installation */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Installation</h2>
        <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm">
{`# Install the package
npm install @peeap/widgets

# Or use CDN
<script src="https://cdn.peeap.com/widgets.js"></script>`}
        </pre>
      </section>

      {/* Widget Configurations */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Widget Configurations</h2>

        {/* POS Terminal */}
        <div className="mb-8 border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">1. POS Terminal</h3>
          <p className="text-gray-600 mb-4">
            Complete point-of-sale system with product catalog, cart, and payment processing.
            Supports QR code, NFC, and cash payments.
          </p>
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto">
{`import { POSTerminal } from '@peeap/widgets'

<POSTerminal
  apiKey="pk_live_YOUR_API_KEY"      // Required: Public API key
  merchantId="YOUR_MERCHANT_ID"       // Required: Merchant ID
  theme="light"                       // "light" | "dark"
  currency="SLE"                      // Currency code (default: SLE)
  taxRate={15}                        // Tax percentage (e.g., 15 for 15%)
  showCategories={true}               // Show category filter tabs
  showInventory={true}                // Show stock levels
  allowDiscounts={true}               // Enable discount input
  paymentMethods={['qr', 'nfc', 'cash']} // Available payment methods
  onSaleComplete={(sale) => {
    // Handle completed sale
    console.log('Sale ID:', sale.id)
    console.log('Total:', sale.total)
    console.log('Receipt:', sale.receipt_number)
  }}
  onError={(error) => console.error(error)}
/>`}
          </pre>
        </div>

        {/* Invoice Creator */}
        <div className="mb-8 border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">2. Invoice Creator</h3>
          <p className="text-gray-600 mb-4">
            Create and send professional invoices with payment links and QR codes.
          </p>
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto">
{`import { InvoiceCreator } from '@peeap/widgets'

<InvoiceCreator
  apiKey="pk_live_YOUR_API_KEY"
  merchantId="YOUR_MERCHANT_ID"
  currency="SLE"
  taxRate={15}
  defaultDueDays={30}                 // Days until due
  companyInfo={{
    name: "Your Company Name",
    address: "123 Street, Freetown, Sierra Leone",
    email: "billing@company.sl",
    logo: "/logo.png"
  }}
  onInvoiceCreated={(invoice) => console.log('Created:', invoice.id)}
  onInvoiceSent={(invoice) => console.log('Sent to:', invoice.customer_email)}
/>`}
          </pre>
        </div>

        {/* Event Tickets */}
        <div className="mb-8 border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">3. Event Ticket Sales</h3>
          <p className="text-gray-600 mb-4">
            Sell event tickets with automatic QR code generation.
          </p>
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto">
{`import { EventTicketSales } from '@peeap/widgets'

<EventTicketSales
  apiKey="pk_live_YOUR_API_KEY"
  eventId="evt_YOUR_EVENT_ID"         // Required: Event ID
  showEventHeader={true}               // Show event name/date
  maxTicketsPerOrder={10}              // Max tickets per purchase
  onPurchaseComplete={(tickets) => {
    // Redirect to confirmation or show tickets
    console.log('Tickets purchased:', tickets)
  }}
/>`}
          </pre>
        </div>

        {/* Ticket Scanner */}
        <div className="mb-8 border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">4. Ticket Scanner</h3>
          <p className="text-gray-600 mb-4">
            Scan and validate tickets at event entrance using camera or manual entry.
          </p>
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto">
{`import { TicketScanner } from '@peeap/widgets'

<TicketScanner
  apiKey="pk_live_YOUR_API_KEY"
  eventId="evt_YOUR_EVENT_ID"
  scanMode="both"                      // "camera" | "manual" | "both"
  showStats={true}                     // Show scan statistics
  onScanSuccess={(ticket) => {
    playSuccessSound()
    console.log('Valid ticket:', ticket.attendee_name)
  }}
  onScanError={(error) => {
    playErrorSound()
    console.log('Invalid:', error.message)
  }}
/>`}
          </pre>
        </div>

        {/* Payment Link Button */}
        <div className="border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">5. Payment Link Button</h3>
          <p className="text-gray-600 mb-4">
            Simple button that opens a payment modal. Perfect for donations, one-time payments.
          </p>
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto">
{`import { PaymentLinkButton } from '@peeap/widgets'

<PaymentLinkButton
  apiKey="pk_live_YOUR_API_KEY"
  amount={100}                         // Amount in local currency
  currency="SLE"
  description="Premium Subscription"
  metadata={{ userId: user.id, plan: 'premium' }}
  onSuccess={(payment) => {
    console.log('Payment successful:', payment.id)
    // Upgrade user, unlock content, etc.
  }}
  onError={(error) => console.error(error)}
  className="bg-blue-600 text-white px-6 py-3 rounded-lg"
>
  Pay NLe 100.00
</PaymentLinkButton>`}
          </pre>
        </div>
      </section>

      {/* Payment Channels */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Channels</h2>
        <p className="text-gray-600 mb-4">
          All Peeap widgets use Peeap Pay for processing. Choose the appropriate channel:
        </p>

        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900">QR Code Checkout</h3>
            <p className="text-sm text-gray-600 mb-2">
              Customer scans QR with mobile banking app. Best for: POS, in-person payments.
            </p>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">paymentChannel: 'qr'</code>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900">NFC/Tap to Pay</h3>
            <p className="text-sm text-gray-600 mb-2">
              Contactless payment via card or phone. Best for: Fast checkout, retail.
            </p>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">paymentChannel: 'nfc'</code>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900">Hosted Checkout</h3>
            <p className="text-sm text-gray-600 mb-2">
              Redirect to Peeap payment page. Best for: E-commerce, online payments.
            </p>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">paymentChannel: 'hosted'</code>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900">Mobile Money</h3>
            <p className="text-sm text-gray-600 mb-2">
              Orange Money, Afrimoney integration. Best for: Mobile-first users.
            </p>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">paymentChannel: 'mobile_money'</code>
          </div>
        </div>
      </section>

      {/* Common Integration Patterns */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Common Integration Patterns</h2>

        <div className="space-y-6">
          <div className="border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Next.js App Router</h3>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto">
{`// app/pos/page.tsx
'use client'

import { POSTerminal } from '@peeap/widgets'

export default function POSPage() {
  return (
    <POSTerminal
      apiKey={process.env.NEXT_PUBLIC_PEEAP_KEY!}
      merchantId={process.env.NEXT_PUBLIC_MERCHANT_ID!}
    />
  )
}`}
            </pre>
          </div>

          <div className="border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-2">React + Vite</h3>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto">
{`// src/components/Checkout.tsx
import { PaymentLinkButton } from '@peeap/widgets'

export function Checkout({ amount, onSuccess }) {
  return (
    <PaymentLinkButton
      apiKey={import.meta.env.VITE_PEEAP_KEY}
      amount={amount}
      onSuccess={onSuccess}
    >
      Pay Now
    </PaymentLinkButton>
  )
}`}
            </pre>
          </div>

          <div className="border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Vanilla JavaScript / HTML</h3>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto">
{`<div id="pos-terminal"></div>
<script src="https://cdn.peeap.com/widgets.js"></script>
<script>
  Peeap.render('POSTerminal', {
    container: '#pos-terminal',
    apiKey: 'pk_live_YOUR_API_KEY',
    merchantId: 'YOUR_MERCHANT_ID',
    onSaleComplete: function(sale) {
      console.log('Sale completed:', sale)
    }
  })
</script>`}
            </pre>
          </div>
        </div>
      </section>

      {/* API Keys */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">API Keys</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-yellow-800 text-sm">
            <strong>Important:</strong> Use public keys (pk_*) for client-side widgets.
            Never expose secret keys (sk_*) in frontend code.
          </p>
        </div>
        <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm">
{`# .env.local
NEXT_PUBLIC_PEEAP_KEY=pk_live_your_public_key
NEXT_PUBLIC_MERCHANT_ID=your_merchant_id

# Server-side only
PEEAP_SECRET_KEY=sk_live_your_secret_key`}
        </pre>
      </section>

      {/* Customization */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Customization</h2>
        <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto">
{`// Theme customization
<POSTerminal
  theme={{
    primaryColor: '#4F46E5',
    backgroundColor: '#FFFFFF',
    textColor: '#111827',
    borderRadius: '12px',
  }}
  className="shadow-xl rounded-2xl"
/>

// CSS variables (global)
.peeap-widget {
  --peeap-primary: #4F46E5;
  --peeap-radius: 12px;
}

// Translations
<POSTerminal
  translations={{
    cart: 'Shopping Basket',
    checkout: 'Complete Purchase',
    total: 'Amount Due',
  }}
/>`}
        </pre>
      </section>

      {/* For AI Assistants */}
      <section className="bg-purple-50 border border-purple-200 rounded-xl p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Instructions for AI Assistants</h2>
        <div className="text-sm text-gray-700 space-y-3">
          <p>
            <strong>When user asks to integrate Peeap:</strong>
          </p>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>Determine which widget they need (POS, Invoice, Events, Payment Link)</li>
            <li>Check their framework (Next.js, React, Vue, vanilla JS)</li>
            <li>Install @peeap/widgets package</li>
            <li>Add the appropriate component with required props (apiKey, merchantId/eventId)</li>
            <li>Set up environment variables for API keys</li>
            <li>Add event handlers for onSuccess/onError callbacks</li>
          </ol>
          <p className="mt-4">
            <strong>Payment channel selection:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Physical store/POS → QR Code or NFC</li>
            <li>Online/E-commerce → Hosted Checkout</li>
            <li>Mobile app → Mobile Money or QR Code</li>
            <li>Donations/Tips → Payment Link Button</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
