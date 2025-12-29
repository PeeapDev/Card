-- Migration: Invoice Type Settings (Admin Configurable)
-- Allows SuperAdmin to configure which invoice types are available
-- and how many types single-app subscribers can select

-- =============================================
-- SYSTEM SETTINGS TABLE (if not exists)
-- =============================================
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INVOICE TYPE DEFINITIONS
-- =============================================
CREATE TABLE IF NOT EXISTS invoice_type_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'standard', 'proforma', 'credit_note'
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50), -- lucide icon name
  color VARCHAR(20) DEFAULT 'gray',

  -- Availability settings
  is_active BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false, -- Only for full plan subscribers
  requires_full_plan BOOLEAN DEFAULT false,

  -- Display order
  sort_order INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MERCHANT INVOICE TYPE SELECTIONS
-- =============================================
CREATE TABLE IF NOT EXISTS merchant_invoice_type_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES plus_businesses(id) ON DELETE CASCADE,
  invoice_type_code VARCHAR(50) NOT NULL REFERENCES invoice_type_definitions(code),
  enabled_at TIMESTAMPTZ DEFAULT NOW(),
  enabled_by UUID,

  UNIQUE(business_id, invoice_type_code)
);

-- =============================================
-- INSERT DEFAULT INVOICE TYPES
-- =============================================
INSERT INTO invoice_type_definitions (code, name, description, icon, color, sort_order, is_premium, requires_full_plan) VALUES
  ('standard', 'Commercial (Standard) Invoice', 'Official bill for delivered goods or services', 'FileText', 'blue', 1, false, false),
  ('proforma', 'Proforma Invoice', 'Preliminary document issued before sale', 'FileQuestion', 'purple', 2, false, false),
  ('tax', 'Tax Invoice', 'Commercial invoice with statutory tax details', 'Receipt', 'green', 3, false, false),
  ('credit_note', 'Credit Note', 'Reduces or reverses a billed amount', 'MinusCircle', 'emerald', 4, true, false),
  ('debit_note', 'Debit Note', 'Increases a previously billed amount', 'PlusCircle', 'orange', 5, true, false),
  ('recurring', 'Recurring Invoice', 'Automatically issued on a schedule', 'RefreshCw', 'cyan', 6, true, true),
  ('interim', 'Interim / Progress Invoice', 'Partial billing for ongoing work', 'Clock', 'yellow', 7, true, false),
  ('final', 'Final Invoice', 'Closing invoice after project completion', 'CheckCircle', 'teal', 8, true, false),
  ('outstanding', 'Outstanding Invoice', 'Unpaid invoice past due date', 'AlertTriangle', 'red', 9, false, false),
  ('overdue_debt', 'Overdue (Debt) Invoice', 'Formal debt invoice demanding payment', 'AlertOctagon', 'red', 10, true, false),
  ('past_due', 'Past Due Invoice', 'Automated reminder for overdue invoice', 'Bell', 'amber', 11, false, false),
  ('statement', 'Statement of Account', 'Summary of all invoices over a period', 'ClipboardList', 'slate', 12, true, true),
  ('self_billing', 'Self-Billing Invoice', 'Issued by buyer under agreement', 'UserCheck', 'indigo', 13, true, true),
  ('bad_debt', 'Bad Debt Write-Off', 'Invoice classified as uncollectible', 'XCircle', 'gray', 14, true, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order,
  is_premium = EXCLUDED.is_premium,
  requires_full_plan = EXCLUDED.requires_full_plan,
  updated_at = NOW();

-- =============================================
-- INSERT DEFAULT SYSTEM SETTINGS
-- =============================================
INSERT INTO system_settings (key, value, description, category) VALUES
  ('invoice_type_limits', '{
    "single_app_max_types": 2,
    "single_app_default_types": ["standard", "proforma"],
    "full_plan_unlimited": true,
    "allow_merchant_selection": true
  }', 'Controls how many invoice types single-app subscribers can select', 'invoices'),

  ('invoice_monthly_limits', '{
    "single_app_limit": 10,
    "full_plan_limit": 1000,
    "enterprise_unlimited": true
  }', 'Monthly invoice creation limits per plan', 'invoices')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- ADD INVOICE TYPE TO INVOICES TABLE
-- =============================================
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_type_code VARCHAR(50) DEFAULT 'standard';

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_invoice_type_defs_active ON invoice_type_definitions(is_active);
CREATE INDEX IF NOT EXISTS idx_invoice_type_defs_premium ON invoice_type_definitions(is_premium);
CREATE INDEX IF NOT EXISTS idx_merchant_invoice_selections_business ON merchant_invoice_type_selections(business_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_type_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_invoice_type_selections ENABLE ROW LEVEL SECURITY;

-- System settings: Only admins can read/write
DROP POLICY IF EXISTS system_settings_select ON system_settings;
CREATE POLICY system_settings_select ON system_settings FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin']))
  OR category = 'public'
);

DROP POLICY IF EXISTS system_settings_all ON system_settings;
CREATE POLICY system_settings_all ON system_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin']))
);

