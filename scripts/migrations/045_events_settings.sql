-- Migration: Events Settings Table
-- Description: Create settings table for event management app

CREATE TABLE IF NOT EXISTS events_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(255),
    default_currency VARCHAR(3) DEFAULT 'SLE',
    allow_refunds BOOLEAN DEFAULT true,
    refund_deadline_hours INTEGER DEFAULT 24,
    max_tickets_per_order INTEGER DEFAULT 10,
    setup_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_events_settings_merchant ON events_settings(merchant_id);

-- Disable RLS (app manages authorization)
ALTER TABLE events_settings DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON events_settings TO authenticated;
GRANT ALL ON events_settings TO service_role;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
