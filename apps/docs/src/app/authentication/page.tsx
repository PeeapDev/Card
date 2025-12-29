'use client'

import { CodeBlock } from '@/components/ui/CodeBlock'

export default function AuthenticationPage() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Authentication</h1>
      <p className="text-xl text-gray-600 mb-8">
        Learn how to authenticate your API requests using API keys.
      </p>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">API Keys</h2>
        <p className="text-gray-600 mb-4">
          The Peeap API uses API keys to authenticate requests. You can generate and manage
          your API keys in your <a href="https://my.peeap.com" className="text-primary-600 hover:underline">Peeap dashboard</a>.
        </p>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 text-sm">
            <strong>Important:</strong> Keep your API keys secure. Do not share them in publicly
            accessible areas such as GitHub, client-side code, or anywhere they could be exposed.
          </p>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Key Types</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Prefix</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Type</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>sk_live_</code></td>
                <td className="py-3 px-4 text-gray-600">Live Secret Key</td>
                <td className="py-3 px-4 text-gray-600">For production server-side requests</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>sk_test_</code></td>
                <td className="py-3 px-4 text-gray-600">Test Secret Key</td>
                <td className="py-3 px-4 text-gray-600">For testing and development</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>pk_live_</code></td>
                <td className="py-3 px-4 text-gray-600">Live Public Key</td>
                <td className="py-3 px-4 text-gray-600">For production client-side requests</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>pk_test_</code></td>
                <td className="py-3 px-4 text-gray-600">Test Public Key</td>
                <td className="py-3 px-4 text-gray-600">For testing client-side integrations</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Making Authenticated Requests</h2>
        <p className="text-gray-600 mb-4">
          You can authenticate requests using either the <code>X-API-Key</code> header or
          the <code>Authorization</code> header with a Bearer token.
        </p>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Using X-API-Key Header</h3>
        <CodeBlock
          language="bash"
          code={`curl -X GET "https://api.peeap.com/api/v1/pos/products" \\
  -H "X-API-Key: sk_live_your_api_key"`}
        />

        <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">Using Authorization Header</h3>
        <CodeBlock
          language="bash"
          code={`curl -X GET "https://api.peeap.com/api/v1/pos/products" \\
  -H "Authorization: Bearer sk_live_your_api_key"`}
        />
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">API Key Scopes</h2>
        <p className="text-gray-600 mb-4">
          API keys can be configured with specific scopes to limit access to certain API endpoints.
          When creating an API key, select only the scopes your integration needs.
        </p>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">POS Scopes</h3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Scope</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>pos:products:read</code></td>
                <td className="py-3 px-4 text-gray-600">View POS products</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>pos:products:write</code></td>
                <td className="py-3 px-4 text-gray-600">Manage POS products</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>pos:categories:read</code></td>
                <td className="py-3 px-4 text-gray-600">View POS categories</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>pos:categories:write</code></td>
                <td className="py-3 px-4 text-gray-600">Manage POS categories</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>pos:sales:read</code></td>
                <td className="py-3 px-4 text-gray-600">View POS sales</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>pos:sales:write</code></td>
                <td className="py-3 px-4 text-gray-600">Create and manage POS sales</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>pos:inventory:read</code></td>
                <td className="py-3 px-4 text-gray-600">View inventory levels</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>pos:inventory:write</code></td>
                <td className="py-3 px-4 text-gray-600">Adjust inventory</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Invoice Scopes</h3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Scope</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>invoices:read</code></td>
                <td className="py-3 px-4 text-gray-600">View invoices</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>invoices:write</code></td>
                <td className="py-3 px-4 text-gray-600">Create and manage invoices</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>invoices:send</code></td>
                <td className="py-3 px-4 text-gray-600">Send invoices to customers</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Events Scopes</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Scope</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>events:read</code></td>
                <td className="py-3 px-4 text-gray-600">View events</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>events:write</code></td>
                <td className="py-3 px-4 text-gray-600">Create and manage events</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>events:tickets:read</code></td>
                <td className="py-3 px-4 text-gray-600">View event tickets</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>events:scanning</code></td>
                <td className="py-3 px-4 text-gray-600">Scan and validate tickets</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Test Mode</h2>
        <p className="text-gray-600 mb-4">
          Use test API keys (<code>sk_test_</code>) during development to avoid affecting
          your live data. Test mode requests will only access test data and won't process
          real transactions.
        </p>
        <CodeBlock
          language="bash"
          title="Test Mode Request"
          code={`# Test mode request
curl -X GET "https://api.peeap.com/api/v1/pos/products" \\
  -H "X-API-Key: sk_test_your_test_api_key"`}
        />
      </section>
    </div>
  )
}
