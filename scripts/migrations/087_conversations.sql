-- Migration: General Messaging System
-- Supports: B2B, B2C, Support-to-User, Admin broadcasts
-- Features: AI moderation, flagging, read receipts

-- =============================================
-- CONVERSATIONS TABLE (Chat threads)
-- =============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Conversation type
  type VARCHAR(30) NOT NULL, -- 'support', 'business_inquiry', 'b2b', 'sales', 'general'

  -- Subject/Title
  subject VARCHAR(255),

  -- Participants (for quick lookup)
  participant_ids UUID[] DEFAULT '{}',

  -- Business context (optional)
  business_id UUID REFERENCES merchant_businesses(id),

  -- Status
  status VARCHAR(20) DEFAULT 'open', -- 'open', 'closed', 'archived', 'flagged', 'blocked'
  priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'

  -- Assignment (for support)
  assigned_to UUID REFERENCES profiles(id),
  department VARCHAR(50), -- 'support', 'sales', 'billing', 'technical'

  -- AI Moderation
  ai_flagged BOOLEAN DEFAULT false,
  ai_flag_reason TEXT,
  ai_risk_score DECIMAL(5,2) DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CONVERSATION PARTICIPANTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Participant info
  user_id UUID REFERENCES profiles(id),
  business_id UUID REFERENCES merchant_businesses(id),

  -- Role in conversation
  role VARCHAR(20) NOT NULL, -- 'user', 'merchant', 'admin', 'support', 'system'
  display_name VARCHAR(255),

  -- Status
  is_active BOOLEAN DEFAULT true,
  muted BOOLEAN DEFAULT false,

  -- Read tracking
  last_read_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,

  -- Notifications
  notifications_enabled BOOLEAN DEFAULT true,

  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,

  UNIQUE(conversation_id, user_id)
);

-- =============================================
-- MESSAGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Sender info
  sender_id UUID REFERENCES profiles(id),
  sender_type VARCHAR(20) NOT NULL, -- 'user', 'merchant', 'admin', 'support', 'system', 'ai'
  sender_name VARCHAR(255),
  sender_business_id UUID REFERENCES merchant_businesses(id),

  -- Message content
  content TEXT NOT NULL,
  message_type VARCHAR(30) DEFAULT 'text', -- 'text', 'image', 'file', 'system', 'ai_warning', 'product_inquiry', 'quote_request'

  -- Attachments
  attachments JSONB DEFAULT '[]'::jsonb, -- [{url, type, name, size}]

  -- Reply to another message
  reply_to_id UUID REFERENCES messages(id),

  -- AI Moderation
  ai_flagged BOOLEAN DEFAULT false,
  ai_flag_reason TEXT,
  ai_analyzed BOOLEAN DEFAULT false,

  -- Visibility
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES profiles(id),

  -- Read tracking
  read_by JSONB DEFAULT '{}'::jsonb, -- {user_id: timestamp}

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- AI FLAG KEYWORDS TABLE (Admin configurable)
-- =============================================
CREATE TABLE IF NOT EXISTS ai_flag_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Keyword/phrase to detect
  keyword VARCHAR(255) NOT NULL,

  -- Category
  category VARCHAR(50) NOT NULL, -- 'fraud', 'scam', 'harassment', 'spam', 'suspicious', 'prohibited'

  -- Severity
  severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'

  -- Action to take
  action VARCHAR(30) DEFAULT 'flag', -- 'flag', 'block', 'notify_admin', 'auto_delete'

  -- Is regex pattern?
  is_regex BOOLEAN DEFAULT false,

  -- Active status
  is_active BOOLEAN DEFAULT true,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- FLAGGED MESSAGES TABLE (For review)
