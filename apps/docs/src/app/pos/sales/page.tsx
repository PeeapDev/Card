export default function PosSalesPage() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Sales</h1>
      <p className="text-xl text-gray-600 mb-8">
        Create and manage POS sales transactions.
      </p>

      {/* List Sales */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-1 text-xs font-semibold rounded method-get">GET</span>
          <code className="text-lg">/v1/pos/sales</code>
        </div>
        <p className="text-gray-600 mb-4">
          Retrieve a list of sales transactions.
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
                <td className="py-2 px-3"><code>start_date</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">Filter from date (ISO 8601)</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>end_date</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">Filter to date (ISO 8601)</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>status</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">Filter by status: completed, voided</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Request</h3>
        <pre className="mb-4">
{`curl -X GET "https://api.peeap.com/api/v1/pos/sales?start_date=2025-01-01&limit=50" \\
  -H "X-API-Key: sk_live_your_api_key"`}
        </pre>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Response</h3>
        <pre>
{`{
  "success": true,
  "data": [
    {
      "id": "sale_def456",
      "receipt_number": "RCP-001234",
      "subtotal": 15.00,
      "tax_amount": 1.50,
      "discount_amount": 0,
      "total": 16.50,
      "payment_method": "card",
      "status": "completed",
      "items": [
        {
          "product_id": "prod_abc123",
          "product_name": "Coffee",
          "quantity": 2,
          "unit_price": 5.00,
          "total": 10.00
        },
        {
          "product_id": "prod_xyz789",
          "product_name": "Muffin",
          "quantity": 1,
          "unit_price": 5.00,
          "total": 5.00
        }
      ],
      "created_at": "2025-01-15T14:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 1250,
    "has_next_page": true
  }
}`}
        </pre>
      </section>

      {/* Create Sale */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-1 text-xs font-semibold rounded method-post">POST</span>
          <code className="text-lg">/v1/pos/sales</code>
        </div>
        <p className="text-gray-600 mb-4">
          Create a new sale transaction. Inventory will be automatically adjusted for tracked products.
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
                <td className="py-2 px-3"><code>items</code></td>
                <td className="py-2 px-3 text-gray-600">array</td>
                <td className="py-2 px-3 text-gray-600">Yes</td>
                <td className="py-2 px-3 text-gray-600">Array of sale items</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>items[].product_id</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">Yes</td>
                <td className="py-2 px-3 text-gray-600">Product ID</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>items[].quantity</code></td>
                <td className="py-2 px-3 text-gray-600">integer</td>
                <td className="py-2 px-3 text-gray-600">Yes</td>
                <td className="py-2 px-3 text-gray-600">Quantity sold</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>items[].unit_price</code></td>
                <td className="py-2 px-3 text-gray-600">number</td>
                <td className="py-2 px-3 text-gray-600">No</td>
                <td className="py-2 px-3 text-gray-600">Override price (uses product price if omitted)</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>payment_method</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">Yes</td>
                <td className="py-2 px-3 text-gray-600">cash, card, mobile_money, or other</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>tax_rate</code></td>
                <td className="py-2 px-3 text-gray-600">number</td>
                <td className="py-2 px-3 text-gray-600">No</td>
                <td className="py-2 px-3 text-gray-600">Tax percentage (e.g., 10 for 10%)</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>discount_amount</code></td>
                <td className="py-2 px-3 text-gray-600">number</td>
                <td className="py-2 px-3 text-gray-600">No</td>
                <td className="py-2 px-3 text-gray-600">Discount in currency amount</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>customer_name</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">No</td>
                <td className="py-2 px-3 text-gray-600">Customer name for receipt</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>notes</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">No</td>
                <td className="py-2 px-3 text-gray-600">Internal notes</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Request</h3>
        <pre>
{`curl -X POST "https://api.peeap.com/api/v1/pos/sales" \\
  -H "X-API-Key: sk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "items": [
      { "product_id": "prod_abc123", "quantity": 2 },
      { "product_id": "prod_xyz789", "quantity": 1 }
    ],
    "payment_method": "card",
    "tax_rate": 10,
    "customer_name": "John Doe"
  }'`}
        </pre>
      </section>

      {/* Get Sale */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-1 text-xs font-semibold rounded method-get">GET</span>
          <code className="text-lg">/v1/pos/sales/:id</code>
        </div>
        <p className="text-gray-600 mb-4">
          Retrieve a single sale transaction by ID.
        </p>
        <pre>
{`curl -X GET "https://api.peeap.com/api/v1/pos/sales/sale_def456" \\
  -H "X-API-Key: sk_live_your_api_key"`}
        </pre>
      </section>

      {/* Void Sale */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-1 text-xs font-semibold rounded method-post">POST</span>
          <code className="text-lg">/v1/pos/sales/:id/void</code>
        </div>
        <p className="text-gray-600 mb-4">
          Void a sale transaction. Inventory will be restored for tracked products.
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
                <td className="py-2 px-3"><code>reason</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">No</td>
                <td className="py-2 px-3 text-gray-600">Reason for voiding</td>
              </tr>
            </tbody>
          </table>
        </div>

        <pre>
{`curl -X POST "https://api.peeap.com/api/v1/pos/sales/sale_def456/void" \\
  -H "X-API-Key: sk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "reason": "Customer returned items"
  }'`}
        </pre>
      </section>
    </div>
  )
}
