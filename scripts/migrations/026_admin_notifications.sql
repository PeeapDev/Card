-- Migration: Create admin_notifications table for superadmin dashboard
-- This table stores notifications for admin users (card orders, kyc requests, etc.)

-- Create admin_notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL, -- 'card_order', 'kyc_request', 'dispute', 'system', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    status VARCHAR(20) NOT NULL DEFAULT 'unread', -- 'unread', 'read', 'archived'
    related_entity_type VARCHAR(50), -- 'card_order', 'user', 'transaction', etc.
    related_entity_id UUID, -- ID of the related entity
    metadata JSONB, -- Additional data (user info, order details, etc.)
    action_url VARCHAR(500), -- Link to the relevant admin page
    read_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Admin who read it
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_status ON admin_notifications(status);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_priority ON admin_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_related ON admin_notifications(related_entity_type, related_entity_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_admin_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS admin_notifications_updated_at ON admin_notifications;
CREATE TRIGGER admin_notifications_updated_at
    BEFORE UPDATE ON admin_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_admin_notifications_updated_at();

-- Enable RLS
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Service role can do everything
CREATE POLICY "Service role full access on admin_notifications"
    ON admin_notifications
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Admins and superadmins can view all notifications
CREATE POLICY "Admins view all notifications"
    ON admin_notifications
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (users.roles LIKE '%admin%' OR users.roles LIKE '%superadmin%')
        )
    );

-- Admins can update (mark as read) notifications
CREATE POLICY "Admins update notifications"
    ON admin_notifications
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (users.roles LIKE '%admin%' OR users.roles LIKE '%superadmin%')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (users.roles LIKE '%admin%' OR users.roles LIKE '%superadmin%')
        )
    );

-- Create function to add admin notification
CREATE OR REPLACE FUNCTION create_admin_notification(
    p_type VARCHAR(50),
    p_title VARCHAR(255),
    p_message TEXT,
    p_priority VARCHAR(20) DEFAULT 'medium',
    p_related_entity_type VARCHAR(50) DEFAULT NULL,
    p_related_entity_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL,
    p_action_url VARCHAR(500) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO admin_notifications (
        type,
        title,
        message,
        priority,
        related_entity_type,
        related_entity_id,
        metadata,
        action_url
    ) VALUES (
        p_type,
        p_title,
        p_message,
        p_priority,
        p_related_entity_type,
        p_related_entity_id,
        p_metadata,
        p_action_url
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$;

-- Create trigger to auto-create notification when card order is placed
CREATE OR REPLACE FUNCTION notify_admin_on_card_order()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name TEXT;
    v_card_type_name TEXT;
BEGIN
    -- Get user name
    SELECT COALESCE(first_name || ' ' || last_name, email, 'Unknown User')
    INTO v_user_name
    FROM users WHERE id = NEW.user_id;

    -- Get card type name
    SELECT name INTO v_card_type_name
    FROM card_types WHERE id = NEW.card_type_id;

    -- Create admin notification
    PERFORM create_admin_notification(
        'card_order',
        'New Card Order',
        v_user_name || ' ordered a ' || COALESCE(v_card_type_name, 'card'),
        'high',
        'card_order',
        NEW.id,
        jsonb_build_object(
            'user_id', NEW.user_id,
            'user_name', v_user_name,
            'card_type_id', NEW.card_type_id,
            'card_type_name', v_card_type_name,
            'amount_paid', NEW.amount_paid,
            'currency', NEW.currency
        ),
        '/admin/card-orders'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS card_order_admin_notification ON card_orders;
CREATE TRIGGER card_order_admin_notification
    AFTER INSERT ON card_orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_admin_on_card_order();

-- Add comments
COMMENT ON TABLE admin_notifications IS 'Notifications for admin dashboard (card orders, kyc requests, etc.)';
COMMENT ON COLUMN admin_notifications.type IS 'Type of notification: card_order, kyc_request, dispute, system, etc.';
COMMENT ON COLUMN admin_notifications.priority IS 'Priority level: low, medium, high, urgent';
COMMENT ON COLUMN admin_notifications.status IS 'Notification status: unread, read, archived';
COMMENT ON COLUMN admin_notifications.metadata IS 'Additional context data as JSON';
