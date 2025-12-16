/**
 * Marketplace Service - Handle all marketplace operations
 */

import { supabase } from '@/lib/supabase';

// Types
export interface MarketplaceStore {
  id: string;
  merchant_id: string;
  store_name: string;
  store_slug: string | null;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  is_listed: boolean;
  is_verified: boolean;
  is_featured: boolean;
  offers_pickup: boolean;
  offers_delivery: boolean;
  delivery_radius_km: number | null;
  delivery_fee: number;
  free_delivery_minimum: number | null;
  minimum_order: number;
  preparation_time_minutes: number;
  operating_hours: Record<string, { open: string; close: string }>;
  is_open_now: boolean;
  store_categories: string[];
  total_orders: number;
  total_revenue: number;
  average_rating: number;
  total_ratings: number;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceListing {
  id: string;
  merchant_id: string;
  store_id: string;
  product_id: string;
  is_listed: boolean;
  is_featured: boolean;
  marketplace_price: number | null;
  marketplace_description: string | null;
  sort_order: number;
  view_count: number;
  order_count: number;
  created_at: string;
  updated_at: string;
  // Joined data
  product?: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    sku: string | null;
    stock_quantity: number;
    category?: {
      id: string;
      name: string;
      color: string;
    };
  };
}

export interface MarketplaceOrder {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  merchant_id: string;
  store_id: string;
  order_type: 'pickup' | 'delivery';
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_instructions: string | null;
  pickup_time: string | null;
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method: string | null;
  payment_reference: string | null;
  paid_at: string | null;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled';
  confirmed_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  estimated_ready_time: string | null;
  customer_notes: string | null;
  merchant_notes: string | null;
  rating: number | null;
  review: string | null;
  pos_sale_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  items?: MarketplaceOrderItem[];
  store?: MarketplaceStore;
}

export interface MarketplaceOrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  listing_id: string | null;
  product_name: string;
  product_image_url: string | null;
  product_sku: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  modifiers: Array<{ name: string; price: number }>;
  created_at: string;
}

export interface MarketplaceCart {
  id: string;
  user_id: string;
  store_id: string;
  subtotal: number;
  item_count: number;
  created_at: string;
  updated_at: string;
  items?: MarketplaceCartItem[];
  store?: MarketplaceStore;
}

export interface MarketplaceCartItem {
  id: string;
  cart_id: string;
  product_id: string;
  listing_id: string | null;
  quantity: number;
  unit_price: number;
  notes: string | null;
  modifiers: Array<{ name: string; price: number }>;
  created_at: string;
  updated_at: string;
  // Joined data
  product?: {
    id: string;
    name: string;
    image_url: string | null;
    price: number;
  };
}

export interface MarketplaceNotification {
  id: string;
  merchant_id: string;
  type: 'new_order' | 'order_cancelled' | 'low_stock' | 'review';
  title: string;
  message: string | null;
  order_id: string | null;
  product_id: string | null;
  is_read: boolean;
  read_at: string | null;
  is_urgent: boolean;
  sound_alert: boolean;
  created_at: string;
}

export interface StoreCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string;
  sort_order: number;
  is_active: boolean;
}

class MarketplaceService {
  // ============================================
  // STORE MANAGEMENT (For Merchants)
  // ============================================

  async getMyStore(merchantId: string): Promise<MarketplaceStore | null> {
    const { data, error } = await supabase
      .from('marketplace_stores')
      .select('*')
      .eq('merchant_id', merchantId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching store:', error);
      throw error;
    }

    return data;
  }

