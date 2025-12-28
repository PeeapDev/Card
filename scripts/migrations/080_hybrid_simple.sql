-- HYBRID SUBSCRIPTION SYSTEM - SIMPLIFIED MIGRATION
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/akiecgwcxadcpqlvntmf/sql

-- 1. Create apps table
CREATE TABLE IF NOT EXISTS apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    category VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create app_pricing table
CREATE TABLE IF NOT EXISTS app_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('starter', 'pro')),
    price_monthly DECIMAL(10,2) NOT NULL,
    price_yearly DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'NLE',
    trial_days INTEGER DEFAULT 7,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(app_id, tier)
);

-- 3. Create app_feature_limits table
CREATE TABLE IF NOT EXISTS app_feature_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('starter', 'pro')),
    limit_key VARCHAR(50) NOT NULL,
    limit_value INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(app_id, tier, limit_key)
);

-- 4. Create subscription_bundles table
CREATE TABLE IF NOT EXISTS subscription_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    bundle_type VARCHAR(20) NOT NULL CHECK (bundle_type IN ('fixed', 'pick_n', 'all_access')),
    max_apps INTEGER,
    app_tier VARCHAR(20) DEFAULT 'starter' CHECK (app_tier IN ('starter', 'pro')),
    price_monthly DECIMAL(10,2) NOT NULL,
    price_yearly DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'NLE',
    trial_days INTEGER DEFAULT 7,
    discount_percentage INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create bundle_apps table
CREATE TABLE IF NOT EXISTS bundle_apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id UUID NOT NULL REFERENCES subscription_bundles(id) ON DELETE CASCADE,
    app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bundle_id, app_id)
);

-- 6. Create user_app_subscriptions table
CREATE TABLE IF NOT EXISTS user_app_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    business_id UUID,
    subscription_type VARCHAR(20) NOT NULL CHECK (subscription_type IN ('app', 'bundle')),
    app_id UUID REFERENCES apps(id) ON DELETE SET NULL,
    app_tier VARCHAR(20) CHECK (app_tier IN ('starter', 'pro')),
    bundle_id UUID REFERENCES subscription_bundles(id) ON DELETE SET NULL,
    selected_apps UUID[],
    price_monthly DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'NLE',
    status VARCHAR(20) NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled', 'expired')),
    trial_started_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    next_billing_date DATE,
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    cancel_at_period_end BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create user_app_subscription_invoices table
CREATE TABLE IF NOT EXISTS user_app_subscription_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES user_app_subscriptions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    invoice_number VARCHAR(50),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'NLE',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_app_pricing_app_id ON app_pricing(app_id);
CREATE INDEX IF NOT EXISTS idx_app_feature_limits_app_id ON app_feature_limits(app_id);
CREATE INDEX IF NOT EXISTS idx_bundle_apps_bundle_id ON bundle_apps(bundle_id);
CREATE INDEX IF NOT EXISTS idx_user_app_subscriptions_user_id ON user_app_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_app_subscriptions_status ON user_app_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_app_subscription_invoices_subscription_id ON user_app_subscription_invoices(subscription_id);

-- Enable RLS
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_feature_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_app_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_app_subscription_invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies - public read for catalog tables
DROP POLICY IF EXISTS "apps_public_read" ON apps;
CREATE POLICY "apps_public_read" ON apps FOR SELECT USING (true);

DROP POLICY IF EXISTS "app_pricing_public_read" ON app_pricing;
CREATE POLICY "app_pricing_public_read" ON app_pricing FOR SELECT USING (true);

DROP POLICY IF EXISTS "app_feature_limits_public_read" ON app_feature_limits;
CREATE POLICY "app_feature_limits_public_read" ON app_feature_limits FOR SELECT USING (true);

DROP POLICY IF EXISTS "subscription_bundles_public_read" ON subscription_bundles;
CREATE POLICY "subscription_bundles_public_read" ON subscription_bundles FOR SELECT USING (true);

DROP POLICY IF EXISTS "bundle_apps_public_read" ON bundle_apps;
CREATE POLICY "bundle_apps_public_read" ON bundle_apps FOR SELECT USING (true);

-- RLS Policies - user subscriptions (users can only see their own)
DROP POLICY IF EXISTS "user_app_subscriptions_user_select" ON user_app_subscriptions;
CREATE POLICY "user_app_subscriptions_user_select" ON user_app_subscriptions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_app_subscriptions_user_insert" ON user_app_subscriptions;
CREATE POLICY "user_app_subscriptions_user_insert" ON user_app_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_app_subscriptions_user_update" ON user_app_subscriptions;
CREATE POLICY "user_app_subscriptions_user_update" ON user_app_subscriptions FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_app_subscription_invoices_user_select" ON user_app_subscription_invoices;
CREATE POLICY "user_app_subscription_invoices_user_select" ON user_app_subscription_invoices FOR SELECT USING (auth.uid() = user_id);

