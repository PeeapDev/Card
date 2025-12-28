'use client'

import { useState } from 'react'

interface TicketType {
  id: string
  name: string
  price: number
  available: number
  sold: number
}

interface Ticket {
  id: string
  code: string
  type: string
  attendee: string
  status: 'valid' | 'scanned'
}

export function EventTicketDemo() {
  const [view, setView] = useState<'event' | 'scanner'>('event')
  const [ticketTypes] = useState<TicketType[]>([
    { id: '1', name: 'General Admission', price: 50, available: 500, sold: 125 },
    { id: '2', name: 'VIP Access', price: 150, available: 50, sold: 20 },
  ])
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({})
  const [purchaseComplete, setPurchaseComplete] = useState(false)
  const [purchasedTickets, setPurchasedTickets] = useState<Ticket[]>([])

  // Scanner state
  const [scanInput, setScanInput] = useState('')
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; ticket?: Ticket } | null>(null)

  const totalAmount = Object.entries(selectedTickets).reduce((sum, [id, qty]) => {
    const ticket = ticketTypes.find(t => t.id === id)
    return sum + (ticket?.price || 0) * qty
  }, 0)

  const handlePurchase = () => {
    const tickets: Ticket[] = []
    Object.entries(selectedTickets).forEach(([typeId, qty]) => {
      const type = ticketTypes.find(t => t.id === typeId)
      for (let i = 0; i < qty; i++) {
        tickets.push({
          id: `tkt_${Date.now()}_${i}`,
          code: `TKT-2025-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          type: type?.name || '',
          attendee: 'John Doe',
          status: 'valid'
        })
      }
    })
    setPurchasedTickets(tickets)
    setPurchaseComplete(true)
  }

  const handleScan = () => {
    const ticket = purchasedTickets.find(t => t.code === scanInput.toUpperCase())

    if (!ticket) {
      setScanResult({ success: false, message: 'Ticket not found' })
    } else if (ticket.status === 'scanned') {
      setScanResult({ success: false, message: 'Ticket already scanned!', ticket })
    } else {
      ticket.status = 'scanned'
      setScanResult({ success: true, message: 'Valid ticket - Entry approved!', ticket })
    }

    setTimeout(() => setScanResult(null), 3000)
    setScanInput('')
  }

  const resetDemo = () => {
    setSelectedTickets({})
    setPurchaseComplete(false)
    setPurchasedTickets([])
    setScanInput('')
    setScanResult(null)
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setView('event')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            view === 'event'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Event & Tickets
        </button>
        <button
          onClick={() => setView('scanner')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            view === 'scanner'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Door Scanner
        </button>
      </div>

      {view === 'event' ? (
        <div className="p-6">
          {purchaseComplete ? (
            <div>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-green-600 text-3xl">✓</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Tickets Purchased!</h3>
                <p className="text-gray-500">Your tickets are ready</p>
              </div>

              <div className="space-y-3 mb-6">
                {purchasedTickets.map(ticket => (
                  <div key={ticket.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{ticket.type}</p>
                        <p className="text-sm text-gray-500">{ticket.attendee}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{ticket.code}</p>
                        <span className={`text-xs ${ticket.status === 'valid' ? 'text-green-600' : 'text-blue-600'}`}>
                          {ticket.status === 'valid' ? 'Valid' : 'Scanned'}
                        </span>
                      </div>
                    </div>
                    {/* QR Code placeholder */}
                    <div className="mt-3 flex justify-center">
                      <div className="w-24 h-24 bg-gray-100 rounded flex items-center justify-center">
                        <span className="text-4xl">📱</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={resetDemo}
                  className="flex-1 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                >
                  Buy More Tickets
                </button>
                <button
                  onClick={() => setView('scanner')}
                  className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
                >
                  Try Scanner
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Event Header */}
              <div className="mb-6">
                <div className="w-full h-32 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-white text-4xl">🎉</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Tech Conference 2025</h3>
                <p className="text-gray-500">March 15, 2025 • Convention Center</p>
              </div>

              {/* Ticket Types */}
              <div className="space-y-3 mb-6">
                {ticketTypes.map(type => (
                  <div key={type.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{type.name}</h4>
                        <p className="text-sm text-gray-500">
                          {type.available - type.sold} remaining
                        </p>
                      </div>
                      <p className="text-xl font-bold text-primary-600">${type.price}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedTickets(prev => ({
                            ...prev,
                            [type.id]: Math.max(0, (prev[type.id] || 0) - 1)
                          }))}
                          className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-medium">
                          {selectedTickets[type.id] || 0}
                        </span>
                        <button
                          onClick={() => setSelectedTickets(prev => ({
                            ...prev,
                            [type.id]: Math.min(10, (prev[type.id] || 0) + 1)
                          }))}
                          className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-gray-600 font-medium">
                        ${((selectedTickets[type.id] || 0) * type.price).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Purchase Button */}
              <button
                onClick={handlePurchase}
                disabled={totalAmount === 0}
                className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {totalAmount > 0 ? `Purchase - $${totalAmount.toFixed(2)}` : 'Select Tickets'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📷</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Ticket Scanner</h3>
            <p className="text-gray-500 text-sm">Enter ticket code to validate</p>
          </div>

          {/* Scan Result */}
          {scanResult && (
            <div className={`mb-4 p-4 rounded-lg ${
              scanResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center gap-3">
                <span className={`text-2xl ${scanResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {scanResult.success ? '✓' : '✗'}
                </span>
                <div>
                  <p className={`font-medium ${scanResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {scanResult.message}
                  </p>
                  {scanResult.ticket && (
                    <p className="text-sm text-gray-600">
                      {scanResult.ticket.type} - {scanResult.ticket.attendee}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Manual Input */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Enter ticket code (e.g., TKT-2025-ABC123)"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono"
            />
          </div>

          <button
            onClick={handleScan}
            disabled={!scanInput}
            className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Validate Ticket
          </button>

          {/* Purchased Tickets Reference */}
          {purchasedTickets.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Test with these codes:</p>
              <div className="space-y-1">
                {purchasedTickets.map(t => (
                  <p key={t.id} className="text-xs font-mono text-gray-600">
                    {t.code} ({t.status})
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
