-- ============================================================================
-- HYBRID APP SUBSCRIPTION SYSTEM
-- ============================================================================
-- Allows users to:
-- 1. Subscribe to individual apps (pay for what you use)
-- 2. Subscribe to bundles (discounted multiple apps)
-- 3. Subscribe to All Access (unlimited apps)
-- ============================================================================

-- ============================================================================
-- 1. APPS TABLE - Define all available apps
-- ============================================================================
CREATE TABLE IF NOT EXISTS apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL, -- 'pos', 'invoicing', 'events', 'driver_wallet', 'payment_links'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50), -- Icon name for UI
    category VARCHAR(50), -- 'sales', 'payments', 'logistics', 'marketing'
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. APP PRICING TABLE - Individual app pricing with tiers
-- ============================================================================
CREATE TABLE IF NOT EXISTS app_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('starter', 'pro')),
    price_monthly DECIMAL(10,2) NOT NULL,
    price_yearly DECIMAL(10,2), -- Optional yearly pricing
    currency VARCHAR(3) DEFAULT 'NLE',
    trial_days INTEGER DEFAULT 7,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(app_id, tier)
);

-- ============================================================================
-- 3. APP FEATURE LIMITS - Limits per app per tier
-- ============================================================================
CREATE TABLE IF NOT EXISTS app_feature_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('starter', 'pro')),
    limit_key VARCHAR(50) NOT NULL, -- 'max_products', 'max_staff', 'max_collections_per_day'
    limit_value INTEGER NOT NULL, -- -1 for unlimited
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(app_id, tier, limit_key)
);

-- ============================================================================
-- 4. BUNDLES TABLE - Bundle pricing
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL, -- 'basic_bundle', 'business_bundle', 'all_access'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    bundle_type VARCHAR(20) NOT NULL CHECK (bundle_type IN ('fixed', 'pick_n', 'all_access')),
    -- For 'pick_n': user picks N apps from available apps
    -- For 'fixed': specific apps included
    -- For 'all_access': all apps included
    max_apps INTEGER, -- For 'pick_n' bundles, NULL for fixed/all_access
    app_tier VARCHAR(20) DEFAULT 'starter' CHECK (app_tier IN ('starter', 'pro')),
    price_monthly DECIMAL(10,2) NOT NULL,
    price_yearly DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'NLE',
    trial_days INTEGER DEFAULT 7,
    discount_percentage INTEGER DEFAULT 0, -- For display: "Save 15%"
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. BUNDLE APPS - Which apps are included in fixed bundles
-- ============================================================================
CREATE TABLE IF NOT EXISTS bundle_apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id UUID NOT NULL REFERENCES subscription_bundles(id) ON DELETE CASCADE,
    app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bundle_id, app_id)
);

-- ============================================================================
-- 6. USER APP SUBSCRIPTIONS - User's app subscriptions
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_app_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    business_id UUID,

    -- Subscription type
    subscription_type VARCHAR(20) NOT NULL CHECK (subscription_type IN ('app', 'bundle')),

    -- For individual app subscriptions
    app_id UUID REFERENCES apps(id) ON DELETE SET NULL,
    app_tier VARCHAR(20) CHECK (app_tier IN ('starter', 'pro')),

    -- For bundle subscriptions
    bundle_id UUID REFERENCES subscription_bundles(id) ON DELETE SET NULL,
    selected_apps UUID[], -- For 'pick_n' bundles, stores selected app IDs

    -- Pricing
    price_monthly DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'NLE',

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'trialing'
        CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled', 'expired')),

    -- Trial period
    trial_started_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,

    -- Billing period
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    next_billing_date DATE,

    -- Cancellation
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    cancel_at_period_end BOOLEAN DEFAULT false,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. USER APP SUBSCRIPTION INVOICES
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_app_subscription_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES user_app_subscriptions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    invoice_number VARCHAR(50),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'NLE',
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_app_pricing_app_id ON app_pricing(app_id);
CREATE INDEX IF NOT EXISTS idx_app_feature_limits_app_id ON app_feature_limits(app_id);
CREATE INDEX IF NOT EXISTS idx_bundle_apps_bundle_id ON bundle_apps(bundle_id);
CREATE INDEX IF NOT EXISTS idx_user_app_subscriptions_user_id ON user_app_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_app_subscriptions_business_id ON user_app_subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_user_app_subscriptions_status ON user_app_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_app_subscriptions_app_id ON user_app_subscriptions(app_id);
CREATE INDEX IF NOT EXISTS idx_user_app_subscriptions_bundle_id ON user_app_subscriptions(bundle_id);
CREATE INDEX IF NOT EXISTS idx_user_app_subscription_invoices_subscription_id ON user_app_subscription_invoices(subscription_id);

