-- Tier Configurations Table
-- Allows dynamic configuration of subscription tier limits and features

-- Create tier_configurations table
CREATE TABLE IF NOT EXISTS tier_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier VARCHAR(50) NOT NULL UNIQUE CHECK (tier IN ('basic', 'business', 'business_plus')),

    -- Display info
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(20) DEFAULT '#6B7280',
    icon VARCHAR(50) DEFAULT 'Store',

    -- Pricing
    price_monthly DECIMAL(15, 2) DEFAULT 0,
    price_yearly DECIMAL(15, 2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'NLE',

    -- Numeric limits (-1 = unlimited)
    max_products INTEGER DEFAULT 10,
    max_staff INTEGER DEFAULT 1,
    max_locations INTEGER DEFAULT 1,
    max_categories INTEGER DEFAULT 3,
    max_event_staff INTEGER DEFAULT 0,
    max_customers INTEGER DEFAULT -1,
    max_transactions_per_month INTEGER DEFAULT -1,

    -- Report limits
    report_history_days INTEGER DEFAULT 7,  -- How many days of history in reports

    -- Transaction fees (percentage)
    transaction_fee_percent DECIMAL(5, 2) DEFAULT 2.5,

    -- Boolean features (POS)
    feature_customers_credit BOOLEAN DEFAULT false,
    feature_loyalty_program BOOLEAN DEFAULT false,
    feature_advanced_reports BOOLEAN DEFAULT false,
    feature_kitchen_display BOOLEAN DEFAULT false,
    feature_table_management BOOLEAN DEFAULT false,
    feature_online_ordering BOOLEAN DEFAULT false,
    feature_multi_payment BOOLEAN DEFAULT false,
    feature_discount_codes BOOLEAN DEFAULT false,
    feature_inventory_alerts BOOLEAN DEFAULT true,
    feature_export_reports BOOLEAN DEFAULT false,
    feature_custom_receipts BOOLEAN DEFAULT false,
    feature_api_access BOOLEAN DEFAULT false,
    feature_priority_support BOOLEAN DEFAULT false,
    feature_barcode_scanner BOOLEAN DEFAULT false,
    feature_multi_currency BOOLEAN DEFAULT false,
    feature_supplier_management BOOLEAN DEFAULT false,
    feature_purchase_orders BOOLEAN DEFAULT false,

    -- Event features
    feature_event_management BOOLEAN DEFAULT false,
    feature_event_analytics BOOLEAN DEFAULT false,
    event_ticket_commission_percent DECIMAL(5, 2) DEFAULT 3.0,

    -- Communication features
    feature_sms_notifications BOOLEAN DEFAULT false,
    feature_whatsapp_notifications BOOLEAN DEFAULT false,
    feature_email_notifications BOOLEAN DEFAULT true,

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default tier configurations
INSERT INTO tier_configurations (
    tier, display_name, description, color, icon,
    price_monthly, price_yearly,
    max_products, max_staff, max_locations, max_categories, max_event_staff,
    report_history_days, transaction_fee_percent,
    feature_customers_credit, feature_loyalty_program, feature_advanced_reports,
    feature_kitchen_display, feature_table_management, feature_online_ordering,
    feature_multi_payment, feature_discount_codes, feature_inventory_alerts,
    feature_export_reports, feature_custom_receipts, feature_api_access,
    feature_priority_support, feature_barcode_scanner, feature_multi_currency,
    feature_supplier_management, feature_purchase_orders,
    feature_event_management, feature_event_analytics, event_ticket_commission_percent,
    feature_sms_notifications, feature_whatsapp_notifications,
    sort_order
) VALUES
-- Basic (Free) Tier
(
    'basic', 'Basic', 'Free tier for small merchants getting started', '#6B7280', 'Store',
    0, 0,
    10, 1, 1, 3, 0,  -- 10 products, 1 staff (owner only), 1 location, 3 categories, no event staff
    7, 2.5,  -- 7 days history, 2.5% fee
    false, false, false,  -- No credit, loyalty, advanced reports
    false, false, false,  -- No kitchen, table, online ordering
    false, false, true,   -- No multi-payment, discounts; yes inventory alerts
    false, false, false,  -- No export, custom receipts, API
    false, false, false,  -- No priority support, barcode, multi-currency
    false, false,         -- No supplier, purchase orders
    false, false, 3.0,    -- No event management, 3% ticket commission
    false, false,         -- No SMS, WhatsApp
    1
),
-- Business Tier
(
    'business', 'Business', 'For growing businesses with staff and advanced features', '#F59E0B', 'Building2',
    150, 1500,
    50, 3, 1, 10, 2,  -- 50 products, 3 staff, 1 location, 10 categories, 2 event staff
    30, 1.5,  -- 30 days history, 1.5% fee
    true, true, true,     -- Credit, loyalty, advanced reports
    false, false, false,  -- No kitchen, table, online ordering
    true, true, true,     -- Multi-payment, discounts, inventory alerts
    true, true, false,    -- Export, custom receipts, no API
    false, true, false,   -- No priority support, yes barcode, no multi-currency
    false, false,         -- No supplier, purchase orders
    true, false, 2.0,     -- Event management, no analytics, 2% ticket commission
    true, false,          -- SMS, no WhatsApp
    2
),
-- Business Plus Tier
(
    'business_plus', 'Business++', 'Full-featured plan for established businesses', '#8B5CF6', 'Rocket',
    500, 5000,
    -1, -1, 5, -1, -1,  -- Unlimited products, staff, 5 locations, unlimited categories, unlimited event staff
    -1, 1.0,  -- Unlimited history, 1% fee
    true, true, true,     -- Credit, loyalty, advanced reports
    true, true, true,     -- Kitchen, table, online ordering
    true, true, true,     -- Multi-payment, discounts, inventory alerts
    true, true, true,     -- Export, custom receipts, API
    true, true, true,     -- Priority support, barcode, multi-currency
    true, true,           -- Supplier, purchase orders
    true, true, 1.0,      -- Event management, analytics, 1% ticket commission
    true, true,           -- SMS, WhatsApp
    3
)
ON CONFLICT (tier) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tier_configurations_tier ON tier_configurations(tier);
CREATE INDEX IF NOT EXISTS idx_tier_configurations_active ON tier_configurations(is_active);

-- RLS Policies
ALTER TABLE tier_configurations ENABLE ROW LEVEL SECURITY;

-- Everyone can read tier configurations (for pricing pages, etc.)
CREATE POLICY "Anyone can view tier configurations"
    ON tier_configurations FOR SELECT
    USING (true);

-- Only admins can modify tier configurations
CREATE POLICY "Admins can manage tier configurations"
    ON tier_configurations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND 'admin' = ANY(users.roles)
        )
    );

