-- Migration: Add is_verified column to merchant_businesses and checkout_sessions
-- Description: Add verification status for businesses to display verified badge on public pages

-- Add is_verified column to merchant_businesses if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'merchant_businesses' AND column_name = 'is_verified') THEN
        ALTER TABLE merchant_businesses ADD COLUMN is_verified BOOLEAN DEFAULT false;
    END IF;

    -- Add verified_at timestamp for tracking when business was verified
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'merchant_businesses' AND column_name = 'verified_at') THEN
        ALTER TABLE merchant_businesses ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add verified_by to track who verified the business
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'merchant_businesses' AND column_name = 'verified_by') THEN
        ALTER TABLE merchant_businesses ADD COLUMN verified_by UUID REFERENCES users(id);
    END IF;
END $$;

-- Add merchant_is_verified column to checkout_sessions to store verification status at time of session creation
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'checkout_sessions' AND column_name = 'merchant_is_verified') THEN
        ALTER TABLE checkout_sessions ADD COLUMN merchant_is_verified BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Create index for verified businesses (commonly queried)
CREATE INDEX IF NOT EXISTS idx_merchant_businesses_is_verified ON merchant_businesses(is_verified) WHERE is_verified = true;

-- Comments
COMMENT ON COLUMN merchant_businesses.is_verified IS 'Whether the business has been verified by Peeap';
COMMENT ON COLUMN merchant_businesses.verified_at IS 'When the business was verified';
COMMENT ON COLUMN merchant_businesses.verified_by IS 'Admin user who verified the business';
COMMENT ON COLUMN checkout_sessions.merchant_is_verified IS 'Whether the merchant was verified at the time of checkout session creation';
