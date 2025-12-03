-- Migration: Merchant Businesses System
-- Description: Creates merchant_businesses table with API keys and approval workflow

-- Create merchant_businesses table
CREATE TABLE IF NOT EXISTS merchant_businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Business Info
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    description TEXT,
    logo_url VARCHAR(500),
    website_url VARCHAR(500),

    -- Business Category
    business_category_id UUID REFERENCES business_categories(id),

    -- Contact Info
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Sierra Leone',

    -- API Keys (auto-generated on creation)
    live_public_key VARCHAR(100) UNIQUE,
    live_secret_key VARCHAR(100) UNIQUE,
    test_public_key VARCHAR(100) UNIQUE,
    test_secret_key VARCHAR(100) UNIQUE,

    -- Mode & Approval
    is_live_mode BOOLEAN DEFAULT FALSE, -- Toggle between test/live
    approval_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, SUSPENDED
    approval_notes TEXT,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,

    -- Sandbox Restrictions
    sandbox_transaction_limit INTEGER DEFAULT 2, -- Max real transactions before approval
    sandbox_transactions_used INTEGER DEFAULT 0, -- Count of real transactions made

    -- Webhook Configuration
    webhook_url VARCHAR(500),
    webhook_secret VARCHAR(100),
    webhook_events TEXT[], -- Array of event types to receive

    -- Settings
    settlement_schedule VARCHAR(50) DEFAULT 'DAILY', -- INSTANT, DAILY, WEEKLY, MONTHLY
    auto_settlement BOOLEAN DEFAULT TRUE,

    -- Status
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, SUSPENDED

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_merchant_businesses_merchant_id ON merchant_businesses(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_businesses_approval_status ON merchant_businesses(approval_status);
CREATE INDEX IF NOT EXISTS idx_merchant_businesses_status ON merchant_businesses(status);
CREATE INDEX IF NOT EXISTS idx_merchant_businesses_live_public_key ON merchant_businesses(live_public_key);
CREATE INDEX IF NOT EXISTS idx_merchant_businesses_test_public_key ON merchant_businesses(test_public_key);
CREATE INDEX IF NOT EXISTS idx_merchant_businesses_slug ON merchant_businesses(slug);

-- Create function to generate API keys
CREATE OR REPLACE FUNCTION generate_api_key(prefix VARCHAR, length INTEGER DEFAULT 32)
RETURNS VARCHAR AS $$
DECLARE
    chars VARCHAR := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result VARCHAR := prefix || '_';
    i INTEGER;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate slug from name
CREATE OR REPLACE FUNCTION generate_business_slug(business_name VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    base_slug VARCHAR;
    final_slug VARCHAR;
    counter INTEGER := 0;
BEGIN
    -- Convert to lowercase and replace spaces with hyphens
    base_slug := lower(regexp_replace(business_name, '[^a-zA-Z0-9\s]', '', 'g'));
    base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
    base_slug := regexp_replace(base_slug, '-+', '-', 'g');
    base_slug := trim(both '-' from base_slug);

    -- Try base slug first
    final_slug := base_slug;

    -- If exists, add counter
    WHILE EXISTS (SELECT 1 FROM merchant_businesses WHERE slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;

    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate API keys and slug on insert
CREATE OR REPLACE FUNCTION auto_generate_business_keys()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate slug if not provided
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := generate_business_slug(NEW.name);
    END IF;

    -- Generate API keys if not provided
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
    IF NEW.webhook_secret IS NULL THEN
        NEW.webhook_secret := generate_api_key('whsec');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_business_keys
    BEFORE INSERT ON merchant_businesses
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_business_keys();

-- Create trigger to update updated_at
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

-- Create business_transactions table to track sandbox usage
CREATE TABLE IF NOT EXISTS business_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES merchant_businesses(id) ON DELETE CASCADE,
    transaction_id UUID, -- Reference to actual transaction if applicable
    amount DECIMAL(20, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'SLE',
    type VARCHAR(50) NOT NULL, -- PAYMENT, REFUND, etc.
    is_sandbox BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'PENDING',
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_transactions_business_id ON business_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_business_transactions_is_sandbox ON business_transactions(is_sandbox);

-- Enable RLS
ALTER TABLE merchant_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for merchant_businesses
CREATE POLICY "Merchants can view own businesses"
    ON merchant_businesses FOR SELECT
    USING (merchant_id = auth.uid() OR
           EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND roles LIKE '%admin%'));

CREATE POLICY "Merchants can insert own businesses"
    ON merchant_businesses FOR INSERT
    WITH CHECK (merchant_id = auth.uid());

CREATE POLICY "Merchants can update own businesses"
    ON merchant_businesses FOR UPDATE
    USING (merchant_id = auth.uid() OR
           EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND roles LIKE '%admin%'));

CREATE POLICY "Admins can delete businesses"
    ON merchant_businesses FOR DELETE
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND roles LIKE '%admin%'));

-- RLS Policies for business_transactions
CREATE POLICY "Users can view own business transactions"
    ON business_transactions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM merchant_businesses mb
        WHERE mb.id = business_id AND (
            mb.merchant_id = auth.uid() OR
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND roles LIKE '%admin%')
        )
    ));

CREATE POLICY "System can insert business transactions"
    ON business_transactions FOR INSERT
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON merchant_businesses TO authenticated;
GRANT ALL ON business_transactions TO authenticated;

-- Add comment
COMMENT ON TABLE merchant_businesses IS 'Merchant businesses/shops with their own API keys and approval workflow';
COMMENT ON TABLE business_transactions IS 'Track transactions per business for sandbox limits';
