-- Create scheduled_notifications table for event reminders and other scheduled notifications
-- This table stores notifications that should be sent at a specific future time

CREATE TABLE IF NOT EXISTS scheduled_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    reminder_type VARCHAR(50) NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    notification_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Unique constraint to prevent duplicate reminders
    CONSTRAINT unique_user_event_reminder UNIQUE (user_id, event_id, reminder_type)
);

-- Create index for efficient querying of pending notifications
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_pending
ON scheduled_notifications (scheduled_for, status)
WHERE status = 'pending';

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_user
ON scheduled_notifications (user_id);

-- Create index for event lookups
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_event
ON scheduled_notifications (event_id)
WHERE event_id IS NOT NULL;

-- Enable RLS
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own scheduled notifications" ON scheduled_notifications;
DROP POLICY IF EXISTS "Users can create own scheduled notifications" ON scheduled_notifications;
DROP POLICY IF EXISTS "Users can update own scheduled notifications" ON scheduled_notifications;
DROP POLICY IF EXISTS "Users can delete own scheduled notifications" ON scheduled_notifications;
DROP POLICY IF EXISTS "Service can manage all scheduled notifications" ON scheduled_notifications;

-- Users can view their own scheduled notifications
CREATE POLICY "Users can view own scheduled notifications"
ON scheduled_notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own scheduled notifications
CREATE POLICY "Users can create own scheduled notifications"
ON scheduled_notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own scheduled notifications
CREATE POLICY "Users can update own scheduled notifications"
ON scheduled_notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own scheduled notifications
CREATE POLICY "Users can delete own scheduled notifications"
ON scheduled_notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Service role can manage all notifications (for background job processing)
CREATE POLICY "Service can manage all scheduled notifications"
ON scheduled_notifications
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- Function to process scheduled notifications
-- This should be called by a cron job or edge function
CREATE OR REPLACE FUNCTION process_scheduled_notifications()
RETURNS INTEGER AS $$
DECLARE
    notification_count INTEGER := 0;
    rec RECORD;
BEGIN
    -- Get all pending notifications that are due
    FOR rec IN
        SELECT * FROM scheduled_notifications
        WHERE status = 'pending'
        AND scheduled_for <= now()
        ORDER BY scheduled_for ASC
        LIMIT 100
    LOOP
        BEGIN
            -- Insert into notifications table
            INSERT INTO notifications (
                user_id,
                type,
                title,
                message,
                icon,
                action_url,
                action_data,
                source_service,
                source_id,
                priority,
                is_read
            )
            SELECT
                rec.user_id,
                CASE
                    WHEN rec.reminder_type LIKE 'event_reminder%' THEN 'event_reminder'
                    ELSE 'system_announcement'
                END,
                CASE
                    WHEN rec.reminder_type LIKE 'event_reminder%' THEN 'Event Reminder'
                    ELSE 'Notification'
                END,
                CASE
                    WHEN rec.reminder_type LIKE 'event_reminder%' THEN
                        (rec.notification_data->>'eventTitle') || ' starts in ' ||
                        (rec.notification_data->>'hoursUntilEvent') || ' hour(s)'
                    ELSE rec.notification_data->>'message'
                END,
                'Calendar',
                '/events/' || (rec.notification_data->>'eventId'),
                rec.notification_data,
                'events',
                rec.notification_data->>'eventId',
                CASE
                    WHEN (rec.notification_data->>'hoursUntilEvent')::int <= 1 THEN 'high'
                    ELSE 'normal'
                END,
                false;

            -- Mark as sent
            UPDATE scheduled_notifications
            SET status = 'sent', sent_at = now(), updated_at = now()
            WHERE id = rec.id;

            notification_count := notification_count + 1;

        EXCEPTION WHEN OTHERS THEN
            -- Mark as failed with error message
            UPDATE scheduled_notifications
            SET status = 'failed', error_message = SQLERRM, updated_at = now()
            WHERE id = rec.id;
        END;
    END LOOP;

    RETURN notification_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION process_scheduled_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION process_scheduled_notifications() TO service_role;

COMMENT ON TABLE scheduled_notifications IS 'Stores notifications scheduled to be sent at a future time, such as event reminders';
COMMENT ON FUNCTION process_scheduled_notifications IS 'Processes pending scheduled notifications and inserts them into the notifications table. Should be called by a cron job every minute.';
