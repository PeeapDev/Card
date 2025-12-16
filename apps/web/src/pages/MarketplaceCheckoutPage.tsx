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
  MarketplaceCartItem,
} from '@/services/marketplace.service';
import { walletService, ExtendedWallet } from '@/services/wallet.service';
import { monimeService } from '@/services/monime.service';
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
  Plus,
  ExternalLink,
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
  const [cart, setCart] = useState<MarketplaceCartItem[]>([]);
  const [cartId, setCartId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<ExtendedWallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState(0);
  const [depositLoading, setDepositLoading] = useState(false);

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

  // Check for deposit callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('deposited') === 'true') {
      // Refresh wallet after successful deposit
      loadWallet();
      // Remove query params
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Load data
  useEffect(() => {
    if (storeId && user?.id) {
      loadData();
      loadWallet();
    }
  }, [storeId, user?.id]);

  const loadWallet = async () => {
    if (!user?.id) return;
    try {
      setWalletLoading(true);
      const walletData = await walletService.getWalletByUserId(user.id);
      setWallet(walletData as ExtendedWallet | null);
    } catch (error) {
      console.error('Error loading wallet:', error);
    } finally {
      setWalletLoading(false);
    }
  };

  // Set default values from user
  useEffect(() => {
    if (user) {
      const metadata = (user as any).user_metadata || {};
      setCustomerName(metadata.full_name || `${metadata.first_name || ''} ${metadata.last_name || ''}`.trim() || '');
      setCustomerPhone((user as any).phone || metadata.phone || '');
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
      const cartData = await marketplaceService.getCart(user.id, storeData.id);
      if (!cartData || !cartData.items || cartData.items.length === 0) {
        navigate(`/marketplace/store/${storeData.store_slug || storeData.id}`);
        return;
      }
      setCartId(cartData.id);
      setCart(cartData.items);
    } catch (error) {
      console.error('Error loading checkout data:', error);
      setError('Failed to load checkout data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.unit_price || item.product?.price || 0) * item.quantity, 0);
  const deliveryFee = fulfillmentType === 'delivery' && store?.offers_delivery
    ? (store.free_delivery_minimum && subtotal >= store.free_delivery_minimum ? 0 : store.delivery_fee)
    : 0;
  const total = subtotal + deliveryFee;

  // Wallet balance helpers
  const walletBalance = wallet?.balance || 0;
  const insufficientFunds = paymentMethod === 'wallet' && walletBalance < total;
  const amountNeeded = total - walletBalance;

  // Validation
  const canCheckout = () => {
    if (!customerName.trim() || !customerPhone.trim()) return false;
    if (fulfillmentType === 'delivery' && !deliveryAddress.trim()) return false;
    if (store?.minimum_order && subtotal < store.minimum_order) return false;
    if (paymentMethod === 'wallet' && insufficientFunds) return false;
    return true;
  };

  // Handle deposit via Monime
  const handleDeposit = async () => {
    if (!wallet?.id) {
      setError('Wallet not found. Please refresh the page.');
      return;
    }

    setDepositLoading(true);
    try {
      const response = await monimeService.initiateDeposit({
        walletId: wallet.id,
        amount: depositAmount,
        successUrl: `${window.location.origin}/marketplace/checkout/${storeId}?deposited=true`,
        cancelUrl: `${window.location.origin}/marketplace/checkout/${storeId}?cancelled=true`,
        description: `Deposit for marketplace order at ${store?.store_name || 'store'}`,
      });

      if (response.paymentUrl) {
        // Redirect to Monime checkout
        window.location.href = response.paymentUrl;
      } else {
        setError('Failed to initiate deposit. Please try again.');
      }
    } catch (error: any) {
      console.error('Deposit error:', error);
      setError(error.message || 'Failed to initiate deposit.');
    } finally {
      setDepositLoading(false);
    }
  };

  // Open deposit modal with suggested amount
  const openDepositModal = () => {
    setDepositAmount(Math.ceil(amountNeeded / 1000) * 1000); // Round up to nearest 1000
    setShowDepositModal(true);
  };

  // Place order
  const placeOrder = async () => {
    if (!user?.id || !store || !canCheckout()) return;

    setProcessing(true);
    setError(null);

    try {
      const orderData = {
        customerId: user.id,
        customerName: customerName,
        customerPhone: customerPhone,
        storeId: store.id,
        orderType: fulfillmentType,
        deliveryAddress: fulfillmentType === 'delivery' ? deliveryAddress : undefined,
        deliveryInstructions: deliveryNotes || undefined,
        paymentMethod: paymentMethod,
        items: cart.map(item => ({
          productId: item.product_id,
          listingId: item.listing_id || undefined,
          productName: item.product?.name || 'Product',
          productImageUrl: item.product?.image_url || undefined,
          quantity: item.quantity,
          unitPrice: item.unit_price || item.product?.price || 0,
          notes: item.notes || undefined,
          modifiers: item.modifiers || [],
        })),
        subtotal,
        deliveryFee: deliveryFee,
        serviceFee: 0,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount: total,
      };

      const order = await marketplaceService.createOrder(orderData);

      // Clear cart
      if (cartId) {
        await marketplaceService.clearCart(cartId);
      }

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
                  {item.product?.name || 'Product'} x {item.quantity}
                </span>
                <span className="text-gray-900 dark:text-white">
                  {formatCurrency((item.unit_price || item.product?.price || 0) * item.quantity)}
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
                <p className="text-sm text-gray-500">
                  {walletLoading ? (
                    'Loading balance...'
                  ) : (
                    <>Balance: <span className={walletBalance >= total ? 'text-green-600' : 'text-red-500'}>{formatCurrency(walletBalance)}</span></>
                  )}
                </p>
              </div>
              {paymentMethod === 'wallet' && (
                <Check className="w-5 h-5 text-primary-600" />
              )}
            </button>

            {/* Insufficient balance warning & deposit option */}
            {paymentMethod === 'wallet' && insufficientFunds && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
                      Insufficient wallet balance
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                      You need {formatCurrency(amountNeeded)} more to complete this order.
                    </p>
                    <button
                      onClick={openDepositModal}
                      className="mt-3 flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Deposit via Mobile Money
                    </button>
                  </div>
                </div>
              </div>
            )}

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

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !depositLoading && setShowDepositModal(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Deposit to Wallet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Add funds via Mobile Money to complete your order
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount to Deposit
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Le</span>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    min={amountNeeded}
                    step={1000}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary-500 text-lg font-semibold"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Minimum required: {formatCurrency(amountNeeded)}
                </p>
              </div>

              {/* Quick amount buttons */}
              <div className="flex flex-wrap gap-2">
                {[5000, 10000, 20000, 50000].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setDepositAmount(amount)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      depositAmount === amount
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {formatCurrency(amount)}
                  </button>
                ))}
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  You'll be redirected to complete payment via Mobile Money (Orange Money, Africell Money). After payment, you'll return here to complete your order.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDepositModal(false)}
                disabled={depositLoading}
                className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeposit}
                disabled={depositLoading || depositAmount < amountNeeded}
                className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {depositLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    Deposit {formatCurrency(depositAmount)}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketplaceCheckoutPage;
