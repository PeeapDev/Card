-- Migration: 063_fix_pos_tables.sql
-- Description: Fix POS tables - drop and recreate with proper relationships
-- Created: 2024-12-21

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS pos_sale_items CASCADE;
DROP TABLE IF EXISTS pos_inventory_log CASCADE;
DROP TABLE IF EXISTS pos_sales CASCADE;
DROP TABLE IF EXISTS pos_products CASCADE;
DROP TABLE IF EXISTS pos_categories CASCADE;
DROP TABLE IF EXISTS pos_customers CASCADE;

-- =====================================================
-- POS CUSTOMERS
-- =====================================================
CREATE TABLE pos_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    customer_type VARCHAR(50) DEFAULT 'regular',
    credit_limit DECIMAL(15,2) DEFAULT 0,
    credit_balance DECIMAL(15,2) DEFAULT 0,
    loyalty_points INTEGER DEFAULT 0,
    total_purchases DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pos_customers_merchant ON pos_customers(merchant_id);
ALTER TABLE pos_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pos_customers_select" ON pos_customers FOR SELECT USING (auth.uid() = merchant_id);
CREATE POLICY "pos_customers_all" ON pos_customers FOR ALL USING (auth.uid() = merchant_id);

-- =====================================================
-- POS CATEGORIES
-- =====================================================
CREATE TABLE pos_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(20) DEFAULT '#3B82F6',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pos_categories_merchant ON pos_categories(merchant_id);
ALTER TABLE pos_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pos_categories_select" ON pos_categories FOR SELECT USING (auth.uid() = merchant_id);
CREATE POLICY "pos_categories_all" ON pos_categories FOR ALL USING (auth.uid() = merchant_id);

-- =====================================================
-- POS PRODUCTS
-- =====================================================
CREATE TABLE pos_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES pos_categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100),
    barcode VARCHAR(100),
    image_url TEXT,
    price DECIMAL(15, 2) NOT NULL DEFAULT 0,
    cost_price DECIMAL(15, 2) DEFAULT 0,
    track_inventory BOOLEAN DEFAULT false,
    stock_quantity INTEGER DEFAULT 0,
    low_stock_alert INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pos_products_merchant ON pos_products(merchant_id);
CREATE INDEX idx_pos_products_category ON pos_products(category_id);
ALTER TABLE pos_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pos_products_select" ON pos_products FOR SELECT USING (auth.uid() = merchant_id);
CREATE POLICY "pos_products_all" ON pos_products FOR ALL USING (auth.uid() = merchant_id);

-- =====================================================
-- POS SALES
-- =====================================================
CREATE TABLE pos_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sale_number VARCHAR(50) NOT NULL,
    customer_id UUID REFERENCES pos_customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15, 2) DEFAULT 0,
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'cash',
    payment_details JSONB DEFAULT '{}'::jsonb,
    cashier_id UUID,
    cashier_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'completed',
    notes TEXT,
    kitchen_status VARCHAR(20) DEFAULT 'new',
    order_type VARCHAR(20) DEFAULT 'dine_in',
    table_number VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(merchant_id, sale_number)
);

CREATE INDEX idx_pos_sales_merchant ON pos_sales(merchant_id);
CREATE INDEX idx_pos_sales_status ON pos_sales(status);
CREATE INDEX idx_pos_sales_created ON pos_sales(created_at DESC);
ALTER TABLE pos_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pos_sales_select" ON pos_sales FOR SELECT USING (auth.uid() = merchant_id);
CREATE POLICY "pos_sales_all" ON pos_sales FOR ALL USING (auth.uid() = merchant_id);

-- =====================================================
-- POS SALE ITEMS (with foreign key to pos_sales for 'items' join)
-- =====================================================
CREATE TABLE pos_sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES pos_sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES pos_products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100),
    unit_price DECIMAL(15, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    discount_amount DECIMAL(15, 2) DEFAULT 0,
    total_price DECIMAL(15, 2) NOT NULL,
    cost_price DECIMAL(15, 2) DEFAULT 0,
    notes TEXT,
    modifiers JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pos_sale_items_sale ON pos_sale_items(sale_id);
CREATE INDEX idx_pos_sale_items_product ON pos_sale_items(product_id);
ALTER TABLE pos_sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pos_sale_items_select" ON pos_sale_items FOR SELECT
USING (EXISTS (SELECT 1 FROM pos_sales s WHERE s.id = sale_id AND s.merchant_id = auth.uid()));

CREATE POLICY "pos_sale_items_all" ON pos_sale_items FOR ALL
USING (EXISTS (SELECT 1 FROM pos_sales s WHERE s.id = sale_id AND s.merchant_id = auth.uid()));

-- =====================================================
-- POS INVENTORY LOG
-- =====================================================
CREATE TABLE pos_inventory_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES pos_products(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    quantity_change INTEGER NOT NULL,
    previous_quantity INTEGER,
    new_quantity INTEGER,
    reference_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pos_inventory_log_product ON pos_inventory_log(product_id);
ALTER TABLE pos_inventory_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pos_inventory_log_select" ON pos_inventory_log FOR SELECT USING (auth.uid() = merchant_id);
CREATE POLICY "pos_inventory_log_all" ON pos_inventory_log FOR ALL USING (auth.uid() = merchant_id);
