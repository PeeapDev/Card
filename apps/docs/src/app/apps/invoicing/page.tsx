import { InvoiceDemo } from '@/components/demos/InvoiceDemo'

export default function InvoicingAppPage() {
  return (
    <div className="max-w-6xl mx-auto px-8 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-2xl">
            📄
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoicing</h1>
            <p className="text-gray-500">Professional invoice creation and payment collection</p>
          </div>
        </div>
      </div>

      {/* Interactive Demo */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Interactive Demo</h2>
        <p className="text-gray-600 mb-6">
          Create an invoice below. Add line items, preview the invoice, and see how it would be sent to customers.
        </p>
        <InvoiceDemo />
      </section>

      {/* AI Integration Guide */}
      <section className="mb-12">
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">AI Integration Guide</h2>
          <p className="text-gray-600">
            Copy this prompt to your AI coding assistant to integrate the Invoice widget.
          </p>
        </div>

        <div className="bg-gray-900 text-gray-100 rounded-lg p-6 mb-6">
          <p className="text-gray-400 text-sm mb-3">Prompt for AI Assistant:</p>
          <pre className="text-sm whitespace-pre-wrap text-green-400">
{`I want to add a Peeap Invoice Creator to my app. Here are the details:

## Installation
npm install @peeap/widgets

## Basic Usage (React/Next.js)
import { InvoiceCreator } from '@peeap/widgets'

function MyInvoices() {
  return (
    <InvoiceCreator
      apiKey="pk_live_YOUR_API_KEY"
      merchantId="YOUR_MERCHANT_ID"
      onInvoiceCreated={(invoice) => console.log('Invoice created:', invoice)}
      onInvoiceSent={(invoice) => console.log('Invoice sent:', invoice)}
    />
  )
}

## Available Props
- apiKey (required): Your Peeap public API key
- merchantId (required): Your merchant business ID
- theme: 'light' | 'dark' (default: 'light')
- currency: string (default: 'USD')
- taxRate: number (default: 0) - Default tax percentage
- defaultDueDays: number (default: 30) - Days until due
- showPreview: boolean (default: true) - Show invoice preview
- allowRecurring: boolean (default: false) - Enable recurring invoices
- companyInfo: { name, address, logo } - Your company details
- onInvoiceCreated: (invoice) => void - Callback when invoice is created
- onInvoiceSent: (invoice) => void - Callback when invoice is sent
- onError: (error) => void - Error callback

## Customization
<InvoiceCreator
  apiKey="pk_live_xxx"
  merchantId="xxx"
  currency="SLL"
  taxRate={15}
  defaultDueDays={14}
  companyInfo={{
    name: "My Business",
    address: "123 Main St, Freetown",
    logo: "/logo.png"
  }}
/>

Please integrate this into my app with [describe your requirements].`}
          </pre>
        </div>
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
                <td className="py-3 px-4"><code>currency</code></td>
                <td className="py-3 px-4 text-gray-600">string</td>
                <td className="py-3 px-4 text-gray-600">'USD'</td>
                <td className="py-3 px-4 text-gray-600">Invoice currency</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>taxRate</code></td>
                <td className="py-3 px-4 text-gray-600">number</td>
                <td className="py-3 px-4 text-gray-600">0</td>
                <td className="py-3 px-4 text-gray-600">Default tax percentage</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>defaultDueDays</code></td>
                <td className="py-3 px-4 text-gray-600">number</td>
                <td className="py-3 px-4 text-gray-600">30</td>
                <td className="py-3 px-4 text-gray-600">Days until invoice is due</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>showPreview</code></td>
                <td className="py-3 px-4 text-gray-600">boolean</td>
                <td className="py-3 px-4 text-gray-600">true</td>
                <td className="py-3 px-4 text-gray-600">Show preview before sending</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>allowRecurring</code></td>
                <td className="py-3 px-4 text-gray-600">boolean</td>
                <td className="py-3 px-4 text-gray-600">false</td>
                <td className="py-3 px-4 text-gray-600">Enable recurring invoice option</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>companyInfo</code></td>
                <td className="py-3 px-4 text-gray-600">object</td>
                <td className="py-3 px-4 text-gray-600">-</td>
                <td className="py-3 px-4 text-gray-600">Your company name, address, logo</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>onInvoiceCreated</code></td>
                <td className="py-3 px-4 text-gray-600">function</td>
                <td className="py-3 px-4 text-gray-600">-</td>
                <td className="py-3 px-4 text-gray-600">Callback when invoice is created</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>onInvoiceSent</code></td>
                <td className="py-3 px-4 text-gray-600">function</td>
                <td className="py-3 px-4 text-gray-600">-</td>
                <td className="py-3 px-4 text-gray-600">Callback when invoice is sent</td>
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
            <h3 className="font-semibold text-gray-900 mb-2">Basic Invoice Creator</h3>
            <pre>
{`import { InvoiceCreator } from '@peeap/widgets'

export default function InvoicesPage() {
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1>Create Invoice</h1>
      <InvoiceCreator
        apiKey="pk_live_your_key"
        merchantId="your_merchant_id"
      />
    </div>
  )
}`}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">With Company Branding</h3>
            <pre>
{`<InvoiceCreator
  apiKey="pk_live_your_key"
  merchantId="your_merchant_id"
  companyInfo={{
    name: "ABC Enterprises",
    address: "45 Siaka Stevens Street, Freetown",
    logo: "/company-logo.png",
    email: "billing@abc.sl",
    phone: "+232 76 123 456"
  }}
  currency="SLL"
  taxRate={15}
  defaultDueDays={14}
/>`}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Invoice List View</h3>
            <pre>
{`import { InvoiceList } from '@peeap/widgets'

// Display all invoices with status filters
<InvoiceList
  apiKey="pk_live_your_key"
  merchantId="your_merchant_id"
  filters={['all', 'draft', 'sent', 'paid', 'overdue']}
  onInvoiceClick={(invoice) => router.push(\`/invoices/\${invoice.id}\`)}
/>`}
            </pre>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Common Use Cases</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Freelancer Invoicing</h3>
            <p className="text-sm text-gray-600">
              Create and send invoices to clients with custom payment terms and automatic reminders.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Subscription Billing</h3>
            <p className="text-sm text-gray-600">
              Set up recurring invoices for monthly or annual subscriptions with automatic generation.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">B2B Payments</h3>
            <p className="text-sm text-gray-600">
              Send professional invoices to business clients with detailed line items and tax calculations.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Service Billing</h3>
            <p className="text-sm text-gray-600">
              Bill for hours worked or project milestones with customizable templates.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
