-- Add trial_days to tier_configurations
-- This allows admin to configure how many days of free trial merchants get

ALTER TABLE tier_configurations
ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 7;

-- Update existing tiers with default trial days
UPDATE tier_configurations SET trial_days = 0 WHERE tier = 'basic';  -- Basic is free, no trial needed
UPDATE tier_configurations SET trial_days = 7 WHERE tier = 'business';  -- 7-day trial for Business
UPDATE tier_configurations SET trial_days = 7 WHERE tier = 'business_plus';  -- 7-day trial for Business++

-- Also add to settings table for global override
INSERT INTO settings (id, key, value, description, category)
VALUES (
    gen_random_uuid(),
    'merchant_trial_days',
    '7',
    'Default number of trial days for new merchant subscriptions',
    'subscriptions'
)
ON CONFLICT (key) DO NOTHING;
