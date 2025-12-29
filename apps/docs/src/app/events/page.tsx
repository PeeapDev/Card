'use client'

import { CodeBlock } from '@/components/ui/CodeBlock'

export default function EventsPage() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Events</h1>
      <p className="text-xl text-gray-600 mb-8">
        Create and manage events with ticket sales.
      </p>

      {/* List Events */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-1 text-xs font-semibold rounded method-get">GET</span>
          <code className="text-lg">/v1/events</code>
        </div>
        <p className="text-gray-600 mb-4">
          Retrieve a list of events.
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
                <td className="py-2 px-3 text-gray-600">Filter: draft, published, cancelled, completed</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>upcoming</code></td>
                <td className="py-2 px-3 text-gray-600">boolean</td>
                <td className="py-2 px-3 text-gray-600">Only show upcoming events</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Request</h3>
        <CodeBlock
          language="bash"
          code={`curl -X GET "https://api.peeap.com/api/v1/events?upcoming=true" \\
  -H "X-API-Key: sk_live_your_api_key"`}
        />

        <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">Response</h3>
        <CodeBlock
          language="json"
          code={`{
  "success": true,
  "data": [
    {
      "id": "evt_abc123",
      "name": "Tech Conference 2025",
      "description": "Annual technology conference",
      "venue": "Convention Center",
      "address": "123 Main St, Freetown",
      "start_date": "2025-03-15T09:00:00.000Z",
      "end_date": "2025-03-15T18:00:00.000Z",
      "status": "published",
      "ticket_types": [
        {
          "id": "tt_xyz789",
          "name": "General Admission",
          "price": 50.00,
          "quantity_available": 500,
          "quantity_sold": 125
        },
        {
          "id": "tt_def456",
          "name": "VIP",
          "price": 150.00,
          "quantity_available": 50,
          "quantity_sold": 20
        }
      ],
      "total_tickets_sold": 145,
      "created_at": "2025-01-10T08:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "has_next_page": false
  }
}`}
        />
      </section>

      {/* Create Event */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-1 text-xs font-semibold rounded method-post">POST</span>
          <code className="text-lg">/v1/events</code>
        </div>
        <p className="text-gray-600 mb-4">
          Create a new event.
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
                <td className="py-2 px-3 text-gray-600">Event name</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>start_date</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">Yes</td>
                <td className="py-2 px-3 text-gray-600">Start date/time (ISO 8601)</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>end_date</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">Yes</td>
                <td className="py-2 px-3 text-gray-600">End date/time (ISO 8601)</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>venue</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">No</td>
                <td className="py-2 px-3 text-gray-600">Venue name</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>ticket_types</code></td>
                <td className="py-2 px-3 text-gray-600">array</td>
                <td className="py-2 px-3 text-gray-600">No</td>
                <td className="py-2 px-3 text-gray-600">Array of ticket types</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Request</h3>
        <CodeBlock
          language="bash"
          code={`curl -X POST "https://api.peeap.com/api/v1/events" \\
  -H "X-API-Key: sk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Summer Music Festival",
    "description": "A day of live music and entertainment",
    "venue": "National Stadium",
    "address": "Freetown, Sierra Leone",
    "start_date": "2025-07-20T14:00:00.000Z",
    "end_date": "2025-07-20T23:00:00.000Z",
    "ticket_types": [
      {
        "name": "General Admission",
        "price": 75.00,
        "quantity_available": 1000
      },
      {
        "name": "VIP Access",
        "price": 200.00,
        "quantity_available": 100
      }
    ]
  }'`}
        />
      </section>

      {/* Get Event */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-1 text-xs font-semibold rounded method-get">GET</span>
          <code className="text-lg">/v1/events/:id</code>
        </div>
        <p className="text-gray-600 mb-4">
          Retrieve a single event by ID.
        </p>
        <CodeBlock
          language="bash"
          code={`curl -X GET "https://api.peeap.com/api/v1/events/evt_abc123" \\
  -H "X-API-Key: sk_live_your_api_key"`}
        />
      </section>

      {/* Update Event */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-1 text-xs font-semibold rounded method-patch">PATCH</span>
          <code className="text-lg">/v1/events/:id</code>
        </div>
        <p className="text-gray-600 mb-4">
          Update an existing event.
        </p>
        <CodeBlock
          language="bash"
          code={`curl -X PATCH "https://api.peeap.com/api/v1/events/evt_abc123" \\
  -H "X-API-Key: sk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "venue": "New Location Arena",
    "status": "published"
  }'`}
        />
      </section>
    </div>
  )
}
