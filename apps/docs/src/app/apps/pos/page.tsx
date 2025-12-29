'use client'

import { POSDemo } from '@/components/demos/POSDemo'
import { CodeBlock } from '@/components/ui/CodeBlock'

export default function POSAppPage() {
  return (
    <div className="max-w-6xl mx-auto px-8 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-2xl">
            🛒
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">POS Terminal</h1>
            <p className="text-gray-500">Point-of-sale system with cart and payments</p>
          </div>
        </div>
      </div>

      {/* Interactive Demo */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Interactive Demo</h2>
        <p className="text-gray-600 mb-6">
          Try the POS Terminal below. Click products to add them to cart, adjust quantities, and complete a sale.
        </p>
        <POSDemo />
      </section>

      {/* AI Integration Guide */}
      <section className="mb-12">
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">AI Integration Guide</h2>
          <p className="text-gray-600">
            Copy this prompt to your AI coding assistant (v0, Cursor, Claude, ChatGPT) to integrate the POS Terminal.
          </p>
        </div>

        <CodeBlock
          language="bash"
          title="Prompt for AI Assistant"
          code={`I want to add a Peeap POS Terminal to my app. Here are the details:

## Installation
npm install @peeap/widgets

## Basic Usage (React/Next.js)
import { POSTerminal } from '@peeap/widgets'

function MyPOS() {
  return (
    <POSTerminal
      apiKey="pk_live_YOUR_API_KEY"
      merchantId="YOUR_MERCHANT_ID"
      onSaleComplete={(sale) => console.log('Sale completed:', sale)}
    />
  )
}

## Available Props
- apiKey (required): Your Peeap public API key
- merchantId (required): Your merchant business ID
- theme: 'light' | 'dark' (default: 'light')
- showInventory: boolean (default: true) - Show stock levels
- showCategories: boolean (default: true) - Show category filters
- allowDiscounts: boolean (default: true) - Enable discount input
- taxRate: number (default: 0) - Tax percentage (e.g., 15 for 15%)
- currency: string (default: 'SLE') - Currency code
- onSaleComplete: (sale: Sale) => void - Callback when sale is completed
- onError: (error: Error) => void - Error callback

Please integrate this into my app with [describe your requirements].`}
        />
      </section>

      {/* Component Props */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Component Props</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Prop</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Type</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Default</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>apiKey</code></td>
                <td className="py-3 px-4 text-gray-600">string</td>
                <td className="py-3 px-4 text-gray-600">required</td>
                <td className="py-3 px-4 text-gray-600">Your Peeap public API key</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>merchantId</code></td>
                <td className="py-3 px-4 text-gray-600">string</td>
                <td className="py-3 px-4 text-gray-600">required</td>
                <td className="py-3 px-4 text-gray-600">Your merchant business ID</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>theme</code></td>
                <td className="py-3 px-4 text-gray-600">'light' | 'dark'</td>
                <td className="py-3 px-4 text-gray-600">'light'</td>
                <td className="py-3 px-4 text-gray-600">Color theme for the terminal</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>showInventory</code></td>
                <td className="py-3 px-4 text-gray-600">boolean</td>
                <td className="py-3 px-4 text-gray-600">true</td>
                <td className="py-3 px-4 text-gray-600">Show product stock levels</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>taxRate</code></td>
                <td className="py-3 px-4 text-gray-600">number</td>
                <td className="py-3 px-4 text-gray-600">0</td>
                <td className="py-3 px-4 text-gray-600">Tax percentage (e.g., 15 for 15%)</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>currency</code></td>
                <td className="py-3 px-4 text-gray-600">string</td>
                <td className="py-3 px-4 text-gray-600">'SLE'</td>
                <td className="py-3 px-4 text-gray-600">Currency code for display</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>onSaleComplete</code></td>
                <td className="py-3 px-4 text-gray-600">function</td>
                <td className="py-3 px-4 text-gray-600">-</td>
                <td className="py-3 px-4 text-gray-600">Callback when sale is completed</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Code Examples */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Code Examples</h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Basic Integration</h3>
            <CodeBlock
              language="tsx"
              code={`import { POSTerminal } from '@peeap/widgets'

export default function StorePage() {
  return (
    <div className="container mx-auto p-4">
      <h1>My Store</h1>
      <POSTerminal
        apiKey="pk_live_your_key"
        merchantId="your_merchant_id"
      />
    </div>
  )
}`}
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">With Sale Handling</h3>
            <CodeBlock
              language="tsx"
              code={`import { POSTerminal, Sale } from '@peeap/widgets'

export default function StorePage() {
  const handleSaleComplete = (sale: Sale) => {
    console.log('Sale ID:', sale.id)
    console.log('Total:', sale.total)
    console.log('Items:', sale.items)

    // Send receipt, update your own database, etc.
  }

  return (
    <POSTerminal
      apiKey="pk_live_your_key"
      merchantId="your_merchant_id"
      onSaleComplete={handleSaleComplete}
      onError={(error) => console.error(error)}
    />
  )
}`}
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Customized for Sierra Leone</h3>
            <CodeBlock
              language="tsx"
              code={`<POSTerminal
  apiKey="pk_live_your_key"
  merchantId="your_merchant_id"
  currency="SLE"
  taxRate={15}
  theme="light"
  showInventory={true}
  allowDiscounts={true}
/>`}
            />
          </div>
        </div>
      </section>

      {/* Features You Can Control */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Features You Can Enable/Disable</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Product Display</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>- Category tabs - <code>showCategories</code></li>
              <li>- Stock levels - <code>showInventory</code></li>
              <li>- Product images - <code>showImages</code></li>
              <li>- Product search - <code>showSearch</code></li>
            </ul>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Cart & Checkout</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>- Discount input - <code>allowDiscounts</code></li>
              <li>- Tax calculation - <code>taxRate</code></li>
              <li>- Customer name - <code>captureCustomer</code></li>
              <li>- Receipt printing - <code>enablePrint</code></li>
            </ul>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Payment Methods</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>- Cash payments - <code>allowCash</code></li>
              <li>- QR payments - <code>allowQR</code></li>
              <li>- NFC payments - <code>allowNFC</code></li>
              <li>- Mobile money - <code>allowMobileMoney</code></li>
            </ul>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Appearance</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>- Light/dark theme - <code>theme</code></li>
              <li>- Primary color - <code>primaryColor</code></li>
              <li>- Border radius - <code>borderRadius</code></li>
              <li>- Custom CSS - <code>className</code></li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
