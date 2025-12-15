-- Migration: 038_pos_settings.sql
-- Description: Create pos_settings table to persist POS configuration
-- Created: 2024-12-14

-- =====================================================
-- HELPER FUNCTION FOR UPDATED_AT TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- POS SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS pos_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Business/Invoice settings
  business_name VARCHAR(255),
  business_address TEXT,
  business_phone VARCHAR(50),
  business_email VARCHAR(255),
  tax_number VARCHAR(100),

  -- Receipt preferences
  show_logo BOOLEAN DEFAULT true,
  receipt_header TEXT DEFAULT 'Thank you for your purchase!',
  receipt_footer TEXT DEFAULT 'Please come again!',

  -- Tax settings
  enable_tax BOOLEAN DEFAULT false,
  default_tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_label VARCHAR(50) DEFAULT 'GST',

  -- Product settings
  expected_products INTEGER DEFAULT 10,

  -- Setup status
  setup_completed BOOLEAN DEFAULT false,
  setup_completed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One settings record per merchant
  UNIQUE(merchant_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pos_settings_merchant ON pos_settings(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pos_settings_setup_completed ON pos_settings(setup_completed);

-- Enable RLS
ALTER TABLE pos_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Merchants can view their own POS settings"
  ON pos_settings FOR SELECT
  USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can insert their own POS settings"
  ON pos_settings FOR INSERT
  WITH CHECK (auth.uid() = merchant_id);

CREATE POLICY "Merchants can update their own POS settings"
  ON pos_settings FOR UPDATE
  USING (auth.uid() = merchant_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_pos_settings_updated_at ON pos_settings;
CREATE TRIGGER trigger_pos_settings_updated_at
  BEFORE UPDATE ON pos_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get or create POS settings for a merchant
CREATE OR REPLACE FUNCTION get_or_create_pos_settings(p_merchant_id UUID)
RETURNS pos_settings AS $$
DECLARE
  v_settings pos_settings;
BEGIN
  -- Try to get existing settings
  SELECT * INTO v_settings
  FROM pos_settings
  WHERE merchant_id = p_merchant_id;

  -- If not found, create default settings
  IF NOT FOUND THEN
    INSERT INTO pos_settings (merchant_id)
    VALUES (p_merchant_id)
    RETURNING * INTO v_settings;
  END IF;

  RETURN v_settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if POS setup is completed
CREATE OR REPLACE FUNCTION is_pos_setup_completed(p_merchant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_completed BOOLEAN;
BEGIN
  SELECT setup_completed INTO v_completed
  FROM pos_settings
  WHERE merchant_id = p_merchant_id;

  RETURN COALESCE(v_completed, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete POS setup
CREATE OR REPLACE FUNCTION complete_pos_setup(
  p_merchant_id UUID,
  p_business_name VARCHAR DEFAULT NULL,
  p_business_address TEXT DEFAULT NULL,
  p_business_phone VARCHAR DEFAULT NULL,
  p_business_email VARCHAR DEFAULT NULL,
  p_tax_number VARCHAR DEFAULT NULL,
  p_show_logo BOOLEAN DEFAULT true,
  p_receipt_header TEXT DEFAULT 'Thank you for your purchase!',
  p_receipt_footer TEXT DEFAULT 'Please come again!',
  p_enable_tax BOOLEAN DEFAULT false,
  p_default_tax_rate DECIMAL DEFAULT 0,
  p_tax_label VARCHAR DEFAULT 'GST',
  p_expected_products INTEGER DEFAULT 10
)
RETURNS pos_settings AS $$
DECLARE
  v_settings pos_settings;
BEGIN
  INSERT INTO pos_settings (
    merchant_id,
    business_name,
    business_address,
    business_phone,
    business_email,
    tax_number,
    show_logo,
    receipt_header,
    receipt_footer,
    enable_tax,
    default_tax_rate,
    tax_label,
    expected_products,
    setup_completed,
    setup_completed_at
  ) VALUES (
    p_merchant_id,
    p_business_name,
    p_business_address,
    p_business_phone,
    p_business_email,
    p_tax_number,
    p_show_logo,
    p_receipt_header,
    p_receipt_footer,
    p_enable_tax,
    p_default_tax_rate,
    p_tax_label,
    p_expected_products,
    true,
    NOW()
  )
  ON CONFLICT (merchant_id) DO UPDATE SET
    business_name = EXCLUDED.business_name,
    business_address = EXCLUDED.business_address,
    business_phone = EXCLUDED.business_phone,
    business_email = EXCLUDED.business_email,
    tax_number = EXCLUDED.tax_number,
    show_logo = EXCLUDED.show_logo,
    receipt_header = EXCLUDED.receipt_header,
    receipt_footer = EXCLUDED.receipt_footer,
    enable_tax = EXCLUDED.enable_tax,
    default_tax_rate = EXCLUDED.default_tax_rate,
    tax_label = EXCLUDED.tax_label,
    expected_products = EXCLUDED.expected_products,
    setup_completed = true,
    setup_completed_at = COALESCE(pos_settings.setup_completed_at, NOW()),
    updated_at = NOW()
  RETURNING * INTO v_settings;

  RETURN v_settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_or_create_pos_settings TO authenticated;
GRANT EXECUTE ON FUNCTION is_pos_setup_completed TO authenticated;
GRANT EXECUTE ON FUNCTION complete_pos_setup TO authenticated;
