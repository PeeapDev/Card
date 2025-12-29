'use client'

import { CodeBlock } from '@/components/ui/CodeBlock'

export default function ErrorsPage() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Errors</h1>
      <p className="text-xl text-gray-600 mb-8">
        Understand API error responses and how to handle them.
      </p>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Response Format</h2>
        <p className="text-gray-600 mb-4">
          When an error occurs, the API returns a JSON response with <code>success: false</code> and
          an <code>error</code> object containing the error code and message.
        </p>
        <CodeBlock
          language="json"
          code={`{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Product name is required"
  }
}`}
        />
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">HTTP Status Codes</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>200</code></td>
                <td className="py-3 px-4 text-gray-600">OK - Request succeeded</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>201</code></td>
                <td className="py-3 px-4 text-gray-600">Created - Resource was created</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>400</code></td>
                <td className="py-3 px-4 text-gray-600">Bad Request - Invalid parameters</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>401</code></td>
                <td className="py-3 px-4 text-gray-600">Unauthorized - Invalid or missing API key</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>403</code></td>
                <td className="py-3 px-4 text-gray-600">Forbidden - API key lacks required scope</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>404</code></td>
                <td className="py-3 px-4 text-gray-600">Not Found - Resource doesn't exist</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>405</code></td>
                <td className="py-3 px-4 text-gray-600">Method Not Allowed - HTTP method not supported</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>429</code></td>
                <td className="py-3 px-4 text-gray-600">Too Many Requests - Rate limit exceeded</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>500</code></td>
                <td className="py-3 px-4 text-gray-600">Internal Server Error - Something went wrong</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Codes</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Code</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>UNAUTHORIZED</code></td>
                <td className="py-3 px-4 text-gray-600">API key is missing or invalid</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>FORBIDDEN</code></td>
                <td className="py-3 px-4 text-gray-600">API key doesn't have required permissions</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>NOT_FOUND</code></td>
                <td className="py-3 px-4 text-gray-600">Requested resource was not found</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>VALIDATION_ERROR</code></td>
                <td className="py-3 px-4 text-gray-600">Request body failed validation</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>METHOD_NOT_ALLOWED</code></td>
                <td className="py-3 px-4 text-gray-600">HTTP method not supported for this endpoint</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>RATE_LIMIT_EXCEEDED</code></td>
                <td className="py-3 px-4 text-gray-600">Too many requests in a short time</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>INTERNAL_ERROR</code></td>
                <td className="py-3 px-4 text-gray-600">Internal server error occurred</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>INSUFFICIENT_STOCK</code></td>
                <td className="py-3 px-4 text-gray-600">Not enough inventory for the requested operation</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4"><code>ALREADY_USED</code></td>
                <td className="py-3 px-4 text-gray-600">Resource has already been used (e.g., ticket scanned)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Handling Errors</h2>
        <p className="text-gray-600 mb-4">
          Always check the <code>success</code> field in the response to determine if the request succeeded.
        </p>
        <CodeBlock
          language="javascript"
          title="Error Handling Example"
          code={`// JavaScript example
async function fetchProducts(apiKey) {
  const response = await fetch('https://api.peeap.com/api/v1/pos/products', {
    headers: {
      'X-API-Key': apiKey
    }
  });

  const data = await response.json();

  if (!data.success) {
    console.error(\`Error: \${data.error.code} - \${data.error.message}\`);

    // Handle specific errors
    switch (data.error.code) {
      case 'UNAUTHORIZED':
        // Redirect to login or refresh API key
        break;
      case 'RATE_LIMIT_EXCEEDED':
        // Wait and retry
        break;
      default:
        // Show error to user
        break;
    }
    return null;
  }

  return data.data;
}`}
        />
      </section>
    </div>
  )
}