-- ============================================================================
-- SEED DATA: Apps
-- ============================================================================
INSERT INTO apps (slug, name, description, icon, category, sort_order) VALUES
    ('pos', 'Point of Sale', 'Complete POS system with inventory, sales tracking, and staff management', 'shopping-cart', 'sales', 1),
    ('invoicing', 'Invoicing', 'Create and send professional invoices to customers', 'file-text', 'payments', 2),
    ('events', 'Events & Tickets', 'Manage events, sell tickets, and track attendance', 'calendar', 'marketing', 3),
    ('driver_wallet', 'Driver Wallet', 'Collect payments from drivers and agents in the field', 'truck', 'logistics', 4),
    ('payment_links', 'Payment Links', 'Create shareable payment links for quick collections', 'link', 'payments', 5),
    ('subscriptions', 'Subscriptions', 'Create recurring subscription plans for customers', 'repeat', 'payments', 6),
    ('inventory', 'Inventory Management', 'Track stock levels, set alerts, and manage suppliers', 'package', 'sales', 7),
    ('reports', 'Advanced Reports', 'Detailed analytics and business intelligence reports', 'bar-chart', 'sales', 8),
    ('loyalty', 'Loyalty Program', 'Customer loyalty points and rewards program', 'gift', 'marketing', 9),
    ('multi_location', 'Multi-Location', 'Manage multiple business locations from one dashboard', 'map-pin', 'sales', 10)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SEED DATA: App Pricing
-- ============================================================================
-- POS
INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days) VALUES
    ((SELECT id FROM apps WHERE slug = 'pos'), 'starter', 25, 250, 7),
    ((SELECT id FROM apps WHERE slug = 'pos'), 'pro', 60, 600, 7)
ON CONFLICT (app_id, tier) DO NOTHING;

-- Invoicing
INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days) VALUES
    ((SELECT id FROM apps WHERE slug = 'invoicing'), 'starter', 15, 150, 7),
    ((SELECT id FROM apps WHERE slug = 'invoicing'), 'pro', 40, 400, 7)
ON CONFLICT (app_id, tier) DO NOTHING;

-- Events
INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days) VALUES
    ((SELECT id FROM apps WHERE slug = 'events'), 'starter', 20, 200, 7),
    ((SELECT id FROM apps WHERE slug = 'events'), 'pro', 50, 500, 7)
ON CONFLICT (app_id, tier) DO NOTHING;

-- Driver Wallet
INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days) VALUES
    ((SELECT id FROM apps WHERE slug = 'driver_wallet'), 'starter', 20, 200, 7),
    ((SELECT id FROM apps WHERE slug = 'driver_wallet'), 'pro', 50, 500, 7)
ON CONFLICT (app_id, tier) DO NOTHING;

-- Payment Links
INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days) VALUES
    ((SELECT id FROM apps WHERE slug = 'payment_links'), 'starter', 10, 100, 7),
    ((SELECT id FROM apps WHERE slug = 'payment_links'), 'pro', 30, 300, 7)
ON CONFLICT (app_id, tier) DO NOTHING;

-- Subscriptions
INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days) VALUES
    ((SELECT id FROM apps WHERE slug = 'subscriptions'), 'starter', 15, 150, 7),
    ((SELECT id FROM apps WHERE slug = 'subscriptions'), 'pro', 40, 400, 7)
ON CONFLICT (app_id, tier) DO NOTHING;

-- Inventory
INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days) VALUES
    ((SELECT id FROM apps WHERE slug = 'inventory'), 'starter', 15, 150, 7),
    ((SELECT id FROM apps WHERE slug = 'inventory'), 'pro', 35, 350, 7)
