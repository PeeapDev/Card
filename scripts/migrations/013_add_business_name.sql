-- Migration: Add business_name column to users table
-- This column stores the business/company name for merchant users

-- Add business_name column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'business_name'
    ) THEN
        ALTER TABLE users ADD COLUMN business_name VARCHAR(255);
    END IF;
END $$;

-- Add an index on business_name for faster searches
CREATE INDEX IF NOT EXISTS idx_users_business_name ON users(business_name) WHERE business_name IS NOT NULL;

-- Comment on the column
COMMENT ON COLUMN users.business_name IS 'Business or company name for merchant accounts';
