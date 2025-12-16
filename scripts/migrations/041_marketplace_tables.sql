-- Migration: 041_marketplace_tables.sql
-- Description: Create tables for multi-vendor marketplace connecting POS to consumers
-- Created: 2024-12-15

-- =====================================================
-- MARKETPLACE STORES (Vendor storefront settings)
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Store info
  store_name VARCHAR(255) NOT NULL,
  store_slug VARCHAR(100) UNIQUE, -- URL-friendly name: peeap.com/store/slug
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,

  -- Contact & Location
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Sierra Leone',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Business settings
  is_listed BOOLEAN DEFAULT false, -- Whether store appears on marketplace
  is_verified BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,

  -- Delivery options
  offers_pickup BOOLEAN DEFAULT true,
  offers_delivery BOOLEAN DEFAULT false,
  delivery_radius_km DECIMAL(5, 2), -- Delivery radius in kilometers
  delivery_fee DECIMAL(15, 2) DEFAULT 0,
  free_delivery_minimum DECIMAL(15, 2), -- Free delivery above this amount

  -- Order settings
  minimum_order DECIMAL(15, 2) DEFAULT 0,
  preparation_time_minutes INTEGER DEFAULT 30, -- Average prep time

  -- Operating hours (JSON: { monday: { open: "09:00", close: "17:00" }, ... })
  operating_hours JSONB DEFAULT '{}'::jsonb,
  is_open_now BOOLEAN DEFAULT true, -- Manual override

  -- Categories this store belongs to
  store_categories TEXT[] DEFAULT '{}', -- e.g., ['food', 'restaurant', 'retail']

  -- Stats
  total_orders INTEGER DEFAULT 0,
  total_revenue DECIMAL(15, 2) DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(merchant_id) -- One store per merchant
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_stores_merchant ON marketplace_stores(merchant_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_stores_slug ON marketplace_stores(store_slug);
CREATE INDEX IF NOT EXISTS idx_marketplace_stores_listed ON marketplace_stores(is_listed) WHERE is_listed = true;
CREATE INDEX IF NOT EXISTS idx_marketplace_stores_featured ON marketplace_stores(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_marketplace_stores_location ON marketplace_stores(city, country);

-- =====================================================
-- MARKETPLACE PRODUCT LISTINGS (Products visible on marketplace)
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES marketplace_stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES pos_products(id) ON DELETE CASCADE,

  -- Listing settings
  is_listed BOOLEAN DEFAULT true, -- Whether product appears on marketplace
  is_featured BOOLEAN DEFAULT false, -- Featured on store page

  -- Marketplace-specific pricing (optional override)
  marketplace_price DECIMAL(15, 2), -- If null, use pos_products.price
  marketplace_description TEXT, -- If null, use pos_products.description

  -- Display order
  sort_order INTEGER DEFAULT 0,

  -- Stats
  view_count INTEGER DEFAULT 0,
  order_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(product_id) -- One listing per product
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_merchant ON marketplace_listings(merchant_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_store ON marketplace_listings(store_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_product ON marketplace_listings(product_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_listed ON marketplace_listings(is_listed) WHERE is_listed = true;

-- =====================================================
-- MARKETPLACE ORDERS (Orders from marketplace to POS)
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,

  -- Customer info
  customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  customer_email VARCHAR(255),

  -- Vendor info
  merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES marketplace_stores(id) ON DELETE CASCADE,

  -- Order type
  order_type VARCHAR(20) NOT NULL DEFAULT 'pickup', -- pickup, delivery

  -- Delivery info (if applicable)
  delivery_address TEXT,
  delivery_city VARCHAR(100),
  delivery_latitude DECIMAL(10, 8),
  delivery_longitude DECIMAL(11, 8),
  delivery_instructions TEXT,

  -- Pickup info (if applicable)
  pickup_time TIMESTAMPTZ, -- Requested pickup time

  -- Order totals
  subtotal DECIMAL(15, 2) NOT NULL,
  delivery_fee DECIMAL(15, 2) DEFAULT 0,
  service_fee DECIMAL(15, 2) DEFAULT 0, -- Platform fee
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  discount_amount DECIMAL(15, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) NOT NULL,

  -- Payment
  payment_status VARCHAR(20) DEFAULT 'pending', -- pending, paid, failed, refunded
  payment_method VARCHAR(50), -- wallet, mobile_money, card
  payment_reference VARCHAR(255),
  paid_at TIMESTAMPTZ,

  -- Order status
  status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, preparing, ready, out_for_delivery, delivered, completed, cancelled

  -- Timestamps for status tracking
  confirmed_at TIMESTAMPTZ,
  preparing_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,

  -- Estimated times
  estimated_ready_time TIMESTAMPTZ,
  estimated_delivery_time TIMESTAMPTZ,

  -- Notes
  customer_notes TEXT,
  merchant_notes TEXT,

  -- Rating (after completion)
  rating INTEGER, -- 1-5
  review TEXT,
  rated_at TIMESTAMPTZ,

  -- Linked POS sale (when order is processed)
  pos_sale_id UUID REFERENCES pos_sales(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_customer ON marketplace_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_merchant ON marketplace_orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_store ON marketplace_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_status ON marketplace_orders(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_payment ON marketplace_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_created ON marketplace_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_number ON marketplace_orders(order_number);

-- =====================================================
-- MARKETPLACE ORDER ITEMS
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES pos_products(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES marketplace_listings(id) ON DELETE SET NULL,

  -- Product snapshot (in case product changes)
  product_name VARCHAR(255) NOT NULL,
  product_image_url TEXT,
  product_sku VARCHAR(100),

  -- Quantity and pricing
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(15, 2) NOT NULL,
  total_price DECIMAL(15, 2) NOT NULL,

  -- Customizations
  notes TEXT,
  modifiers JSONB DEFAULT '[]'::jsonb, -- e.g., [{ name: "Extra cheese", price: 5 }]

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_order_items_order ON marketplace_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_order_items_product ON marketplace_order_items(product_id);

-- =====================================================
-- MARKETPLACE CART (User shopping cart)
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES marketplace_stores(id) ON DELETE CASCADE,

  -- Cart totals (calculated)
  subtotal DECIMAL(15, 2) DEFAULT 0,
  item_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, store_id) -- One cart per store per user
);

-- Cart items
CREATE TABLE IF NOT EXISTS marketplace_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES marketplace_carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES pos_products(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES marketplace_listings(id) ON DELETE SET NULL,

  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(15, 2) NOT NULL,
  notes TEXT,
  modifiers JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(cart_id, product_id) -- One entry per product per cart
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_carts_user ON marketplace_carts(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_carts_store ON marketplace_carts(store_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_cart_items_cart ON marketplace_cart_items(cart_id);

-- =====================================================
-- MARKETPLACE NOTIFICATIONS (Real-time for POS)
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Notification type
  type VARCHAR(50) NOT NULL, -- new_order, order_cancelled, low_stock, review
  title VARCHAR(255) NOT NULL,
  message TEXT,

  -- Related data
  order_id UUID REFERENCES marketplace_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES pos_products(id) ON DELETE SET NULL,

  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  -- For popup/sound alerts
  is_urgent BOOLEAN DEFAULT false,
  sound_alert BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_notifications_merchant ON marketplace_notifications(merchant_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_notifications_unread ON marketplace_notifications(merchant_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_marketplace_notifications_created ON marketplace_notifications(created_at DESC);

-- =====================================================
-- STORE CATEGORIES (For filtering)
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_store_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50), -- Icon name (e.g., 'utensils', 'shopping-bag')
  color VARCHAR(20) DEFAULT '#3B82F6',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO marketplace_store_categories (name, slug, icon, color, sort_order) VALUES
  ('Food & Restaurants', 'food', 'utensils', '#EF4444', 1),
  ('Grocery', 'grocery', 'shopping-cart', '#22C55E', 2),
  ('Retail & Shopping', 'retail', 'shopping-bag', '#3B82F6', 3),
  ('Pharmacy', 'pharmacy', 'pill', '#8B5CF6', 4),
  ('Electronics', 'electronics', 'smartphone', '#F59E0B', 5),
  ('Fashion', 'fashion', 'shirt', '#EC4899', 6),
  ('Services', 'services', 'wrench', '#6366F1', 7),
  ('Other', 'other', 'grid', '#6B7280', 99)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Marketplace stores
ALTER TABLE marketplace_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view listed stores"
  ON marketplace_stores FOR SELECT
  USING (is_listed = true);

CREATE POLICY "Merchants can manage their own store"
  ON marketplace_stores FOR ALL
  USING (auth.uid() = merchant_id);

-- Marketplace listings
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view listed products"
  ON marketplace_listings FOR SELECT
  USING (is_listed = true);

CREATE POLICY "Merchants can manage their own listings"
  ON marketplace_listings FOR ALL
  USING (auth.uid() = merchant_id);

-- Marketplace orders
ALTER TABLE marketplace_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view their own orders"
  ON marketplace_orders FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Merchants can view their store orders"
  ON marketplace_orders FOR SELECT
  USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can update their store orders"
  ON marketplace_orders FOR UPDATE
  USING (auth.uid() = merchant_id);

CREATE POLICY "Customers can create orders"
  ON marketplace_orders FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Marketplace notifications
ALTER TABLE marketplace_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view their notifications"
  ON marketplace_notifications FOR SELECT
  USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can update their notifications"
  ON marketplace_notifications FOR UPDATE
  USING (auth.uid() = merchant_id);

-- Marketplace carts
ALTER TABLE marketplace_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own carts"
  ON marketplace_carts FOR ALL
  USING (auth.uid() = user_id);

ALTER TABLE marketplace_cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own cart items"
  ON marketplace_cart_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM marketplace_carts c WHERE c.id = cart_id AND c.user_id = auth.uid()
  ));

-- Store categories (public read)
ALTER TABLE marketplace_store_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view store categories"
  ON marketplace_store_categories FOR SELECT
  USING (true);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_marketplace_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_marketplace_stores_updated ON marketplace_stores;
CREATE TRIGGER trigger_marketplace_stores_updated
  BEFORE UPDATE ON marketplace_stores
  FOR EACH ROW EXECUTE FUNCTION update_marketplace_updated_at();

DROP TRIGGER IF EXISTS trigger_marketplace_listings_updated ON marketplace_listings;
CREATE TRIGGER trigger_marketplace_listings_updated
  BEFORE UPDATE ON marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION update_marketplace_updated_at();

DROP TRIGGER IF EXISTS trigger_marketplace_orders_updated ON marketplace_orders;
CREATE TRIGGER trigger_marketplace_orders_updated
  BEFORE UPDATE ON marketplace_orders
  FOR EACH ROW EXECUTE FUNCTION update_marketplace_updated_at();

DROP TRIGGER IF EXISTS trigger_marketplace_carts_updated ON marketplace_carts;
CREATE TRIGGER trigger_marketplace_carts_updated
  BEFORE UPDATE ON marketplace_carts
  FOR EACH ROW EXECUTE FUNCTION update_marketplace_updated_at();

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Generate order number
CREATE OR REPLACE FUNCTION generate_marketplace_order_number()
RETURNS TEXT AS $$
DECLARE
  v_number TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_number := 'MKT-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 6));
    SELECT EXISTS(SELECT 1 FROM marketplace_orders WHERE order_number = v_number) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Create notification for new order
CREATE OR REPLACE FUNCTION notify_merchant_new_order()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO marketplace_notifications (
    merchant_id,
    type,
    title,
    message,
    order_id,
    is_urgent,
    sound_alert
  ) VALUES (
    NEW.merchant_id,
    'new_order',
    'New Order Received!',
    'Order #' || NEW.order_number || ' - ' || NEW.customer_name || ' - Le ' || NEW.total_amount,
    NEW.id,
    true,
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_new_order ON marketplace_orders;
CREATE TRIGGER trigger_notify_new_order
  AFTER INSERT ON marketplace_orders
  FOR EACH ROW EXECUTE FUNCTION notify_merchant_new_order();

-- Update store stats on order completion
CREATE OR REPLACE FUNCTION update_store_stats_on_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE marketplace_stores
    SET
      total_orders = total_orders + 1,
      total_revenue = total_revenue + NEW.total_amount
    WHERE id = NEW.store_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_store_stats ON marketplace_orders;
CREATE TRIGGER trigger_update_store_stats
  AFTER UPDATE ON marketplace_orders
  FOR EACH ROW EXECUTE FUNCTION update_store_stats_on_order();

-- Grant permissions
GRANT SELECT ON marketplace_store_categories TO anon, authenticated;
GRANT ALL ON marketplace_stores TO authenticated;
GRANT ALL ON marketplace_listings TO authenticated;
GRANT ALL ON marketplace_orders TO authenticated;
GRANT ALL ON marketplace_order_items TO authenticated;
GRANT ALL ON marketplace_carts TO authenticated;
GRANT ALL ON marketplace_cart_items TO authenticated;
GRANT ALL ON marketplace_notifications TO authenticated;
