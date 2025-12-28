export default function ReactComponentsPage() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">React Components</h1>
      <p className="text-xl text-gray-600 mb-8">
        Full reference for all React components in the Peeap Widgets SDK.
      </p>

      {/* Available Components */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Available Components</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900">POSTerminal</h3>
            <p className="text-sm text-gray-600">Complete point-of-sale interface</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900">InvoiceCreator</h3>
            <p className="text-sm text-gray-600">Invoice creation form with preview</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900">InvoiceList</h3>
            <p className="text-sm text-gray-600">Display and manage invoices</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900">EventTicketSales</h3>
            <p className="text-sm text-gray-600">Ticket selection and purchase</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900">TicketScanner</h3>
            <p className="text-sm text-gray-600">QR code scanner for door entry</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900">PaymentLinkCreator</h3>
            <p className="text-sm text-gray-600">Generate shareable payment links</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900">PaymentLinkButton</h3>
            <p className="text-sm text-gray-600">One-click payment button</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900">ProductCatalog</h3>
            <p className="text-sm text-gray-600">Display products with add to cart</p>
          </div>
        </div>
      </section>

      {/* POSTerminal */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">POSTerminal</h2>
        <p className="text-gray-600 mb-4">
          Full point-of-sale interface with product grid, cart, and payment processing.
        </p>

        <pre className="mb-6">
{`import { POSTerminal } from '@peeap/widgets'

<POSTerminal
  apiKey="pk_live_xxx"
  merchantId="xxx"
  theme="light"
  currency="SLL"
  taxRate={15}
  showCategories={true}
  showInventory={true}
  allowDiscounts={true}
  onSaleComplete={(sale) => {
    console.log('Sale completed:', sale)
  }}
  onError={(error) => {
    console.error('Error:', error)
  }}
/>`}
        </pre>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Props Reference</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3">Prop</th>
                <th className="text-left py-2 px-3">Type</th>
                <th className="text-left py-2 px-3">Default</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>apiKey</code></td>
                <td className="py-2 px-3">string (required)</td>
                <td className="py-2 px-3">-</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>merchantId</code></td>
                <td className="py-2 px-3">string (required)</td>
                <td className="py-2 px-3">-</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>theme</code></td>
                <td className="py-2 px-3">'light' | 'dark'</td>
                <td className="py-2 px-3">'light'</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>currency</code></td>
                <td className="py-2 px-3">string</td>
                <td className="py-2 px-3">'USD'</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>taxRate</code></td>
                <td className="py-2 px-3">number</td>
                <td className="py-2 px-3">0</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>showCategories</code></td>
                <td className="py-2 px-3">boolean</td>
                <td className="py-2 px-3">true</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>showInventory</code></td>
                <td className="py-2 px-3">boolean</td>
                <td className="py-2 px-3">true</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>allowDiscounts</code></td>
                <td className="py-2 px-3">boolean</td>
                <td className="py-2 px-3">true</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>onSaleComplete</code></td>
                <td className="py-2 px-3">(sale: Sale) =&gt; void</td>
                <td className="py-2 px-3">-</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>onError</code></td>
                <td className="py-2 px-3">(error: Error) =&gt; void</td>
                <td className="py-2 px-3">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* InvoiceCreator */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">InvoiceCreator</h2>
        <p className="text-gray-600 mb-4">
          Invoice creation form with line items, preview, and send functionality.
        </p>

        <pre className="mb-6">
{`import { InvoiceCreator } from '@peeap/widgets'

<InvoiceCreator
  apiKey="pk_live_xxx"
  merchantId="xxx"
  currency="SLL"
  taxRate={15}
  defaultDueDays={14}
  companyInfo={{
    name: "My Company",
    address: "123 Main St",
    logo: "/logo.png"
  }}
  onInvoiceCreated={(invoice) => console.log(invoice)}
  onInvoiceSent={(invoice) => console.log('Sent:', invoice)}
/>`}
        </pre>
      </section>

      {/* EventTicketSales */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">EventTicketSales</h2>
        <p className="text-gray-600 mb-4">
          Ticket selection and purchase widget for events.
        </p>

        <pre className="mb-6">
{`import { EventTicketSales } from '@peeap/widgets'

<EventTicketSales
  apiKey="pk_live_xxx"
  eventId="evt_abc123"
  showEventHeader={true}
  maxTicketsPerOrder={10}
  onPurchaseComplete={(tickets) => {
    // Redirect to confirmation page
    router.push(\`/tickets/\${tickets[0].id}\`)
  }}
/>`}
        </pre>
      </section>

      {/* TicketScanner */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">TicketScanner</h2>
        <p className="text-gray-600 mb-4">
          QR code scanner for validating tickets at event entrance.
        </p>

        <pre className="mb-6">
{`import { TicketScanner } from '@peeap/widgets'

<TicketScanner
  apiKey="pk_live_xxx"
  eventId="evt_abc123"
  scanMode="camera"  // 'camera' | 'manual' | 'both'
  showStats={true}
  onScanSuccess={(ticket) => {
    playSuccessSound()
    console.log('Welcome:', ticket.attendee_name)
  }}
  onScanError={(error) => {
    playErrorSound()
    console.log('Error:', error.message)
  }}
/>`}
        </pre>
      </section>

      {/* PaymentLinkButton */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">PaymentLinkButton</h2>
        <p className="text-gray-600 mb-4">
          Simple button that opens a payment modal when clicked.
        </p>

        <pre className="mb-6">
{`import { PaymentLinkButton } from '@peeap/widgets'

<PaymentLinkButton
  apiKey="pk_live_xxx"
  amount={99.00}
  currency="USD"
  description="Premium Subscription"
  metadata={{ userId: user.id, plan: 'premium' }}
  onSuccess={(payment) => {
    // Update user subscription
    upgradeUser(payment.metadata.userId)
  }}
  onError={(error) => toast.error(error.message)}
  className="bg-blue-600 text-white px-6 py-3 rounded-lg"
>
  Upgrade to Premium - $99
</PaymentLinkButton>`}
        </pre>
      </section>

      {/* Common Patterns */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Common Patterns</h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Loading States</h3>
            <pre>
{`import { POSTerminal, usePeeapLoading } from '@peeap/widgets'

function POSPage() {
  const { isLoading } = usePeeapLoading()

  if (isLoading) {
    return <LoadingSkeleton />
  }

  return <POSTerminal apiKey="..." merchantId="..." />
}`}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Error Boundaries</h3>
            <pre>
{`import { PeeapErrorBoundary, POSTerminal } from '@peeap/widgets'

<PeeapErrorBoundary
  fallback={<div>Something went wrong. Please refresh.</div>}
  onError={(error) => logToSentry(error)}
>
  <POSTerminal apiKey="..." merchantId="..." />
</PeeapErrorBoundary>`}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Combining Multiple Widgets</h3>
            <pre>
{`import {
  POSTerminal,
  InvoiceCreator,
  PeeapProvider
} from '@peeap/widgets'

// Wrap multiple widgets in a provider to share config
<PeeapProvider
  apiKey="pk_live_xxx"
  merchantId="xxx"
  theme="dark"
  currency="SLL"
>
  <POSTerminal />
  <InvoiceCreator />
</PeeapProvider>`}
            </pre>
          </div>
        </div>
      </section>
    </div>
  )
}
