-- School Salary Payments Table
-- Tracks all salary payments made to staff

CREATE TABLE IF NOT EXISTS school_salary_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id VARCHAR(100) NOT NULL,
  staff_id VARCHAR(100) NOT NULL,
  staff_name VARCHAR(255) NOT NULL,

  -- Salary details
  month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  base_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  allowances DECIMAL(12,2) NOT NULL DEFAULT 0,
  deductions DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_salary DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Payment details
  payment_method VARCHAR(50) NOT NULL DEFAULT 'wallet', -- wallet, bank, mobile_money, manual
  transaction_id VARCHAR(100) UNIQUE,
  school_wallet_id UUID REFERENCES wallets(id),
  recipient_wallet_id UUID REFERENCES wallets(id),
  recipient_user_id UUID REFERENCES users(id),

  -- Bank details (if bank transfer)
  bank_name VARCHAR(100),
  account_number VARCHAR(50),
  account_name VARCHAR(255),

  -- Mobile money details
  mobile_provider VARCHAR(50),
  phone_number VARCHAR(50),

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'reversed')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,

  -- Unique constraint: one payment per staff per month per school
  UNIQUE(school_id, staff_id, month)
);

CREATE INDEX IF NOT EXISTS idx_salary_payments_school ON school_salary_payments(school_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_month ON school_salary_payments(month);
CREATE INDEX IF NOT EXISTS idx_salary_payments_staff ON school_salary_payments(staff_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_status ON school_salary_payments(status);

-- Pending Transfers Table
-- Tracks bank and mobile money transfers that need processing

CREATE TABLE IF NOT EXISTS pending_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL, -- bank_transfer, mobile_money, manual
  transaction_id VARCHAR(100) UNIQUE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'SLE',

  -- Recipient info
  recipient_name VARCHAR(255) NOT NULL,
  bank_name VARCHAR(100),
  account_number VARCHAR(50),
  account_name VARCHAR(255),
  mobile_provider VARCHAR(50),
  phone_number VARCHAR(50),

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'pending_manual', 'processing', 'completed', 'failed')),

  -- Details
  description TEXT,
  metadata JSONB DEFAULT '{}',

  -- Processing info
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES users(id),
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_transfers_type ON pending_transfers(type);
CREATE INDEX IF NOT EXISTS idx_pending_transfers_status ON pending_transfers(status);

-- School Chat Messages Table
-- For school-parent communication (receipts, invoices, messages)

CREATE TABLE IF NOT EXISTS school_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Message type
  type VARCHAR(50) NOT NULL CHECK (type IN ('invoice', 'receipt', 'fee_notice', 'salary_slip', 'message', 'reminder')),

  -- Recipient (parent/staff user)
  recipient_user_id UUID NOT NULL REFERENCES users(id),

  -- Sender (school)
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('school', 'parent', 'system')),
  sender_id VARCHAR(100) NOT NULL, -- school_id or user_id

  -- Message content
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient ON school_chat_messages(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON school_chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_type ON school_chat_messages(type);
CREATE INDEX IF NOT EXISTS idx_chat_messages_status ON school_chat_messages(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON school_chat_messages(created_at DESC);

-- RLS Policies

-- Salary payments: schools can manage their own payments
ALTER TABLE school_salary_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY salary_payments_school_policy ON school_salary_payments
  FOR ALL
  USING (
    school_id IN (
      SELECT sc.school_id FROM school_connections sc
      WHERE sc.connected_by_user_id = auth.uid()
    )
  );

-- Staff can view their own salary payments
CREATE POLICY salary_payments_staff_policy ON school_salary_payments
  FOR SELECT
  USING (recipient_user_id = auth.uid());

-- Pending transfers: only admins can manage
ALTER TABLE pending_transfers ENABLE ROW LEVEL SECURITY;

-- Chat messages: recipients can view their messages
ALTER TABLE school_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_messages_recipient_policy ON school_chat_messages
  FOR SELECT
  USING (recipient_user_id = auth.uid());

-- Schools can send messages
CREATE POLICY chat_messages_school_policy ON school_chat_messages
  FOR ALL
  USING (
    sender_type = 'school' AND sender_id IN (
      SELECT sc.school_id FROM school_connections sc
      WHERE sc.connected_by_user_id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE school_salary_payments IS 'Salary payment records for school staff';
COMMENT ON TABLE pending_transfers IS 'Bank and mobile money transfers awaiting processing';
COMMENT ON TABLE school_chat_messages IS 'Chat messages between schools and parents/staff';
