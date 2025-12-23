/**
 * Merchant Payment Terminal Page
 *
 * Universal payment terminal for merchants to accept:
 * - QR code payments (scan-to-pay)
 * - NFC/Tap-to-Pay (contactless cards and phones)
 *
 * Access: /merchant/terminal
 *
 * URL Parameters (for integration):
 * - amount: Pre-set amount in cents (e.g., ?amount=5000 for Le 50.00)
 * - currency: Currency code (e.g., ?currency=SLE)
 * - description: Payment description (e.g., ?description=Product%20Name)
 * - reference: External reference ID (e.g., ?reference=ORDER-123)
 * - autoStart: Auto-start payment (e.g., ?autoStart=true)
 *
 * Integration Examples:
 * - Product page: /merchant/terminal?amount=5000&description=Coffee&reference=PROD-001
 * - Cart checkout: /merchant/terminal?amount=15000&description=Cart%20Total&reference=CART-456
 * - POS integration: Use NFCPaymentTerminal component directly
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Store,
  Settings,
  History,
  CreditCard,
  Smartphone,
  Nfc,
  QrCode,
  DollarSign,
  Calculator,
  X,
  Check,
  Loader2,
  AlertCircle,
  Package,
  ShoppingCart,
  Pencil,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { NFCPaymentTerminal } from '@/components/payment/NFCPaymentTerminal';

// Currency definitions
const CURRENCIES = [
  { code: 'SLE', symbol: 'Le', name: 'Sierra Leonean Leone' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
];

// Default quick amounts (can be overridden by business settings)
const DEFAULT_QUICK_AMOUNTS = [
  { value: 1000, label: 'Le 10' },
  { value: 2000, label: 'Le 20' },
  { value: 5000, label: 'Le 50' },
  { value: 10000, label: 'Le 100' },
  { value: 20000, label: 'Le 200' },
  { value: 50000, label: 'Le 500' },
];

interface Business {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  api_key_live?: string;
  api_key_test?: string;
  is_live_mode: boolean;
  terminal_settings?: {
    quick_amounts?: number[];
    default_currency?: string;
  };
}

// Integration mode type
type IntegrationMode = 'manual' | 'product' | 'cart';

export function MerchantPaymentTerminalPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // URL Parameters for integration
  const urlAmount = searchParams.get('amount');
  const urlCurrency = searchParams.get('currency');
  const urlDescription = searchParams.get('description');
  const urlReference = searchParams.get('reference');
  const urlAutoStart = searchParams.get('autoStart') === 'true';
  const urlProductName = searchParams.get('product');
  const urlCartId = searchParams.get('cartId');

  // Determine integration mode
  const integrationMode: IntegrationMode = useMemo(() => {
    if (urlCartId) return 'cart';
    if (urlProductName || urlReference) return 'product';
    return 'manual';
  }, [urlCartId, urlProductName, urlReference]);

  // State
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [amount, setAmount] = useState(urlAmount ? (parseInt(urlAmount) / 100).toFixed(2) : '');
  const [currency, setCurrency] = useState(urlCurrency || 'SLE');
  const [description, setDescription] = useState(urlDescription || urlProductName || '');
  const [reference, setReference] = useState(urlReference || '');
  const [showTerminal, setShowTerminal] = useState(false);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [editingAmount, setEditingAmount] = useState(!urlAmount); // If amount pre-set, don't show editor

  // Load businesses
  useEffect(() => {
    loadBusinesses();
  }, [user?.id]);

  // Auto-start payment when URL has amount and autoStart=true
  useEffect(() => {
    if (urlAutoStart && urlAmount && selectedBusiness && !showTerminal) {
      startPayment();
    }
  }, [urlAutoStart, urlAmount, selectedBusiness]);

  const loadBusinesses = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, slug, logo_url, api_key_live, api_key_test, is_live_mode, metadata')
        .eq('owner_id', user.id)
        .eq('status', 'ACTIVE');

      if (error) throw error;

      // Map metadata to terminal_settings if available
      const businessesWithSettings = (data || []).map(b => ({
        ...b,
        terminal_settings: b.metadata?.terminal_settings || undefined,
      }));

      setBusinesses(businessesWithSettings);
      if (businessesWithSettings.length > 0) {
        setSelectedBusiness(businessesWithSettings[0]);
        // Set default currency from business settings if available
        if (businessesWithSettings[0].terminal_settings?.default_currency && !urlCurrency) {
          setCurrency(businessesWithSettings[0].terminal_settings.default_currency);
        }
      }
    } catch (err) {
      console.error('Failed to load businesses:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get quick amounts from business settings or use defaults
  const quickAmounts = useMemo(() => {
    if (selectedBusiness?.terminal_settings?.quick_amounts) {
      const currencyInfo = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
      return selectedBusiness.terminal_settings.quick_amounts.map(value => ({
        value,
        label: `${currencyInfo.symbol} ${(value / 100).toLocaleString()}`,
      }));
    }
    return DEFAULT_QUICK_AMOUNTS;
  }, [selectedBusiness, currency]);

  // Handle amount input
  const handleAmountChange = (value: string) => {
    // Only allow numbers and one decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setAmount(cleaned);
  };

  // Handle quick amount
  const handleQuickAmount = (value: number) => {
    setAmount((value / 100).toFixed(2));
  };

  // Get amount in cents
  const getAmountInCents = () => {
    const num = parseFloat(amount);
    if (isNaN(num)) return 0;
    return Math.round(num * 100);
  };

  // Get API key based on mode
  const getApiKey = () => {
    if (!selectedBusiness) return '';
    return selectedBusiness.is_live_mode
      ? selectedBusiness.api_key_live || ''
      : selectedBusiness.api_key_test || '';
  };

  // Start payment
  const startPayment = () => {
    if (getAmountInCents() <= 0) return;
    setShowTerminal(true);
  };

  // Handle payment success
  const handlePaymentSuccess = (payment: any) => {
    console.log('Payment successful:', payment);
    setRecentPayments(prev => [payment, ...prev].slice(0, 10));

    // Reset after success
    setTimeout(() => {
      setShowTerminal(false);
      setAmount('');
      setDescription('');
    }, 3000);
  };

  // Handle payment failed
  const handlePaymentFailed = (error: string) => {
    console.error('Payment failed:', error);
  };

  // Handle cancel
  const handleCancel = () => {
    setShowTerminal(false);
  };

  // Format currency
  const formatCurrency = (cents: number, curr: string = 'SLE') => {
    const currencyInfo = CURRENCIES.find(c => c.code === curr) || CURRENCIES[0];
    return `${currencyInfo.symbol} ${(cents / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  // No businesses
  if (businesses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">No Business Found</h1>
          <p className="text-gray-500 mb-6">
            You need to create a business before accepting payments.
          </p>
          <button
            onClick={() => navigate('/merchant/developer')}
            className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700"
          >
            Create Business
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/merchant')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              {selectedBusiness?.logo_url ? (
                <img
                  src={selectedBusiness.logo_url}
                  alt={selectedBusiness.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Store className="w-5 h-5 text-purple-600" />
                </div>
              )}
              <div>
                <h1 className="font-semibold text-gray-900">Payment Terminal</h1>
                <p className="text-sm text-gray-500">{selectedBusiness?.name}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              selectedBusiness?.is_live_mode
                ? 'bg-green-100 text-green-700'
                : 'bg-orange-100 text-orange-700'
            }`}>
              {selectedBusiness?.is_live_mode ? 'Live' : 'Test'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {!showTerminal ? (
          <div className="space-y-6">
            {/* Business Selector (if multiple) */}
            {businesses.length > 1 && (
              <div className="bg-white rounded-xl shadow-sm p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Business
                </label>
                <select
                  value={selectedBusiness?.id || ''}
                  onChange={(e) => {
                    const biz = businesses.find(b => b.id === e.target.value);
                    setSelectedBusiness(biz || null);
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {businesses.map(biz => (
                    <option key={biz.id} value={biz.id}>
                      {biz.name} ({biz.is_live_mode ? 'Live' : 'Test'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Product/Cart Info (when in integration mode) */}
            {integrationMode !== 'manual' && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl shadow-sm p-4 border border-purple-100">
                <div className="flex items-center gap-3">
                  {integrationMode === 'cart' ? (
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-purple-600" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-indigo-600" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">
                      {integrationMode === 'cart' ? 'Cart Checkout' : 'Product Payment'}
                    </p>
                    <p className="font-semibold text-gray-900">
                      {description || urlProductName || 'Order'}
                    </p>
                    {reference && (
                      <p className="text-xs text-gray-500">Ref: {reference}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(getAmountInCents(), currency)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Amount Entry */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-purple-600" />
                  {integrationMode !== 'manual' ? 'Payment Amount' : 'Enter Amount'}
                </h2>
                {integrationMode !== 'manual' && !editingAmount && (
                  <button
                    onClick={() => setEditingAmount(true)}
                    className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                )}
              </div>

              {/* Amount Display (for integration mode with pre-set amount) */}
              {integrationMode !== 'manual' && !editingAmount ? (
                <div className="text-center py-4 mb-4 bg-gray-50 rounded-xl">
                  <p className="text-4xl font-bold text-gray-900">
                    {formatCurrency(getAmountInCents(), currency)}
                  </p>
                  {description && (
                    <p className="text-sm text-gray-500 mt-1">{description}</p>
                  )}
                </div>
              ) : (
                <>
                  {/* Amount Input */}
                  <div className="relative mb-4">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400">
                      {CURRENCIES.find(c => c.code === currency)?.symbol}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full py-4 pl-12 pr-20 text-3xl font-bold text-center border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium"
                    >
                      {CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>{c.code}</option>
                      ))}
                    </select>
                  </div>

                  {/* Quick Amounts (only in manual mode or when editing) */}
                  {(integrationMode === 'manual' || editingAmount) && (
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {quickAmounts.map(qa => (
                        <button
                          key={qa.value}
                          onClick={() => handleQuickAmount(qa.value)}
                          className="py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                        >
                          {qa.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Description */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description {integrationMode === 'manual' && '(optional)'}
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g., Coffee, Lunch, Product name"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {integrationMode !== 'manual' && editingAmount && (
                    <button
                      onClick={() => setEditingAmount(false)}
                      className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 mb-2"
                    >
                      Done editing
                    </button>
                  )}
                </>
              )}

              {/* Start Button */}
              <button
                onClick={startPayment}
                disabled={getAmountInCents() <= 0}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <CreditCard className="w-6 h-6" />
                {integrationMode !== 'manual' ? 'Collect Payment' : 'Accept Payment'}
              </button>
            </div>

            {/* Features Info */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Payment Methods</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                  <QrCode className="w-6 h-6 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">QR Code</p>
                    <p className="text-sm text-gray-500">Customer scans with phone</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg">
                  <Nfc className="w-6 h-6 text-indigo-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Tap-to-Pay</p>
                    <p className="text-sm text-gray-500">NFC contactless payment</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Payments */}
            {recentPayments.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <History className="w-5 h-5 text-gray-400" />
                    Recent Payments
                  </h3>
                </div>
                <div className="space-y-3">
                  {recentPayments.map((payment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {formatCurrency(payment.amount, payment.currency)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(payment.created_at || Date.now()).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-green-600 font-medium">Paid</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Payment Terminal View */
          <div className="space-y-4">
            {/* Back Button */}
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to amount entry</span>
            </button>

            {/* NFC Payment Terminal */}
            {selectedBusiness && (
              <NFCPaymentTerminal
                amount={getAmountInCents()}
                currency={currency}
                merchantId={selectedBusiness.id}
                merchantName={selectedBusiness.name}
                apiKey={getApiKey()}
                description={description || `Payment at ${selectedBusiness.name}`}
                terminalId={`web-terminal-${selectedBusiness.id}`}
                metadata={{
                  reference: reference || undefined,
                  integration_mode: integrationMode,
                  product_name: urlProductName || undefined,
                  cart_id: urlCartId || undefined,
                }}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentFailed={handlePaymentFailed}
                onPaymentCancelled={handleCancel}
                qrSize={220}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default MerchantPaymentTerminalPage;
