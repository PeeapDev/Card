-- Migration: 086_merchant_app_settings.sql
-- Description: Create table for persisting merchant app settings (enabled/disabled apps)
-- This replaces localStorage-based app state management

-- Create merchant_app_settings table
CREATE TABLE IF NOT EXISTS merchant_app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    app_id VARCHAR(50) NOT NULL,
    enabled BOOLEAN DEFAULT FALSE,
    setup_completed BOOLEAN DEFAULT FALSE,
    wallet_id UUID REFERENCES wallets(id),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Each merchant can only have one setting per app
    UNIQUE(merchant_id, app_id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_merchant_app_settings_merchant_id ON merchant_app_settings(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_app_settings_app_id ON merchant_app_settings(app_id);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_merchant_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_merchant_app_settings_updated_at ON merchant_app_settings;
CREATE TRIGGER trigger_merchant_app_settings_updated_at
    BEFORE UPDATE ON merchant_app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_merchant_app_settings_updated_at();

-- RLS policies
ALTER TABLE merchant_app_settings ENABLE ROW LEVEL SECURITY;

-- Users can read and write their own app settings
DROP POLICY IF EXISTS merchant_app_settings_select ON merchant_app_settings;
CREATE POLICY merchant_app_settings_select ON merchant_app_settings
    FOR SELECT
    USING (merchant_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS merchant_app_settings_insert ON merchant_app_settings;
CREATE POLICY merchant_app_settings_insert ON merchant_app_settings
    FOR INSERT
    WITH CHECK (merchant_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS merchant_app_settings_update ON merchant_app_settings;
CREATE POLICY merchant_app_settings_update ON merchant_app_settings
    FOR UPDATE
    USING (merchant_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS merchant_app_settings_delete ON merchant_app_settings;
CREATE POLICY merchant_app_settings_delete ON merchant_app_settings
    FOR DELETE
    USING (merchant_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

-- Comment
COMMENT ON TABLE merchant_app_settings IS 'Stores enabled/disabled state for merchant apps like POS, Events, Driver Wallet, etc.';
