-- Migration: 3-Way Dispute Messaging System
-- Enables User <-> Merchant <-> Admin communication for dispute resolution

-- =============================================
-- DISPUTES TABLE (Main dispute records)
-- =============================================
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Transaction reference
  transaction_id UUID,
  payment_id UUID,

  -- Parties involved
  customer_id UUID REFERENCES profiles(id),
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  business_id UUID REFERENCES merchant_businesses(id),
  merchant_id UUID REFERENCES profiles(id),

  -- Dispute details
  reason VARCHAR(50) NOT NULL, -- 'duplicate', 'fraudulent', 'product_not_received', 'product_unacceptable', 'subscription_canceled', 'unrecognized', 'credit_not_processed', 'general', 'other'
  description TEXT,
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'SLE',

  -- Status workflow
  status VARCHAR(30) DEFAULT 'open', -- 'open', 'pending_merchant', 'pending_customer', 'under_review', 'evidence_required', 'resolved', 'won', 'lost', 'closed', 'escalated'
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'

  -- Resolution
  resolution VARCHAR(50), -- 'full_refund', 'partial_refund', 'favor_merchant', 'favor_customer', 'no_action', 'chargeback'
  resolution_amount DECIMAL(15,2),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,

  -- Merchant response
  merchant_response TEXT,
  merchant_responded_at TIMESTAMPTZ,

  -- Evidence
  customer_evidence JSONB DEFAULT '[]'::jsonb, -- [{url, type, name, uploaded_at}]
  merchant_evidence JSONB DEFAULT '[]'::jsonb,

  -- Deadlines
  due_date TIMESTAMPTZ,
  merchant_deadline TIMESTAMPTZ, -- Deadline for merchant to respond

  -- AI Analysis reference
  ai_analysis_id UUID,
  fraud_risk_score DECIMAL(5,2),

  -- Assigned admin
  assigned_to UUID REFERENCES profiles(id),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- DISPUTE MESSAGES TABLE (3-way conversation)
-- =============================================
CREATE TABLE IF NOT EXISTS dispute_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,

  -- Sender info
  sender_id UUID REFERENCES profiles(id),
  sender_type VARCHAR(20) NOT NULL, -- 'customer', 'merchant', 'admin', 'system', 'ai'
  sender_name VARCHAR(255),

  -- Message content
  content TEXT NOT NULL,
  message_type VARCHAR(30) DEFAULT 'message', -- 'message', 'evidence', 'status_change', 'resolution', 'ai_analysis', 'internal_note'

  -- Attachments
  attachments JSONB DEFAULT '[]'::jsonb, -- [{url, type, name, size}]

  -- Visibility control
  is_internal BOOLEAN DEFAULT false, -- Internal notes only visible to admins
  visible_to JSONB DEFAULT '["customer", "merchant", "admin"]'::jsonb, -- Who can see this message

  -- Read tracking
  read_by JSONB DEFAULT '{}'::jsonb, -- {user_id: timestamp}

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- DISPUTE EVENTS TABLE (Activity log)
-- =============================================
CREATE TABLE IF NOT EXISTS dispute_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,

  -- Event details
  event_type VARCHAR(50) NOT NULL, -- 'created', 'status_changed', 'message_sent', 'evidence_uploaded', 'assigned', 'escalated', 'resolved', 'ai_analyzed'
  actor_id UUID REFERENCES profiles(id),
  actor_type VARCHAR(20), -- 'customer', 'merchant', 'admin', 'system', 'ai'

  -- Event data
  description TEXT,
  old_value JSONB,
  new_value JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_disputes_customer ON disputes(customer_id);
