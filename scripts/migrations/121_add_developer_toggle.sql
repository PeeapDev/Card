-- Add developer mode toggle to merchant_businesses
-- This allows merchants to enable/disable API access per business

-- Add the developer_mode_enabled column
ALTER TABLE merchant_businesses
ADD COLUMN IF NOT EXISTS developer_mode_enabled BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN merchant_businesses.developer_mode_enabled
IS 'When true, this business has access to API keys, webhooks, and developer features';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_merchant_businesses_developer_mode
ON merchant_businesses(developer_mode_enabled)
WHERE developer_mode_enabled = TRUE;
