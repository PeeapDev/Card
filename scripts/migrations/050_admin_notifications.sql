-- Admin Notifications History Table
-- Stores history of push notifications sent by admins

CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_type VARCHAR(50) DEFAULT 'all', -- 'all', 'specific', 'single', 'user', 'merchant', 'driver', 'admin'
  target_ids UUID[] DEFAULT NULL, -- specific user IDs if target_type is 'specific' or 'single'
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  errors JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fetching history by sender
CREATE INDEX IF NOT EXISTS idx_admin_notifications_sender ON admin_notifications(sender_id);

-- Index for fetching history by date
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can view notification history
CREATE POLICY "Admins can view all notifications" ON admin_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- Service role can insert (from API)
CREATE POLICY "Service role can insert" ON admin_notifications
  FOR INSERT WITH CHECK (true);

-- Service role full access
CREATE POLICY "Service role full access" ON admin_notifications
  FOR ALL USING (auth.role() = 'service_role');

-- Comment on table
COMMENT ON TABLE admin_notifications IS 'History of push notifications sent by administrators';
