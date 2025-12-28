export default function InvoicesPage() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Invoices</h1>
      <p className="text-xl text-gray-600 mb-8">
        Create, manage, and send professional invoices.
      </p>

      {/* List Invoices */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-1 text-xs font-semibold rounded method-get">GET</span>
          <code className="text-lg">/v1/invoices</code>
        </div>
        <p className="text-gray-600 mb-4">
          Retrieve a list of invoices.
        </p>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Query Parameters</h3>
        <div className="overflow-x-auto mb-4">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-semibold text-gray-900">Parameter</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-900">Type</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-900">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>page</code></td>
                <td className="py-2 px-3 text-gray-600">integer</td>
                <td className="py-2 px-3 text-gray-600">Page number (default: 1)</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>limit</code></td>
                <td className="py-2 px-3 text-gray-600">integer</td>
                <td className="py-2 px-3 text-gray-600">Items per page (default: 20)</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>status</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">Filter: draft, sent, paid, overdue, cancelled</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>customer_email</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">Filter by customer email</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Request</h3>
        <pre className="mb-4">
{`curl -X GET "https://api.peeap.com/api/v1/invoices?status=sent" \\
  -H "X-API-Key: sk_live_your_api_key"`}
        </pre>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Response</h3>
        <pre>
{`{
  "success": true,
  "data": [
    {
      "id": "inv_abc123",
      "invoice_number": "INV-2025-0001",
      "status": "sent",
      "customer_name": "Acme Corporation",
      "customer_email": "billing@acme.com",
      "subtotal": 1000.00,
      "tax_amount": 100.00,
      "total": 1100.00,
      "currency": "USD",
      "due_date": "2025-02-15",
      "items": [
        {
          "description": "Web Development Services",
          "quantity": 10,
          "unit_price": 100.00,
          "total": 1000.00
        }
      ],
      "created_at": "2025-01-15T10:00:00.000Z",
      "sent_at": "2025-01-15T10:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 85,
    "has_next_page": true
  }
}`}
        </pre>
      </section>

      {/* Create Invoice */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-1 text-xs font-semibold rounded method-post">POST</span>
          <code className="text-lg">/v1/invoices</code>
        </div>
        <p className="text-gray-600 mb-4">
          Create a new invoice.
        </p>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Request Body</h3>
        <div className="overflow-x-auto mb-4">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-semibold text-gray-900">Field</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-900">Type</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-900">Required</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-900">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>customer_name</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">Yes</td>
                <td className="py-2 px-3 text-gray-600">Customer or company name</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>customer_email</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">Yes</td>
                <td className="py-2 px-3 text-gray-600">Customer email address</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>items</code></td>
                <td className="py-2 px-3 text-gray-600">array</td>
                <td className="py-2 px-3 text-gray-600">Yes</td>
                <td className="py-2 px-3 text-gray-600">Array of invoice line items</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>items[].description</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">Yes</td>
                <td className="py-2 px-3 text-gray-600">Line item description</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>items[].quantity</code></td>
                <td className="py-2 px-3 text-gray-600">number</td>
                <td className="py-2 px-3 text-gray-600">Yes</td>
                <td className="py-2 px-3 text-gray-600">Quantity</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>items[].unit_price</code></td>
                <td className="py-2 px-3 text-gray-600">number</td>
                <td className="py-2 px-3 text-gray-600">Yes</td>
                <td className="py-2 px-3 text-gray-600">Price per unit</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>due_date</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">No</td>
                <td className="py-2 px-3 text-gray-600">Due date (YYYY-MM-DD)</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>tax_rate</code></td>
                <td className="py-2 px-3 text-gray-600">number</td>
                <td className="py-2 px-3 text-gray-600">No</td>
                <td className="py-2 px-3 text-gray-600">Tax percentage</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>currency</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">No</td>
                <td className="py-2 px-3 text-gray-600">Currency code (default: USD)</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>notes</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">No</td>
                <td className="py-2 px-3 text-gray-600">Notes shown on invoice</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Request</h3>
        <pre>
{`curl -X POST "https://api.peeap.com/api/v1/invoices" \\
  -H "X-API-Key: sk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customer_name": "Acme Corporation",
    "customer_email": "billing@acme.com",
    "items": [
      {
        "description": "Web Development Services",
        "quantity": 10,
        "unit_price": 100.00
      },
      {
        "description": "Hosting (Monthly)",
        "quantity": 1,
        "unit_price": 50.00
      }
    ],
    "due_date": "2025-02-15",
    "tax_rate": 10,
    "notes": "Thank you for your business!"
  }'`}
        </pre>
      </section>

      {/* Get Invoice */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-1 text-xs font-semibold rounded method-get">GET</span>
          <code className="text-lg">/v1/invoices/:id</code>
        </div>
        <p className="text-gray-600 mb-4">
          Retrieve a single invoice by ID.
        </p>
        <pre>
{`curl -X GET "https://api.peeap.com/api/v1/invoices/inv_abc123" \\
  -H "X-API-Key: sk_live_your_api_key"`}
        </pre>
      </section>

      {/* Update Invoice */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-1 text-xs font-semibold rounded method-patch">PATCH</span>
          <code className="text-lg">/v1/invoices/:id</code>
        </div>
        <p className="text-gray-600 mb-4">
          Update a draft invoice. Sent invoices cannot be modified.
        </p>
        <pre>
{`curl -X PATCH "https://api.peeap.com/api/v1/invoices/inv_abc123" \\
  -H "X-API-Key: sk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "due_date": "2025-02-28",
    "notes": "Updated payment terms"
  }'`}
        </pre>
      </section>

      {/* Send Invoice */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-1 text-xs font-semibold rounded method-post">POST</span>
          <code className="text-lg">/v1/invoices/:id/send</code>
        </div>
        <p className="text-gray-600 mb-4">
          Send an invoice to the customer via email. The invoice status will change to "sent".
        </p>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Request Body (Optional)</h3>
        <div className="overflow-x-auto mb-4">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-semibold text-gray-900">Field</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-900">Type</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-900">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>cc</code></td>
                <td className="py-2 px-3 text-gray-600">string[]</td>
                <td className="py-2 px-3 text-gray-600">CC email addresses</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>message</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">Custom email message</td>
              </tr>
            </tbody>
          </table>
        </div>

        <pre>
{`curl -X POST "https://api.peeap.com/api/v1/invoices/inv_abc123/send" \\
  -H "X-API-Key: sk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "cc": ["accounting@yourcompany.com"],
    "message": "Please find attached your invoice for January services."
  }'`}
        </pre>
      </section>
    </div>
  )
}
