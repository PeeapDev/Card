'use client'

import { CodeBlock } from '@/components/ui/CodeBlock'

export default function PosProductsPage() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Products</h1>
      <p className="text-xl text-gray-600 mb-8">
        Manage your POS products programmatically.
      </p>

      {/* List Products */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-1 text-xs font-semibold rounded method-get">GET</span>
          <code className="text-lg">/v1/pos/products</code>
        </div>
        <p className="text-gray-600 mb-4">
          Retrieve a list of all products for your business.
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
                <td className="py-2 px-3 text-gray-600">Items per page (default: 20, max: 100)</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>category_id</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">Filter by category ID</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>search</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">Search by product name</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Request</h3>
        <CodeBlock
          language="bash"
          code={`curl -X GET "https://api.peeap.com/api/v1/pos/products?page=1&limit=20" \\
  -H "X-API-Key: sk_live_your_api_key"`}
        />

        <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">Response</h3>
        <CodeBlock
          language="json"
          code={`{
  "success": true,
  "data": [
    {
      "id": "prod_abc123",
      "name": "Coffee",
      "description": "Fresh brewed coffee",
      "price": 5.00,
      "cost_price": 2.00,
      "sku": "COF-001",
      "barcode": "123456789",
      "category_id": "cat_xyz789",
      "track_inventory": true,
      "stock_quantity": 100,
      "low_stock_threshold": 10,
      "is_active": true,
      "created_at": "2025-01-15T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "has_next_page": true
  }
}`}
        />
      </section>

      {/* Create Product */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-1 text-xs font-semibold rounded method-post">POST</span>
          <code className="text-lg">/v1/pos/products</code>
        </div>
        <p className="text-gray-600 mb-4">
          Create a new product.
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
                <td className="py-2 px-3"><code>name</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">Yes</td>
                <td className="py-2 px-3 text-gray-600">Product name</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>price</code></td>
                <td className="py-2 px-3 text-gray-600">number</td>
                <td className="py-2 px-3 text-gray-600">Yes</td>
                <td className="py-2 px-3 text-gray-600">Selling price</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>description</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">No</td>
                <td className="py-2 px-3 text-gray-600">Product description</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>cost_price</code></td>
                <td className="py-2 px-3 text-gray-600">number</td>
                <td className="py-2 px-3 text-gray-600">No</td>
                <td className="py-2 px-3 text-gray-600">Cost/purchase price</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>sku</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">No</td>
                <td className="py-2 px-3 text-gray-600">Stock keeping unit</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>category_id</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">No</td>
                <td className="py-2 px-3 text-gray-600">Category ID</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>track_inventory</code></td>
                <td className="py-2 px-3 text-gray-600">boolean</td>
                <td className="py-2 px-3 text-gray-600">No</td>
                <td className="py-2 px-3 text-gray-600">Enable inventory tracking</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>stock_quantity</code></td>
                <td className="py-2 px-3 text-gray-600">integer</td>
                <td className="py-2 px-3 text-gray-600">No</td>
                <td className="py-2 px-3 text-gray-600">Initial stock quantity</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Request</h3>
        <CodeBlock
          language="bash"
          code={`curl -X POST "https://api.peeap.com/api/v1/pos/products" \\
  -H "X-API-Key: sk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Espresso",
    "price": 4.50,
    "cost_price": 1.50,
    "category_id": "cat_xyz789",
    "track_inventory": true,
    "stock_quantity": 50
  }'`}
        />
      </section>

      {/* Get Product */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-1 text-xs font-semibold rounded method-get">GET</span>
          <code className="text-lg">/v1/pos/products/:id</code>
        </div>
        <p className="text-gray-600 mb-4">
          Retrieve a single product by ID.
        </p>
        <CodeBlock
          language="bash"
          code={`curl -X GET "https://api.peeap.com/api/v1/pos/products/prod_abc123" \\
  -H "X-API-Key: sk_live_your_api_key"`}
        />
      </section>

      {/* Update Product */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-1 text-xs font-semibold rounded method-patch">PATCH</span>
          <code className="text-lg">/v1/pos/products/:id</code>
        </div>
        <p className="text-gray-600 mb-4">
          Update an existing product. Only include fields you want to change.
        </p>
        <CodeBlock
          language="bash"
          code={`curl -X PATCH "https://api.peeap.com/api/v1/pos/products/prod_abc123" \\
  -H "X-API-Key: sk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "price": 5.50,
    "is_active": false
  }'`}
        />
      </section>

      {/* Delete Product */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-1 text-xs font-semibold rounded method-delete">DELETE</span>
          <code className="text-lg">/v1/pos/products/:id</code>
        </div>
        <p className="text-gray-600 mb-4">
          Delete a product. This action cannot be undone.
        </p>
        <CodeBlock
          language="bash"
          code={`curl -X DELETE "https://api.peeap.com/api/v1/pos/products/prod_abc123" \\
  -H "X-API-Key: sk_live_your_api_key"`}
        />
      </section>
    </div>
  )
}
