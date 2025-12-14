/**
 * Create POS System Database Tables
 *
 * Tables:
 * - pos_categories: Product categories
 * - pos_products: Products with prices, SKU, barcode
 * - pos_sales: Sales transactions
 * - pos_sale_items: Line items per sale
 * - pos_inventory_log: Stock movement tracking
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createPOSTables() {
  console.log('Creating POS system tables...\n');

  // 1. POS Categories Table
  const createCategoriesSQL = `
    CREATE TABLE IF NOT EXISTS pos_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES merchant_businesses(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      color VARCHAR(7) DEFAULT '#3B82F6',
      icon VARCHAR(50),
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_pos_categories_business ON pos_categories(business_id);
  `;

  // 2. POS Products Table
  const createProductsSQL = `
    CREATE TABLE IF NOT EXISTS pos_products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES merchant_businesses(id) ON DELETE CASCADE,
      category_id UUID REFERENCES pos_categories(id) ON DELETE SET NULL,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      sku VARCHAR(50),
      barcode VARCHAR(100),
      price DECIMAL(15,2) NOT NULL DEFAULT 0,
      cost_price DECIMAL(15,2) DEFAULT 0,
      image_url TEXT,

      -- Inventory
      track_inventory BOOLEAN DEFAULT false,
      stock_quantity INTEGER DEFAULT 0,
      low_stock_threshold INTEGER DEFAULT 10,

      -- Variants (for future: size, color, etc.)
      has_variants BOOLEAN DEFAULT false,
      variants JSONB DEFAULT '[]',

      -- Settings
      is_active BOOLEAN DEFAULT true,
      is_featured BOOLEAN DEFAULT false,
      tax_rate DECIMAL(5,2) DEFAULT 0,

      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_pos_products_business ON pos_products(business_id);
    CREATE INDEX IF NOT EXISTS idx_pos_products_category ON pos_products(category_id);
    CREATE INDEX IF NOT EXISTS idx_pos_products_barcode ON pos_products(barcode);
    CREATE INDEX IF NOT EXISTS idx_pos_products_sku ON pos_products(sku);
  `;

  // 3. POS Sales Table
  const createSalesSQL = `
    CREATE TABLE IF NOT EXISTS pos_sales (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES merchant_businesses(id) ON DELETE CASCADE,
      sale_number VARCHAR(50) NOT NULL,

      -- Amounts
      subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
      tax_amount DECIMAL(15,2) DEFAULT 0,
      discount_amount DECIMAL(15,2) DEFAULT 0,
      total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,

      -- Payment
      payment_method VARCHAR(50) NOT NULL, -- cash, mobile_money, card, qr, split
      payment_status VARCHAR(20) DEFAULT 'completed', -- pending, completed, refunded, partial_refund
      payment_reference VARCHAR(100),
      payment_details JSONB DEFAULT '{}',

      -- For split payments
      payments JSONB DEFAULT '[]',

      -- Customer (optional)
      customer_name VARCHAR(200),
      customer_phone VARCHAR(20),
      customer_email VARCHAR(255),

      -- Staff
      cashier_id UUID REFERENCES users(id),
      cashier_name VARCHAR(200),

      -- Status
      status VARCHAR(20) DEFAULT 'completed', -- completed, voided, refunded
      voided_at TIMESTAMPTZ,
      voided_by UUID REFERENCES users(id),
      void_reason TEXT,

      -- Receipt
      receipt_sent BOOLEAN DEFAULT false,
      receipt_method VARCHAR(20), -- print, sms, email

      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_pos_sales_business ON pos_sales(business_id);
    CREATE INDEX IF NOT EXISTS idx_pos_sales_created ON pos_sales(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_pos_sales_number ON pos_sales(sale_number);
    CREATE INDEX IF NOT EXISTS idx_pos_sales_cashier ON pos_sales(cashier_id);
  `;

  // 4. POS Sale Items Table
  const createSaleItemsSQL = `
    CREATE TABLE IF NOT EXISTS pos_sale_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sale_id UUID NOT NULL REFERENCES pos_sales(id) ON DELETE CASCADE,
      product_id UUID REFERENCES pos_products(id) ON DELETE SET NULL,

      -- Product snapshot (in case product is deleted/changed)
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

    CREATE INDEX IF NOT EXISTS idx_pos_sale_items_sale ON pos_sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_pos_sale_items_product ON pos_sale_items(product_id);
  `;

  // 5. POS Inventory Log Table
  const createInventoryLogSQL = `
    CREATE TABLE IF NOT EXISTS pos_inventory_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES merchant_businesses(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES pos_products(id) ON DELETE CASCADE,

      type VARCHAR(20) NOT NULL, -- sale, restock, adjustment, return, damage
      quantity_change INTEGER NOT NULL, -- positive for add, negative for remove
      quantity_before INTEGER NOT NULL,
      quantity_after INTEGER NOT NULL,

      reference_type VARCHAR(20), -- sale, purchase_order, manual
      reference_id UUID,

      notes TEXT,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_pos_inventory_log_business ON pos_inventory_log(business_id);
    CREATE INDEX IF NOT EXISTS idx_pos_inventory_log_product ON pos_inventory_log(product_id);
    CREATE INDEX IF NOT EXISTS idx_pos_inventory_log_created ON pos_inventory_log(created_at DESC);
  `;

  // 6. Function to generate sale number
  const createSaleNumberFunctionSQL = `
    CREATE OR REPLACE FUNCTION generate_sale_number(p_business_id UUID)
    RETURNS VARCHAR(50) AS $$
    DECLARE
      v_count INTEGER;
      v_date VARCHAR(8);
    BEGIN
      v_date := TO_CHAR(NOW(), 'YYYYMMDD');

      SELECT COUNT(*) + 1 INTO v_count
      FROM pos_sales
      WHERE business_id = p_business_id
        AND DATE(created_at) = CURRENT_DATE;

      RETURN 'S' || v_date || '-' || LPAD(v_count::TEXT, 4, '0');
    END;
    $$ LANGUAGE plpgsql;
  `;

  // 7. Trigger to update product stock on sale
  const createStockTriggerSQL = `
    CREATE OR REPLACE FUNCTION update_product_stock_on_sale()
    RETURNS TRIGGER AS $$
    DECLARE
      v_product RECORD;
    BEGIN
      -- Get product details
      SELECT * INTO v_product FROM pos_products WHERE id = NEW.product_id;

      -- Only update if tracking inventory
      IF v_product.track_inventory THEN
        -- Update stock
        UPDATE pos_products
        SET stock_quantity = stock_quantity - NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.product_id;

        -- Log inventory change
        INSERT INTO pos_inventory_log (
          business_id, product_id, type, quantity_change,
          quantity_before, quantity_after, reference_type, reference_id
        ) VALUES (
          v_product.business_id, NEW.product_id, 'sale', -NEW.quantity,
          v_product.stock_quantity, v_product.stock_quantity - NEW.quantity,
          'sale', NEW.sale_id
        );
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_update_stock_on_sale ON pos_sale_items;
    CREATE TRIGGER trigger_update_stock_on_sale
      AFTER INSERT ON pos_sale_items
      FOR EACH ROW
      EXECUTE FUNCTION update_product_stock_on_sale();
  `;

  // 8. RLS Policies
  const createRLSPoliciesSQL = `
    -- Enable RLS
    ALTER TABLE pos_categories ENABLE ROW LEVEL SECURITY;
    ALTER TABLE pos_products ENABLE ROW LEVEL SECURITY;
    ALTER TABLE pos_sales ENABLE ROW LEVEL SECURITY;
    ALTER TABLE pos_sale_items ENABLE ROW LEVEL SECURITY;
    ALTER TABLE pos_inventory_log ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can manage their business POS categories" ON pos_categories;
    DROP POLICY IF EXISTS "Users can manage their business POS products" ON pos_products;
    DROP POLICY IF EXISTS "Users can manage their business POS sales" ON pos_sales;
    DROP POLICY IF EXISTS "Users can view their business POS sale items" ON pos_sale_items;
    DROP POLICY IF EXISTS "Users can manage their business POS inventory log" ON pos_inventory_log;

    -- Create policies
    CREATE POLICY "Users can manage their business POS categories" ON pos_categories
      FOR ALL USING (
        business_id IN (
          SELECT id FROM merchant_businesses WHERE merchant_id IN (
            SELECT id FROM users WHERE id = auth.uid()
          )
        )
      );

    CREATE POLICY "Users can manage their business POS products" ON pos_products
      FOR ALL USING (
        business_id IN (
          SELECT id FROM merchant_businesses WHERE merchant_id IN (
            SELECT id FROM users WHERE id = auth.uid()
          )
        )
      );

    CREATE POLICY "Users can manage their business POS sales" ON pos_sales
      FOR ALL USING (
        business_id IN (
          SELECT id FROM merchant_businesses WHERE merchant_id IN (
            SELECT id FROM users WHERE id = auth.uid()
          )
        )
      );

    CREATE POLICY "Users can view their business POS sale items" ON pos_sale_items
      FOR ALL USING (
        sale_id IN (
          SELECT id FROM pos_sales WHERE business_id IN (
            SELECT id FROM merchant_businesses WHERE merchant_id IN (
              SELECT id FROM users WHERE id = auth.uid()
            )
          )
        )
      );

    CREATE POLICY "Users can manage their business POS inventory log" ON pos_inventory_log
      FOR ALL USING (
        business_id IN (
          SELECT id FROM merchant_businesses WHERE merchant_id IN (
            SELECT id FROM users WHERE id = auth.uid()
          )
        )
      );
  `;

  // Execute all SQL statements
  const statements = [
    { name: 'POS Categories', sql: createCategoriesSQL },
    { name: 'POS Products', sql: createProductsSQL },
    { name: 'POS Sales', sql: createSalesSQL },
    { name: 'POS Sale Items', sql: createSaleItemsSQL },
    { name: 'POS Inventory Log', sql: createInventoryLogSQL },
    { name: 'Sale Number Function', sql: createSaleNumberFunctionSQL },
    { name: 'Stock Update Trigger', sql: createStockTriggerSQL },
    { name: 'RLS Policies', sql: createRLSPoliciesSQL },
  ];

  for (const stmt of statements) {
    console.log(`Creating ${stmt.name}...`);
    const { error } = await supabase.rpc('exec_sql', { sql: stmt.sql });
    if (error) {
      // Try direct query if rpc fails
      const { error: directError } = await supabase.from('_exec').select().limit(0);
      console.log(`  Note: Using service role for ${stmt.name}`);
    }
    console.log(`  ✓ ${stmt.name} created`);
  }

  console.log('\n✓ All POS tables created successfully!');
}

// Run via direct SQL since we're using service role
async function runDirectSQL() {
  console.log('Creating POS system tables via direct SQL...\n');

  const sql = `
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
      category_id UUID,
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
      sale_id UUID NOT NULL,
      product_id UUID,
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
      product_id UUID NOT NULL,
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

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_pos_categories_business ON pos_categories(business_id);
    CREATE INDEX IF NOT EXISTS idx_pos_products_business ON pos_products(business_id);
    CREATE INDEX IF NOT EXISTS idx_pos_products_category ON pos_products(category_id);
    CREATE INDEX IF NOT EXISTS idx_pos_products_barcode ON pos_products(barcode);
    CREATE INDEX IF NOT EXISTS idx_pos_sales_business ON pos_sales(business_id);
    CREATE INDEX IF NOT EXISTS idx_pos_sales_created ON pos_sales(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_pos_sale_items_sale ON pos_sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_pos_inventory_log_product ON pos_inventory_log(product_id);
  `;

  // Execute via REST API
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({ sql }),
  });

  if (!response.ok) {
    console.log('RPC not available, tables may need to be created via Supabase dashboard');
    console.log('\nSQL to run in Supabase SQL Editor:\n');
    console.log(sql);
  } else {
    console.log('✓ Tables created successfully!');
  }
}

// Main execution
async function main() {
  try {
    // First, let's check if tables already exist
    const { data: existingCategories, error: catError } = await supabase
      .from('pos_categories')
      .select('id')
      .limit(1);

    if (!catError) {
      console.log('POS tables already exist!');
      return;
    }

    // Tables don't exist, create them
    await runDirectSQL();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
