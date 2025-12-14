-- Add invitation status to pos_staff table
-- Run this in Supabase SQL Editor

-- Add invitation_status column
ALTER TABLE pos_staff
ADD COLUMN IF NOT EXISTS invitation_status VARCHAR(20) DEFAULT 'pending';

-- Add invited_at timestamp
ALTER TABLE pos_staff
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ DEFAULT NOW();

-- Add accepted_at timestamp
ALTER TABLE pos_staff
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- Add declined_at timestamp
ALTER TABLE pos_staff
ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_pos_staff_invitation_status ON pos_staff(invitation_status);
CREATE INDEX IF NOT EXISTS idx_pos_staff_user_id ON pos_staff(user_id);

-- Comment on the columns
COMMENT ON COLUMN pos_staff.invitation_status IS 'Status of staff invitation: pending, accepted, declined';
