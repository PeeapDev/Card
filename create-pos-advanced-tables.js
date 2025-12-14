/**
 * Create Advanced POS Tables
 * - pos_customers: Customer management with credit/tab system
 * - pos_credit_transactions: Credit/payment transaction history
 * - pos_held_orders: Parked/held orders
 * - pos_refunds: Refund records
 * - pos_discounts: Discount codes and promotions
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sql = `
-- ========================================
-- 1. POS Customers Table (Credit/Tab System)
-- ========================================
CREATE TABLE IF NOT EXISTS pos_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  credit_limit DECIMAL(15,2) DEFAULT 0,
  credit_balance DECIMAL(15,2) DEFAULT 0,
  total_purchases DECIMAL(15,2) DEFAULT 0,
  total_paid DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_customers_merchant ON pos_customers(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pos_customers_phone ON pos_customers(phone);

-- ========================================
-- 2. POS Credit Transactions Table
-- ========================================
CREATE TABLE IF NOT EXISTS pos_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES pos_customers(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES pos_sales(id),
  type VARCHAR(20) NOT NULL, -- 'credit' or 'payment'
  amount DECIMAL(15,2) NOT NULL,
  balance_before DECIMAL(15,2) NOT NULL,
  balance_after DECIMAL(15,2) NOT NULL,
  payment_method VARCHAR(50),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_credit_tx_customer ON pos_credit_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_pos_credit_tx_merchant ON pos_credit_transactions(merchant_id);

-- ========================================
-- 3. POS Held Orders Table
-- ========================================
CREATE TABLE IF NOT EXISTS pos_held_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hold_number VARCHAR(50) NOT NULL,
  customer_name VARCHAR(200),
  customer_phone VARCHAR(20),
  items JSONB NOT NULL DEFAULT '[]',
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  held_by UUID REFERENCES users(id),
  held_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'held', -- held, resumed, expired
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_held_orders_merchant ON pos_held_orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pos_held_orders_status ON pos_held_orders(status);

-- ========================================
-- 4. POS Refunds Table
-- ========================================
CREATE TABLE IF NOT EXISTS pos_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES pos_sales(id),
  refund_number VARCHAR(50) NOT NULL,
  refund_type VARCHAR(20) NOT NULL, -- 'full' or 'partial'
  refund_amount DECIMAL(15,2) NOT NULL,
  refund_method VARCHAR(50) NOT NULL, -- cash, original, store_credit
  items JSONB,
  reason TEXT NOT NULL,
  refunded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_refunds_merchant ON pos_refunds(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pos_refunds_sale ON pos_refunds(sale_id);

-- ========================================
-- 5. POS Discounts Table
-- ========================================
CREATE TABLE IF NOT EXISTS pos_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50),
  type VARCHAR(20) NOT NULL, -- 'percentage' or 'fixed'
  value DECIMAL(15,2) NOT NULL,
  min_purchase DECIMAL(15,2),
  max_discount DECIMAL(15,2),
  applies_to VARCHAR(20) DEFAULT 'cart', -- cart, item, category
  category_ids JSONB DEFAULT '[]',
  product_ids JSONB DEFAULT '[]',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_discounts_merchant ON pos_discounts(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pos_discounts_code ON pos_discounts(code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_discounts_unique_code ON pos_discounts(merchant_id, code) WHERE code IS NOT NULL;

-- ========================================
-- Enable RLS on all tables
-- ========================================
ALTER TABLE pos_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_held_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_discounts ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS Policies
-- ========================================
DROP POLICY IF EXISTS "Users can manage their POS customers" ON pos_customers;
CREATE POLICY "Users can manage their POS customers" ON pos_customers
  FOR ALL USING (merchant_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their credit transactions" ON pos_credit_transactions;
CREATE POLICY "Users can manage their credit transactions" ON pos_credit_transactions
  FOR ALL USING (merchant_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their held orders" ON pos_held_orders;
CREATE POLICY "Users can manage their held orders" ON pos_held_orders
  FOR ALL USING (merchant_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their refunds" ON pos_refunds;
CREATE POLICY "Users can manage their refunds" ON pos_refunds
  FOR ALL USING (merchant_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their discounts" ON pos_discounts;
CREATE POLICY "Users can manage their discounts" ON pos_discounts
  FOR ALL USING (merchant_id = auth.uid());
`;

async function checkTables() {
  console.log('Checking existing POS advanced tables...\n');

  const tables = [
    'pos_customers',
    'pos_credit_transactions',
    'pos_held_orders',
    'pos_refunds',
    'pos_discounts',
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
      console.log('\n✓ All POS advanced tables already exist!');
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
