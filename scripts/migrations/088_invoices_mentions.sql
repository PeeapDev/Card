-- Migration: Invoices & @ Mention System
-- Features:
--   @staffname - Add staff to conversation
--   @product - Reference a product
--   @receipt - Reference a receipt/transaction
--   @invoice - Create invoice with payment link

-- =============================================
-- INVOICES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) UNIQUE,

  -- Business/Merchant
  business_id UUID REFERENCES merchant_businesses(id),
  merchant_id UUID REFERENCES profiles(id),

  -- Customer
  customer_id UUID REFERENCES profiles(id),
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),

  -- Conversation context (if sent via chat)
  conversation_id UUID REFERENCES conversations(id),
  message_id UUID REFERENCES messages(id),

  -- Invoice details
  title VARCHAR(255),
  description TEXT,
  currency VARCHAR(3) DEFAULT 'SLE',

  -- Line items
  items JSONB DEFAULT '[]'::jsonb, -- [{name, description, quantity, unit_price, total}]

  -- Amounts
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,

  -- Payment
  payment_link_id UUID, -- References payment_links table if exists
  payment_url TEXT,
  payment_status VARCHAR(20) DEFAULT 'unpaid', -- 'unpaid', 'partial', 'paid', 'overdue', 'cancelled'
  amount_paid DECIMAL(15,2) DEFAULT 0,
  paid_at TIMESTAMPTZ,

  -- Dates
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,

  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,

  -- Notes
  notes TEXT,
  terms TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MESSAGE MENTIONS TABLE (Track @mentions)
-- =============================================
CREATE TABLE IF NOT EXISTS message_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Mention type
  mention_type VARCHAR(30) NOT NULL, -- 'user', 'staff', 'product', 'receipt', 'invoice', 'transaction'

  -- What was mentioned (one of these will be set)
  mentioned_user_id UUID REFERENCES profiles(id),
  mentioned_product_id UUID, -- References products table
  mentioned_transaction_id UUID, -- References transactions table
  mentioned_invoice_id UUID REFERENCES invoices(id),

  -- Display info
  mention_text VARCHAR(255) NOT NULL, -- The actual @text used
  display_name VARCHAR(255),

  -- Position in message
  start_position INTEGER,
  end_position INTEGER,

  -- Action taken
  action_taken VARCHAR(50), -- 'added_to_chat', 'invoice_created', 'link_generated', etc.

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CONVERSATION INVITES (For @staff mentions)
-- =============================================
CREATE TABLE IF NOT EXISTS conversation_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Who invited
  invited_by UUID REFERENCES profiles(id),

  -- Who was invited
  invited_user_id UUID REFERENCES profiles(id),
  invited_email VARCHAR(255),

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'expired'

  -- Message that triggered invite
  message_id UUID REFERENCES messages(id),
  mention_text VARCHAR(255),

  -- Timestamps
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_invoices_business ON invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_conversation ON invoices(conversation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date) WHERE status NOT IN ('paid', 'cancelled');

CREATE INDEX IF NOT EXISTS idx_mentions_message ON message_mentions(message_id);
CREATE INDEX IF NOT EXISTS idx_mentions_conversation ON message_mentions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_mentions_type ON message_mentions(mention_type);
CREATE INDEX IF NOT EXISTS idx_mentions_user ON message_mentions(mentioned_user_id);

