'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/currency'

interface LineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
}

export function InvoiceDemo() {
  const [customerName, setCustomerName] = useState('Acme Corporation')
  const [customerEmail, setCustomerEmail] = useState('billing@acme.sl')
  const [items, setItems] = useState<LineItem[]>([
    { id: '1', description: 'Web Development Services', quantity: 10, unitPrice: 100 },
    { id: '2', description: 'Hosting (Monthly)', quantity: 1, unitPrice: 50 },
  ])
  const [showPreview, setShowPreview] = useState(false)
  const [sent, setSent] = useState(false)
  const [paymentQR, setPaymentQR] = useState<string | null>(null)

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0 }])
  }

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const tax = subtotal * 0.15
  const total = subtotal + tax
  const invoiceNumber = `INV-2025-${String(Math.floor(Math.random() * 1000)).padStart(4, '0')}`

  const generatePaymentQR = () => {
    const paymentData = `PEEAP_INVOICE_${invoiceNumber}_${Date.now()}`
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
      `https://pay.peeap.com/invoice/${paymentData}?amount=${total}&currency=SLE`
    )}`
    setPaymentQR(qrUrl)
  }

  const handleSend = () => {
    generatePaymentQR()
    setSent(true)
    setTimeout(() => {
      setSent(false)
      setShowPreview(false)
      setPaymentQR(null)
    }, 4000)
  }

  if (showPreview) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
        {sent ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Invoice Sent!</h3>
            <p className="text-gray-500 mb-4">Email sent to {customerEmail}</p>

            {paymentQR && (
              <div className="mt-6">
                <p className="text-sm text-gray-500 mb-2">Payment QR Code (included in email)</p>
                <img src={paymentQR} alt="Payment QR" className="mx-auto rounded-lg" />
              </div>
            )}

            <p className="text-xs text-gray-400 mt-4">Sandbox mode - No real email sent</p>
          </div>
        ) : (
          <>
            {/* Invoice Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center mb-3">
                  <span className="text-white font-bold text-xl">P</span>
                </div>
                <h3 className="font-bold text-gray-900">Your Business Name</h3>
                <p className="text-gray-500 text-sm">123 Business St, Freetown</p>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold text-gray-900">INVOICE</h2>
                <p className="text-gray-500">{invoiceNumber}</p>
                <p className="text-gray-500 text-sm mt-2">Date: {new Date().toLocaleDateString()}</p>
                <p className="text-gray-500 text-sm">Due: {new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Bill To */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-sm mb-1">Bill To:</p>
              <p className="font-semibold text-gray-900">{customerName}</p>
              <p className="text-gray-600 text-sm">{customerEmail}</p>
            </div>

            {/* Items */}
            <table className="w-full mb-8">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-500 text-sm font-medium">Description</th>
                  <th className="text-right py-2 text-gray-500 text-sm font-medium">Qty</th>
                  <th className="text-right py-2 text-gray-500 text-sm font-medium">Price</th>
                  <th className="text-right py-2 text-gray-500 text-sm font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-3">{item.description}</td>
                    <td className="text-right py-3">{item.quantity}</td>
                    <td className="text-right py-3">{formatCurrency(item.unitPrice)}</td>
                    <td className="text-right py-3 font-medium">{formatCurrency(item.quantity * item.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64">
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">GST (15%)</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between py-2 border-t border-gray-200 font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary-600">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                onClick={handleSend}
                className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
              >
                Send Invoice
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Create Invoice</h3>

      {/* Customer Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email</label>
          <input
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Line Items */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Line Items</label>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex gap-3 items-start">
              <input
                type="text"
                placeholder="Description"
                value={item.description}
                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <input
                type="number"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400 text-sm">NLe</span>
                <input
                  type="number"
                  placeholder="Price"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                  className="w-28 pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <span className="py-2 w-28 text-right font-medium text-sm">
                {formatCurrency(item.quantity * item.unitPrice)}
              </span>
              {items.length > 1 && (
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addItem}
          className="mt-3 text-primary-600 text-sm font-medium hover:text-primary-700 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Line Item
        </button>
      </div>

      {/* Summary */}
      <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg mb-6">
        <div>
          <p className="text-gray-500 text-sm">Total Amount</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</p>
          <p className="text-xs text-gray-400">Including 15% GST</p>
        </div>
        <button
          onClick={() => setShowPreview(true)}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
        >
          Preview Invoice
        </button>
      </div>

      <p className="text-xs text-center text-gray-400">
        Sandbox mode - Invoice will include a payment QR code
      </p>
    </div>
  )
}
