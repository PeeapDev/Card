-- Migration: Add risk_level column to business_categories
-- Purpose: Allow categorizing businesses by risk level for KYC requirements

-- Add risk_level column to business_categories table
ALTER TABLE business_categories
ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'low';

-- Add check constraint for valid values
ALTER TABLE business_categories
ADD CONSTRAINT check_risk_level CHECK (risk_level IN ('low', 'medium', 'high'));

-- Add comment explaining the column
COMMENT ON COLUMN business_categories.risk_level IS 'Risk level for KYC requirements: low (standard KYC), medium (enhanced verification), high (full due diligence)';

-- Set some default high-risk categories (can be adjusted by admin)
-- These are typical high-risk business categories
UPDATE business_categories
SET risk_level = 'high'
WHERE name ILIKE '%money%'
   OR name ILIKE '%exchange%'
   OR name ILIKE '%gambling%'
   OR name ILIKE '%casino%'
   OR name ILIKE '%crypto%'
   OR name ILIKE '%forex%';

-- Set medium risk for some categories
UPDATE business_categories
SET risk_level = 'medium'
WHERE name ILIKE '%financial%'
   OR name ILIKE '%insurance%'
   OR name ILIKE '%real estate%'
   OR name ILIKE '%jewelry%'
   OR name ILIKE '%precious%'
   OR name ILIKE '%luxury%';
