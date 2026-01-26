-- School Wallet API Tables
-- This migration creates the tables needed for the School Shared Wallet API

-- ============================================
-- 1. School Wallets Table
-- ============================================
CREATE TABLE IF NOT EXISTS school_wallets (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  balance BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'SLE',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_wallets_school_id ON school_wallets(school_id);
CREATE INDEX IF NOT EXISTS idx_school_wallets_status ON school_wallets(status);

-- ============================================
-- 2. School Wallet Permissions Table
-- ============================================
CREATE TABLE IF NOT EXISTS school_wallet_permissions (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL REFERENCES school_wallets(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'accountant', 'staff', 'viewer')),
  permissions TEXT[] NOT NULL DEFAULT ARRAY['view'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(wallet_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_school_wallet_permissions_wallet ON school_wallet_permissions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_school_wallet_permissions_user ON school_wallet_permissions(user_id);

-- ============================================
-- 3. School Wallet Transactions Table
-- ============================================
CREATE TABLE IF NOT EXISTS school_wallet_transactions (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL REFERENCES school_wallets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'transfer', 'bank_transfer')),
  amount BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SLE',
  description TEXT,
  reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_school_wallet_txns_wallet ON school_wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_school_wallet_txns_type ON school_wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_school_wallet_txns_status ON school_wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_school_wallet_txns_created ON school_wallet_transactions(created_at DESC);

-- ============================================
-- 4. School Chat Messages Table
-- ============================================
CREATE TABLE IF NOT EXISTS school_chat_messages (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  recipient_user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('receipt', 'fee_notice', 'salary_slip', 'message', 'reminder')),
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_school_chat_recipient ON school_chat_messages(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_school_chat_school ON school_chat_messages(school_id);
CREATE INDEX IF NOT EXISTS idx_school_chat_type ON school_chat_messages(type);
CREATE INDEX IF NOT EXISTS idx_school_chat_status ON school_chat_messages(status);
CREATE INDEX IF NOT EXISTS idx_school_chat_created ON school_chat_messages(created_at DESC);

-- ============================================
-- 5. School Webhooks Table
-- ============================================
CREATE TABLE IF NOT EXISTS school_webhooks (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY['payment.completed'],
  secret TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_webhooks_school ON school_webhooks(school_id);
CREATE INDEX IF NOT EXISTS idx_school_webhooks_status ON school_webhooks(status);

-- ============================================
-- 6. Webhook Deliveries Table (for logging)
-- ============================================
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id TEXT NOT NULL REFERENCES school_webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB,
  response_status INT,
  error TEXT,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event ON webhook_deliveries(event);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_delivered ON webhook_deliveries(delivered_at DESC);

-- ============================================
-- 7. Enable Row Level Security
-- ============================================
ALTER TABLE school_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_wallet_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. RLS Policies
-- ============================================

-- School Wallets: Users can only view wallets they have permission for
CREATE POLICY "Users can view wallets they have permission for"
  ON school_wallets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM school_wallet_permissions
      WHERE wallet_id = school_wallets.id
      AND user_id = auth.uid()::TEXT
    )
  );

-- School Wallet Permissions: Users can view permissions for wallets they have access to
CREATE POLICY "Users can view permissions for their wallets"
  ON school_wallet_permissions FOR SELECT
  USING (
    user_id = auth.uid()::TEXT
    OR EXISTS (
      SELECT 1 FROM school_wallet_permissions swp
      WHERE swp.wallet_id = school_wallet_permissions.wallet_id
      AND swp.user_id = auth.uid()::TEXT
      AND swp.role = 'owner'
    )
  );

-- School Wallet Transactions: Users can view transactions for wallets they have permission for
CREATE POLICY "Users can view transactions for their wallets"
  ON school_wallet_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM school_wallet_permissions
      WHERE wallet_id = school_wallet_transactions.wallet_id
      AND user_id = auth.uid()::TEXT
      AND 'view_transactions' = ANY(permissions)
    )
  );

-- School Chat Messages: Users can only see their own messages
CREATE POLICY "Users can view their own messages"
  ON school_chat_messages FOR SELECT
  USING (recipient_user_id = auth.uid()::TEXT);

-- School Webhooks: Users can manage webhooks for schools they administer
CREATE POLICY "Users can view webhooks they created"
  ON school_webhooks FOR SELECT
  USING (created_by = auth.uid()::TEXT);

-- Service role bypass for all tables (for API access)
CREATE POLICY "Service role can access school_wallets"
  ON school_wallets FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access school_wallet_permissions"
  ON school_wallet_permissions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access school_wallet_transactions"
  ON school_wallet_transactions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access school_chat_messages"
  ON school_chat_messages FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access school_webhooks"
  ON school_webhooks FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access webhook_deliveries"
  ON webhook_deliveries FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- 9. Helper Functions
-- ============================================

-- Function to get school wallet balance
CREATE OR REPLACE FUNCTION get_school_wallet_balance(p_school_id TEXT)
RETURNS TABLE (
  wallet_id TEXT,
  balance BIGINT,
  currency TEXT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT sw.id, sw.balance, sw.currency, sw.status
  FROM school_wallets sw
  WHERE sw.school_id = p_school_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to credit school wallet
CREATE OR REPLACE FUNCTION credit_school_wallet(
  p_school_id TEXT,
  p_amount BIGINT,
  p_description TEXT,
  p_reference TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS TEXT AS $$
DECLARE
  v_wallet_id TEXT;
  v_transaction_id TEXT;
  v_current_balance BIGINT;
BEGIN
  -- Get wallet
  SELECT id, balance INTO v_wallet_id, v_current_balance
  FROM school_wallets
  WHERE school_id = p_school_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'School wallet not found';
  END IF;

  -- Generate transaction ID
  v_transaction_id := 'swtxn_' || encode(gen_random_bytes(12), 'hex');

  -- Update balance
  UPDATE school_wallets
  SET balance = balance + p_amount,
      updated_at = NOW()
  WHERE id = v_wallet_id;

  -- Create transaction record
  INSERT INTO school_wallet_transactions (
    id, wallet_id, type, amount, currency, description, reference, status, metadata, created_at, completed_at
  ) VALUES (
    v_transaction_id, v_wallet_id, 'credit', p_amount, 'SLE', p_description, p_reference, 'completed', p_metadata, NOW(), NOW()
  );

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE school_wallets IS 'Shared wallets for schools - one wallet per school';
COMMENT ON TABLE school_wallet_permissions IS 'User permissions for school wallets - roles: owner, accountant, staff, viewer';
COMMENT ON TABLE school_wallet_transactions IS 'Transaction history for school wallets';
COMMENT ON TABLE school_chat_messages IS 'Messages sent from schools to parents/staff (receipts, fee notices, etc.)';
COMMENT ON TABLE school_webhooks IS 'Webhook registrations for school payment notifications';
COMMENT ON TABLE webhook_deliveries IS 'Webhook delivery log for debugging and retry';
