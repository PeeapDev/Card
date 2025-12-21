-- Migration: 062_pos_sales_tables.sql
-- Description: Create core POS tables (categories, products, sales, sale items)
-- Created: 2024-12-21

-- =====================================================
-- POS CUSTOMERS TABLE (needed for foreign key)
-- =====================================================
CREATE TABLE IF NOT EXISTS pos_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Sierra Leone',
    customer_type VARCHAR(50) DEFAULT 'regular',
    credit_limit DECIMAL(15,2) DEFAULT 0,
    credit_balance DECIMAL(15,2) DEFAULT 0,
    loyalty_points INTEGER DEFAULT 0,
    total_purchases DECIMAL(15,2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active',
    last_purchase_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_customers_merchant ON pos_customers(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pos_customers_phone ON pos_customers(phone);

ALTER TABLE pos_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Merchants can view their own customers" ON pos_customers;
DROP POLICY IF EXISTS "Merchants can manage their own customers" ON pos_customers;

CREATE POLICY "Merchants can view their own customers"
  ON pos_customers FOR SELECT
  USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can manage their own customers"
  ON pos_customers FOR ALL
  USING (auth.uid() = merchant_id);

-- =====================================================
-- POS CATEGORIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS pos_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(20) DEFAULT '#3B82F6',
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_categories_merchant ON pos_categories(merchant_id);
ALTER TABLE pos_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Merchants can view their own categories" ON pos_categories;
DROP POLICY IF EXISTS "Merchants can manage their own categories" ON pos_categories;

CREATE POLICY "Merchants can view their own categories"
  ON pos_categories FOR SELECT
  USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can manage their own categories"
  ON pos_categories FOR ALL
  USING (auth.uid() = merchant_id);

-- =====================================================
-- POS PRODUCTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS pos_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES pos_categories(id) ON DELETE SET NULL,

  -- Product info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sku VARCHAR(100),
  barcode VARCHAR(100),
  image_url TEXT,

  -- Pricing
  price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(15, 2) DEFAULT 0,

  -- Inventory
  track_inventory BOOLEAN DEFAULT false,
  stock_quantity INTEGER DEFAULT 0,
  low_stock_alert INTEGER DEFAULT 10,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_products_merchant ON pos_products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pos_products_category ON pos_products(category_id);
CREATE INDEX IF NOT EXISTS idx_pos_products_sku ON pos_products(sku);
CREATE INDEX IF NOT EXISTS idx_pos_products_barcode ON pos_products(barcode);

ALTER TABLE pos_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Merchants can view their own products" ON pos_products;
DROP POLICY IF EXISTS "Merchants can manage their own products" ON pos_products;

CREATE POLICY "Merchants can view their own products"
  ON pos_products FOR SELECT
  USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can manage their own products"
  ON pos_products FOR ALL
  USING (auth.uid() = merchant_id);

-- =====================================================
-- POS INVENTORY LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS pos_inventory_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES pos_products(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- sale, return, adjustment, purchase
  quantity_change INTEGER NOT NULL,
  previous_quantity INTEGER,
  new_quantity INTEGER,
  reference_id UUID, -- sale_id, purchase_order_id, etc.
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_inventory_log_product ON pos_inventory_log(product_id);
CREATE INDEX IF NOT EXISTS idx_pos_inventory_log_merchant ON pos_inventory_log(merchant_id);

ALTER TABLE pos_inventory_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Merchants can view their own inventory logs" ON pos_inventory_log;
DROP POLICY IF EXISTS "Merchants can manage their own inventory logs" ON pos_inventory_log;

CREATE POLICY "Merchants can view their own inventory logs"
  ON pos_inventory_log FOR SELECT
  USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can manage their own inventory logs"
  ON pos_inventory_log FOR ALL
  USING (auth.uid() = merchant_id);

-- =====================================================
-- POS SALES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS pos_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Sale identification
  sale_number VARCHAR(50) NOT NULL,

  -- Customer info (optional)
  customer_id UUID REFERENCES pos_customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),

  -- Amounts
  subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(15, 2) DEFAULT 0,
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Payment
  payment_method VARCHAR(50) DEFAULT 'cash', -- cash, card, mobile, split
  payment_details JSONB DEFAULT '{}'::jsonb,

  -- Staff info
  cashier_id UUID,
  cashier_name VARCHAR(255),

  -- Status
  status VARCHAR(20) DEFAULT 'completed', -- completed, voided, refunded

  -- Notes
  notes TEXT,

  -- Kitchen/Table management (from migration 037)
  kitchen_status VARCHAR(20) DEFAULT 'new',
  kitchen_started_at TIMESTAMPTZ,
  kitchen_completed_at TIMESTAMPTZ,
  priority VARCHAR(20) DEFAULT 'normal',
  estimated_time INTEGER,
  order_type VARCHAR(20) DEFAULT 'dine_in',
  table_id UUID,
  table_number VARCHAR(20),
  delivery_address TEXT,
  delivery_phone VARCHAR(50),
  delivery_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique sale number per merchant
  UNIQUE(merchant_id, sale_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pos_sales_merchant ON pos_sales(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_customer ON pos_sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_status ON pos_sales(status);
CREATE INDEX IF NOT EXISTS idx_pos_sales_created ON pos_sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_sales_kitchen_status ON pos_sales(kitchen_status);
CREATE INDEX IF NOT EXISTS idx_pos_sales_order_type ON pos_sales(order_type);

-- Enable RLS
ALTER TABLE pos_sales ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Merchants can view their own sales" ON pos_sales;
DROP POLICY IF EXISTS "Merchants can manage their own sales" ON pos_sales;

-- RLS Policies
CREATE POLICY "Merchants can view their own sales"
  ON pos_sales FOR SELECT
  USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can manage their own sales"
  ON pos_sales FOR ALL
  USING (auth.uid() = merchant_id);

-- =====================================================
-- POS SALE ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS pos_sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES pos_sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES pos_products(id) ON DELETE SET NULL,

  -- Product info (denormalized for history)
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100),

  -- Pricing
  unit_price DECIMAL(15, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  discount_amount DECIMAL(15, 2) DEFAULT 0,
  total_price DECIMAL(15, 2) NOT NULL,

  -- Cost for profit tracking
  cost_price DECIMAL(15, 2) DEFAULT 0,

  -- Modifiers/customizations
  notes TEXT,
  modifiers JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pos_sale_items_sale ON pos_sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_pos_sale_items_product ON pos_sale_items(product_id);

-- Enable RLS
ALTER TABLE pos_sale_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view sale items for their sales" ON pos_sale_items;
DROP POLICY IF EXISTS "Users can manage sale items for their sales" ON pos_sale_items;

-- RLS Policies (through sale relationship)
CREATE POLICY "Users can view sale items for their sales"
  ON pos_sale_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pos_sales s
      WHERE s.id = pos_sale_items.sale_id
      AND s.merchant_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage sale items for their sales"
  ON pos_sale_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pos_sales s
      WHERE s.id = pos_sale_items.sale_id
      AND s.merchant_id = auth.uid()
    )
  );

-- =====================================================
-- TRIGGER FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pos_sales_updated_at ON pos_sales;
CREATE TRIGGER trigger_pos_sales_updated_at
  BEFORE UPDATE ON pos_sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Add table_id foreign key reference (after pos_tables exists)
-- =====================================================
DO $$
BEGIN
  -- Add foreign key if pos_tables exists and constraint doesn't
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pos_tables') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'pos_sales_table_id_fkey'
    ) THEN
      ALTER TABLE pos_sales
        ADD CONSTRAINT pos_sales_table_id_fkey
        FOREIGN KEY (table_id) REFERENCES pos_tables(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;
