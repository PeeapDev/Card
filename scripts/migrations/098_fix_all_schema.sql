-- =============================================
-- COMPREHENSIVE SCHEMA FIX - Run this in Supabase SQL Editor
-- Fixes: businesses, pos_customers, pos_cash_sessions, pos_products, merchant_businesses
-- =============================================

-- =============================================
-- 1. CREATE BUSINESSES VIEW (code expects 'businesses' table)
-- =============================================
DROP VIEW IF EXISTS businesses CASCADE;
CREATE OR REPLACE VIEW businesses AS
SELECT
    id,
    merchant_id as owner_id,
    name,
    logo_url,
    CASE WHEN status = 'ACTIVE' THEN 'active' ELSE 'inactive' END as status,
    created_at
FROM merchant_businesses;

-- =============================================
-- 2. FIX POS_CUSTOMERS - add is_active column
-- =============================================
ALTER TABLE pos_customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
UPDATE pos_customers SET is_active = (status = 'active') WHERE is_active IS NULL;

-- =============================================
-- 3. CREATE POS_CASH_SESSIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS pos_cash_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    opening_balance DECIMAL(15,2) DEFAULT 0,
    closing_balance DECIMAL(15,2),
    total_cash_sales DECIMAL(15,2) DEFAULT 0,
    total_cash_refunds DECIMAL(15,2) DEFAULT 0,
    expected_balance DECIMAL(15,2),
    actual_balance DECIMAL(15,2),
    difference DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    opened_by UUID REFERENCES users(id),
    closed_by UUID REFERENCES users(id),
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(merchant_id, session_date)
);

CREATE INDEX IF NOT EXISTS idx_pos_cash_sessions_merchant ON pos_cash_sessions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pos_cash_sessions_date ON pos_cash_sessions(session_date);

-- RLS for pos_cash_sessions
ALTER TABLE pos_cash_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pos_cash_sessions_select" ON pos_cash_sessions;
DROP POLICY IF EXISTS "pos_cash_sessions_all" ON pos_cash_sessions;
CREATE POLICY "pos_cash_sessions_select" ON pos_cash_sessions FOR SELECT USING (true);
CREATE POLICY "pos_cash_sessions_all" ON pos_cash_sessions FOR ALL USING (true);

-- =============================================
-- 4. FIX POS_PRODUCTS - add missing columns
-- =============================================
ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS is_on_sale BOOLEAN DEFAULT false;
ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS sale_price DECIMAL(15,2);
ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS is_variant BOOLEAN DEFAULT false;
ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS parent_product_id UUID REFERENCES pos_products(id);
ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS variant_name VARCHAR(100);
ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10;

-- =============================================
-- 5. FIX MERCHANT_BUSINESSES - add user_id and is_active
-- =============================================
ALTER TABLE merchant_businesses ADD COLUMN IF NOT EXISTS user_id UUID;
UPDATE merchant_businesses SET user_id = merchant_id WHERE user_id IS NULL;
ALTER TABLE merchant_businesses ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
UPDATE merchant_businesses SET is_active = (status = 'ACTIVE') WHERE is_active IS NULL;
CREATE INDEX IF NOT EXISTS idx_merchant_businesses_user_id ON merchant_businesses(user_id);

-- =============================================
-- 6. FIX RLS POLICIES - Make them permissive for now
-- =============================================
-- pos_products
DROP POLICY IF EXISTS "pos_products_select" ON pos_products;
DROP POLICY IF EXISTS "pos_products_all" ON pos_products;
CREATE POLICY "pos_products_select" ON pos_products FOR SELECT USING (true);
CREATE POLICY "pos_products_all" ON pos_products FOR ALL USING (true);

-- pos_categories
DROP POLICY IF EXISTS "pos_categories_select" ON pos_categories;
DROP POLICY IF EXISTS "pos_categories_all" ON pos_categories;
CREATE POLICY "pos_categories_select" ON pos_categories FOR SELECT USING (true);
CREATE POLICY "pos_categories_all" ON pos_categories FOR ALL USING (true);

-- pos_customers
DROP POLICY IF EXISTS "pos_customers_select" ON pos_customers;
DROP POLICY IF EXISTS "pos_customers_all" ON pos_customers;
CREATE POLICY "pos_customers_select" ON pos_customers FOR SELECT USING (true);
CREATE POLICY "pos_customers_all" ON pos_customers FOR ALL USING (true);

-- pos_sales
DROP POLICY IF EXISTS "pos_sales_select" ON pos_sales;
DROP POLICY IF EXISTS "pos_sales_all" ON pos_sales;
CREATE POLICY "pos_sales_select" ON pos_sales FOR SELECT USING (true);
CREATE POLICY "pos_sales_all" ON pos_sales FOR ALL USING (true);

-- pos_sale_items
DROP POLICY IF EXISTS "pos_sale_items_select" ON pos_sale_items;
DROP POLICY IF EXISTS "pos_sale_items_all" ON pos_sale_items;
CREATE POLICY "pos_sale_items_select" ON pos_sale_items FOR SELECT USING (true);
CREATE POLICY "pos_sale_items_all" ON pos_sale_items FOR ALL USING (true);

-- =============================================
-- DONE!
-- =============================================
