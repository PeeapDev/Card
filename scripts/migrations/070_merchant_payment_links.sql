-- Migration: 070_merchant_payment_links.sql
-- Description: Create merchant payment links table for shareable payment URLs

-- Drop existing objects if they exist
DROP TABLE IF EXISTS merchant_payment_links CASCADE;

-- Create merchant_payment_links table
CREATE TABLE merchant_payment_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Owner info
    business_id UUID NOT NULL REFERENCES merchant_businesses(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Link details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    slug VARCHAR(100) NOT NULL,

    -- Amount (nullable for customer to enter)
    amount DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'SLE',
    allow_custom_amount BOOLEAN DEFAULT false,
    min_amount DECIMAL(15,2),
    max_amount DECIMAL(15,2),

    -- Redirect URLs
    success_url TEXT,
    cancel_url TEXT,

    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Analytics
    view_count INTEGER DEFAULT 0,
    payment_count INTEGER DEFAULT 0,
    total_collected DECIMAL(15,2) DEFAULT 0,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint on slug per business
CREATE UNIQUE INDEX idx_merchant_payment_links_business_slug ON merchant_payment_links(business_id, slug);

-- Indexes
CREATE INDEX idx_merchant_payment_links_business_id ON merchant_payment_links(business_id);
CREATE INDEX idx_merchant_payment_links_merchant_id ON merchant_payment_links(merchant_id);
CREATE INDEX idx_merchant_payment_links_status ON merchant_payment_links(status);
CREATE INDEX idx_merchant_payment_links_created_at ON merchant_payment_links(created_at DESC);

-- RLS
ALTER TABLE merchant_payment_links ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access on merchant_payment_links"
    ON merchant_payment_links FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Merchants can manage their own payment links
CREATE POLICY "Merchants manage own payment links"
    ON merchant_payment_links FOR ALL TO authenticated
    USING (merchant_id = auth.uid())
    WITH CHECK (merchant_id = auth.uid());

-- Public can view active payment links (for checkout)
CREATE POLICY "Public view active payment links"
    ON merchant_payment_links FOR SELECT TO anon
    USING (status = 'active' AND (expires_at IS NULL OR expires_at > NOW()));

-- Function to generate unique slug
CREATE OR REPLACE FUNCTION generate_payment_link_slug()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate slug if not provided
CREATE OR REPLACE FUNCTION set_payment_link_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := generate_payment_link_slug();
        -- Ensure uniqueness
        WHILE EXISTS (SELECT 1 FROM merchant_payment_links WHERE business_id = NEW.business_id AND slug = NEW.slug AND id != COALESCE(NEW.id, gen_random_uuid())) LOOP
            NEW.slug := generate_payment_link_slug();
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER merchant_payment_links_slug_trigger
    BEFORE INSERT ON merchant_payment_links
    FOR EACH ROW
    EXECUTE FUNCTION set_payment_link_slug();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_merchant_payment_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER merchant_payment_links_updated_at
    BEFORE UPDATE ON merchant_payment_links
    FOR EACH ROW
    EXECUTE FUNCTION update_merchant_payment_links_updated_at();

-- Comments
COMMENT ON TABLE merchant_payment_links IS 'Shareable payment links for merchants';
COMMENT ON COLUMN merchant_payment_links.slug IS 'Short URL-safe identifier for the payment link';
COMMENT ON COLUMN merchant_payment_links.allow_custom_amount IS 'If true, customer can enter their own amount';