-- Function to get tier configuration
CREATE OR REPLACE FUNCTION get_tier_configuration(p_tier VARCHAR)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT row_to_json(tc.*)
    INTO result
    FROM tier_configurations tc
    WHERE tc.tier = p_tier AND tc.is_active = true;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all tier configurations
CREATE OR REPLACE FUNCTION get_all_tier_configurations()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(row_to_json(tc.*) ORDER BY tc.sort_order)
    INTO result
    FROM tier_configurations tc
    WHERE tc.is_active = true;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is within limit
CREATE OR REPLACE FUNCTION check_tier_limit(
    p_user_id UUID,
    p_limit_type VARCHAR,
    p_current_count INTEGER
)
RETURNS JSON AS $$
DECLARE
    user_tier VARCHAR;
    tier_limit INTEGER;
    result JSON;
BEGIN
    -- Get user's tier from merchant_subscriptions
    SELECT COALESCE(ms.tier, 'basic')
    INTO user_tier
    FROM users u
    LEFT JOIN merchant_subscriptions ms ON ms.user_id = u.id
    WHERE u.id = p_user_id;

    -- Get the limit for this tier
    EXECUTE format(
        'SELECT %I FROM tier_configurations WHERE tier = $1',
        'max_' || p_limit_type
    ) INTO tier_limit USING user_tier;

    -- -1 means unlimited
    IF tier_limit = -1 THEN
        result := json_build_object(
            'allowed', true,
            'current', p_current_count,
            'limit', -1,
            'tier', user_tier,
            'unlimited', true
        );
    ELSIF p_current_count < tier_limit THEN
        result := json_build_object(
            'allowed', true,
            'current', p_current_count,
            'limit', tier_limit,
            'tier', user_tier,
            'remaining', tier_limit - p_current_count,
            'unlimited', false
        );
    ELSE
        result := json_build_object(
            'allowed', false,
            'current', p_current_count,
            'limit', tier_limit,
            'tier', user_tier,
            'remaining', 0,
            'unlimited', false
        );
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_tier_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tier_configurations_updated_at
    BEFORE UPDATE ON tier_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_tier_configurations_updated_at();