CREATE INDEX IF NOT EXISTS idx_disputes_business ON disputes(business_id);
CREATE INDEX IF NOT EXISTS idx_disputes_merchant ON disputes(merchant_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_created ON disputes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_assigned ON disputes(assigned_to);
CREATE INDEX IF NOT EXISTS idx_disputes_transaction ON disputes(transaction_id);

CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute ON dispute_messages(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_sender ON dispute_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_created ON dispute_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_type ON dispute_messages(message_type);

CREATE INDEX IF NOT EXISTS idx_dispute_events_dispute ON dispute_events(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_events_created ON dispute_events(created_at DESC);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_events ENABLE ROW LEVEL SECURITY;

-- Disputes policies
DROP POLICY IF EXISTS disputes_select_policy ON disputes;
CREATE POLICY disputes_select_policy ON disputes FOR SELECT USING (
  -- Customers can see their own disputes
  customer_id = auth.uid()
  -- Merchants can see disputes against their businesses
  OR merchant_id = auth.uid()
  OR business_id IN (SELECT id FROM merchant_businesses WHERE merchant_id = auth.uid())
  -- Admins can see all
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin']))
);

DROP POLICY IF EXISTS disputes_insert_policy ON disputes;
CREATE POLICY disputes_insert_policy ON disputes FOR INSERT WITH CHECK (
  -- Customers can create disputes
  customer_id = auth.uid()
  -- Admins can create on behalf
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin']))
);

DROP POLICY IF EXISTS disputes_update_policy ON disputes;
CREATE POLICY disputes_update_policy ON disputes FOR UPDATE USING (
  -- Customers can update their own (limited fields handled by app)
  customer_id = auth.uid()
  -- Merchants can update (respond to) disputes against their businesses
  OR merchant_id = auth.uid()
  OR business_id IN (SELECT id FROM merchant_businesses WHERE merchant_id = auth.uid())
  -- Admins can update all
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin']))
);

-- Dispute messages policies
DROP POLICY IF EXISTS dispute_messages_select_policy ON dispute_messages;
CREATE POLICY dispute_messages_select_policy ON dispute_messages FOR SELECT USING (
  -- Can see messages if you're part of the dispute
  dispute_id IN (
    SELECT id FROM disputes WHERE
      customer_id = auth.uid()
      OR merchant_id = auth.uid()
      OR business_id IN (SELECT id FROM merchant_businesses WHERE merchant_id = auth.uid())
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin']))
  )
  -- And message is visible to your role (internal notes only for admins)
  AND (
    NOT is_internal
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin']))
  )
);

DROP POLICY IF EXISTS dispute_messages_insert_policy ON dispute_messages;
CREATE POLICY dispute_messages_insert_policy ON dispute_messages FOR INSERT WITH CHECK (
  -- Must be part of the dispute to send messages
  dispute_id IN (
    SELECT id FROM disputes WHERE
      customer_id = auth.uid()
      OR merchant_id = auth.uid()
      OR business_id IN (SELECT id FROM merchant_businesses WHERE merchant_id = auth.uid())
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin']))
  )
);

-- Dispute events policies (read-only for most, system writes)
DROP POLICY IF EXISTS dispute_events_select_policy ON dispute_events;
CREATE POLICY dispute_events_select_policy ON dispute_events FOR SELECT USING (
  dispute_id IN (
    SELECT id FROM disputes WHERE
      customer_id = auth.uid()
      OR merchant_id = auth.uid()
      OR business_id IN (SELECT id FROM merchant_businesses WHERE merchant_id = auth.uid())
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin']))
  )
);

DROP POLICY IF EXISTS dispute_events_insert_policy ON dispute_events;
CREATE POLICY dispute_events_insert_policy ON dispute_events FOR INSERT WITH CHECK (
  -- Same as messages
  dispute_id IN (
    SELECT id FROM disputes WHERE
      customer_id = auth.uid()
      OR merchant_id = auth.uid()
      OR business_id IN (SELECT id FROM merchant_businesses WHERE merchant_id = auth.uid())
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin']))
  )
);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to update dispute updated_at on message
CREATE OR REPLACE FUNCTION update_dispute_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE disputes
  SET updated_at = NOW()
  WHERE id = NEW.dispute_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_dispute_on_message ON dispute_messages;
CREATE TRIGGER trigger_update_dispute_on_message
AFTER INSERT ON dispute_messages
FOR EACH ROW
EXECUTE FUNCTION update_dispute_on_message();

-- Function to create event on dispute status change
CREATE OR REPLACE FUNCTION log_dispute_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO dispute_events (dispute_id, event_type, description, old_value, new_value)
    VALUES (
      NEW.id,
      'status_changed',
      'Dispute status changed from ' || COALESCE(OLD.status, 'none') || ' to ' || NEW.status,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_dispute_status_change ON disputes;
CREATE TRIGGER trigger_log_dispute_status_change
AFTER UPDATE ON disputes
FOR EACH ROW
EXECUTE FUNCTION log_dispute_status_change();

-- Function to set merchant deadline (7 days from creation)
CREATE OR REPLACE FUNCTION set_dispute_deadlines()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.merchant_deadline IS NULL THEN
    NEW.merchant_deadline := NEW.created_at + INTERVAL '7 days';
  END IF;
  IF NEW.due_date IS NULL THEN
    NEW.due_date := NEW.created_at + INTERVAL '30 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_dispute_deadlines ON disputes;
CREATE TRIGGER trigger_set_dispute_deadlines
BEFORE INSERT ON disputes
FOR EACH ROW
EXECUTE FUNCTION set_dispute_deadlines();

-- =============================================
-- HELPER VIEWS
-- =============================================

-- View for dispute summary with latest message
CREATE OR REPLACE VIEW dispute_summary AS
SELECT
  d.*,
  p_customer.full_name as customer_full_name,
  p_merchant.full_name as merchant_full_name,
  mb.name as business_name,
  (SELECT COUNT(*) FROM dispute_messages WHERE dispute_id = d.id) as message_count,
  (SELECT COUNT(*) FROM dispute_messages WHERE dispute_id = d.id AND sender_type = 'customer') as customer_message_count,
  (SELECT COUNT(*) FROM dispute_messages WHERE dispute_id = d.id AND sender_type = 'merchant') as merchant_message_count,
  (SELECT COUNT(*) FROM dispute_messages WHERE dispute_id = d.id AND sender_type = 'admin') as admin_message_count,
  (SELECT content FROM dispute_messages WHERE dispute_id = d.id ORDER BY created_at DESC LIMIT 1) as last_message,
  (SELECT sender_type FROM dispute_messages WHERE dispute_id = d.id ORDER BY created_at DESC LIMIT 1) as last_message_sender
FROM disputes d
LEFT JOIN profiles p_customer ON d.customer_id = p_customer.id
LEFT JOIN profiles p_merchant ON d.merchant_id = p_merchant.id
LEFT JOIN merchant_businesses mb ON d.business_id = mb.id;

-- Grant access to the view
GRANT SELECT ON dispute_summary TO authenticated;