-- =============================================
CREATE TABLE IF NOT EXISTS flagged_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Flag details
  flag_reason TEXT NOT NULL,
  matched_keywords TEXT[],
  severity VARCHAR(20) DEFAULT 'medium',

  -- Review status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'reviewed', 'dismissed', 'action_taken'
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  action_taken VARCHAR(50), -- 'none', 'warning_sent', 'message_deleted', 'user_blocked', 'escalated'

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CANNED RESPONSES TABLE (For support)
-- =============================================
CREATE TABLE IF NOT EXISTS canned_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Response details
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  shortcut VARCHAR(50), -- e.g., "/refund" triggers this response

  -- Category
  category VARCHAR(50), -- 'greeting', 'closing', 'refund', 'technical', 'billing'

  -- Visibility
  is_global BOOLEAN DEFAULT true, -- Available to all support staff
  created_by UUID REFERENCES profiles(id),
  business_id UUID REFERENCES merchant_businesses(id), -- For merchant-specific responses

  -- Usage tracking
  use_count INTEGER DEFAULT 0,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_conversations_business ON conversations(business_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations USING GIN (participant_ids);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_flagged ON conversations(ai_flagged) WHERE ai_flagged = true;

CREATE INDEX IF NOT EXISTS idx_conv_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_business ON conversation_participants(business_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_flagged ON messages(ai_flagged) WHERE ai_flagged = true;
CREATE INDEX IF NOT EXISTS idx_messages_reply ON messages(reply_to_id) WHERE reply_to_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_flagged_messages_status ON flagged_messages(status);
CREATE INDEX IF NOT EXISTS idx_flagged_messages_severity ON flagged_messages(severity);

CREATE INDEX IF NOT EXISTS idx_ai_keywords_category ON ai_flag_keywords(category);
CREATE INDEX IF NOT EXISTS idx_ai_keywords_active ON ai_flag_keywords(is_active) WHERE is_active = true;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE flagged_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE canned_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_flag_keywords ENABLE ROW LEVEL SECURITY;

-- Conversations: Can see if you're a participant or admin
DROP POLICY IF EXISTS conversations_select_policy ON conversations;
CREATE POLICY conversations_select_policy ON conversations FOR SELECT USING (
  auth.uid() = ANY(participant_ids)
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin'] OR roles @> ARRAY['support']))
);

DROP POLICY IF EXISTS conversations_insert_policy ON conversations;
CREATE POLICY conversations_insert_policy ON conversations FOR INSERT WITH CHECK (
  auth.uid() = ANY(participant_ids)
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin'] OR roles @> ARRAY['support']))
);

DROP POLICY IF EXISTS conversations_update_policy ON conversations;
CREATE POLICY conversations_update_policy ON conversations FOR UPDATE USING (
  auth.uid() = ANY(participant_ids)
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin'] OR roles @> ARRAY['support']))
);

-- Participants: Can see your own participation or if admin
DROP POLICY IF EXISTS conv_participants_select_policy ON conversation_participants;
CREATE POLICY conv_participants_select_policy ON conversation_participants FOR SELECT USING (
  user_id = auth.uid()
  OR conversation_id IN (SELECT id FROM conversations WHERE auth.uid() = ANY(participant_ids))
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin'] OR roles @> ARRAY['support']))
);

DROP POLICY IF EXISTS conv_participants_insert_policy ON conversation_participants;
CREATE POLICY conv_participants_insert_policy ON conversation_participants FOR INSERT WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin'] OR roles @> ARRAY['support']))
);

-- Messages: Can see if you're in the conversation
DROP POLICY IF EXISTS messages_select_policy ON messages;
CREATE POLICY messages_select_policy ON messages FOR SELECT USING (
  conversation_id IN (SELECT id FROM conversations WHERE auth.uid() = ANY(participant_ids))
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin'] OR roles @> ARRAY['support']))
);

DROP POLICY IF EXISTS messages_insert_policy ON messages;
CREATE POLICY messages_insert_policy ON messages FOR INSERT WITH CHECK (
  conversation_id IN (SELECT id FROM conversations WHERE auth.uid() = ANY(participant_ids))
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin'] OR roles @> ARRAY['support']))
);

-- Flagged messages: Admin only
DROP POLICY IF EXISTS flagged_messages_select_policy ON flagged_messages;
CREATE POLICY flagged_messages_select_policy ON flagged_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin'] OR roles @> ARRAY['support']))
);

DROP POLICY IF EXISTS flagged_messages_insert_policy ON flagged_messages;
CREATE POLICY flagged_messages_insert_policy ON flagged_messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS flagged_messages_update_policy ON flagged_messages;
CREATE POLICY flagged_messages_update_policy ON flagged_messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin']))
);

-- Canned responses: Support can read, admin can modify
DROP POLICY IF EXISTS canned_responses_select_policy ON canned_responses;
CREATE POLICY canned_responses_select_policy ON canned_responses FOR SELECT USING (
  is_global = true
  OR created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin'] OR roles @> ARRAY['support']))
);

DROP POLICY IF EXISTS canned_responses_insert_policy ON canned_responses;
CREATE POLICY canned_responses_insert_policy ON canned_responses FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin'] OR roles @> ARRAY['support']))
);

