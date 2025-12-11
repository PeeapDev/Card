-- Migration: Add admin RLS policy to checkout_sessions
-- Allows admins and superadmins to view all checkout sessions for analytics

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admins can view all checkout sessions" ON checkout_sessions;

-- Allow admins and superadmins to view all checkout sessions
CREATE POLICY "Admins can view all checkout sessions"
    ON checkout_sessions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND (u.roles LIKE '%superadmin%' OR u.roles LIKE '%admin%')
        )
    );

-- Also add payment_method column if it doesn't exist (for tracking payment type)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'checkout_sessions'
        AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE checkout_sessions ADD COLUMN payment_method VARCHAR(50);
    END IF;
END $$;

-- Add payment_reference column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'checkout_sessions'
        AND column_name = 'payment_reference'
    ) THEN
        ALTER TABLE checkout_sessions ADD COLUMN payment_reference VARCHAR(255);
    END IF;
END $$;

-- Add index for faster queries on status
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_status_completed ON checkout_sessions(status) WHERE status = 'COMPLETE';

-- Add index for completed_at for date range queries
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_completed_at ON checkout_sessions(completed_at) WHERE completed_at IS NOT NULL;

-- Comments
COMMENT ON POLICY "Admins can view all checkout sessions" ON checkout_sessions IS 'Allows admin users to view all checkout sessions for analytics dashboard';