ON CONFLICT (app_id, tier) DO NOTHING;

-- Reports
INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days) VALUES
    ((SELECT id FROM apps WHERE slug = 'reports'), 'starter', 20, 200, 7),
    ((SELECT id FROM apps WHERE slug = 'reports'), 'pro', 45, 450, 7)
ON CONFLICT (app_id, tier) DO NOTHING;

-- Loyalty
INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days) VALUES
    ((SELECT id FROM apps WHERE slug = 'loyalty'), 'starter', 15, 150, 7),
    ((SELECT id FROM apps WHERE slug = 'loyalty'), 'pro', 40, 400, 7)
ON CONFLICT (app_id, tier) DO NOTHING;

-- Multi-Location
INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days) VALUES
    ((SELECT id FROM apps WHERE slug = 'multi_location'), 'starter', 30, 300, 7),
    ((SELECT id FROM apps WHERE slug = 'multi_location'), 'pro', 80, 800, 7)
ON CONFLICT (app_id, tier) DO NOTHING;

-- ============================================================================
-- SEED DATA: App Feature Limits
-- ============================================================================
-- POS Limits
INSERT INTO app_feature_limits (app_id, tier, limit_key, limit_value, description) VALUES
    ((SELECT id FROM apps WHERE slug = 'pos'), 'starter', 'max_products', 15, 'Maximum number of products'),
    ((SELECT id FROM apps WHERE slug = 'pos'), 'starter', 'max_staff', 1, 'Additional staff members'),
    ((SELECT id FROM apps WHERE slug = 'pos'), 'starter', 'max_categories', 3, 'Product categories'),
    ((SELECT id FROM apps WHERE slug = 'pos'), 'pro', 'max_products', -1, 'Unlimited products'),
    ((SELECT id FROM apps WHERE slug = 'pos'), 'pro', 'max_staff', -1, 'Unlimited staff'),
    ((SELECT id FROM apps WHERE slug = 'pos'), 'pro', 'max_categories', -1, 'Unlimited categories')
ON CONFLICT (app_id, tier, limit_key) DO NOTHING;

-- Driver Wallet Limits
INSERT INTO app_feature_limits (app_id, tier, limit_key, limit_value, description) VALUES
    ((SELECT id FROM apps WHERE slug = 'driver_wallet'), 'starter', 'max_collections_per_day', 25, 'Collections per day'),
    ((SELECT id FROM apps WHERE slug = 'driver_wallet'), 'starter', 'max_drivers', 3, 'Number of drivers'),
    ((SELECT id FROM apps WHERE slug = 'driver_wallet'), 'pro', 'max_collections_per_day', -1, 'Unlimited collections'),
    ((SELECT id FROM apps WHERE slug = 'driver_wallet'), 'pro', 'max_drivers', -1, 'Unlimited drivers')
ON CONFLICT (app_id, tier, limit_key) DO NOTHING;

-- Events Limits
INSERT INTO app_feature_limits (app_id, tier, limit_key, limit_value, description) VALUES
    ((SELECT id FROM apps WHERE slug = 'events'), 'starter', 'max_events', 5, 'Active events'),
    ((SELECT id FROM apps WHERE slug = 'events'), 'starter', 'max_staff', 0, 'Event staff (checkers)'),
    ((SELECT id FROM apps WHERE slug = 'events'), 'starter', 'max_ticket_types', 2, 'Ticket types per event'),
    ((SELECT id FROM apps WHERE slug = 'events'), 'pro', 'max_events', -1, 'Unlimited events'),
    ((SELECT id FROM apps WHERE slug = 'events'), 'pro', 'max_staff', -1, 'Unlimited staff'),
    ((SELECT id FROM apps WHERE slug = 'events'), 'pro', 'max_ticket_types', -1, 'Unlimited ticket types')
ON CONFLICT (app_id, tier, limit_key) DO NOTHING;