-- AI Keywords: Admin only
DROP POLICY IF EXISTS ai_keywords_select_policy ON ai_flag_keywords;
CREATE POLICY ai_keywords_select_policy ON ai_flag_keywords FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin']))
);

DROP POLICY IF EXISTS ai_keywords_all_policy ON ai_flag_keywords;
CREATE POLICY ai_keywords_all_policy ON ai_flag_keywords FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin']))
);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Update conversation on new message
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100),
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  -- Update unread count for other participants
  UPDATE conversation_participants
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.sender_id
    AND is_active = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON messages;
CREATE TRIGGER trigger_update_conversation_on_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_on_message();

-- Update participant array when participants change
CREATE OR REPLACE FUNCTION sync_conversation_participants()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE conversations
    SET participant_ids = array_append(participant_ids, NEW.user_id)
    WHERE id = NEW.conversation_id
      AND NOT (NEW.user_id = ANY(participant_ids));
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE conversations
    SET participant_ids = array_remove(participant_ids, OLD.user_id)
    WHERE id = OLD.conversation_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_participants ON conversation_participants;
CREATE TRIGGER trigger_sync_participants
AFTER INSERT OR DELETE ON conversation_participants
FOR EACH ROW
EXECUTE FUNCTION sync_conversation_participants();

-- =============================================
-- SEED DEFAULT FLAG KEYWORDS
-- =============================================
INSERT INTO ai_flag_keywords (keyword, category, severity, action) VALUES
  -- Fraud/Scam
  ('send money outside', 'fraud', 'high', 'flag'),
  ('western union', 'fraud', 'medium', 'flag'),
  ('moneygram', 'fraud', 'medium', 'flag'),
  ('gift card payment', 'fraud', 'high', 'flag'),
  ('urgent wire transfer', 'fraud', 'critical', 'notify_admin'),
  ('bank account details', 'fraud', 'medium', 'flag'),
  ('password', 'fraud', 'high', 'flag'),
  ('pin number', 'fraud', 'high', 'flag'),
  ('social security', 'fraud', 'critical', 'notify_admin'),
  ('lottery winner', 'scam', 'critical', 'block'),
  ('inheritance money', 'scam', 'high', 'flag'),
  ('prince', 'scam', 'medium', 'flag'),

  -- Suspicious activity
  ('bypass verification', 'suspicious', 'high', 'notify_admin'),
  ('avoid fees', 'suspicious', 'medium', 'flag'),
  ('off platform', 'suspicious', 'high', 'flag'),
  ('direct payment', 'suspicious', 'medium', 'flag'),
  ('personal account', 'suspicious', 'medium', 'flag'),

  -- Harassment
  ('kill you', 'harassment', 'critical', 'block'),
  ('threat', 'harassment', 'high', 'notify_admin'),

  -- Prohibited
  ('drugs', 'prohibited', 'high', 'notify_admin'),
  ('weapons', 'prohibited', 'high', 'notify_admin'),
  ('counterfeit', 'prohibited', 'critical', 'block')
ON CONFLICT DO NOTHING;

-- =============================================
-- SEED DEFAULT CANNED RESPONSES
-- =============================================
INSERT INTO canned_responses (title, content, shortcut, category, is_global) VALUES
  ('Greeting', 'Hello! Thank you for contacting Peeap Support. How can I help you today?', '/hi', 'greeting', true),
  ('Closing', 'Is there anything else I can help you with? If not, feel free to close this chat. Have a great day!', '/bye', 'closing', true),
  ('Refund Request', 'I understand you''d like a refund. Let me look into this for you. Could you please provide the transaction ID or date of the transaction?', '/refund', 'refund', true),
  ('Technical Issue', 'I''m sorry to hear you''re experiencing technical difficulties. Let me help troubleshoot this issue. Can you tell me what device and browser you''re using?', '/tech', 'technical', true),
  ('Verification Pending', 'Your verification documents are currently under review. This typically takes 1-2 business days. We''ll notify you once the review is complete.', '/kyc', 'general', true),
  ('Payment Failed', 'I see that your payment didn''t go through. This can happen due to insufficient funds, card limits, or bank restrictions. Would you like to try a different payment method?', '/paymentfail', 'billing', true)
ON CONFLICT DO NOTHING;

-- Grant access
GRANT SELECT ON conversations TO authenticated;
GRANT SELECT ON conversation_participants TO authenticated;
GRANT SELECT ON messages TO authenticated;
GRANT SELECT ON canned_responses TO authenticated;
