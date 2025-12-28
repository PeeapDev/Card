export default function PosInventoryPage() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Inventory</h1>
      <p className="text-xl text-gray-600 mb-8">
        Track and manage product inventory levels.
      </p>

      {/* Get Inventory */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-1 text-xs font-semibold rounded method-get">GET</span>
          <code className="text-lg">/v1/pos/inventory</code>
        </div>
        <p className="text-gray-600 mb-4">
          Retrieve inventory levels for all products with inventory tracking enabled.
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
                <td className="py-2 px-3"><code>low_stock</code></td>
                <td className="py-2 px-3 text-gray-600">boolean</td>
                <td className="py-2 px-3 text-gray-600">Only show low stock items</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>out_of_stock</code></td>
                <td className="py-2 px-3 text-gray-600">boolean</td>
                <td className="py-2 px-3 text-gray-600">Only show out of stock items</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>category_id</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">Filter by category</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Request</h3>
        <pre className="mb-4">
{`curl -X GET "https://api.peeap.com/api/v1/pos/inventory?low_stock=true" \\
  -H "X-API-Key: sk_live_your_api_key"`}
        </pre>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Response</h3>
        <pre>
{`{
  "success": true,
  "data": [
    {
      "product_id": "prod_abc123",
      "product_name": "Coffee Beans",
      "sku": "COF-BEAN-001",
      "stock_quantity": 8,
      "low_stock_threshold": 10,
      "is_low_stock": true,
      "is_out_of_stock": false,
      "last_updated": "2025-01-15T12:00:00.000Z"
    },
    {
      "product_id": "prod_xyz789",
      "product_name": "Paper Cups",
      "sku": "CUP-001",
      "stock_quantity": 0,
      "low_stock_threshold": 50,
      "is_low_stock": true,
      "is_out_of_stock": true,
      "last_updated": "2025-01-14T18:30:00.000Z"
    }
  ]
}`}
        </pre>
      </section>

      {/* Adjust Inventory */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-1 text-xs font-semibold rounded method-post">POST</span>
          <code className="text-lg">/v1/pos/inventory/:productId/adjust</code>
        </div>
        <p className="text-gray-600 mb-4">
          Adjust inventory levels for a product. Use positive values to add stock and negative values to remove stock.
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
                <td className="py-2 px-3"><code>adjustment</code></td>
                <td className="py-2 px-3 text-gray-600">integer</td>
                <td className="py-2 px-3 text-gray-600">Yes</td>
                <td className="py-2 px-3 text-gray-600">Amount to adjust (positive or negative)</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>reason</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">No</td>
                <td className="py-2 px-3 text-gray-600">Reason for adjustment</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Add Stock</h3>
        <pre className="mb-4">
{`curl -X POST "https://api.peeap.com/api/v1/pos/inventory/prod_abc123/adjust" \\
  -H "X-API-Key: sk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "adjustment": 50,
    "reason": "Received shipment from supplier"
  }'`}
        </pre>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Remove Stock</h3>
        <pre className="mb-4">
{`curl -X POST "https://api.peeap.com/api/v1/pos/inventory/prod_abc123/adjust" \\
  -H "X-API-Key: sk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "adjustment": -5,
    "reason": "Damaged goods written off"
  }'`}
        </pre>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Response</h3>
        <pre>
{`{
  "success": true,
  "data": {
    "product_id": "prod_abc123",
    "product_name": "Coffee Beans",
    "previous_quantity": 8,
    "adjustment": 50,
    "new_quantity": 58,
    "reason": "Received shipment from supplier",
    "adjusted_at": "2025-01-15T14:00:00.000Z"
  }
}`}
        </pre>
      </section>

      {/* Inventory Webhooks */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Inventory Alerts</h2>
        <p className="text-gray-600 mb-4">
          Set up webhooks to receive notifications when inventory levels reach certain thresholds.
          Configure webhooks in your <a href="https://my.peeap.com" className="text-primary-600 hover:underline">Peeap dashboard</a>.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Available Events</h3>
          <ul className="space-y-2 text-gray-600">
            <li><code>inventory.low_stock</code> - Product reached low stock threshold</li>
            <li><code>inventory.out_of_stock</code> - Product is out of stock</li>
            <li><code>inventory.adjusted</code> - Inventory was manually adjusted</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