-- Invoicing Limits
INSERT INTO app_feature_limits (app_id, tier, limit_key, limit_value, description) VALUES
    ((SELECT id FROM apps WHERE slug = 'invoicing'), 'starter', 'max_invoices_per_month', 20, 'Invoices per month'),
    ((SELECT id FROM apps WHERE slug = 'invoicing'), 'starter', 'max_recurring', 0, 'Recurring invoices'),
    ((SELECT id FROM apps WHERE slug = 'invoicing'), 'pro', 'max_invoices_per_month', -1, 'Unlimited invoices'),
    ((SELECT id FROM apps WHERE slug = 'invoicing'), 'pro', 'max_recurring', -1, 'Unlimited recurring')
ON CONFLICT (app_id, tier, limit_key) DO NOTHING;

-- Payment Links Limits
INSERT INTO app_feature_limits (app_id, tier, limit_key, limit_value, description) VALUES
    ((SELECT id FROM apps WHERE slug = 'payment_links'), 'starter', 'max_active_links', 10, 'Active payment links'),
    ((SELECT id FROM apps WHERE slug = 'payment_links'), 'pro', 'max_active_links', -1, 'Unlimited links')
ON CONFLICT (app_id, tier, limit_key) DO NOTHING;

-- Multi-Location Limits
INSERT INTO app_feature_limits (app_id, tier, limit_key, limit_value, description) VALUES
    ((SELECT id FROM apps WHERE slug = 'multi_location'), 'starter', 'max_locations', 2, 'Business locations'),
    ((SELECT id FROM apps WHERE slug = 'multi_location'), 'pro', 'max_locations', -1, 'Unlimited locations')
ON CONFLICT (app_id, tier, limit_key) DO NOTHING;

-- ============================================================================
-- SEED DATA: Bundles
-- ============================================================================
INSERT INTO subscription_bundles (slug, name, description, bundle_type, max_apps, app_tier, price_monthly, price_yearly, discount_percentage, trial_days, sort_order) VALUES
    ('starter_bundle', 'Starter Bundle', 'Pick any 2 apps at a discounted rate', 'pick_n', 2, 'starter', 35, 350, 15, 7, 1),
    ('growth_bundle', 'Growth Bundle', 'Pick any 3 apps with Pro features', 'pick_n', 3, 'pro', 120, 1200, 20, 10, 2),
    ('business_bundle', 'Business Bundle', 'Pick any 5 apps with Pro features', 'pick_n', 5, 'pro', 180, 1800, 30, 10, 3),
    ('all_access', 'All Access', 'Unlimited access to all apps with Pro features', 'all_access', NULL, 'pro', 350, 3500, 40, 14, 4)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_feature_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_app_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_app_subscription_invoices ENABLE ROW LEVEL SECURITY;

-- Apps, pricing, bundles are public read
CREATE POLICY "apps_public_read" ON apps FOR SELECT USING (true);
CREATE POLICY "app_pricing_public_read" ON app_pricing FOR SELECT USING (true);
CREATE POLICY "app_feature_limits_public_read" ON app_feature_limits FOR SELECT USING (true);
CREATE POLICY "subscription_bundles_public_read" ON subscription_bundles FOR SELECT USING (true);
CREATE POLICY "bundle_apps_public_read" ON bundle_apps FOR SELECT USING (true);

