-- Migration: 097_fix_schema_issues.sql
-- Fix schema issues for merchant_businesses and pos_products

-- =============================================
-- FIX MERCHANT_BUSINESSES - Add user_id alias
-- =============================================
-- The code queries user_id but table has merchant_id
-- Add user_id as an alias column that mirrors merchant_id

-- Add user_id column if not exists
ALTER TABLE merchant_businesses ADD COLUMN IF NOT EXISTS user_id UUID;

-- Update existing records to copy merchant_id to user_id
UPDATE merchant_businesses SET user_id = merchant_id WHERE user_id IS NULL;

-- Add is_active column if not exists (code uses this)
ALTER TABLE merchant_businesses ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update is_active based on status
UPDATE merchant_businesses SET is_active = (status = 'ACTIVE') WHERE is_active IS NULL;

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_merchant_businesses_user_id ON merchant_businesses(user_id);

-- =============================================
-- FIX POS_PRODUCTS - Add missing columns
-- =============================================
-- Add columns that the UI expects

ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS is_on_sale BOOLEAN DEFAULT false;
ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS sale_price DECIMAL(15,2);
ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS is_variant BOOLEAN DEFAULT false;
ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS parent_product_id UUID REFERENCES pos_products(id);
ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS variant_name VARCHAR(100);

-- Add low_stock_threshold alias for low_stock_alert
ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10;

-- Update low_stock_threshold from low_stock_alert
UPDATE pos_products SET low_stock_threshold = low_stock_alert WHERE low_stock_threshold IS NULL OR low_stock_threshold = 10;

-- =============================================
-- FIX BUSINESSES TABLE (if exists)
-- =============================================
-- Some code references a 'businesses' table directly
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'businesses') THEN
        -- Add owner_id if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'owner_id') THEN
            ALTER TABLE businesses ADD COLUMN owner_id UUID;
        END IF;
    END IF;
END $$;

-- =============================================
-- CREATE VIEW FOR COMPATIBILITY (optional)
-- =============================================
-- Create a view that maps merchant_businesses columns
CREATE OR REPLACE VIEW businesses_compat AS
SELECT
    id,
    merchant_id as owner_id,
    name,
    logo_url,
    status,
    created_at
FROM merchant_businesses;

COMMENT ON VIEW businesses_compat IS 'Compatibility view for code that references businesses table';
