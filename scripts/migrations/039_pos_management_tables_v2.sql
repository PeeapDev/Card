-- Migration: POS Management Tables v2
-- Description: Create tables for suppliers, discounts, and purchase orders
-- Note: pos_customers table already exists with different schema

-- Check if pos_customers exists and add missing columns if needed
DO $$
BEGIN
    -- Add status column if it doesn't exist (for backwards compatibility)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'pos_customers' AND column_name = 'status') THEN
        ALTER TABLE pos_customers ADD COLUMN status VARCHAR(20) DEFAULT 'active';
        -- Migrate is_active to status
        UPDATE pos_customers SET status = CASE WHEN is_active = true THEN 'active' ELSE 'inactive' END;
    END IF;

    -- Add customer_type if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'pos_customers' AND column_name = 'customer_type') THEN
        ALTER TABLE pos_customers ADD COLUMN customer_type VARCHAR(50) DEFAULT 'regular';
    END IF;

    -- Add city if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'pos_customers' AND column_name = 'city') THEN
        ALTER TABLE pos_customers ADD COLUMN city VARCHAR(100);
    END IF;

    -- Add country if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'pos_customers' AND column_name = 'country') THEN
        ALTER TABLE pos_customers ADD COLUMN country VARCHAR(100) DEFAULT 'Sierra Leone';
    END IF;

    -- Add loyalty_points if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'pos_customers' AND column_name = 'loyalty_points') THEN
        ALTER TABLE pos_customers ADD COLUMN loyalty_points INTEGER DEFAULT 0;
    END IF;

    -- Add total_orders if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'pos_customers' AND column_name = 'total_orders') THEN
        ALTER TABLE pos_customers ADD COLUMN total_orders INTEGER DEFAULT 0;
    END IF;

    -- Add last_purchase_date if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'pos_customers' AND column_name = 'last_purchase_date') THEN
        ALTER TABLE pos_customers ADD COLUMN last_purchase_date TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- POS Suppliers Table
CREATE TABLE IF NOT EXISTS pos_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Sierra Leone',
    tax_id VARCHAR(100),
    payment_terms VARCHAR(50) DEFAULT 'NET30',
    credit_limit DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,
    bank_name VARCHAR(255),
    bank_account VARCHAR(100),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active',
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(15,2) DEFAULT 0,
    last_order_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pos_suppliers_merchant ON pos_suppliers(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pos_suppliers_status ON pos_suppliers(status);

-- POS Discounts Table
CREATE TABLE IF NOT EXISTS pos_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    type VARCHAR(50) NOT NULL,
    value DECIMAL(15,2) NOT NULL,
    min_purchase DECIMAL(15,2) DEFAULT 0,
    max_discount DECIMAL(15,2) DEFAULT 0,
    usage_limit INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    per_customer_limit INTEGER DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    applies_to VARCHAR(50) DEFAULT 'all',
    target_ids UUID[] DEFAULT '{}',
    conditions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pos_discounts_merchant ON pos_discounts(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pos_discounts_code ON pos_discounts(code);
CREATE INDEX IF NOT EXISTS idx_pos_discounts_active ON pos_discounts(is_active);
CREATE INDEX IF NOT EXISTS idx_pos_discounts_dates ON pos_discounts(start_date, end_date);

-- POS Purchase Orders Table
CREATE TABLE IF NOT EXISTS pos_purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES pos_suppliers(id),
    supplier_name VARCHAR(255),
    order_number VARCHAR(50) NOT NULL,
    order_date DATE NOT NULL,
    expected_date DATE,
    received_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'draft',
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    shipping_cost DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    items JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pos_purchase_orders_merchant ON pos_purchase_orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pos_purchase_orders_supplier ON pos_purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_pos_purchase_orders_status ON pos_purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_pos_purchase_orders_number ON pos_purchase_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_pos_purchase_orders_date ON pos_purchase_orders(order_date);

-- Disable RLS for these tables (app manages authorization)
ALTER TABLE pos_suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE pos_discounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE pos_purchase_orders DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON pos_suppliers TO authenticated;
GRANT ALL ON pos_discounts TO authenticated;
GRANT ALL ON pos_purchase_orders TO authenticated;
GRANT ALL ON pos_suppliers TO service_role;
GRANT ALL ON pos_discounts TO service_role;
GRANT ALL ON pos_purchase_orders TO service_role;
