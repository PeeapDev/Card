'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/currency'

interface Product {
  id: string
  name: string
  price: number
  category: string
  emoji: string
}

interface CartItem extends Product {
  quantity: number
}

const sampleProducts: Product[] = [
  { id: '1', name: 'Cappuccino', price: 16, category: 'Beverages', emoji: '☕' },
  { id: '2', name: 'Latte', price: 18, category: 'Beverages', emoji: '🥛' },
  { id: '3', name: 'Espresso', price: 12, category: 'Beverages', emoji: '☕' },
  { id: '4', name: 'Fresh Juice', price: 15, category: 'Beverages', emoji: '🧃' },
  { id: '5', name: 'Croissant', price: 10, category: 'Food', emoji: '🥐' },
  { id: '6', name: 'Muffin', price: 8, category: 'Food', emoji: '🧁' },
  { id: '7', name: 'Sandwich', price: 25, category: 'Food', emoji: '🥪' },
  { id: '8', name: 'Salad', price: 30, category: 'Food', emoji: '🥗' },
]

const categories = ['All', 'Beverages', 'Food']

type PaymentMethod = 'qr' | 'nfc' | 'cash'
type CheckoutStep = 'cart' | 'payment' | 'processing' | 'success'

export function POSDemo() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('cart')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [receiptNumber, setReceiptNumber] = useState<string>('')

  const filteredProducts = selectedCategory === 'All'
    ? sampleProducts
    : sampleProducts.filter(p => p.category === selectedCategory)

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId))
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev =>
      prev.map(item => {
        if (item.id === productId) {
          const newQty = item.quantity + delta
          return newQty > 0 ? { ...item, quantity: newQty } : item
        }
        return item
      }).filter(item => item.quantity > 0)
    )
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = subtotal * 0.15 // 15% GST
  const total = subtotal + tax

  const generateQRCode = async () => {
    // In production, this would call the Peeap API to generate a dynamic QR code
    // For now, we'll simulate with a placeholder
    // The QR code would contain a payment link like: https://pay.peeap.com/qr/sandbox_xxx
    const mockQrData = `PEEAP_SANDBOX_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Generate QR code URL using a public API (in production, use Peeap's QR endpoint)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      `https://pay.peeap.com/sandbox/${mockQrData}?amount=${total}&currency=SLE`
    )}`

    setQrCode(qrUrl)
  }

  const handlePaymentSelect = async (method: PaymentMethod) => {
    setPaymentMethod(method)
    setCheckoutStep('payment')

    if (method === 'qr') {
      await generateQRCode()
    }
  }

  const simulatePayment = () => {
    setCheckoutStep('processing')

    // Simulate payment processing
    setTimeout(() => {
      setReceiptNumber(`RCP-${Date.now().toString().slice(-6)}`)
      setCheckoutStep('success')
    }, 2000)
  }

  const handleNewSale = () => {
    setCart([])
    setCheckoutStep('cart')
    setPaymentMethod(null)
    setQrCode(null)
    setReceiptNumber('')
  }

  // Payment selection screen
  if (checkoutStep === 'payment' && paymentMethod) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
        <button
          onClick={() => { setCheckoutStep('cart'); setPaymentMethod(null) }}
          className="mb-4 text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to cart
        </button>

        {paymentMethod === 'qr' && (
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Scan to Pay</h3>
            <p className="text-gray-500 text-sm mb-4">
              Scan this QR code with your mobile banking app or Peeap wallet
            </p>

            <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-200 inline-block mb-4">
              {qrCode ? (
                <img src={qrCode} alt="Payment QR Code" className="w-48 h-48" />
              ) : (
                <div className="w-48 h-48 bg-gray-100 animate-pulse rounded" />
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-500">Amount to pay</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</p>
            </div>

            <p className="text-xs text-gray-400 mb-4">
              This is a sandbox payment. No real money will be charged.
            </p>

            <button
              onClick={simulatePayment}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
            >
              Simulate Payment Received
            </button>
          </div>
        )}

        {paymentMethod === 'nfc' && (
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Tap to Pay</h3>
            <p className="text-gray-500 text-sm mb-6">
              Hold your card or phone near the NFC reader
            </p>

            <div className="w-32 h-32 mx-auto mb-6 bg-blue-50 rounded-full flex items-center justify-center">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
                <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-500">Amount to pay</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</p>
            </div>

            <button
              onClick={simulatePayment}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Simulate Tap Payment
            </button>
          </div>
        )}

        {paymentMethod === 'cash' && (
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cash Payment</h3>
            <p className="text-gray-500 text-sm mb-6">
              Collect cash from customer
            </p>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <p className="text-sm text-gray-500 mb-1">Amount Due</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(total)}</p>
            </div>

            <button
              onClick={simulatePayment}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
            >
              Mark as Paid
            </button>
          </div>
        )}
      </div>
    )
  }

  // Processing screen
  if (checkoutStep === 'processing') {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto text-center">
        <div className="w-16 h-16 mx-auto mb-4 relative">
          <div className="absolute inset-0 border-4 border-primary-200 rounded-full" />
          <div className="absolute inset-0 border-4 border-primary-600 rounded-full border-t-transparent animate-spin" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Payment</h3>
        <p className="text-gray-500">Please wait...</p>
      </div>
    )
  }

  // Success screen
  if (checkoutStep === 'success') {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900">Payment Successful</h3>
          <p className="text-gray-500 text-sm">Receipt #{receiptNumber}</p>
        </div>

        <div className="border-t border-b border-gray-200 py-4 mb-4">
          {cart.map(item => (
            <div key={item.id} className="flex justify-between text-sm mb-2">
              <span>{item.emoji} {item.name} x{item.quantity}</span>
              <span>{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-1 text-sm mb-6">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">GST (15%)</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleNewSale}
            className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
          >
            New Sale
          </button>
          <button className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </button>
        </div>

        <p className="text-xs text-center text-gray-400 mt-4">
          Sandbox mode - No real transaction processed
        </p>
      </div>
    )
  }

  // Main POS screen
  return (
    <div className="bg-gray-50 rounded-xl shadow-lg overflow-hidden">
      <div className="flex h-[520px]">
        {/* Products Panel */}
        <div className="flex-1 p-4 overflow-y-auto">
          {/* Categories */}
          <div className="flex gap-2 mb-4">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white p-4 rounded-xl text-left hover:shadow-md transition-all border border-gray-100 hover:border-primary-200"
              >
                <div className="text-3xl mb-2">{product.emoji}</div>
                <h4 className="font-medium text-gray-900 text-sm">{product.name}</h4>
                <p className="text-primary-600 font-bold">{formatCurrency(product.price)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Cart Panel */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Current Order</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🛒</div>
                <p className="text-gray-400">Cart is empty</p>
                <p className="text-gray-400 text-sm">Tap products to add</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                    <span className="text-xl">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(item.price)} each</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-7 h-7 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 text-sm font-medium"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-7 h-7 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 text-sm font-medium"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-1 text-red-400 hover:text-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="space-y-1 text-sm mb-4">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>GST (15%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                <span>Total</span>
                <span className="text-primary-600">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <button
                onClick={() => handlePaymentSelect('qr')}
                disabled={cart.length === 0}
                className="p-3 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <div className="text-xl mb-1">📱</div>
                <div className="text-xs font-medium text-gray-600">QR Code</div>
              </button>
              <button
                onClick={() => handlePaymentSelect('nfc')}
                disabled={cart.length === 0}
                className="p-3 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <div className="text-xl mb-1">💳</div>
                <div className="text-xs font-medium text-gray-600">Tap/NFC</div>
              </button>
              <button
                onClick={() => handlePaymentSelect('cash')}
                disabled={cart.length === 0}
                className="p-3 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <div className="text-xl mb-1">💵</div>
                <div className="text-xs font-medium text-gray-600">Cash</div>
              </button>
            </div>

            <p className="text-xs text-center text-gray-400">
              Select payment method to checkout
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
