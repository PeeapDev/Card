import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardHeader, CardTitle, CardDescription, Button } from '@/components/ui';
import { ExternalLink, Book, Code, Terminal } from 'lucide-react';

export function ApiDocsPage() {
  const endpoints = [
    {
      category: 'Authentication',
      items: [
        { method: 'POST', path: '/api/v1/auth/register', description: 'Register a new user' },
        { method: 'POST', path: '/api/v1/auth/login', description: 'Login and get tokens' },
        { method: 'POST', path: '/api/v1/auth/refresh', description: 'Refresh access token' },
        { method: 'POST', path: '/api/v1/auth/logout', description: 'Logout and invalidate tokens' },
        { method: 'GET', path: '/api/v1/auth/profile', description: 'Get current user profile' },
      ],
    },
    {
      category: 'Wallets',
      items: [
        { method: 'GET', path: '/api/v1/wallets', description: 'List all wallets' },
        { method: 'POST', path: '/api/v1/wallets', description: 'Create a new wallet' },
        { method: 'GET', path: '/api/v1/wallets/:id', description: 'Get wallet details' },
        { method: 'POST', path: '/api/v1/wallets/:id/deposit', description: 'Deposit funds' },
        { method: 'POST', path: '/api/v1/wallets/transfer', description: 'Transfer between wallets' },
        { method: 'POST', path: '/api/v1/wallets/:id/freeze', description: 'Freeze wallet' },
        { method: 'POST', path: '/api/v1/wallets/:id/unfreeze', description: 'Unfreeze wallet' },
      ],
    },
    {
      category: 'Cards',
      items: [
        { method: 'GET', path: '/api/v1/cards', description: 'List all cards' },
        { method: 'POST', path: '/api/v1/cards', description: 'Create a new card' },
        { method: 'GET', path: '/api/v1/cards/:id', description: 'Get card details' },
        { method: 'POST', path: '/api/v1/cards/:id/activate', description: 'Activate card' },
        { method: 'POST', path: '/api/v1/cards/:id/block', description: 'Block card' },
        { method: 'POST', path: '/api/v1/cards/:id/unblock', description: 'Unblock card' },
        { method: 'PATCH', path: '/api/v1/cards/:id/limits', description: 'Update card limits' },
        { method: 'GET', path: '/api/v1/cards/:id/details', description: 'Get sensitive card details' },
      ],
    },
    {
      category: 'Transactions',
      items: [
        { method: 'GET', path: '/api/v1/transactions', description: 'List all transactions' },
        { method: 'GET', path: '/api/v1/transactions/:id', description: 'Get transaction details' },
        { method: 'POST', path: '/api/v1/transactions/authorize', description: 'Authorize a payment' },
        { method: 'POST', path: '/api/v1/transactions/:id/capture', description: 'Capture authorized payment' },
        { method: 'POST', path: '/api/v1/transactions/:id/reverse', description: 'Reverse a transaction' },
      ],
    },
  ];

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-100 text-green-700';
      case 'POST': return 'bg-blue-100 text-blue-700';
      case 'PUT': return 'bg-yellow-100 text-yellow-700';
      case 'PATCH': return 'bg-orange-100 text-orange-700';
      case 'DELETE': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">API Documentation</h1>
              <p className="mt-2 text-gray-600">
                Complete reference for the PaymentSystem REST API
              </p>
            </div>
            <div className="flex gap-4">
              <a href="/api/docs" target="_blank">
                <Button variant="outline">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Swagger UI
                </Button>
              </a>
              <a href="/" >
                <Button variant="outline">
                  Back to Home
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="text-base">Quick Links</CardTitle>
              </CardHeader>
              <nav className="space-y-1">
                {endpoints.map((section) => (
                  <a
                    key={section.category}
                    href={`#${section.category.toLowerCase()}`}
                    className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg"
                  >
                    {section.category}
                  </a>
                ))}
              </nav>
              <div className="mt-6 px-4">
                <p className="text-sm font-medium text-gray-900 mb-3">Resources</p>
                <div className="space-y-2">
                  <a href="/api/docs" target="_blank" className="flex items-center text-sm text-gray-600 hover:text-gray-900">
                    <Book className="w-4 h-4 mr-2" />
                    Swagger UI
                  </a>
                  <a href="#" className="flex items-center text-sm text-gray-600 hover:text-gray-900">
                    <Code className="w-4 h-4 mr-2" />
                    SDK Libraries
                  </a>
                  <a href="#" className="flex items-center text-sm text-gray-600 hover:text-gray-900">
                    <Terminal className="w-4 h-4 mr-2" />
                    Postman Collection
                  </a>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Base URL */}
            <Card>
              <CardHeader>
                <CardTitle>Base URL</CardTitle>
                <CardDescription>All API requests should be made to:</CardDescription>
              </CardHeader>
              <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400">
                http://localhost:3000/api/v1
              </div>
            </Card>

            {/* Authentication */}
            <Card>
              <CardHeader>
                <CardTitle>Authentication</CardTitle>
                <CardDescription>
                  Most endpoints require authentication via Bearer token
                </CardDescription>
              </CardHeader>
              <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-300 overflow-x-auto">
                <pre>{`// Include in request headers
Authorization: Bearer <access_token>

// Example
curl -X GET http://localhost:3000/api/v1/wallets \\
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."`}</pre>
              </div>
            </Card>

            {/* Endpoints */}
            {endpoints.map((section) => (
              <Card key={section.category} id={section.category.toLowerCase()}>
                <CardHeader>
                  <CardTitle>{section.category}</CardTitle>
                </CardHeader>
                <div className="divide-y divide-gray-100">
                  {section.items.map((endpoint, index) => (
                    <div key={index} className="py-4 flex items-start gap-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getMethodColor(endpoint.method)}`}>
                        {endpoint.method}
                      </span>
                      <div className="flex-1 min-w-0">
                        <code className="text-sm font-mono text-gray-900">{endpoint.path}</code>
                        <p className="text-sm text-gray-500 mt-1">{endpoint.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}

            {/* Example Requests */}
            <Card>
              <CardHeader>
                <CardTitle>Example: Create a Card</CardTitle>
                <CardDescription>Full example of creating a virtual card</CardDescription>
              </CardHeader>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Request</p>
                  <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-300 overflow-x-auto">
                    <pre>{`POST /api/v1/cards
Content-Type: application/json
Authorization: Bearer <token>

{
  "walletId": "uuid-of-wallet",
  "type": "VIRTUAL",
  "cardholderName": "JOHN DOE",
  "dailyLimit": 1000,
  "monthlyLimit": 5000
}`}</pre>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Response (201 Created)</p>
                  <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-300 overflow-x-auto">
                    <pre>{`{
  "id": "card-uuid",
  "walletId": "uuid-of-wallet",
  "maskedNumber": "**** **** **** 1234",
  "expiryMonth": 12,
  "expiryYear": 2027,
  "cardholderName": "JOHN DOE",
  "status": "INACTIVE",
  "type": "VIRTUAL",
  "dailyLimit": 1000,
  "monthlyLimit": 5000,
  "createdAt": "2024-11-29T10:00:00.000Z"
}`}</pre>
                  </div>
                </div>
              </div>
            </Card>

            {/* Error Handling */}
            <Card>
              <CardHeader>
                <CardTitle>Error Responses</CardTitle>
                <CardDescription>Standard error format for all endpoints</CardDescription>
              </CardHeader>
              <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-300 overflow-x-auto">
                <pre>{`// 400 Bad Request
{
  "statusCode": 400,
  "message": ["email must be a valid email"],
  "error": "Bad Request"
}

// 401 Unauthorized
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}

// 404 Not Found
{
  "statusCode": 404,
  "message": "Card not found",
  "error": "Not Found"
}`}</pre>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
