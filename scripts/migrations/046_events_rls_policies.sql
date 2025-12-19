-- Add RLS policies for events table
-- This allows merchants to create and manage their own events

-- Enable RLS if not already enabled
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Merchants can view own events" ON events;
DROP POLICY IF EXISTS "Merchants can create events" ON events;
DROP POLICY IF EXISTS "Merchants can update own events" ON events;
DROP POLICY IF EXISTS "Merchants can delete own events" ON events;
DROP POLICY IF EXISTS "Users can view published events" ON events;

-- Merchants can view their own events
CREATE POLICY "Merchants can view own events"
ON events
FOR SELECT
USING (auth.uid() = merchant_id);

-- Merchants can create events
CREATE POLICY "Merchants can create events"
ON events
FOR INSERT
WITH CHECK (auth.uid() = merchant_id);

-- Merchants can update their own events
CREATE POLICY "Merchants can update own events"
ON events
FOR UPDATE
USING (auth.uid() = merchant_id);

-- Merchants can delete their own events (only drafts)
CREATE POLICY "Merchants can delete own events"
ON events
FOR DELETE
USING (auth.uid() = merchant_id AND status = 'draft');

-- Anyone can view published events (for discovery page)
CREATE POLICY "Users can view published events"
ON events
FOR SELECT
USING (status = 'published');

-- Enable RLS for event_ticket_types
ALTER TABLE event_ticket_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View ticket types for accessible events" ON event_ticket_types;
DROP POLICY IF EXISTS "Merchants can manage ticket types" ON event_ticket_types;

-- Anyone can view ticket types for events they can see
CREATE POLICY "View ticket types for accessible events"
ON event_ticket_types
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = event_ticket_types.event_id
    AND (events.merchant_id = auth.uid() OR events.status = 'published')
  )
);

-- Merchants can insert/update/delete their own event ticket types
CREATE POLICY "Merchants can manage ticket types"
ON event_ticket_types
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = event_ticket_types.event_id
    AND events.merchant_id = auth.uid()
  )
);

-- Enable RLS for event_tickets
ALTER TABLE event_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tickets" ON event_tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON event_tickets;
DROP POLICY IF EXISTS "Merchants can view event tickets" ON event_tickets;

-- Users can view their own tickets
CREATE POLICY "Users can view own tickets"
ON event_tickets
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create tickets (purchase)
CREATE POLICY "Users can create tickets"
ON event_tickets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Merchants can view tickets for their events
CREATE POLICY "Merchants can view event tickets"
ON event_tickets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = event_tickets.event_id
    AND events.merchant_id = auth.uid()
  )
);

-- Enable RLS for event_staff
ALTER TABLE event_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View staff for accessible events" ON event_staff;
DROP POLICY IF EXISTS "Merchants can manage staff" ON event_staff;
DROP POLICY IF EXISTS "Users can view own staff invitations" ON event_staff;
DROP POLICY IF EXISTS "Users can update own staff invitation" ON event_staff;

-- Merchants can view and manage staff for their events
CREATE POLICY "Merchants can manage staff"
ON event_staff
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = event_staff.event_id
    AND events.merchant_id = auth.uid()
  )
);

-- Users can view their own staff invitations
CREATE POLICY "Users can view own staff invitations"
ON event_staff
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own staff invitation (accept/decline)
CREATE POLICY "Users can update own staff invitation"
ON event_staff
FOR UPDATE
USING (auth.uid() = user_id);

-- Enable RLS for event_scans
ALTER TABLE event_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can create scans" ON event_scans;
DROP POLICY IF EXISTS "View scans for accessible events" ON event_scans;

-- Staff can create scans
CREATE POLICY "Staff can create scans"
ON event_scans
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM event_staff
    WHERE event_staff.event_id = event_scans.event_id
    AND event_staff.user_id = auth.uid()
    AND event_staff.invitation_status = 'accepted'
  )
  OR
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = event_scans.event_id
    AND events.merchant_id = auth.uid()
  )
);

-- Merchants and staff can view scans
CREATE POLICY "View scans for accessible events"
ON event_scans
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = event_scans.event_id
    AND events.merchant_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM event_staff
    WHERE event_staff.event_id = event_scans.event_id
    AND event_staff.user_id = auth.uid()
  )
);

COMMENT ON POLICY "Merchants can create events" ON events IS 'Allows authenticated merchants to create new events';
COMMENT ON POLICY "Users can view published events" ON events IS 'Allows anyone to view published events for discovery';
