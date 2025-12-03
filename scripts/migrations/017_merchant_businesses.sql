-- Migration: Create merchant_businesses table
-- This table allows merchants to create multiple businesses/shops with separate API keys

-- Function to generate random API keys
CREATE OR REPLACE FUNCTION generate_api_key(prefix TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN prefix || '_' || encode(gen_random_bytes(24), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to generate slug from name
CREATE OR REPLACE FUNCTION generate_slug(name TEXT)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Convert to lowercase, replace spaces with hyphens, remove special chars
    base_slug := lower(regexp_replace(name, '[^a-zA-Z0-9\s]', '', 'g'));
    base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
    base_slug := regexp_replace(base_slug, '-+', '-', 'g');
    base_slug := trim(both '-' from base_slug);

    -- Ensure unique slug
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM merchant_businesses WHERE slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;

    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Create merchant_businesses table
CREATE TABLE IF NOT EXISTS merchant_businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Basic Info
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    website_url TEXT,
    business_category_id UUID REFERENCES business_categories(id),

    -- Contact Info
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Sierra Leone',

    -- API Keys (generated automatically)
    live_public_key VARCHAR(100) NOT NULL DEFAULT generate_api_key('pk_live'),
    live_secret_key VARCHAR(100) NOT NULL DEFAULT generate_api_key('sk_live'),
    test_public_key VARCHAR(100) NOT NULL DEFAULT generate_api_key('pk_test'),
    test_secret_key VARCHAR(100) NOT NULL DEFAULT generate_api_key('sk_test'),

    -- Mode & Approval
    is_live_mode BOOLEAN DEFAULT false,
    approval_status VARCHAR(20) DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED')),
    approval_notes TEXT,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,

    -- Sandbox Restrictions (must complete X transactions before going live)
    sandbox_transaction_limit INTEGER DEFAULT 2,
    sandbox_transactions_used INTEGER DEFAULT 0,

    -- Webhook Configuration
    webhook_url TEXT,
    webhook_secret VARCHAR(100) DEFAULT generate_api_key('whsec'),
    webhook_events TEXT[], -- Array of event types to send

    -- Settlement Settings
    settlement_schedule VARCHAR(20) DEFAULT 'DAILY' CHECK (settlement_schedule IN ('INSTANT', 'DAILY', 'WEEKLY', 'MONTHLY')),
    auto_settlement BOOLEAN DEFAULT true,

    -- Status
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_merchant_businesses_merchant_id ON merchant_businesses(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_businesses_slug ON merchant_businesses(slug);
CREATE INDEX IF NOT EXISTS idx_merchant_businesses_status ON merchant_businesses(status);
CREATE INDEX IF NOT EXISTS idx_merchant_businesses_approval_status ON merchant_businesses(approval_status);
CREATE INDEX IF NOT EXISTS idx_merchant_businesses_live_public_key ON merchant_businesses(live_public_key);
CREATE INDEX IF NOT EXISTS idx_merchant_businesses_test_public_key ON merchant_businesses(test_public_key);

-- Trigger to auto-generate slug on insert
CREATE OR REPLACE FUNCTION set_business_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := generate_slug(NEW.name);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_business_slug
    BEFORE INSERT ON merchant_businesses
    FOR EACH ROW
    EXECUTE FUNCTION set_business_slug();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_merchant_business_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_merchant_business_timestamp
    BEFORE UPDATE ON merchant_businesses
    FOR EACH ROW
    EXECUTE FUNCTION update_merchant_business_timestamp();

-- Trigger to regenerate API keys when set to null
CREATE OR REPLACE FUNCTION regenerate_api_keys()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.live_public_key IS NULL THEN
        NEW.live_public_key := generate_api_key('pk_live');
    END IF;
    IF NEW.live_secret_key IS NULL THEN
        NEW.live_secret_key := generate_api_key('sk_live');
    END IF;
    IF NEW.test_public_key IS NULL THEN
        NEW.test_public_key := generate_api_key('pk_test');
    END IF;
    IF NEW.test_secret_key IS NULL THEN
        NEW.test_secret_key := generate_api_key('sk_test');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_regenerate_api_keys
    BEFORE UPDATE ON merchant_businesses
    FOR EACH ROW
    EXECUTE FUNCTION regenerate_api_keys();

-- RLS Policies
ALTER TABLE merchant_businesses ENABLE ROW LEVEL SECURITY;

-- Merchants can view their own businesses
CREATE POLICY "Merchants can view own businesses"
    ON merchant_businesses
    FOR SELECT
    USING (merchant_id = auth.uid() OR EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND roles LIKE '%admin%'
    ));

-- Merchants can create their own businesses
CREATE POLICY "Merchants can create own businesses"
    ON merchant_businesses
    FOR INSERT
    WITH CHECK (merchant_id = auth.uid());

-- Merchants can update their own businesses (limited fields)
CREATE POLICY "Merchants can update own businesses"
    ON merchant_businesses
    FOR UPDATE
    USING (merchant_id = auth.uid() OR EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND roles LIKE '%admin%'
    ));

-- Only admins can delete businesses
CREATE POLICY "Admins can delete businesses"
    ON merchant_businesses
    FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND roles LIKE '%admin%'
    ));

-- Comments
COMMENT ON TABLE merchant_businesses IS 'Merchant businesses/shops with separate API keys for payments integration';
COMMENT ON COLUMN merchant_businesses.sandbox_transaction_limit IS 'Number of test transactions required before business can go live';
COMMENT ON COLUMN merchant_businesses.sandbox_transactions_used IS 'Number of test transactions completed';
COMMENT ON COLUMN merchant_businesses.is_live_mode IS 'Whether the business is accepting live payments (vs test mode)';
