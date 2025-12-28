export default function EventTicketsPage() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Tickets</h1>
      <p className="text-xl text-gray-600 mb-8">
        Manage event tickets and handle ticket scanning.
      </p>

      {/* List Tickets */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-1 text-xs font-semibold rounded method-get">GET</span>
          <code className="text-lg">/v1/events/:eventId/tickets</code>
        </div>
        <p className="text-gray-600 mb-4">
          Retrieve all tickets for a specific event.
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
                <td className="py-2 px-3 text-gray-600">Filter: valid, used, cancelled</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3"><code>ticket_type_id</code></td>
                <td className="py-2 px-3 text-gray-600">string</td>
                <td className="py-2 px-3 text-gray-600">Filter by ticket type</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Request</h3>
        <pre className="mb-4">
{`curl -X GET "https://api.peeap.com/api/v1/events/evt_abc123/tickets" \\
  -H "X-API-Key: sk_live_your_api_key"`}
        </pre>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Response</h3>
        <pre>
{`{
  "success": true,
  "data": [
    {
      "id": "tkt_abc123",
      "ticket_code": "TKT-2025-ABC123",
      "ticket_type": {
        "id": "tt_xyz789",
        "name": "General Admission",
        "price": 50.00
      },
      "attendee_name": "John Doe",
      "attendee_email": "john@example.com",
      "status": "valid",
      "scanned_at": null,
      "purchased_at": "2025-01-15T10:00:00.000Z"
    },
    {
      "id": "tkt_def456",
      "ticket_code": "TKT-2025-DEF456",
      "ticket_type": {
        "id": "tt_xyz789",
        "name": "General Admission",
        "price": 50.00
      },
      "attendee_name": "Jane Smith",
      "attendee_email": "jane@example.com",
      "status": "used",
      "scanned_at": "2025-03-15T09:15:00.000Z",
      "purchased_at": "2025-01-20T14:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 145,
    "has_next_page": true
  }
}`}
        </pre>
      </section>

      {/* Scan Ticket */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-1 text-xs font-semibold rounded method-post">POST</span>
          <code className="text-lg">/v1/events/tickets/:ticketId/scan</code>
        </div>
        <p className="text-gray-600 mb-4">
          Scan and validate a ticket at the event entrance. This marks the ticket as used.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800 text-sm">
            <strong>Tip:</strong> You can also use the ticket code instead of the ticket ID.
            Just pass the code as the ticketId parameter (e.g., <code>TKT-2025-ABC123</code>).
          </p>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Request</h3>
        <pre className="mb-4">
{`curl -X POST "https://api.peeap.com/api/v1/events/tickets/tkt_abc123/scan" \\
  -H "X-API-Key: sk_live_your_api_key"`}
        </pre>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Success Response</h3>
        <pre className="mb-4">
{`{
  "success": true,
  "data": {
    "ticket_id": "tkt_abc123",
    "ticket_code": "TKT-2025-ABC123",
    "status": "valid",
    "attendee_name": "John Doe",
    "ticket_type": "General Admission",
    "event_name": "Tech Conference 2025",
    "scanned_at": "2025-03-15T09:00:00.000Z",
    "message": "Ticket validated successfully"
  }
}`}
        </pre>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Already Scanned Response</h3>
        <pre className="mb-4">
{`{
  "success": false,
  "error": {
    "code": "ALREADY_USED",
    "message": "Ticket has already been scanned",
    "details": {
      "scanned_at": "2025-03-15T08:45:00.000Z"
    }
  }
}`}
        </pre>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Invalid Ticket Response</h3>
        <pre>
{`{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Ticket not found or has been cancelled"
  }
}`}
        </pre>
      </section>

      {/* Ticket Statuses */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Ticket Statuses</h2>
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
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">valid</span>
                </td>
                <td className="py-3 px-4 text-gray-600">Ticket is valid and has not been scanned</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">used</span>
                </td>
                <td className="py-3 px-4 text-gray-600">Ticket has been scanned and used</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">cancelled</span>
                </td>
                <td className="py-3 px-4 text-gray-600">Ticket has been cancelled or refunded</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Best Practices */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Scanning Best Practices</h2>
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Handle Network Issues</h3>
            <p className="text-gray-600 text-sm">
              Implement retry logic for network failures. Store failed scans locally and sync
              when connection is restored.
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Display Clear Feedback</h3>
            <p className="text-gray-600 text-sm">
              Show clear visual and audio feedback for valid, invalid, and already-scanned tickets
              so staff can quickly process attendees.
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Use QR Codes</h3>
            <p className="text-gray-600 text-sm">
              Generate QR codes containing the ticket code for faster scanning. The QR code should
              encode the ticket code (e.g., <code>TKT-2025-ABC123</code>).
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