-- User subscriptions - users can only see their own
CREATE POLICY "user_app_subscriptions_user_select" ON user_app_subscriptions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_app_subscriptions_user_insert" ON user_app_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_app_subscriptions_user_update" ON user_app_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- Invoices - users can only see their own
CREATE POLICY "user_app_subscription_invoices_user_select" ON user_app_subscription_invoices
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get user's active apps
CREATE OR REPLACE FUNCTION get_user_active_apps(p_user_id UUID)
RETURNS TABLE (
    app_slug VARCHAR,
    app_name VARCHAR,
    tier VARCHAR,
    subscription_type VARCHAR,
    status VARCHAR,
    expires_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    WITH user_subs AS (
        SELECT
            uas.id,
            uas.subscription_type,
            uas.app_id,
            uas.app_tier,
            uas.bundle_id,
            uas.selected_apps,
            uas.status,
            COALESCE(uas.current_period_end, uas.trial_ends_at) as expires_at
        FROM user_app_subscriptions uas
        WHERE uas.user_id = p_user_id
        AND uas.status IN ('trialing', 'active')
    )
    -- Individual app subscriptions
    SELECT
        a.slug,
        a.name,
        us.app_tier,
        us.subscription_type,
        us.status,
        us.expires_at
    FROM user_subs us
    JOIN apps a ON a.id = us.app_id
    WHERE us.subscription_type = 'app'

    UNION ALL

    -- Bundle subscriptions (all_access)
    SELECT
        a.slug,
        a.name,
        sb.app_tier,
        us.subscription_type,
        us.status,
        us.expires_at
    FROM user_subs us
    JOIN subscription_bundles sb ON sb.id = us.bundle_id
    JOIN apps a ON a.is_active = true
    WHERE us.subscription_type = 'bundle'
    AND sb.bundle_type = 'all_access'

    UNION ALL

    -- Bundle subscriptions (pick_n with selected apps)
    SELECT
        a.slug,
        a.name,
        sb.app_tier,
        us.subscription_type,
        us.status,
        us.expires_at
    FROM user_subs us
    JOIN subscription_bundles sb ON sb.id = us.bundle_id
    JOIN apps a ON a.id = ANY(us.selected_apps)
    WHERE us.subscription_type = 'bundle'
    AND sb.bundle_type = 'pick_n'

    UNION ALL

    -- Bundle subscriptions (fixed bundles)
    SELECT
        a.slug,
        a.name,
        sb.app_tier,
        us.subscription_type,
        us.status,
        us.expires_at
    FROM user_subs us
    JOIN subscription_bundles sb ON sb.id = us.bundle_id
    JOIN bundle_apps ba ON ba.bundle_id = sb.id
    JOIN apps a ON a.id = ba.app_id
    WHERE us.subscription_type = 'bundle'
    AND sb.bundle_type = 'fixed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has access to an app
CREATE OR REPLACE FUNCTION user_has_app_access(p_user_id UUID, p_app_slug VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM get_user_active_apps(p_user_id) WHERE app_slug = p_app_slug
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's app tier for a specific app
CREATE OR REPLACE FUNCTION get_user_app_tier(p_user_id UUID, p_app_slug VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    v_tier VARCHAR;
BEGIN
    SELECT tier INTO v_tier
    FROM get_user_active_apps(p_user_id)
    WHERE app_slug = p_app_slug
    LIMIT 1;

    RETURN COALESCE(v_tier, 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check app limit
CREATE OR REPLACE FUNCTION check_app_limit(
    p_user_id UUID,
    p_app_slug VARCHAR,
    p_limit_key VARCHAR,
    p_current_count INTEGER
)
RETURNS TABLE (
    allowed BOOLEAN,
    limit_value INTEGER,
    tier VARCHAR
) AS $$
DECLARE
    v_tier VARCHAR;
    v_app_id UUID;
    v_limit INTEGER;
BEGIN
    -- Get user's tier for this app
    v_tier := get_user_app_tier(p_user_id, p_app_slug);

    IF v_tier = 'none' THEN
        RETURN QUERY SELECT false, 0, 'none'::VARCHAR;
        RETURN;
    END IF;

    -- Get app ID
    SELECT id INTO v_app_id FROM apps WHERE slug = p_app_slug;

    -- Get limit
    SELECT afl.limit_value INTO v_limit
    FROM app_feature_limits afl
    WHERE afl.app_id = v_app_id
    AND afl.tier = v_tier
    AND afl.limit_key = p_limit_key;

    -- -1 means unlimited
    IF v_limit = -1 THEN
        RETURN QUERY SELECT true, -1, v_tier;
    ELSIF v_limit IS NULL THEN
        -- No limit defined, allow
        RETURN QUERY SELECT true, -1, v_tier;
    ELSE
        RETURN QUERY SELECT (p_current_count < v_limit), v_limit, v_tier;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_apps_updated_at
    BEFORE UPDATE ON apps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_pricing_updated_at
    BEFORE UPDATE ON app_pricing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_bundles_updated_at
    BEFORE UPDATE ON subscription_bundles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_app_subscriptions_updated_at
    BEFORE UPDATE ON user_app_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_app_subscription_invoices_updated_at
    BEFORE UPDATE ON user_app_subscription_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
