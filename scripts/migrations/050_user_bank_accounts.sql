-- User Bank Accounts
-- Allows users to save bank accounts for withdrawals/payouts
-- Integrates with Monime bank payout API

-- Create user_bank_accounts table
CREATE TABLE IF NOT EXISTS user_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Bank details
  bank_provider_id VARCHAR(50) NOT NULL,  -- e.g., 'slb001', 'slb004'
  bank_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  account_name VARCHAR(255),  -- Verified account holder name from KYC

  -- Verification status
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verification_reference VARCHAR(255),

  -- User-friendly label
  nickname VARCHAR(100),  -- e.g., "My GTBank Account", "Salary Account"

  -- Default account flag
  is_default BOOLEAN DEFAULT FALSE,

  -- Status
  status VARCHAR(20) DEFAULT 'active',  -- active, suspended, deleted

  -- Metadata
  country VARCHAR(10) DEFAULT 'SL',
  currency VARCHAR(10) DEFAULT 'SLE',
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique bank account per user
  UNIQUE(user_id, bank_provider_id, account_number)
);

-- Indexes
CREATE INDEX idx_user_bank_accounts_user_id ON user_bank_accounts(user_id);
CREATE INDEX idx_user_bank_accounts_provider ON user_bank_accounts(bank_provider_id);
CREATE INDEX idx_user_bank_accounts_status ON user_bank_accounts(status);
CREATE INDEX idx_user_bank_accounts_default ON user_bank_accounts(user_id, is_default) WHERE is_default = true;

-- Enable RLS
ALTER TABLE user_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Users can view their own bank accounts
CREATE POLICY "users_view_own_bank_accounts" ON user_bank_accounts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own bank accounts
CREATE POLICY "users_insert_own_bank_accounts" ON user_bank_accounts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own bank accounts
CREATE POLICY "users_update_own_bank_accounts" ON user_bank_accounts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own bank accounts
CREATE POLICY "users_delete_own_bank_accounts" ON user_bank_accounts
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all bank accounts
CREATE POLICY "admins_view_all_bank_accounts" ON user_bank_accounts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.roles IN ('admin', 'superadmin', 'ADMIN', 'SUPERADMIN')
    )
  );

-- Function to ensure only one default bank account per user
CREATE OR REPLACE FUNCTION ensure_single_default_bank_account()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE user_bank_accounts
    SET is_default = false, updated_at = NOW()
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_default_bank_account
  BEFORE INSERT OR UPDATE ON user_bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_bank_account();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bank_account_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bank_account_updated_at
  BEFORE UPDATE ON user_bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_account_updated_at();

-- Add comment
COMMENT ON TABLE user_bank_accounts IS 'Stores user bank accounts for withdrawals/payouts via Monime';