-- Seed apps
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

-- Seed app pricing
INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days)
SELECT id, 'starter', 25, 250, 7 FROM apps WHERE slug = 'pos' ON CONFLICT DO NOTHING;
INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days)
SELECT id, 'pro', 60, 600, 7 FROM apps WHERE slug = 'pos' ON CONFLICT DO NOTHING;

INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days)
SELECT id, 'starter', 15, 150, 7 FROM apps WHERE slug = 'invoicing' ON CONFLICT DO NOTHING;
INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days)
SELECT id, 'pro', 40, 400, 7 FROM apps WHERE slug = 'invoicing' ON CONFLICT DO NOTHING;

INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days)
SELECT id, 'starter', 20, 200, 7 FROM apps WHERE slug = 'events' ON CONFLICT DO NOTHING;
INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days)
SELECT id, 'pro', 50, 500, 7 FROM apps WHERE slug = 'events' ON CONFLICT DO NOTHING;

INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days)
SELECT id, 'starter', 20, 200, 7 FROM apps WHERE slug = 'driver_wallet' ON CONFLICT DO NOTHING;
INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days)
SELECT id, 'pro', 50, 500, 7 FROM apps WHERE slug = 'driver_wallet' ON CONFLICT DO NOTHING;

INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days)
SELECT id, 'starter', 10, 100, 7 FROM apps WHERE slug = 'payment_links' ON CONFLICT DO NOTHING;
INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days)
SELECT id, 'pro', 30, 300, 7 FROM apps WHERE slug = 'payment_links' ON CONFLICT DO NOTHING;

INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days)
SELECT id, 'starter', 15, 150, 7 FROM apps WHERE slug = 'subscriptions' ON CONFLICT DO NOTHING;
INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days)
SELECT id, 'pro', 40, 400, 7 FROM apps WHERE slug = 'subscriptions' ON CONFLICT DO NOTHING;

INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days)
SELECT id, 'starter', 15, 150, 7 FROM apps WHERE slug = 'inventory' ON CONFLICT DO NOTHING;
INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days)
SELECT id, 'pro', 35, 350, 7 FROM apps WHERE slug = 'inventory' ON CONFLICT DO NOTHING;

INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days)
SELECT id, 'starter', 20, 200, 7 FROM apps WHERE slug = 'reports' ON CONFLICT DO NOTHING;
INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days)
SELECT id, 'pro', 45, 450, 7 FROM apps WHERE slug = 'reports' ON CONFLICT DO NOTHING;

INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days)
SELECT id, 'starter', 15, 150, 7 FROM apps WHERE slug = 'loyalty' ON CONFLICT DO NOTHING;
INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days)
SELECT id, 'pro', 40, 400, 7 FROM apps WHERE slug = 'loyalty' ON CONFLICT DO NOTHING;

INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days)
SELECT id, 'starter', 30, 300, 7 FROM apps WHERE slug = 'multi_location' ON CONFLICT DO NOTHING;
INSERT INTO app_pricing (app_id, tier, price_monthly, price_yearly, trial_days)
SELECT id, 'pro', 80, 800, 7 FROM apps WHERE slug = 'multi_location' ON CONFLICT DO NOTHING;

-- Seed bundles
INSERT INTO subscription_bundles (slug, name, description, bundle_type, max_apps, app_tier, price_monthly, price_yearly, discount_percentage, trial_days, sort_order) VALUES
    ('starter_bundle', 'Starter Bundle', 'Pick any 2 apps at a discounted rate', 'pick_n', 2, 'starter', 35, 350, 15, 7, 1),
    ('growth_bundle', 'Growth Bundle', 'Pick any 3 apps with Pro features', 'pick_n', 3, 'pro', 120, 1200, 20, 10, 2),
    ('business_bundle', 'Business Bundle', 'Pick any 5 apps with Pro features', 'pick_n', 5, 'pro', 180, 1800, 30, 10, 3),
    ('all_access', 'All Access', 'Unlimited access to all apps with Pro features', 'all_access', NULL, 'pro', 350, 3500, 40, 14, 4)
ON CONFLICT (slug) DO NOTHING;

-- Done!
SELECT 'Migration complete!' as status;
SELECT COUNT(*) as apps_count FROM apps;
SELECT COUNT(*) as pricing_count FROM app_pricing;
SELECT COUNT(*) as bundles_count FROM subscription_bundles;