CREATE INDEX IF NOT EXISTS idx_conv_invites_conversation ON conversation_invites(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_invites_user ON conversation_invites(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_conv_invites_status ON conversation_invites(status);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_invites ENABLE ROW LEVEL SECURITY;

-- Invoices: Merchant or customer can see
DROP POLICY IF EXISTS invoices_select_policy ON invoices;
CREATE POLICY invoices_select_policy ON invoices FOR SELECT USING (
  merchant_id = auth.uid()
  OR customer_id = auth.uid()
  OR business_id IN (SELECT id FROM merchant_businesses WHERE merchant_id = auth.uid())
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin']))
);

DROP POLICY IF EXISTS invoices_insert_policy ON invoices;
CREATE POLICY invoices_insert_policy ON invoices FOR INSERT WITH CHECK (
  merchant_id = auth.uid()
  OR business_id IN (SELECT id FROM merchant_businesses WHERE merchant_id = auth.uid())
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin']))
);

DROP POLICY IF EXISTS invoices_update_policy ON invoices;
CREATE POLICY invoices_update_policy ON invoices FOR UPDATE USING (
  merchant_id = auth.uid()
  OR business_id IN (SELECT id FROM merchant_businesses WHERE merchant_id = auth.uid())
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin']))
);

-- Mentions: Same as messages
DROP POLICY IF EXISTS mentions_select_policy ON message_mentions;
CREATE POLICY mentions_select_policy ON message_mentions FOR SELECT USING (
  conversation_id IN (SELECT id FROM conversations WHERE auth.uid() = ANY(participant_ids))
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin']))
);

DROP POLICY IF EXISTS mentions_insert_policy ON message_mentions;
CREATE POLICY mentions_insert_policy ON message_mentions FOR INSERT WITH CHECK (true);

-- Invites: Can see if you invited or were invited
DROP POLICY IF EXISTS invites_select_policy ON conversation_invites;
CREATE POLICY invites_select_policy ON conversation_invites FOR SELECT USING (
  invited_by = auth.uid()
  OR invited_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin']))
);

DROP POLICY IF EXISTS invites_insert_policy ON conversation_invites;
CREATE POLICY invites_insert_policy ON conversation_invites FOR INSERT WITH CHECK (
  invited_by = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin']))
);

DROP POLICY IF EXISTS invites_update_policy ON conversation_invites;
CREATE POLICY invites_update_policy ON conversation_invites FOR UPDATE USING (
  invited_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin']))
);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  prefix VARCHAR(10);
  seq_num INTEGER;
  new_number VARCHAR(50);
BEGIN
  -- Get business prefix or use default
  SELECT COALESCE(UPPER(LEFT(name, 3)), 'INV') INTO prefix
  FROM merchant_businesses WHERE id = NEW.business_id;

  -- Get next sequence number for this business
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO seq_num
  FROM invoices
  WHERE business_id = NEW.business_id;

  -- Format: PREFIX-YYYYMM-XXXX
  new_number := prefix || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(seq_num::TEXT, 4, '0');

  NEW.invoice_number := new_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_invoice_number ON invoices;
CREATE TRIGGER trigger_generate_invoice_number
BEFORE INSERT ON invoices
FOR EACH ROW
WHEN (NEW.invoice_number IS NULL)
EXECUTE FUNCTION generate_invoice_number();

-- Update invoice status based on due date
CREATE OR REPLACE FUNCTION check_invoice_overdue()
RETURNS void AS $$
BEGIN
  UPDATE invoices
  SET status = 'overdue', payment_status = 'overdue'
  WHERE due_date < CURRENT_DATE
    AND status = 'sent'
    AND payment_status NOT IN ('paid', 'cancelled');
END;
$$ LANGUAGE plpgsql;

-- Add user to conversation when mentioned
CREATE OR REPLACE FUNCTION process_staff_mention()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.mention_type IN ('user', 'staff') AND NEW.mentioned_user_id IS NOT NULL THEN
    -- Check if already a participant
    IF NOT EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = NEW.conversation_id
        AND user_id = NEW.mentioned_user_id
    ) THEN
      -- Add as participant
      INSERT INTO conversation_participants (conversation_id, user_id, role, display_name)
      VALUES (NEW.conversation_id, NEW.mentioned_user_id, 'user', NEW.display_name);

      -- Update the mention record
      NEW.action_taken := 'added_to_chat';

      -- Send notification
      INSERT INTO notifications (user_id, type, title, message, action_url, source_service, source_id, priority)
      VALUES (
        NEW.mentioned_user_id,
        'system_announcement',
        'Added to Conversation',
        'You were mentioned and added to a conversation',
        '/messages',
        'system',
        NEW.conversation_id::text,
        'normal'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_process_staff_mention ON message_mentions;
CREATE TRIGGER trigger_process_staff_mention
BEFORE INSERT ON message_mentions
FOR EACH ROW
EXECUTE FUNCTION process_staff_mention();

-- =============================================
-- INVOICE SETTINGS COLUMN
-- =============================================
ALTER TABLE merchant_businesses ADD COLUMN IF NOT EXISTS invoice_settings JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN merchant_businesses.invoice_settings IS 'Invoice configuration: tax rate, due days, terms, branding, etc.';

-- =============================================
-- GRANTS
-- =============================================
GRANT SELECT ON invoices TO authenticated;
GRANT SELECT ON message_mentions TO authenticated;
GRANT SELECT ON conversation_invites TO authenticated;
