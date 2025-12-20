-- Transfer Limits Configuration Table
-- Allows admin to set daily, monthly, and per-transaction limits for each user type

-- Drop and recreate to ensure correct schema
DROP TABLE IF EXISTS transfer_limits CASCADE;

CREATE TABLE transfer_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_type VARCHAR(50) NOT NULL UNIQUE,
    daily_limit DECIMAL(18, 2) NOT NULL DEFAULT 5000,
    monthly_limit DECIMAL(18, 2) NOT NULL DEFAULT 25000,
    per_transaction_limit DECIMAL(18, 2) NOT NULL DEFAULT 2500,
    min_amount DECIMAL(18, 2) NOT NULL DEFAULT 1,
    currency VARCHAR(3) NOT NULL DEFAULT 'SLE',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default limits for each user type (in New Leone / SLE)
INSERT INTO transfer_limits (user_type, daily_limit, monthly_limit, per_transaction_limit, min_amount, currency) VALUES
    ('standard', 5000, 25000, 2500, 1, 'SLE'),
    ('agent', 20000, 100000, 10000, 0.50, 'SLE'),
    ('merchant', 50000, 200000, 25000, 0.10, 'SLE'),
    ('agent_plus', 100000, 500000, 50000, 0.10, 'SLE'),
    ('admin', 1000000, 10000000, 500000, 0.01, 'SLE'),
    ('superadmin', 10000000, 100000000, 5000000, 0.01, 'SLE');

-- Enable RLS
ALTER TABLE transfer_limits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "transfer_limits_read_all" ON transfer_limits;
DROP POLICY IF EXISTS "transfer_limits_admin_all" ON transfer_limits;

-- Policy: Anyone can read transfer limits
CREATE POLICY "transfer_limits_read_all" ON transfer_limits
    FOR SELECT USING (true);

-- Policy: Only admins can modify transfer limits
CREATE POLICY "transfer_limits_admin_all" ON transfer_limits
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'superadmin')
        )
    );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_transfer_limits_user_type ON transfer_limits(user_type);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_transfer_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS transfer_limits_updated_at ON transfer_limits;
CREATE TRIGGER transfer_limits_updated_at
    BEFORE UPDATE ON transfer_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_transfer_limits_updated_at();

-- Grant permissions
GRANT SELECT ON transfer_limits TO authenticated;
GRANT ALL ON transfer_limits TO service_role;
