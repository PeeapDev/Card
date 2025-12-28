export default function IntroductionPage() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Peeap API Documentation</h1>
      <p className="text-xl text-gray-600 mb-8">
        Build powerful integrations with Peeap's merchant services API.
      </p>

      <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-primary-800 mb-2">Base URL</h2>
        <code className="text-primary-700 bg-primary-100 px-3 py-1 rounded">
          https://api.peeap.com/api/v1
        </code>
      </div>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Overview</h2>
        <p className="text-gray-600 mb-4">
          The Peeap API provides programmatic access to Peeap's merchant services including
          Point of Sale (POS), Invoicing, and Event Management. Use our REST API to build
          custom integrations, automate workflows, and extend your business capabilities.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Available APIs</h2>
        <div className="grid gap-4">
          <div className="border border-gray-200 rounded-lg p-5 hover:border-primary-300 transition-colors">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">POS API</h3>
            <p className="text-gray-600 mb-3">
              Manage products, categories, sales, and inventory for your point of sale system.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">Products</span>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">Categories</span>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">Sales</span>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">Inventory</span>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-5 hover:border-primary-300 transition-colors">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Invoices API</h3>
            <p className="text-gray-600 mb-3">
              Create, manage, and send professional invoices to your customers.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">Create</span>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">Update</span>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">Send</span>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-5 hover:border-primary-300 transition-colors">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Events API</h3>
            <p className="text-gray-600 mb-3">
              Manage events, sell tickets, and handle ticket scanning at the door.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">Events</span>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">Tickets</span>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">Scanning</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Start</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold">
              1
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Get your API key</h3>
              <p className="text-gray-600">
                Log in to your <a href="https://my.peeap.com" className="text-primary-600 hover:underline">Peeap dashboard</a> and
                navigate to Settings &gt; API Keys to generate your API key.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold">
              2
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Make your first request</h3>
              <p className="text-gray-600 mb-2">
                Test your API key by fetching your products:
              </p>
              <pre className="text-sm">
{`curl -X GET "https://api.peeap.com/api/v1/pos/products" \\
  -H "X-API-Key: sk_live_your_api_key"`}
              </pre>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold">
              3
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Build your integration</h3>
              <p className="text-gray-600">
                Explore the API documentation to learn about all available endpoints and start building.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Response Format</h2>
        <p className="text-gray-600 mb-4">
          All API responses follow a consistent JSON format:
        </p>
        <pre>
{`// Success response
{
  "success": true,
  "data": { ... },
  "timestamp": "2025-01-15T10:30:00.000Z"
}

// Paginated response
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "has_next_page": true
  }
}

// Error response
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid API key"
  }
}`}
        </pre>
      </section>
    </div>
  )
}
