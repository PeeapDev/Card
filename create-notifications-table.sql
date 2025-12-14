-- Notifications Table for Cross-Service Notifications
-- Run this in Supabase SQL Editor

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Notification type for categorization and handling
  type VARCHAR(50) NOT NULL,
  -- Types: 'staff_invitation', 'payment_received', 'payment_sent', 'kyc_update',
  --        'transaction_alert', 'system_announcement', 'promotion', etc.

  -- Display content
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,

  -- Optional icon (lucide icon name or URL)
  icon VARCHAR(100),

  -- Optional action URL - where to navigate when clicked
  action_url VARCHAR(500),

  -- Optional action data (JSON) - for custom handling
  action_data JSONB,

  -- Metadata about the notification source
  source_service VARCHAR(50), -- 'pos', 'wallet', 'kyc', 'payment', 'system'
  source_id VARCHAR(100), -- Reference ID in the source service

  -- State
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Priority: 'low', 'normal', 'high', 'urgent'
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',

  -- Expiry (optional) - after this date, notification can be auto-deleted
  expires_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_source ON notifications(source_service, source_id);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "anon_select_notifications" ON notifications;
DROP POLICY IF EXISTS "anon_insert_notifications" ON notifications;
DROP POLICY IF EXISTS "anon_update_notifications" ON notifications;
DROP POLICY IF EXISTS "anon_delete_notifications" ON notifications;

-- Create RLS policies for anon role (since app uses custom auth)
CREATE POLICY "anon_select_notifications" ON notifications
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_notifications" ON notifications
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update_notifications" ON notifications
  FOR UPDATE TO anon USING (true);

CREATE POLICY "anon_delete_notifications" ON notifications
  FOR DELETE TO anon USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS notifications_updated_at ON notifications;
CREATE TRIGGER notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- Create function to auto-set read_at when is_read becomes true
CREATE OR REPLACE FUNCTION set_notification_read_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_read = true AND OLD.is_read = false THEN
    NEW.read_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for read_at
DROP TRIGGER IF EXISTS notifications_read_at ON notifications;
CREATE TRIGGER notifications_read_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION set_notification_read_at();