-- Invoice type definitions: Anyone can read active types, only admins can modify
DROP POLICY IF EXISTS invoice_type_defs_select ON invoice_type_definitions;
CREATE POLICY invoice_type_defs_select ON invoice_type_definitions FOR SELECT USING (is_active = true OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin']))
);

DROP POLICY IF EXISTS invoice_type_defs_all ON invoice_type_definitions;
CREATE POLICY invoice_type_defs_all ON invoice_type_definitions FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin']))
);

-- Merchant selections: Business owner can manage their selections
DROP POLICY IF EXISTS merchant_selections_select ON merchant_invoice_type_selections;
CREATE POLICY merchant_selections_select ON merchant_invoice_type_selections FOR SELECT USING (
  business_id IN (SELECT id FROM plus_businesses WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin']))
);

DROP POLICY IF EXISTS merchant_selections_insert ON merchant_invoice_type_selections;
CREATE POLICY merchant_selections_insert ON merchant_invoice_type_selections FOR INSERT WITH CHECK (
  business_id IN (SELECT id FROM plus_businesses WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin']))
);

DROP POLICY IF EXISTS merchant_selections_delete ON merchant_invoice_type_selections;
CREATE POLICY merchant_selections_delete ON merchant_invoice_type_selections FOR DELETE USING (
  business_id IN (SELECT id FROM plus_businesses WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin']))
);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Get available invoice types for a business based on their plan
CREATE OR REPLACE FUNCTION get_available_invoice_types(p_business_id UUID)
RETURNS TABLE (
  code VARCHAR(50),
  name VARCHAR(100),
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),
  is_selected BOOLEAN
) AS $$
DECLARE
  v_is_full_plan BOOLEAN := false;
  v_user_id UUID;
BEGIN
  -- Get business owner and check their subscription
  SELECT user_id INTO v_user_id FROM plus_businesses WHERE id = p_business_id;

  -- Check if user has full plan (you can customize this logic)
  SELECT EXISTS (
    SELECT 1 FROM user_subscriptions
    WHERE user_id = v_user_id
    AND status IN ('active', 'trialing')
    AND tier IN ('plus', 'enterprise', 'all_apps')
  ) INTO v_is_full_plan;

  RETURN QUERY
  SELECT
    itd.code,
    itd.name,
    itd.description,
    itd.icon,
    itd.color,
    EXISTS (
      SELECT 1 FROM merchant_invoice_type_selections mits
      WHERE mits.business_id = p_business_id
      AND mits.invoice_type_code = itd.code
    ) AS is_selected
  FROM invoice_type_definitions itd
  WHERE itd.is_active = true
  AND (
    -- Full plan gets all types
    v_is_full_plan = true
    -- Or type doesn't require full plan
    OR itd.requires_full_plan = false
  )
  ORDER BY itd.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if merchant can use a specific invoice type
CREATE OR REPLACE FUNCTION can_use_invoice_type(p_business_id UUID, p_type_code VARCHAR(50))
RETURNS BOOLEAN AS $$
DECLARE
  v_is_full_plan BOOLEAN := false;
  v_is_selected BOOLEAN := false;
  v_requires_full_plan BOOLEAN := false;
  v_user_id UUID;
BEGIN
  -- Get business owner
  SELECT user_id INTO v_user_id FROM plus_businesses WHERE id = p_business_id;

  -- Check subscription
  SELECT EXISTS (
    SELECT 1 FROM user_subscriptions
    WHERE user_id = v_user_id
    AND status IN ('active', 'trialing')
    AND tier IN ('plus', 'enterprise', 'all_apps')
  ) INTO v_is_full_plan;

  -- Get type info
  SELECT requires_full_plan INTO v_requires_full_plan
  FROM invoice_type_definitions WHERE code = p_type_code;

  -- If requires full plan and user doesn't have it, deny
  IF v_requires_full_plan AND NOT v_is_full_plan THEN
    RETURN false;
  END IF;

  -- Full plan users can use any type
  IF v_is_full_plan THEN
    RETURN true;
  END IF;

  -- Single app users must have selected this type
  SELECT EXISTS (
    SELECT 1 FROM merchant_invoice_type_selections
    WHERE business_id = p_business_id AND invoice_type_code = p_type_code
  ) INTO v_is_selected;

  RETURN v_is_selected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- GRANTS
-- =============================================
GRANT SELECT ON system_settings TO authenticated;
GRANT SELECT ON invoice_type_definitions TO authenticated;
GRANT ALL ON merchant_invoice_type_selections TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_invoice_types(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_use_invoice_type(UUID, VARCHAR) TO authenticated;
