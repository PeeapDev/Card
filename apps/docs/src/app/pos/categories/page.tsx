export default function PosCategoriesPage() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Categories</h1>
      <p className="text-xl text-gray-600 mb-8">
        Organize your products with categories.
      </p>

      {/* List Categories */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-1 text-xs font-semibold rounded method-get">GET</span>
          <code className="text-lg">/v1/pos/categories</code>
        </div>
        <p className="text-gray-600 mb-4">
          Retrieve all categories for your business.
        </p>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Request</h3>
        <pre className="mb-4">
{`curl -X GET "https://api.peeap.com/api/v1/pos/categories" \\
  -H "X-API-Key: sk_live_your_api_key"`}
        </pre>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Response</h3>
        <pre>
{`{
  "success": true,
  "data": [
    {
      "id": "cat_xyz789",
      "name": "Beverages",
      "description": "Hot and cold drinks",
      "color": "#4F46E5",
      "sort_order": 1,
      "is_active": true,
      "product_count": 12,
      "created_at": "2025-01-10T08:00:00.000Z"
    },
    {
      "id": "cat_abc456",
      "name": "Food",
      "description": "Snacks and meals",
      "color": "#10B981",
      "sort_order": 2,
      "is_active": true,
      "product_count": 25,
      "created_at": "2025-01-10T08:00:00.000Z"
    }
  ]
}`}
        </pre>
      </section>

      {/* Create Category */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-1 text-xs font-semibold rounded method-post">POST</span>
          <code className="text-lg">/v1/pos/categories</code>
        </div>
        <p className="text-gray-600 mb-4">
          Create a new category.
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
                <td className="py-2 px-3 text-gray-600">Category name</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>description</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">No</td>
                <td className="py-2 px-3 text-gray-600">Category description</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>color</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">No</td>
                <td className="py-2 px-3 text-gray-600">Hex color code (e.g., #4F46E5)</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>sort_order</code></td>
                <td className="py-2 px-3 text-gray-600">integer</td>
                <td className="py-2 px-3 text-gray-600">No</td>
                <td className="py-2 px-3 text-gray-600">Display order</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Request</h3>
        <pre>
{`curl -X POST "https://api.peeap.com/api/v1/pos/categories" \\
  -H "X-API-Key: sk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Desserts",
    "description": "Sweet treats and pastries",
    "color": "#EC4899",
    "sort_order": 3
  }'`}
        </pre>
      </section>

      {/* Get Category */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-1 text-xs font-semibold rounded method-get">GET</span>
          <code className="text-lg">/v1/pos/categories/:id</code>
        </div>
        <p className="text-gray-600 mb-4">
          Retrieve a single category by ID.
        </p>
        <pre>
{`curl -X GET "https://api.peeap.com/api/v1/pos/categories/cat_xyz789" \\
  -H "X-API-Key: sk_live_your_api_key"`}
        </pre>
      </section>

      {/* Update Category */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-1 text-xs font-semibold rounded method-patch">PATCH</span>
          <code className="text-lg">/v1/pos/categories/:id</code>
        </div>
        <p className="text-gray-600 mb-4">
          Update an existing category.
        </p>
        <pre>
{`curl -X PATCH "https://api.peeap.com/api/v1/pos/categories/cat_xyz789" \\
  -H "X-API-Key: sk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Hot Beverages",
    "color": "#F59E0B"
  }'`}
        </pre>
      </section>

      {/* Delete Category */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-1 text-xs font-semibold rounded method-delete">DELETE</span>
          <code className="text-lg">/v1/pos/categories/:id</code>
        </div>
        <p className="text-gray-600 mb-4">
          Delete a category. Products in this category will become uncategorized.
        </p>
        <pre>
{`curl -X DELETE "https://api.peeap.com/api/v1/pos/categories/cat_xyz789" \\
  -H "X-API-Key: sk_live_your_api_key"`}
        </pre>
      </section>
    </div>
  )
}
