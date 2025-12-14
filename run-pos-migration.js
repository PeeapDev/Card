/**
 * Run POS Tables Migration via Supabase
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Running POS tables migration...\n');

  // Check if tables exist by trying to query them
  const { data: existingCheck, error: checkError } = await supabase
    .from('pos_products')
    .select('id')
    .limit(1);

  if (!checkError) {
    console.log('✓ POS tables already exist!');

    // Show table counts
    const { count: catCount } = await supabase.from('pos_categories').select('*', { count: 'exact', head: true });
    const { count: prodCount } = await supabase.from('pos_products').select('*', { count: 'exact', head: true });
    const { count: saleCount } = await supabase.from('pos_sales').select('*', { count: 'exact', head: true });

    console.log(`\nCurrent data:`);
    console.log(`  Categories: ${catCount || 0}`);
    console.log(`  Products: ${prodCount || 0}`);
    console.log(`  Sales: ${saleCount || 0}`);
    return;
  }

  console.log('Tables do not exist. Please run the following SQL in Supabase Dashboard > SQL Editor:\n');
  console.log('Go to: https://supabase.com/dashboard/project/akiecgwcxadcpqlvntmf/sql/new\n');
  console.log('------- COPY BELOW -------\n');

  const sql = `
-- POS System Tables for Peeap Merchant Plus
-- Run this in Supabase SQL Editor

-- 1. POS Categories Table
CREATE TABLE IF NOT EXISTS pos_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. POS Products Table
CREATE TABLE IF NOT EXISTS pos_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  category_id UUID REFERENCES pos_categories(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  sku VARCHAR(50),
  barcode VARCHAR(100),
  price DECIMAL(15,2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(15,2) DEFAULT 0,
  image_url TEXT,
  track_inventory BOOLEAN DEFAULT false,
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  has_variants BOOLEAN DEFAULT false,
  variants JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. POS Sales Table
CREATE TABLE IF NOT EXISTS pos_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  sale_number VARCHAR(50) NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(50) NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'completed',
  payment_reference VARCHAR(100),
  payment_details JSONB DEFAULT '{}',
  payments JSONB DEFAULT '[]',
  customer_name VARCHAR(200),
  customer_phone VARCHAR(20),
  customer_email VARCHAR(255),
  cashier_id UUID,
  cashier_name VARCHAR(200),
  status VARCHAR(20) DEFAULT 'completed',
  voided_at TIMESTAMPTZ,
  voided_by UUID,
  void_reason TEXT,
  receipt_sent BOOLEAN DEFAULT false,
  receipt_method VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. POS Sale Items Table
CREATE TABLE IF NOT EXISTS pos_sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES pos_sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES pos_products(id) ON DELETE SET NULL,
  product_name VARCHAR(200) NOT NULL,
  product_sku VARCHAR(50),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_price DECIMAL(15,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. POS Inventory Log Table
CREATE TABLE IF NOT EXISTS pos_inventory_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES pos_products(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  quantity_change INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  reference_type VARCHAR(20),
  reference_id UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pos_categories_business ON pos_categories(business_id);
CREATE INDEX IF NOT EXISTS idx_pos_products_business ON pos_products(business_id);
CREATE INDEX IF NOT EXISTS idx_pos_products_category ON pos_products(category_id);
CREATE INDEX IF NOT EXISTS idx_pos_products_barcode ON pos_products(barcode);
CREATE INDEX IF NOT EXISTS idx_pos_products_sku ON pos_products(sku);
CREATE INDEX IF NOT EXISTS idx_pos_sales_business ON pos_sales(business_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_created ON pos_sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_sales_number ON pos_sales(sale_number);
CREATE INDEX IF NOT EXISTS idx_pos_sale_items_sale ON pos_sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_pos_sale_items_product ON pos_sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_pos_inventory_log_product ON pos_inventory_log(product_id);
CREATE INDEX IF NOT EXISTS idx_pos_inventory_log_business ON pos_inventory_log(business_id);

-- Enable Row Level Security
ALTER TABLE pos_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_inventory_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow service role full access)
CREATE POLICY "Service role full access to pos_categories" ON pos_categories FOR ALL USING (true);
CREATE POLICY "Service role full access to pos_products" ON pos_products FOR ALL USING (true);
CREATE POLICY "Service role full access to pos_sales" ON pos_sales FOR ALL USING (true);
CREATE POLICY "Service role full access to pos_sale_items" ON pos_sale_items FOR ALL USING (true);
CREATE POLICY "Service role full access to pos_inventory_log" ON pos_inventory_log FOR ALL USING (true);

SELECT 'POS tables created successfully!' as result;
`;

  console.log(sql);
  console.log('\n------- END COPY -------\n');
}

runMigration();
