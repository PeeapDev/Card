'use client'

import { EventTicketDemo } from '@/components/demos/EventTicketDemo'
import { CodeBlock } from '@/components/ui/CodeBlock'

export default function EventsAppPage() {
  return (
    <div className="max-w-6xl mx-auto px-8 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center text-2xl">
            🎫
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Event Tickets</h1>
            <p className="text-gray-500">Ticket sales, QR codes, and door scanning</p>
          </div>
        </div>
      </div>

      {/* Interactive Demo */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Interactive Demo</h2>
        <p className="text-gray-600 mb-6">
          Try the complete ticket flow: select tickets, complete purchase, then switch to "Door Scanner" to validate tickets.
        </p>
        <div className="max-w-md mx-auto">
          <EventTicketDemo />
        </div>
      </section>

      {/* AI Integration Guide */}
      <section className="mb-12">
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">AI Integration Guide</h2>
          <p className="text-gray-600">
            Copy this prompt to your AI coding assistant to integrate Event Tickets.
          </p>
        </div>

        <CodeBlock
          language="bash"
          title="Prompt for AI Assistant"
          code={`I want to add Peeap Event Tickets to my app. Here are the details:

## Installation
npm install @peeap/widgets

## Components Available
1. EventTicketSales - For selling tickets on your event page
2. TicketScanner - For scanning tickets at the door
3. EventDashboard - For managing events and viewing sales

## Basic Usage - Ticket Sales
import { EventTicketSales } from '@peeap/widgets'

function EventPage({ eventId }) {
  return (
    <EventTicketSales
      apiKey="pk_live_YOUR_API_KEY"
      eventId={eventId}
      onPurchaseComplete={(tickets) => console.log('Purchased:', tickets)}
    />
  )
}

## Basic Usage - Door Scanner
import { TicketScanner } from '@peeap/widgets'

function DoorScannerPage({ eventId }) {
  return (
    <TicketScanner
      apiKey="pk_live_YOUR_API_KEY"
      eventId={eventId}
      onScanSuccess={(ticket) => playSuccessSound()}
      onScanError={(error) => playErrorSound()}
    />
  )
}

## EventTicketSales Props
- apiKey (required): Your Peeap public API key
- eventId (required): The event ID to sell tickets for
- maxTicketsPerOrder: number (default: 10)
- onPurchaseComplete: (tickets) => void

## TicketScanner Props
- apiKey (required): Your Peeap public API key
- eventId (required): Event ID to validate tickets for
- scanMode: 'camera' | 'manual' | 'both' (default: 'both')
- onScanSuccess: (ticket) => void
- onScanError: (error) => void

Please integrate this into my app with [describe your requirements].`}
        />
      </section>

      {/* Two Widget Types */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Available Widgets</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="text-3xl mb-3">🛒</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">EventTicketSales</h3>
            <p className="text-gray-600 text-sm mb-4">
              Embed on your event page to let customers browse ticket types, select quantities, and complete purchases.
            </p>
            <CodeBlock
              language="tsx"
              code={`<EventTicketSales
  apiKey="pk_live_xxx"
  eventId="evt_123"
  maxTicketsPerOrder={10}
/>`}
            />
          </div>
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="text-3xl mb-3">📷</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">TicketScanner</h3>
            <p className="text-gray-600 text-sm mb-4">
              Use at event entrance to scan and validate ticket QR codes. Shows attendee info and prevents duplicate entry.
            </p>
            <CodeBlock
              language="tsx"
              code={`<TicketScanner
  apiKey="pk_live_xxx"
  eventId="evt_123"
  scanMode="camera"
/>`}
            />
          </div>
        </div>
      </section>

      {/* Code Examples */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Code Examples</h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Complete Event Page</h3>
            <CodeBlock
              language="tsx"
              code={`import { EventTicketSales } from '@peeap/widgets'

export default function EventPage({ params }) {
  const handlePurchase = (tickets) => {
    // Tickets purchased - redirect to confirmation
    router.push(\`/tickets/\${tickets[0].id}\`)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <EventTicketSales
        apiKey="pk_live_your_key"
        eventId={params.eventId}
        showEventHeader={true}
        onPurchaseComplete={handlePurchase}
      />
    </div>
  )
}`}
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Door Scanner with Audio Feedback</h3>
            <CodeBlock
              language="tsx"
              code={`import { TicketScanner } from '@peeap/widgets'
import { useRef } from 'react'

export default function ScannerPage({ eventId }) {
  const successSound = useRef(new Audio('/sounds/success.mp3'))
  const errorSound = useRef(new Audio('/sounds/error.mp3'))

  return (
    <TicketScanner
      apiKey="pk_live_your_key"
      eventId={eventId}
      scanMode="camera"
      showStats={true}
      onScanSuccess={(ticket) => {
        successSound.current.play()
        console.log('Welcome:', ticket.attendee_name)
      }}
      onScanError={(error) => {
        errorSound.current.play()
        console.error('Scan failed:', error.message)
      }}
    />
  )
}`}
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Event Dashboard for Organizers</h3>
            <CodeBlock
              language="tsx"
              code={`import { EventDashboard } from '@peeap/widgets'

// Full event management with sales analytics
<EventDashboard
  apiKey="sk_live_your_key"  // Use secret key for management
  merchantId="your_merchant_id"
  features={['sales', 'attendees', 'checkin-stats', 'revenue']}
/>`}
            />
          </div>
        </div>
      </section>

      {/* Ticket Flow */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">How It Works</h2>
        <div className="space-y-4">
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-purple-600 font-bold">1</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Customer Purchases Ticket</h3>
              <p className="text-gray-600 text-sm">
                Customer selects ticket type, enters details, and completes payment through the embedded widget.
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-purple-600 font-bold">2</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Ticket Delivered</h3>
              <p className="text-gray-600 text-sm">
                Customer receives email with ticket PDF containing unique QR code. Can also view in-app.
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-purple-600 font-bold">3</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Door Scanning</h3>
              <p className="text-gray-600 text-sm">
                Staff uses TicketScanner widget to scan QR codes. System validates ticket and marks as used.
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-purple-600 font-bold">4</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Real-time Analytics</h3>
              <p className="text-gray-600 text-sm">
                Organizers see live check-in stats, revenue, and attendance numbers through the dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
