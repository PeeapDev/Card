-- POS Multivendor Settings Migration
-- Adds multivendor marketplace settings for merchants

-- Create multivendor settings table
CREATE TABLE IF NOT EXISTS pos_multivendor_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL UNIQUE,

    -- Multivendor toggle
    is_enabled BOOLEAN DEFAULT false,

    -- Subscription status
    subscription_status VARCHAR(20) DEFAULT 'none' CHECK (subscription_status IN ('none', 'trial', 'active', 'expired', 'cancelled')),
    subscription_plan VARCHAR(20) CHECK (subscription_plan IN ('monthly', 'yearly')),

    -- Trial tracking (7 days free)
    trial_started_at TIMESTAMP WITH TIME ZONE,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    has_used_trial BOOLEAN DEFAULT false,

    -- Subscription dates
    subscription_started_at TIMESTAMP WITH TIME ZONE,
    subscription_expires_at TIMESTAMP WITH TIME ZONE,

    -- Payment tracking
    last_payment_at TIMESTAMP WITH TIME ZONE,
    last_payment_amount DECIMAL(15,2),
    payment_reference VARCHAR(100),

    -- Statistics
    total_views INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_multivendor_merchant ON pos_multivendor_settings(merchant_id);
CREATE INDEX IF NOT EXISTS idx_multivendor_enabled ON pos_multivendor_settings(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_multivendor_status ON pos_multivendor_settings(subscription_status);

-- Enable RLS
ALTER TABLE pos_multivendor_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own multivendor settings"
    ON pos_multivendor_settings FOR SELECT
    USING (merchant_id = auth.uid());

CREATE POLICY "Users can insert their own multivendor settings"
    ON pos_multivendor_settings FOR INSERT
    WITH CHECK (merchant_id = auth.uid());

CREATE POLICY "Users can update their own multivendor settings"
    ON pos_multivendor_settings FOR UPDATE
    USING (merchant_id = auth.uid());

-- Public read access for enabled multivendor merchants (for product queries)
CREATE POLICY "Anyone can see enabled multivendor merchants"
    ON pos_multivendor_settings FOR SELECT
    USING (is_enabled = true AND subscription_status IN ('trial', 'active'));

-- Function to check if multivendor is active (trial or paid subscription)
CREATE OR REPLACE FUNCTION is_multivendor_active(p_merchant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_settings pos_multivendor_settings%ROWTYPE;
BEGIN
    SELECT * INTO v_settings
    FROM pos_multivendor_settings
    WHERE merchant_id = p_merchant_id;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    IF NOT v_settings.is_enabled THEN
        RETURN false;
    END IF;

    -- Check trial
    IF v_settings.subscription_status = 'trial' THEN
        RETURN v_settings.trial_ends_at > NOW();
    END IF;

    -- Check active subscription
    IF v_settings.subscription_status = 'active' THEN
        RETURN v_settings.subscription_expires_at > NOW();
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to start free trial
CREATE OR REPLACE FUNCTION start_multivendor_trial(p_merchant_id UUID)
RETURNS pos_multivendor_settings AS $$
DECLARE
    v_settings pos_multivendor_settings%ROWTYPE;
BEGIN
    -- Check if already has settings
    SELECT * INTO v_settings
    FROM pos_multivendor_settings
    WHERE merchant_id = p_merchant_id;

    IF FOUND AND v_settings.has_used_trial THEN
        RAISE EXCEPTION 'Free trial has already been used';
    END IF;

    -- Insert or update settings
    INSERT INTO pos_multivendor_settings (
        merchant_id,
        is_enabled,
        subscription_status,
        trial_started_at,
        trial_ends_at,
        has_used_trial
    ) VALUES (
        p_merchant_id,
        true,
        'trial',
        NOW(),
        NOW() + INTERVAL '7 days',
        true
    )
    ON CONFLICT (merchant_id) DO UPDATE SET
        is_enabled = true,
        subscription_status = 'trial',
        trial_started_at = NOW(),
        trial_ends_at = NOW() + INTERVAL '7 days',
        has_used_trial = true,
        updated_at = NOW()
    RETURNING * INTO v_settings;

    RETURN v_settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_multivendor_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_multivendor_settings_timestamp
    BEFORE UPDATE ON pos_multivendor_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_multivendor_settings_timestamp();

-- Add comment
COMMENT ON TABLE pos_multivendor_settings IS 'Stores multivendor marketplace settings for POS merchants including subscription status';
