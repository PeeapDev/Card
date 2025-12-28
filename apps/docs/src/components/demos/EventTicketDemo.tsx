'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/currency'

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
  qrCode: string
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
  const [isProcessing, setIsProcessing] = useState(false)

  // Scanner state
  const [scanInput, setScanInput] = useState('')
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; ticket?: Ticket } | null>(null)

  const totalAmount = Object.entries(selectedTickets).reduce((sum, [id, qty]) => {
    const ticket = ticketTypes.find(t => t.id === id)
    return sum + (ticket?.price || 0) * qty
  }, 0)

  const handlePurchase = async () => {
    setIsProcessing(true)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))

    const tickets: Ticket[] = []
    Object.entries(selectedTickets).forEach(([typeId, qty]) => {
      const type = ticketTypes.find(t => t.id === typeId)
      for (let i = 0; i < qty; i++) {
        const code = `TKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
        tickets.push({
          id: `tkt_${Date.now()}_${i}`,
          code,
          type: type?.name || '',
          attendee: 'Demo Attendee',
          status: 'valid',
          qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
            `https://events.peeap.com/scan/${code}`
          )}`
        })
      }
    })
    setPurchasedTickets(tickets)
    setPurchaseComplete(true)
    setIsProcessing(false)
  }

  const handleScan = () => {
    const normalizedInput = scanInput.toUpperCase().trim()
    const ticket = purchasedTickets.find(t => t.code === normalizedInput)

    if (!ticket) {
      setScanResult({ success: false, message: 'Ticket not found or invalid' })
    } else if (ticket.status === 'scanned') {
      setScanResult({
        success: false,
        message: 'Ticket already scanned!',
        ticket
      })
    } else {
      // Mark as scanned
      ticket.status = 'scanned'
      setScanResult({
        success: true,
        message: 'Valid ticket - Entry approved!',
        ticket
      })
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
          className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            view === 'event'
              ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>🎫</span> Buy Tickets
        </button>
        <button
          onClick={() => setView('scanner')}
          className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            view === 'scanner'
              ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>📷</span> Door Scanner
        </button>
      </div>

      {view === 'event' ? (
        <div className="p-6">
          {isProcessing ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 relative">
                <div className="absolute inset-0 border-4 border-purple-200 rounded-full" />
                <div className="absolute inset-0 border-4 border-purple-600 rounded-full border-t-transparent animate-spin" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Processing Payment...</h3>
              <p className="text-gray-500 text-sm">Generating your tickets</p>
            </div>
          ) : purchaseComplete ? (
            <div>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Tickets Purchased!</h3>
                <p className="text-gray-500">Your tickets are ready</p>
              </div>

              <div className="space-y-4 mb-6">
                {purchasedTickets.map(ticket => (
                  <div key={ticket.id} className="border border-gray-200 rounded-xl p-4 bg-gradient-to-r from-purple-50 to-pink-50">
                    <div className="flex gap-4">
                      <img src={ticket.qrCode} alt="Ticket QR" className="w-24 h-24 rounded-lg" />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{ticket.type}</p>
                        <p className="text-sm text-gray-500">{ticket.attendee}</p>
                        <div className="mt-2">
                          <span className="font-mono text-sm bg-white px-2 py-1 rounded border border-gray-200">
                            {ticket.code}
                          </span>
                        </div>
                        <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${
                          ticket.status === 'valid'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {ticket.status === 'valid' ? 'Valid' : 'Scanned'}
                        </span>
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
                  Buy More
                </button>
                <button
                  onClick={() => setView('scanner')}
                  className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
                >
                  Try Scanner
                </button>
              </div>

              <p className="text-xs text-center text-gray-400 mt-4">
                Sandbox mode - Scan these QR codes in the Door Scanner tab
              </p>
            </div>
          ) : (
            <div>
              {/* Event Header */}
              <div className="mb-6">
                <div className="w-full h-32 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl mb-4 flex items-center justify-center">
                  <div className="text-center text-white">
                    <span className="text-4xl">🎉</span>
                    <h3 className="text-xl font-bold mt-2">Tech Conference 2025</h3>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    March 15, 2025
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Convention Center, Freetown
                  </span>
                </div>
              </div>

              {/* Ticket Types */}
              <div className="space-y-3 mb-6">
                {ticketTypes.map(type => (
                  <div key={type.id} className="border border-gray-200 rounded-xl p-4 hover:border-purple-200 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{type.name}</h4>
                        <p className="text-sm text-gray-500">
                          {type.available - type.sold} tickets remaining
                        </p>
                      </div>
                      <p className="text-xl font-bold text-primary-600">{formatCurrency(type.price)}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedTickets(prev => ({
                            ...prev,
                            [type.id]: Math.max(0, (prev[type.id] || 0) - 1)
                          }))}
                          className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-semibold">
                          {selectedTickets[type.id] || 0}
                        </span>
                        <button
                          onClick={() => setSelectedTickets(prev => ({
                            ...prev,
                            [type.id]: Math.min(10, (prev[type.id] || 0) + 1)
                          }))}
                          className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-gray-600 font-medium">
                        {formatCurrency((selectedTickets[type.id] || 0) * type.price)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Purchase Button */}
              <button
                onClick={handlePurchase}
                disabled={totalAmount === 0}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all"
              >
                {totalAmount > 0 ? `Purchase - ${formatCurrency(totalAmount)}` : 'Select Tickets'}
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
            <p className="text-gray-500 text-sm">Enter ticket code or scan QR</p>
          </div>

          {/* Scan Result */}
          {scanResult && (
            <div className={`mb-4 p-4 rounded-xl ${
              scanResult.success
                ? 'bg-green-50 border-2 border-green-200'
                : 'bg-red-50 border-2 border-red-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  scanResult.success ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {scanResult.success ? (
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className={`font-semibold ${scanResult.success ? 'text-green-800' : 'text-red-800'}`}>
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
              placeholder="Enter ticket code (e.g., TKT-ABC123-XYZ)"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-center"
            />
          </div>

          <button
            onClick={handleScan}
            disabled={!scanInput}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Validate Ticket
          </button>

          {/* Purchased Tickets Reference */}
          {purchasedTickets.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              <p className="text-sm font-medium text-gray-700 mb-3">Test with these codes:</p>
              <div className="space-y-2">
                {purchasedTickets.map(t => (
                  <div key={t.id} className="flex items-center justify-between bg-white rounded-lg p-2">
                    <code className="text-xs font-mono text-gray-600">{t.code}</code>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      t.status === 'valid'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {purchasedTickets.length === 0 && (
            <p className="text-center text-gray-400 text-sm mt-4">
              Buy tickets first to test the scanner
            </p>
          )}
        </div>
      )}
    </div>
  )
}
