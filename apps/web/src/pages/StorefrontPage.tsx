/**
 * Storefront Page
 *
 * Public storefront for a specific vendor
 * Users can browse products and add them to cart
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import marketplaceService, {
  MarketplaceStore,
  MarketplaceListing,
  CartItem,
} from '@/services/marketplace.service';
import {
  ArrowLeft,
  Star,
  MapPin,
  Clock,
  Truck,
  Package,
  Phone,
  Mail,
  BadgeCheck,
  ShoppingCart,
  Plus,
  Minus,
  Loader2,
  Store,
  Heart,
  Share2,
  ChevronRight,
  Search,
  X,
  Info,
  Check,
  AlertCircle,
} from 'lucide-react';

// Format currency
const formatCurrency = (amount: number) => {
  return `Le ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// Format time
const formatTime = (time: string) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

export function StorefrontPage() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<MarketplaceStore | null>(null);
  const [products, setProducts] = useState<MarketplaceListing[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [showCart, setShowCart] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  // Load store and products
  useEffect(() => {
    if (storeSlug) {
      loadStore();
    }
  }, [storeSlug]);

  // Load cart
  useEffect(() => {
    if (user?.id && store?.id) {
      loadCart();
    }
  }, [user?.id, store?.id]);

  // Calculate cart total
  useEffect(() => {
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    setCartTotal(total);
  }, [cart]);

  const loadStore = async () => {
    if (!storeSlug) return;

    try {
      setLoading(true);

      // Load store
      const storeData = await marketplaceService.getStoreBySlug(storeSlug);
      if (!storeData) {
        navigate('/marketplace');
        return;
      }
      setStore(storeData);

      // Load products
      const productList = await marketplaceService.getStoreProducts(storeData.id);
      setProducts(productList);
    } catch (error) {
      console.error('Error loading store:', error);
      navigate('/marketplace');
    } finally {
      setLoading(false);
    }
  };

  const loadCart = async () => {
    if (!user?.id || !store?.id) return;

    try {
      const cartItems = await marketplaceService.getCart(user.id, store.id);
      setCart(cartItems);
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  };

  const addToCart = async (listing: MarketplaceListing) => {
    if (!isAuthenticated) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    if (!user?.id || !store?.id) return;

    setAddingToCart(listing.id);
    try {
      // Check if already in cart
      const existingItem = cart.find(item => item.listing_id === listing.id);

      if (existingItem) {
        await marketplaceService.updateCartItem(existingItem.id, existingItem.quantity + 1);
      } else {
        await marketplaceService.addToCart(user.id, store.id, listing.id, 1);
      }

      await loadCart();
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setAddingToCart(null);
    }
  };

  const updateCartQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) {
      await removeFromCart(itemId);
      return;
    }

    try {
      await marketplaceService.updateCartItem(itemId, quantity);
      await loadCart();
    } catch (error) {
      console.error('Error updating cart:', error);
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      await marketplaceService.removeFromCart(itemId);
      await loadCart();
    } catch (error) {
      console.error('Error removing from cart:', error);
    }
  };

  // Get unique categories from products
  const categories = [...new Set(
    products
      .filter(p => p.product?.category_id)
      .map(p => p.product?.category?.name)
      .filter(Boolean)
  )];

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchQuery ||
      p.product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.product?.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !selectedCategory ||
      p.product?.category?.name === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Group products by category
  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const category = product.product?.category?.name || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {} as Record<string, MarketplaceListing[]>);

  // Check if store is open
  const isStoreOpen = () => {
    if (!store?.operating_hours) return true;

    const now = new Date();
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const hours = store.operating_hours[dayName];

    if (!hours || hours.closed) return false;

    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [openHours, openMins] = hours.open.split(':').map(Number);
    const [closeHours, closeMins] = hours.close.split(':').map(Number);
    const openTime = openHours * 60 + openMins;
    const closeTime = closeHours * 60 + closeMins;

    return currentTime >= openTime && currentTime <= closeTime;
  };

  const storeOpen = isStoreOpen();

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </MainLayout>
    );
  }

  if (!store) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <Store className="w-16 h-16 text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Store not found</h2>
          <Link to="/marketplace" className="text-primary-600 hover:text-primary-700">
            Back to Marketplace
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Store Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          {/* Banner */}
          <div className="h-40 sm:h-56 bg-gradient-to-r from-primary-500 to-primary-600 relative">
            {store.banner_url && (
              <img src={store.banner_url} alt="" className="w-full h-full object-cover" />
            )}
            {/* Back button */}
            <button
              onClick={() => navigate('/marketplace')}
              className="absolute top-4 left-4 p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow hover:bg-white dark:hover:bg-gray-800"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
            {/* Share button */}
            <button
              onClick={() => navigator.share?.({ title: store.store_name, url: window.location.href })}
              className="absolute top-4 right-4 p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow hover:bg-white dark:hover:bg-gray-800"
            >
              <Share2 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
          </div>

          {/* Store Info */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="relative -mt-12 sm:-mt-16 pb-4 sm:pb-6">
              {/* Logo */}
              <div className="flex items-end gap-4">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl bg-white dark:bg-gray-700 border-4 border-white dark:border-gray-800 shadow-lg flex items-center justify-center overflow-hidden">
                  {store.logo_url ? (
                    <img src={store.logo_url} alt={store.store_name} className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />
                  )}
                </div>

                <div className="flex-1 pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {store.store_name}
                        {store.is_verified && (
                          <BadgeCheck className="w-6 h-6 text-blue-500" />
                        )}
                      </h1>
                      {store.average_rating > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {store.average_rating.toFixed(1)}
                          </span>
                          <span className="text-gray-500">({store.total_ratings} reviews)</span>
                        </div>
                      )}
                    </div>

                    {/* Open/Closed badge */}
                    <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                      storeOpen
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {storeOpen ? 'Open Now' : 'Closed'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Store details */}
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                {store.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {store.address}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {store.preparation_time_minutes} min prep time
                </span>
                {store.offers_delivery && (
                  <span className="flex items-center gap-1 text-green-600">
                    <Truck className="w-4 h-4" />
                    {store.delivery_fee > 0 ? formatCurrency(store.delivery_fee) : 'Free'} delivery
                  </span>
                )}
                {store.offers_pickup && (
                  <span className="flex items-center gap-1">
                    <Package className="w-4 h-4" />
                    Pickup available
                  </span>
                )}
              </div>

              {store.description && (
                <p className="mt-3 text-gray-600 dark:text-gray-400">
                  {store.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Products Section */}
            <div className="flex-1">
              {/* Search and Filter */}
              <div className="mb-6 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {categories.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-colors ${
                        !selectedCategory
                          ? 'bg-primary-600 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      All
                    </button>
                    {categories.map(category => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category === selectedCategory ? null : category!)}
                        className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-colors ${
                          selectedCategory === category
                            ? 'bg-primary-600 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Products */}
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No products found
                  </h3>
                  <p className="text-gray-500">
                    {searchQuery ? 'Try a different search term' : 'This store has no products listed yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
                    <div key={category}>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        {category}
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {categoryProducts.map(listing => (
                          <ProductCard
                            key={listing.id}
                            listing={listing}
                            onAddToCart={() => addToCart(listing)}
                            isLoading={addingToCart === listing.id}
                            inCart={cart.some(item => item.listing_id === listing.id)}
                            storeOpen={storeOpen}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Sidebar - Desktop */}
            <div className="hidden lg:block w-80">
              <CartSidebar
                cart={cart}
                store={store}
                total={cartTotal}
                onUpdateQuantity={updateCartQuantity}
                onRemove={removeFromCart}
                storeOpen={storeOpen}
              />
            </div>
          </div>
        </div>

        {/* Mobile Cart Button */}
        {cart.length > 0 && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-area-pb">
            <button
              onClick={() => setShowCart(true)}
              className="w-full flex items-center justify-between bg-primary-600 text-white py-4 px-6 rounded-xl font-medium"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                <span>{cart.length} items</span>
              </div>
              <span>{formatCurrency(cartTotal)}</span>
            </button>
          </div>
        )}

        {/* Mobile Cart Sheet */}
        {showCart && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowCart(false)} />
            <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Cart</h3>
                <button onClick={() => setShowCart(false)} className="p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                <CartSidebar
                  cart={cart}
                  store={store}
                  total={cartTotal}
                  onUpdateQuantity={updateCartQuantity}
                  onRemove={removeFromCart}
                  storeOpen={storeOpen}
                  isMobile
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

// Product Card Component
function ProductCard({
  listing,
  onAddToCart,
  isLoading,
  inCart,
  storeOpen,
}: {
  listing: MarketplaceListing;
  onAddToCart: () => void;
  isLoading: boolean;
  inCart: boolean;
  storeOpen: boolean;
}) {
  const product = listing.product;
  if (!product) return null;

  const outOfStock = product.track_inventory && product.stock_quantity === 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex gap-4 p-4">
        {/* Image */}
        <div className="w-24 h-24 rounded-lg bg-gray-100 dark:bg-gray-700 flex-shrink-0 overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-white">{product.name}</h3>
          {product.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
              {product.description}
            </p>
          )}
          <div className="flex items-center justify-between mt-2">
            <p className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(listing.marketplace_price || product.price)}
            </p>
            {outOfStock ? (
              <span className="text-sm text-red-600 font-medium">Out of stock</span>
            ) : !storeOpen ? (
              <span className="text-sm text-gray-500">Store closed</span>
            ) : (
              <button
                onClick={onAddToCart}
                disabled={isLoading}
                className={`p-2 rounded-lg transition-colors ${
                  inCart
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30'
                    : 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 hover:bg-primary-200'
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : inCart ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Cart Sidebar Component
function CartSidebar({
  cart,
  store,
  total,
  onUpdateQuantity,
  onRemove,
  storeOpen,
  isMobile = false,
}: {
  cart: CartItem[];
  store: MarketplaceStore;
  total: number;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  storeOpen: boolean;
  isMobile?: boolean;
}) {
  const navigate = useNavigate();

  const deliveryFee = store.offers_delivery ? store.delivery_fee : 0;
  const isFreeDelivery = store.free_delivery_minimum && total >= store.free_delivery_minimum;
  const finalDeliveryFee = isFreeDelivery ? 0 : deliveryFee;
  const grandTotal = total + finalDeliveryFee;

  const meetsMinimum = !store.minimum_order || total >= store.minimum_order;

  if (cart.length === 0) {
    return (
      <Card className={`${isMobile ? '' : 'sticky top-6'} p-6 text-center`}>
        <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <h3 className="font-medium text-gray-900 dark:text-white mb-1">Your cart is empty</h3>
        <p className="text-sm text-gray-500">Add items to get started</p>
      </Card>
    );
  }

  return (
    <Card className={`${isMobile ? '' : 'sticky top-6'} overflow-hidden`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">Your Order</h3>
        <p className="text-sm text-gray-500">{cart.length} items</p>
      </div>

      {/* Items */}
      <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
        {cart.map(item => (
          <div key={item.id} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                {item.listing?.product?.name || 'Product'}
              </p>
              <p className="text-sm text-gray-500">
                {formatCurrency(item.price)} x {item.quantity}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-6 text-center text-sm">{item.quantity}</span>
              <button
                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => onRemove(item.id)}
              className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Subtotal</span>
          <span className="text-gray-900 dark:text-white">{formatCurrency(total)}</span>
        </div>
        {store.offers_delivery && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">
              Delivery
              {isFreeDelivery && (
                <span className="ml-1 text-green-600">(Free!)</span>
              )}
            </span>
            <span className={isFreeDelivery ? 'text-green-600 line-through' : 'text-gray-900 dark:text-white'}>
              {formatCurrency(deliveryFee)}
            </span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-lg pt-2 border-t border-gray-200 dark:border-gray-700">
          <span>Total</span>
          <span>{formatCurrency(grandTotal)}</span>
        </div>
      </div>

      {/* Checkout */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
        {!storeOpen && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>This store is currently closed. You can browse and save items for later.</span>
          </div>
        )}

        {!meetsMinimum && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-lg text-sm">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Minimum order: {formatCurrency(store.minimum_order)}. Add {formatCurrency(store.minimum_order - total)} more.
            </span>
          </div>
        )}

        {store.free_delivery_minimum && !isFreeDelivery && (
          <p className="text-xs text-gray-500 text-center">
            Add {formatCurrency(store.free_delivery_minimum - total)} more for free delivery
          </p>
        )}

        <Button
          onClick={() => navigate(`/marketplace/checkout/${store.id}`)}
          disabled={!storeOpen || !meetsMinimum}
          className="w-full"
        >
          Proceed to Checkout
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </Card>
  );
}

export default StorefrontPage;
