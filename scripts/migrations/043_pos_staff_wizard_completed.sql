-- Migration: Add wizard_completed column to pos_staff
-- Description: Track whether staff has completed the onboarding wizard in the database
--              instead of localStorage for persistence across devices/browsers

-- Add wizard_completed column to pos_staff table
ALTER TABLE pos_staff
ADD COLUMN IF NOT EXISTS wizard_completed BOOLEAN DEFAULT false;

-- Add index for faster lookups (optional, but useful for queries)
CREATE INDEX IF NOT EXISTS idx_pos_staff_wizard_completed ON pos_staff(wizard_completed);

-- Update existing accepted staff to have wizard_completed = true
-- (they likely already completed the wizard via localStorage)
UPDATE pos_staff
SET wizard_completed = true
WHERE invitation_status = 'accepted'
  AND wizard_completed IS NULL;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
