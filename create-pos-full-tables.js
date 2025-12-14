/**
 * Create Full POS Tables
 * - pos_staff: Staff members with roles and permissions
 * - pos_product_variants: Product variants (size, color, etc.)
 * - pos_loyalty_programs: Loyalty program configuration
 * - pos_loyalty_points: Customer loyalty points tracking
 * - pos_inventory_alerts: Low stock and out of stock alerts
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sql = `
-- ========================================
-- 1. POS Staff Table
-- ========================================
CREATE TABLE IF NOT EXISTS pos_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  name VARCHAR(200) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  pin VARCHAR(10),
  role VARCHAR(20) NOT NULL DEFAULT 'cashier', -- admin, manager, cashier
  permissions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_staff_merchant ON pos_staff(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pos_staff_role ON pos_staff(role);
CREATE INDEX IF NOT EXISTS idx_pos_staff_pin ON pos_staff(merchant_id, pin);

-- ========================================
-- 2. POS Product Variants Table
-- ========================================
CREATE TABLE IF NOT EXISTS pos_product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES pos_products(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  sku VARCHAR(50),
  barcode VARCHAR(50),
  price_adjustment DECIMAL(15,2) DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  attributes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_variants_merchant ON pos_product_variants(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pos_variants_product ON pos_product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_pos_variants_barcode ON pos_product_variants(barcode);
CREATE INDEX IF NOT EXISTS idx_pos_variants_sku ON pos_product_variants(sku);

-- ========================================
-- 3. POS Loyalty Programs Table
-- ========================================
CREATE TABLE IF NOT EXISTS pos_loyalty_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  points_per_currency DECIMAL(10,4) DEFAULT 1, -- Points earned per unit of currency spent
  points_value DECIMAL(10,4) DEFAULT 0.01, -- Currency value per point when redeeming
  min_redeem_points INTEGER DEFAULT 100, -- Minimum points to redeem
  max_redeem_percent DECIMAL(5,2) DEFAULT 50, -- Max % of transaction that can be paid with points
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(merchant_id) -- One loyalty program per merchant
);

CREATE INDEX IF NOT EXISTS idx_pos_loyalty_programs_merchant ON pos_loyalty_programs(merchant_id);

-- ========================================
-- 4. POS Loyalty Points Table (Customer Points)
-- ========================================
CREATE TABLE IF NOT EXISTS pos_loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES pos_customers(id) ON DELETE CASCADE,
  points_balance INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  total_redeemed INTEGER DEFAULT 0,
  last_earned_at TIMESTAMPTZ,
  last_redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(merchant_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_pos_loyalty_points_merchant ON pos_loyalty_points(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pos_loyalty_points_customer ON pos_loyalty_points(customer_id);

-- ========================================
-- 5. POS Loyalty Transactions Table
-- ========================================
CREATE TABLE IF NOT EXISTS pos_loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES pos_customers(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES pos_sales(id),
  type VARCHAR(20) NOT NULL, -- 'earn' or 'redeem'
  points INTEGER NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  sale_amount DECIMAL(15,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_loyalty_tx_merchant ON pos_loyalty_transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pos_loyalty_tx_customer ON pos_loyalty_transactions(customer_id);

-- ========================================
-- 6. POS Inventory Alerts Table
-- ========================================
CREATE TABLE IF NOT EXISTS pos_inventory_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES pos_products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES pos_product_variants(id) ON DELETE CASCADE,
  alert_type VARCHAR(20) NOT NULL, -- 'low_stock', 'out_of_stock'
  current_stock INTEGER NOT NULL,
  threshold INTEGER NOT NULL,
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_inventory_alerts_merchant ON pos_inventory_alerts(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pos_inventory_alerts_product ON pos_inventory_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_pos_inventory_alerts_acknowledged ON pos_inventory_alerts(is_acknowledged);

-- ========================================
-- 7. Add barcode column to pos_products if not exists
-- ========================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'pos_products' AND column_name = 'barcode') THEN
    ALTER TABLE pos_products ADD COLUMN barcode VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'pos_products' AND column_name = 'cost_price') THEN
    ALTER TABLE pos_products ADD COLUMN cost_price DECIMAL(15,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'pos_products' AND column_name = 'low_stock_threshold') THEN
    ALTER TABLE pos_products ADD COLUMN low_stock_threshold INTEGER DEFAULT 10;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pos_products_barcode ON pos_products(barcode);

-- ========================================
-- 8. Add split payment support to pos_sales
-- ========================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'pos_sales' AND column_name = 'payment_details') THEN
    ALTER TABLE pos_sales ADD COLUMN payment_details JSONB DEFAULT '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'pos_sales' AND column_name = 'loyalty_points_earned') THEN
    ALTER TABLE pos_sales ADD COLUMN loyalty_points_earned INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'pos_sales' AND column_name = 'loyalty_points_redeemed') THEN
    ALTER TABLE pos_sales ADD COLUMN loyalty_points_redeemed INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'pos_sales' AND column_name = 'staff_id') THEN
    ALTER TABLE pos_sales ADD COLUMN staff_id UUID REFERENCES pos_staff(id);
  END IF;
END $$;

-- ========================================
-- Enable RLS on all new tables
-- ========================================
ALTER TABLE pos_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_inventory_alerts ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS Policies
-- ========================================
DROP POLICY IF EXISTS "Users can manage their POS staff" ON pos_staff;
CREATE POLICY "Users can manage their POS staff" ON pos_staff
  FOR ALL USING (merchant_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their product variants" ON pos_product_variants;
CREATE POLICY "Users can manage their product variants" ON pos_product_variants
  FOR ALL USING (merchant_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their loyalty program" ON pos_loyalty_programs;
CREATE POLICY "Users can manage their loyalty program" ON pos_loyalty_programs
  FOR ALL USING (merchant_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their loyalty points" ON pos_loyalty_points;
CREATE POLICY "Users can manage their loyalty points" ON pos_loyalty_points
  FOR ALL USING (merchant_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their loyalty transactions" ON pos_loyalty_transactions;
CREATE POLICY "Users can manage their loyalty transactions" ON pos_loyalty_transactions
  FOR ALL USING (merchant_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their inventory alerts" ON pos_inventory_alerts;
CREATE POLICY "Users can manage their inventory alerts" ON pos_inventory_alerts
  FOR ALL USING (merchant_id = auth.uid());
`;

async function checkTables() {
  console.log('Checking existing POS full tables...\n');

  const tables = [
    'pos_staff',
    'pos_product_variants',
    'pos_loyalty_programs',
    'pos_loyalty_points',
    'pos_loyalty_transactions',
    'pos_inventory_alerts',
  ];

  const results = {};
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('id')
      .limit(1);

    results[table] = !error;
    console.log(`  ${!error ? '✓' : '✗'} ${table}: ${!error ? 'exists' : error.message}`);
  }

  return results;
}

async function main() {
  try {
    const existing = await checkTables();
    const allExist = Object.values(existing).every(v => v);

    if (allExist) {
      console.log('\n✓ All POS full tables already exist!');
      return;
    }

    console.log('\n⚠️ Some tables are missing. Run this SQL in Supabase SQL Editor:\n');
    console.log('='.repeat(60));
    console.log(sql);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