  async createStore(merchantId: string, store: Partial<MarketplaceStore>): Promise<MarketplaceStore> {
    const { data, error } = await supabase
      .from('marketplace_stores')
      .insert({
        merchant_id: merchantId,
        store_name: store.store_name || 'My Store',
        store_slug: store.store_slug || null,
        description: store.description || null,
        logo_url: store.logo_url || null,
        banner_url: store.banner_url || null,
        phone: store.phone || null,
        email: store.email || null,
        address: store.address || null,
        city: store.city || null,
        country: store.country || 'Sierra Leone',
        is_listed: store.is_listed || false,
        offers_pickup: store.offers_pickup ?? true,
        offers_delivery: store.offers_delivery || false,
        delivery_fee: store.delivery_fee || 0,
        minimum_order: store.minimum_order || 0,
        preparation_time_minutes: store.preparation_time_minutes || 30,
        operating_hours: store.operating_hours || {},
        store_categories: store.store_categories || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating store:', error);
      throw error;
    }

    return data;
  }

  async updateStore(storeId: string, updates: Partial<MarketplaceStore>): Promise<MarketplaceStore> {
    const { data, error } = await supabase
      .from('marketplace_stores')
      .update(updates)
      .eq('id', storeId)
      .select()
      .single();

    if (error) {
      console.error('Error updating store:', error);
      throw error;
    }

    return data;
  }

  // ============================================
  // PRODUCT LISTINGS (For Merchants)
  // ============================================

  async getMyListings(merchantId: string): Promise<MarketplaceListing[]> {
    const { data, error } = await supabase
      .from('marketplace_listings')
      .select(`
        *,
        product:pos_products (
          id, name, description, price, image_url, sku, stock_quantity,
          category:pos_categories (id, name, color)
        )
      `)
      .eq('merchant_id', merchantId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching listings:', error);
      throw error;
    }

    return data || [];
  }

  async createListing(merchantId: string, storeId: string, productId: string): Promise<MarketplaceListing> {
    const { data, error } = await supabase
      .from('marketplace_listings')
      .insert({
        merchant_id: merchantId,
        store_id: storeId,
        product_id: productId,
        is_listed: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating listing:', error);
      throw error;
    }

    return data;
  }

  async updateListing(listingId: string, updates: Partial<MarketplaceListing>): Promise<MarketplaceListing> {
    const { data, error } = await supabase
      .from('marketplace_listings')
      .update(updates)
      .eq('id', listingId)
      .select()
      .single();

    if (error) {
      console.error('Error updating listing:', error);
      throw error;
    }

    return data;
  }

  async deleteListing(listingId: string): Promise<void> {
    const { error } = await supabase
      .from('marketplace_listings')
      .delete()
      .eq('id', listingId);

    if (error) {
      console.error('Error deleting listing:', error);
      throw error;
    }
  }

  async bulkToggleListings(productIds: string[], isListed: boolean, merchantId: string, storeId: string): Promise<void> {
    // For products not yet in listings, create them
    for (const productId of productIds) {
      const { data: existing } = await supabase
        .from('marketplace_listings')
        .select('id')
        .eq('product_id', productId)
        .single();

      if (existing) {
        await supabase
          .from('marketplace_listings')
          .update({ is_listed: isListed })
          .eq('product_id', productId);
      } else if (isListed) {
        await supabase
          .from('marketplace_listings')
          .insert({
            merchant_id: merchantId,
            store_id: storeId,
            product_id: productId,
            is_listed: true,
          });
      }
    }
  }

  // ============================================
  // MARKETPLACE BROWSING (For Consumers)
  // ============================================

  async getStoreCategories(): Promise<StoreCategory[]> {
    const { data, error } = await supabase
      .from('marketplace_store_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching store categories:', error);
      throw error;
    }

    return data || [];
  }

  async getListedStores(filters?: {
    category?: string;
    city?: string;
    search?: string;
    featured?: boolean;
  }): Promise<MarketplaceStore[]> {
    let query = supabase
      .from('marketplace_stores')
      .select('*')
      .eq('is_listed', true);

    if (filters?.category) {
      query = query.contains('store_categories', [filters.category]);
    }

    if (filters?.city) {
      query = query.ilike('city', `%${filters.city}%`);
    }

    if (filters?.search) {
      query = query.or(`store_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters?.featured) {
      query = query.eq('is_featured', true);
    }

    const { data, error } = await query.order('is_featured', { ascending: false }).order('total_orders', { ascending: false });

    if (error) {
      console.error('Error fetching stores:', error);
      throw error;
    }

    return data || [];
  }

  async getStoreBySlug(slug: string): Promise<MarketplaceStore | null> {
    const { data, error } = await supabase
      .from('marketplace_stores')
      .select('*')
      .eq('store_slug', slug)
      .eq('is_listed', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching store:', error);
      throw error;
    }

    return data;
  }

  async getStoreById(storeId: string): Promise<MarketplaceStore | null> {
    const { data, error } = await supabase
      .from('marketplace_stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching store:', error);
      throw error;
    }

    return data;
  }

  async getStoreProducts(storeId: string): Promise<MarketplaceListing[]> {
    const { data, error } = await supabase
      .from('marketplace_listings')
      .select(`
        *,
        product:pos_products (
          id, name, description, price, image_url, sku, stock_quantity,
          category:pos_categories (id, name, color)
        )
      `)
      .eq('store_id', storeId)
      .eq('is_listed', true)
      .order('is_featured', { ascending: false })
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching store products:', error);
      throw error;
    }

    return data || [];
  }

  // ============================================
  // CART MANAGEMENT (For Consumers)
  // ============================================

  async getCart(userId: string, storeId: string): Promise<MarketplaceCart | null> {
    const { data, error } = await supabase
      .from('marketplace_carts')
      .select(`
        *,
        items:marketplace_cart_items (
          *,
          product:pos_products (id, name, image_url, price)
        ),
        store:marketplace_stores (id, store_name, logo_url, delivery_fee, minimum_order)
      `)
      .eq('user_id', userId)
      .eq('store_id', storeId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching cart:', error);
      throw error;
    }

    return data;
  }

  async getAllCarts(userId: string): Promise<MarketplaceCart[]> {
    const { data, error } = await supabase
      .from('marketplace_carts')
      .select(`
        *,
        items:marketplace_cart_items (
          *,
          product:pos_products (id, name, image_url, price)
        ),
        store:marketplace_stores (id, store_name, logo_url, delivery_fee, minimum_order)
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching carts:', error);
      throw error;
    }

    return data || [];
  }

  async addToCart(
    userId: string,
    storeId: string,
    productId: string,
    quantity: number,
    unitPrice: number,
    notes?: string,
    modifiers?: Array<{ name: string; price: number }>
  ): Promise<MarketplaceCartItem> {
    // Get or create cart
    let { data: cart } = await supabase
      .from('marketplace_carts')
      .select('id')
      .eq('user_id', userId)
      .eq('store_id', storeId)
      .single();

    if (!cart) {
      const { data: newCart, error: cartError } = await supabase
        .from('marketplace_carts')
        .insert({ user_id: userId, store_id: storeId })
        .select()
        .single();

      if (cartError) throw cartError;
      cart = newCart;
    }

    if (!cart) throw new Error('Failed to create or retrieve cart');

    // Check if item already exists
    const { data: existing } = await supabase
      .from('marketplace_cart_items')
      .select('id, quantity')
      .eq('cart_id', cart.id)
      .eq('product_id', productId)
      .single();

    if (existing) {
      // Update quantity
      const { data, error } = await supabase
        .from('marketplace_cart_items')
        .update({
          quantity: existing.quantity + quantity,
          notes,
          modifiers: modifiers || [],
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      await this.updateCartTotals(cart.id);
      return data;
    }

    // Add new item
    const { data, error } = await supabase
      .from('marketplace_cart_items')
      .insert({
        cart_id: cart.id,
        product_id: productId,
        quantity,
        unit_price: unitPrice,
        notes,
        modifiers: modifiers || [],
      })
      .select()
      .single();

    if (error) throw error;
    await this.updateCartTotals(cart.id);
    return data;
  }

  async updateCartItem(itemId: string, quantity: number, notes?: string): Promise<void> {
    const { data: item, error: fetchError } = await supabase
      .from('marketplace_cart_items')
      .select('cart_id')
      .eq('id', itemId)
      .single();

    if (fetchError) throw fetchError;

    if (quantity <= 0) {
      await supabase.from('marketplace_cart_items').delete().eq('id', itemId);
    } else {
      await supabase
        .from('marketplace_cart_items')
        .update({ quantity, notes })
        .eq('id', itemId);
    }

    await this.updateCartTotals(item.cart_id);
  }

  async removeFromCart(itemId: string): Promise<void> {
    const { data: item } = await supabase
      .from('marketplace_cart_items')
      .select('cart_id')
      .eq('id', itemId)
      .single();

    await supabase.from('marketplace_cart_items').delete().eq('id', itemId);

    if (item) {
      await this.updateCartTotals(item.cart_id);
    }
  }

  async clearCart(cartId: string): Promise<void> {
    await supabase.from('marketplace_cart_items').delete().eq('cart_id', cartId);
    await supabase.from('marketplace_carts').delete().eq('id', cartId);
  }

  private async updateCartTotals(cartId: string): Promise<void> {
    const { data: items } = await supabase
      .from('marketplace_cart_items')
      .select('quantity, unit_price, modifiers')
      .eq('cart_id', cartId);

    const subtotal = (items || []).reduce((sum, item) => {
      const modifierTotal = (item.modifiers || []).reduce((m: number, mod: any) => m + mod.price, 0);
      return sum + (item.unit_price + modifierTotal) * item.quantity;
    }, 0);

    const itemCount = (items || []).reduce((sum, item) => sum + item.quantity, 0);

    await supabase
      .from('marketplace_carts')
      .update({ subtotal, item_count: itemCount })
      .eq('id', cartId);
  }

  // ============================================
  // ORDER MANAGEMENT
  // ============================================

  async createOrder(order: {
    customerId: string;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    storeId: string;
    orderType: 'pickup' | 'delivery';
    deliveryAddress?: string;
    deliveryCity?: string;
    deliveryInstructions?: string;
    pickupTime?: string;
    customerNotes?: string;
    items: Array<{
      productId: string;
      listingId?: string;
      productName: string;
      productImageUrl?: string;
      productSku?: string;
      quantity: number;
      unitPrice: number;
      notes?: string;
      modifiers?: Array<{ name: string; price: number }>;
    }>;
    subtotal: number;
    deliveryFee: number;
    serviceFee: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    paymentMethod?: string;
    paymentReference?: string;
  }): Promise<MarketplaceOrder> {
    // Get store to get merchant_id
    const { data: store } = await supabase
      .from('marketplace_stores')
      .select('merchant_id')
      .eq('id', order.storeId)
      .single();

    if (!store) throw new Error('Store not found');

    // Generate order number
    const { data: orderNumberData } = await supabase.rpc('generate_marketplace_order_number');
    const orderNumber = orderNumberData || `MKT-${Date.now()}`;

    // Create order
    const { data: newOrder, error: orderError } = await supabase
      .from('marketplace_orders')
      .insert({
        order_number: orderNumber,
        customer_id: order.customerId,
        customer_name: order.customerName,
        customer_phone: order.customerPhone,
        customer_email: order.customerEmail,
        merchant_id: store.merchant_id,
        store_id: order.storeId,
        order_type: order.orderType,
        delivery_address: order.deliveryAddress,
        delivery_city: order.deliveryCity,
        delivery_instructions: order.deliveryInstructions,
        pickup_time: order.pickupTime,
        customer_notes: order.customerNotes,
        subtotal: order.subtotal,
        delivery_fee: order.deliveryFee,
        service_fee: order.serviceFee,
        tax_amount: order.taxAmount,
        discount_amount: order.discountAmount,
        total_amount: order.totalAmount,
        payment_method: order.paymentMethod,
        payment_reference: order.paymentReference,
        payment_status: order.paymentReference ? 'paid' : 'pending',
        paid_at: order.paymentReference ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const orderItems = order.items.map(item => ({
      order_id: newOrder.id,
      product_id: item.productId,
      listing_id: item.listingId,
      product_name: item.productName,
      product_image_url: item.productImageUrl,
      product_sku: item.productSku,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.unitPrice * item.quantity,
      notes: item.notes,
      modifiers: item.modifiers || [],
    }));

    await supabase.from('marketplace_order_items').insert(orderItems);

    return newOrder;
  }

  async getOrdersByCustomer(customerId: string): Promise<MarketplaceOrder[]> {
    const { data, error } = await supabase
      .from('marketplace_orders')
      .select(`
        *,
        items:marketplace_order_items (*),
        store:marketplace_stores (id, store_name, logo_url, phone)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getOrdersByMerchant(merchantId: string, status?: string): Promise<MarketplaceOrder[]> {
    let query = supabase
      .from('marketplace_orders')
      .select(`
        *,
        items:marketplace_order_items (*)
      `)
      .eq('merchant_id', merchantId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async updateOrderStatus(
    orderId: string,
    status: MarketplaceOrder['status'],
    notes?: string
  ): Promise<MarketplaceOrder> {
    const timestamp = new Date().toISOString();
    const statusTimestamp: Record<string, string | null> = {};

    switch (status) {
      case 'confirmed':
        statusTimestamp.confirmed_at = timestamp;
        break;
      case 'preparing':
        statusTimestamp.preparing_at = timestamp;
        break;
      case 'ready':
        statusTimestamp.ready_at = timestamp;
        break;
      case 'out_for_delivery':
        // No specific timestamp
        break;
      case 'delivered':
        statusTimestamp.delivered_at = timestamp;
        break;
      case 'completed':
        statusTimestamp.completed_at = timestamp;
        break;
      case 'cancelled':
        statusTimestamp.cancelled_at = timestamp;
        statusTimestamp.cancel_reason = notes || null;
        break;
    }

    const { data, error } = await supabase
      .from('marketplace_orders')
      .update({
        status,
        merchant_notes: notes,
        ...statusTimestamp,
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ============================================
  // NOTIFICATIONS (For Merchants)
  // ============================================

  async getNotifications(merchantId: string, unreadOnly = false): Promise<MarketplaceNotification[]> {
    let query = supabase
      .from('marketplace_notifications')
      .select('*')
      .eq('merchant_id', merchantId);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(50);

    if (error) throw error;
    return data || [];
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    await supabase
      .from('marketplace_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);
  }

  async markAllNotificationsRead(merchantId: string): Promise<void> {
    await supabase
      .from('marketplace_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('merchant_id', merchantId)
      .eq('is_read', false);
  }

  // Get featured products for the feed (stories-style)
  async getFeaturedProducts(limit = 20): Promise<{
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    store_name: string;
    store_slug: string | null;
    store_logo: string | null;
    store_id: string;
    is_featured: boolean;
  }[]> {
    // First try to get from marketplace_listings
    const { data: listingsData, error: listingsError } = await supabase
      .from('marketplace_listings')
      .select(`
        id,
        marketplace_price,
        is_featured,
        product:pos_products(id, name, price, image_url),
        store:marketplace_stores(id, store_name, store_slug, logo_url, is_listed, is_verified)
      `)
      .eq('is_listed', true)
      .order('is_featured', { ascending: false })
      .order('view_count', { ascending: false })
      .limit(limit);

    if (!listingsError && listingsData && listingsData.length > 0) {
      // Filter to only include products from listed stores and transform data
      const products = listingsData
        .filter((item: any) => item.store?.is_listed)
        .map((item: any) => ({
          id: item.id,
          name: item.product?.name || 'Product',
          price: item.marketplace_price || item.product?.price || 0,
          image_url: item.product?.image_url,
          store_name: item.store?.store_name || 'Store',
          store_slug: item.store?.store_slug,
          store_logo: item.store?.logo_url,
          store_id: item.store?.id,
          is_featured: item.is_featured,
        }));

      if (products.length > 0) {
        return products;
      }
    }

    // Fallback: Get products from ALL POS products that have images
    // First try to get marketplace stores for store info (may not exist)
    let storesData: any[] = [];
    try {
      const { data } = await supabase
        .from('marketplace_stores')
        .select(`id, store_name, store_slug, logo_url, merchant_id`)
        .eq('is_listed', true);
      storesData = data || [];
    } catch {
      // marketplace_stores table may not exist
    }

    // Get ALL POS products with images (from any business)
    const { data: productsData, error: productsError } = await supabase
      .from('pos_products')
      .select('*')
      .eq('is_active', true)
      .not('image_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (productsError || !productsData || productsData.length === 0) {
      return [];
    }

    // Try to get business info if businesses table exists
    let businessesData: any[] = [];
    const merchantIds = [...new Set(productsData.map(p => p.merchant_id))];
    try {
      const { data } = await supabase
        .from('businesses')
        .select('id, business_name, logo_url, merchant_id')
        .in('merchant_id', merchantIds);
      businessesData = data || [];
    } catch {
      // businesses table may not exist
    }

    // Map products with store info (use marketplace store if exists, otherwise use business info)
    return productsData.map((product: any) => {
      const store = storesData.find(s => s.merchant_id === product.merchant_id);
      const business = businessesData.find(b => b.merchant_id === product.merchant_id);
      const storeName = store?.store_name || business?.business_name || 'Store';
      const storeLogo = store?.logo_url || business?.logo_url || null;

      return {
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        store_name: storeName,
        store_slug: store?.store_slug || null,
        store_logo: storeLogo,
        store_id: store?.id || product.merchant_id,
        is_featured: false,
      };
    });
  }

  // Real-time subscription for new notifications
  subscribeToNotifications(merchantId: string, callback: (notification: MarketplaceNotification) => void) {
    return supabase
      .channel(`marketplace-notifications-${merchantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'marketplace_notifications',
          filter: `merchant_id=eq.${merchantId}`,
        },
        (payload) => {
          callback(payload.new as MarketplaceNotification);
        }
      )
      .subscribe();
  }

  // Real-time subscription for order updates
  subscribeToOrders(merchantId: string, callback: (order: MarketplaceOrder) => void) {
    return supabase
      .channel(`marketplace-orders-${merchantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'marketplace_orders',
          filter: `merchant_id=eq.${merchantId}`,
        },
        (payload) => {
          callback(payload.new as MarketplaceOrder);
        }
      )
      .subscribe();
  }
}

export const marketplaceService = new MarketplaceService();
export default marketplaceService;
