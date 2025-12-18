-- Migration: Event Management Tables
-- Description: Create tables for event management including events, ticket types, tickets, staff, and scans

-- ================== Events Table ==================
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(500),
    venue_name VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Sierra Leone',
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    timezone VARCHAR(50) DEFAULT 'Africa/Freetown',
    cover_image TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
    is_free BOOLEAN DEFAULT false,
    capacity INTEGER,
    tickets_sold INTEGER DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for events
CREATE INDEX IF NOT EXISTS idx_events_merchant ON events(merchant_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_end_date ON events(end_date);

-- ================== Event Ticket Types Table ==================
CREATE TABLE IF NOT EXISTS event_ticket_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(15,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'SLE',
    quantity_available INTEGER NOT NULL DEFAULT 0,
    quantity_sold INTEGER DEFAULT 0,
    max_per_order INTEGER DEFAULT 10,
    sale_start_date TIMESTAMP WITH TIME ZONE,
    sale_end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for ticket types
CREATE INDEX IF NOT EXISTS idx_event_ticket_types_event ON event_ticket_types(event_id);
CREATE INDEX IF NOT EXISTS idx_event_ticket_types_merchant ON event_ticket_types(merchant_id);
CREATE INDEX IF NOT EXISTS idx_event_ticket_types_active ON event_ticket_types(is_active);

-- ================== Event Staff Table ==================
-- (Created before event_tickets due to foreign key reference)
CREATE TABLE IF NOT EXISTS event_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitation_status VARCHAR(20) DEFAULT 'pending' CHECK (invitation_status IN ('pending', 'accepted', 'declined')),
    wizard_completed BOOLEAN DEFAULT false,
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    declined_at TIMESTAMP WITH TIME ZONE,
    scan_count INTEGER DEFAULT 0,
    last_scan_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Indexes for event staff
CREATE INDEX IF NOT EXISTS idx_event_staff_event ON event_staff(event_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_merchant ON event_staff(merchant_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_user ON event_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_status ON event_staff(invitation_status);

-- ================== Event Tickets Table ==================
CREATE TABLE IF NOT EXISTS event_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    ticket_type_id UUID NOT NULL REFERENCES event_ticket_types(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticket_number VARCHAR(50) NOT NULL UNIQUE,
    qr_code VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'cancelled', 'refunded')),
    purchaser_name VARCHAR(255),
    purchaser_email VARCHAR(255),
    purchaser_phone VARCHAR(50),
    attendee_name VARCHAR(255),
    price_paid DECIMAL(15,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'SLE',
    payment_reference VARCHAR(255),
    scanned_at TIMESTAMP WITH TIME ZONE,
    scanned_by UUID REFERENCES event_staff(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for tickets
CREATE INDEX IF NOT EXISTS idx_event_tickets_event ON event_tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_event_tickets_type ON event_tickets(ticket_type_id);
CREATE INDEX IF NOT EXISTS idx_event_tickets_user ON event_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_event_tickets_merchant ON event_tickets(merchant_id);
CREATE INDEX IF NOT EXISTS idx_event_tickets_qr_code ON event_tickets(qr_code);
CREATE INDEX IF NOT EXISTS idx_event_tickets_number ON event_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_event_tickets_status ON event_tickets(status);

-- ================== Event Scans Table ==================
CREATE TABLE IF NOT EXISTS event_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    ticket_id UUID REFERENCES event_tickets(id) ON DELETE SET NULL,
    staff_id UUID NOT NULL REFERENCES event_staff(id) ON DELETE CASCADE,
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scan_result VARCHAR(20) NOT NULL CHECK (scan_result IN ('valid', 'invalid', 'already_used', 'cancelled')),
    ticket_number VARCHAR(50),
    attendee_name VARCHAR(255),
    notes TEXT
);

-- Indexes for scans
CREATE INDEX IF NOT EXISTS idx_event_scans_event ON event_scans(event_id);
CREATE INDEX IF NOT EXISTS idx_event_scans_ticket ON event_scans(ticket_id);
CREATE INDEX IF NOT EXISTS idx_event_scans_staff ON event_scans(staff_id);
CREATE INDEX IF NOT EXISTS idx_event_scans_time ON event_scans(scanned_at);
CREATE INDEX IF NOT EXISTS idx_event_scans_result ON event_scans(scan_result);

-- ================== Helper Functions ==================

-- Function to increment ticket type quantity sold
CREATE OR REPLACE FUNCTION increment_ticket_type_sold(ticket_type_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE event_ticket_types
    SET quantity_sold = quantity_sold + 1,
        updated_at = NOW()
    WHERE id = ticket_type_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update event ticket stats
CREATE OR REPLACE FUNCTION update_event_ticket_stats(p_event_id UUID, p_price DECIMAL)
RETURNS void AS $$
BEGIN
    UPDATE events
    SET tickets_sold = tickets_sold + 1,
        total_revenue = total_revenue + p_price,
        updated_at = NOW()
    WHERE id = p_event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment staff scan count
CREATE OR REPLACE FUNCTION increment_event_staff_scan_count(staff_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE event_staff
    SET scan_count = scan_count + 1,
        last_scan_at = NOW(),
        updated_at = NOW()
    WHERE id = staff_id;
END;
$$ LANGUAGE plpgsql;

-- ================== Row Level Security ==================

-- Disable RLS for now (app manages authorization)
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_ticket_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_scans DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON events TO authenticated;
GRANT ALL ON event_ticket_types TO authenticated;
GRANT ALL ON event_tickets TO authenticated;
GRANT ALL ON event_staff TO authenticated;
GRANT ALL ON event_scans TO authenticated;

GRANT ALL ON events TO service_role;
GRANT ALL ON event_ticket_types TO service_role;
GRANT ALL ON event_tickets TO service_role;
GRANT ALL ON event_staff TO service_role;
GRANT ALL ON event_scans TO service_role;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
