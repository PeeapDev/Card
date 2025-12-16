/**
 * Marketplace Checkout Page
 *
 * Checkout flow for marketplace orders
 * Includes delivery/pickup options and payment
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import marketplaceService, {
  MarketplaceStore,
  CartItem,
} from '@/services/marketplace.service';
import {
  ArrowLeft,
  Store,
  MapPin,
  Phone,
  Clock,
  Truck,
  Package,
  CreditCard,
  Wallet,
  Loader2,
  Check,
  AlertCircle,
  ChevronRight,
  User,
  MessageSquare,
  BadgeCheck,
} from 'lucide-react';

// Format currency
const formatCurrency = (amount: number) => {
  return `Le ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

type FulfillmentType = 'delivery' | 'pickup';
type PaymentMethod = 'wallet' | 'mobile_money' | 'card';

export function MarketplaceCheckoutPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [store, setStore] = useState<MarketplaceStore | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wallet');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
    }
  }, [isAuthenticated, navigate]);

  // Load data
  useEffect(() => {
    if (storeId && user?.id) {
      loadData();
    }
  }, [storeId, user?.id]);

  // Set default values from user
  useEffect(() => {
    if (user) {
      setCustomerName(user.user_metadata?.full_name || `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || '');
      setCustomerPhone(user.phone || user.user_metadata?.phone || '');
    }
  }, [user]);

  const loadData = async () => {
    if (!storeId || !user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Load store
      const storeData = await marketplaceService.getStoreBySlug(storeId);
      if (!storeData) {
        setError('Store not found');
        return;
      }
      setStore(storeData);

      // Set default fulfillment type
      if (!storeData.offers_delivery && storeData.offers_pickup) {
        setFulfillmentType('pickup');
      }

      // Load cart
      const cartItems = await marketplaceService.getCart(user.id, storeData.id);
      if (cartItems.length === 0) {
        navigate(`/marketplace/store/${storeData.store_slug || storeData.id}`);
        return;
      }
      setCart(cartItems);
    } catch (error) {
      console.error('Error loading checkout data:', error);
      setError('Failed to load checkout data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = fulfillmentType === 'delivery' && store?.offers_delivery
    ? (store.free_delivery_minimum && subtotal >= store.free_delivery_minimum ? 0 : store.delivery_fee)
    : 0;
  const total = subtotal + deliveryFee;

  // Validation
  const canCheckout = () => {
    if (!customerName.trim() || !customerPhone.trim()) return false;
    if (fulfillmentType === 'delivery' && !deliveryAddress.trim()) return false;
    if (store?.minimum_order && subtotal < store.minimum_order) return false;
    return true;
  };

  // Place order
  const placeOrder = async () => {
    if (!user?.id || !store || !canCheckout()) return;

    setProcessing(true);
    setError(null);

    try {
      const orderData = {
        fulfillment_type: fulfillmentType,
        customer_name: customerName,
        customer_phone: customerPhone,
        delivery_address: fulfillmentType === 'delivery' ? deliveryAddress : undefined,
        delivery_notes: deliveryNotes || undefined,
        payment_method: paymentMethod,
        subtotal,
        delivery_fee: deliveryFee,
        total,
      };

      const order = await marketplaceService.createOrder(user.id, store.id, cart, orderData);

      // Clear cart
      await marketplaceService.clearCart(user.id, store.id);

      // Redirect to success/confirmation page
      navigate(`/marketplace/order/${order.id}?success=true`);
    } catch (error: any) {
      console.error('Error placing order:', error);
      setError(error.message || 'Failed to place order. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error && !store) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{error}</h2>
        <Link to="/marketplace" className="text-primary-600 hover:text-primary-700">
          Back to Marketplace
        </Link>
      </div>
    );
  }

  if (!store) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-semibold text-gray-900 dark:text-white">Checkout</h1>
            <p className="text-sm text-gray-500">{store.store_name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 pb-32">
        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Order Summary */}
        <Card className="p-4 mb-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Order Summary</h2>
          <div className="space-y-3">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {item.listing?.product?.name || 'Product'} x {item.quantity}
                </span>
                <span className="text-gray-900 dark:text-white">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(subtotal)}</span>
              </div>
              {fulfillmentType === 'delivery' && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600 dark:text-gray-400">
                    Delivery Fee
                    {deliveryFee === 0 && store.free_delivery_minimum && (
                      <span className="text-green-600 ml-1">(Free!)</span>
                    )}
                  </span>
                  <span className="text-gray-900 dark:text-white">{formatCurrency(deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Fulfillment Options */}
        <Card className="p-4 mb-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">How would you like to receive your order?</h2>
          <div className="grid grid-cols-2 gap-3">
            {store.offers_delivery && (
              <button
                onClick={() => setFulfillmentType('delivery')}
                className={`p-4 rounded-xl border-2 transition-colors ${
                  fulfillmentType === 'delivery'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <Truck className={`w-6 h-6 mx-auto mb-2 ${
                  fulfillmentType === 'delivery' ? 'text-primary-600' : 'text-gray-400'
                }`} />
                <p className={`font-medium ${
                  fulfillmentType === 'delivery' ? 'text-primary-600' : 'text-gray-900 dark:text-white'
                }`}>
                  Delivery
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {store.delivery_fee > 0 ? formatCurrency(store.delivery_fee) : 'Free'}
                </p>
              </button>
            )}
            {store.offers_pickup && (
              <button
                onClick={() => setFulfillmentType('pickup')}
                className={`p-4 rounded-xl border-2 transition-colors ${
                  fulfillmentType === 'pickup'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <Package className={`w-6 h-6 mx-auto mb-2 ${
                  fulfillmentType === 'pickup' ? 'text-primary-600' : 'text-gray-400'
                }`} />
                <p className={`font-medium ${
                  fulfillmentType === 'pickup' ? 'text-primary-600' : 'text-gray-900 dark:text-white'
                }`}>
                  Pickup
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ~{store.preparation_time_minutes} min
                </p>
              </button>
            )}
          </div>
        </Card>

        {/* Contact Details */}
        <Card className="p-4 mb-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Contact Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Your name"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="+232 XX XXX XXXX"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {fulfillmentType === 'delivery' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Delivery Address *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    value={deliveryAddress}
                    onChange={e => setDeliveryAddress(e.target.value)}
                    placeholder="Enter your full delivery address"
                    rows={2}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Special Instructions (Optional)
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <textarea
                  value={deliveryNotes}
                  onChange={e => setDeliveryNotes(e.target.value)}
                  placeholder="Any special instructions for your order..."
                  rows={2}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Payment Method */}
        <Card className="p-4 mb-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Payment Method</h2>
          <div className="space-y-3">
            <button
              onClick={() => setPaymentMethod('wallet')}
              className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-colors ${
                paymentMethod === 'wallet'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                paymentMethod === 'wallet' ? 'bg-primary-100 dark:bg-primary-900/30' : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                <Wallet className={`w-6 h-6 ${paymentMethod === 'wallet' ? 'text-primary-600' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1 text-left">
                <p className={`font-medium ${paymentMethod === 'wallet' ? 'text-primary-600' : 'text-gray-900 dark:text-white'}`}>
                  Peeap Wallet
                </p>
                <p className="text-sm text-gray-500">Pay from your wallet balance</p>
              </div>
              {paymentMethod === 'wallet' && (
                <Check className="w-5 h-5 text-primary-600" />
              )}
            </button>

            <button
              onClick={() => setPaymentMethod('mobile_money')}
              className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-colors ${
                paymentMethod === 'mobile_money'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                paymentMethod === 'mobile_money' ? 'bg-primary-100 dark:bg-primary-900/30' : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                <Phone className={`w-6 h-6 ${paymentMethod === 'mobile_money' ? 'text-primary-600' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1 text-left">
                <p className={`font-medium ${paymentMethod === 'mobile_money' ? 'text-primary-600' : 'text-gray-900 dark:text-white'}`}>
                  Mobile Money
                </p>
                <p className="text-sm text-gray-500">Orange Money, Africell Money</p>
              </div>
              {paymentMethod === 'mobile_money' && (
                <Check className="w-5 h-5 text-primary-600" />
              )}
            </button>

            <button
              onClick={() => setPaymentMethod('card')}
              className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-colors ${
                paymentMethod === 'card'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                paymentMethod === 'card' ? 'bg-primary-100 dark:bg-primary-900/30' : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                <CreditCard className={`w-6 h-6 ${paymentMethod === 'card' ? 'text-primary-600' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1 text-left">
                <p className={`font-medium ${paymentMethod === 'card' ? 'text-primary-600' : 'text-gray-900 dark:text-white'}`}>
                  Debit/Credit Card
                </p>
                <p className="text-sm text-gray-500">Visa, Mastercard</p>
              </div>
              {paymentMethod === 'card' && (
                <Check className="w-5 h-5 text-primary-600" />
              )}
            </button>
          </div>
        </Card>

        {/* Pickup Location Info */}
        {fulfillmentType === 'pickup' && store.address && (
          <Card className="p-4 mb-6">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Pickup Location</h2>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-gray-900 dark:text-white">{store.store_name}</p>
                <p className="text-sm text-gray-500">{store.address}</p>
                {store.phone && (
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <Phone className="w-3 h-3" />
                    {store.phone}
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 safe-area-pb">
        <div className="max-w-3xl mx-auto">
          {store.minimum_order && subtotal < store.minimum_order && (
            <p className="text-sm text-yellow-600 mb-2 text-center">
              Minimum order: {formatCurrency(store.minimum_order)}. Add {formatCurrency(store.minimum_order - subtotal)} more.
            </p>
          )}
          <Button
            onClick={placeOrder}
            disabled={processing || !canCheckout()}
            className="w-full py-4 text-lg"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Place Order - {formatCurrency(total)}
                <ChevronRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default MarketplaceCheckoutPage;
