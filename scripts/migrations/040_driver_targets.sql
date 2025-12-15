-- Migration: Create driver_targets table for daily target tracking
-- This allows drivers to set and track daily earnings goals

-- Create driver_targets table
CREATE TABLE IF NOT EXISTS driver_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    daily_target DECIMAL(19, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_driver_targets_user_id ON driver_targets(user_id);

-- Enable RLS
ALTER TABLE driver_targets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own targets
CREATE POLICY "Users can view own targets"
    ON driver_targets FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own targets
CREATE POLICY "Users can insert own targets"
    ON driver_targets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own targets
CREATE POLICY "Users can update own targets"
    ON driver_targets FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own targets
CREATE POLICY "Users can delete own targets"
    ON driver_targets FOR DELETE
    USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE driver_targets IS 'Stores daily earnings targets for drivers';
COMMENT ON COLUMN driver_targets.daily_target IS 'Daily earnings goal in local currency';

-- Done
SELECT 'Created driver_targets table' as status;
