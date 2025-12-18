-- Mobile Money Float Tracking
-- Tracks the balance held with mobile money providers (Orange Money, Africell, etc.)
-- This represents actual money held with providers that can be used for payouts

-- Mobile Money Float table - tracks balance per provider
CREATE TABLE IF NOT EXISTS mobile_money_float (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id VARCHAR(50) NOT NULL, -- 'm17' for Orange, 'm18' for Africell, etc.
  provider_name VARCHAR(100) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'SLE',
  current_balance DECIMAL(20, 2) NOT NULL DEFAULT 0,
  total_deposits DECIMAL(20, 2) NOT NULL DEFAULT 0, -- Total money received via this provider
  total_payouts DECIMAL(20, 2) NOT NULL DEFAULT 0, -- Total money sent out via this provider
  total_fees_collected DECIMAL(20, 2) NOT NULL DEFAULT 0, -- Fees earned
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, suspended
  last_deposit_at TIMESTAMPTZ,
  last_payout_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, currency)
);

-- Mobile Money Float History - immutable audit log
CREATE TABLE IF NOT EXISTS mobile_money_float_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  float_id UUID REFERENCES mobile_money_float(id),
  provider_id VARCHAR(50) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'SLE',
  transaction_type VARCHAR(50) NOT NULL, -- 'deposit', 'payout', 'fee', 'adjustment', 'replenishment'
  amount DECIMAL(20, 2) NOT NULL,
  fee DECIMAL(20, 2) DEFAULT 0,
  previous_balance DECIMAL(20, 2) NOT NULL,
  new_balance DECIMAL(20, 2) NOT NULL,
  reference VARCHAR(255), -- Transaction ID or external reference
  description TEXT,
  transaction_id UUID, -- Link to transactions table
  user_id UUID, -- User who initiated the transaction
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mm_float_provider ON mobile_money_float(provider_id);
CREATE INDEX IF NOT EXISTS idx_mm_float_currency ON mobile_money_float(currency);
CREATE INDEX IF NOT EXISTS idx_mm_float_history_float_id ON mobile_money_float_history(float_id);
CREATE INDEX IF NOT EXISTS idx_mm_float_history_provider ON mobile_money_float_history(provider_id);
CREATE INDEX IF NOT EXISTS idx_mm_float_history_type ON mobile_money_float_history(transaction_type);
CREATE INDEX IF NOT EXISTS idx_mm_float_history_created ON mobile_money_float_history(created_at DESC);

-- Initialize default providers (Sierra Leone)
INSERT INTO mobile_money_float (provider_id, provider_name, currency, current_balance)
VALUES
  ('m17', 'Orange Money', 'SLE', 0),
  ('m18', 'Africell Money', 'SLE', 0)
ON CONFLICT (provider_id, currency) DO NOTHING;

-- Function to credit mobile money float (when deposits come in)
CREATE OR REPLACE FUNCTION credit_mobile_money_float(
  p_provider_id VARCHAR(50),
  p_amount DECIMAL(20, 2),
  p_fee DECIMAL(20, 2) DEFAULT 0,
  p_reference VARCHAR(255) DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_transaction_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_currency VARCHAR(10) DEFAULT 'SLE'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_float_record mobile_money_float%ROWTYPE;
  v_new_balance DECIMAL(20, 2);
  v_history_id UUID;
BEGIN
  -- Get or create float record
  SELECT * INTO v_float_record
  FROM mobile_money_float
  WHERE provider_id = p_provider_id AND currency = p_currency
  FOR UPDATE;

  IF v_float_record.id IS NULL THEN
    -- Create new float record
    INSERT INTO mobile_money_float (provider_id, provider_name, currency, current_balance)
    VALUES (p_provider_id, p_provider_id, p_currency, 0)
    RETURNING * INTO v_float_record;
  END IF;

  -- Calculate new balance
  v_new_balance := v_float_record.current_balance + p_amount;

  -- Update float
  UPDATE mobile_money_float
  SET
    current_balance = v_new_balance,
    total_deposits = total_deposits + p_amount,
    total_fees_collected = total_fees_collected + p_fee,
    last_deposit_at = NOW(),
    updated_at = NOW()
  WHERE id = v_float_record.id;

  -- Record history
  INSERT INTO mobile_money_float_history (
    float_id, provider_id, currency, transaction_type, amount, fee,
    previous_balance, new_balance, reference, description, transaction_id, user_id
  )
  VALUES (
    v_float_record.id, p_provider_id, p_currency, 'deposit', p_amount, p_fee,
    v_float_record.current_balance, v_new_balance, p_reference, p_description, p_transaction_id, p_user_id
  )
  RETURNING id INTO v_history_id;

  RETURN jsonb_build_object(
    'success', true,
    'float_id', v_float_record.id,
    'history_id', v_history_id,
    'previous_balance', v_float_record.current_balance,
    'new_balance', v_new_balance,
    'amount', p_amount
  );
END;
$$;

-- Function to debit mobile money float (when payouts go out)
CREATE OR REPLACE FUNCTION debit_mobile_money_float(
  p_provider_id VARCHAR(50),
  p_amount DECIMAL(20, 2),
  p_fee DECIMAL(20, 2) DEFAULT 0,
  p_reference VARCHAR(255) DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_transaction_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_currency VARCHAR(10) DEFAULT 'SLE'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_float_record mobile_money_float%ROWTYPE;
  v_new_balance DECIMAL(20, 2);
  v_history_id UUID;
BEGIN
  -- Get float record
  SELECT * INTO v_float_record
  FROM mobile_money_float
  WHERE provider_id = p_provider_id AND currency = p_currency
  FOR UPDATE;

  IF v_float_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Float record not found for provider'
    );
  END IF;

  -- Check sufficient balance
  IF v_float_record.current_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient float balance',
      'available', v_float_record.current_balance,
      'required', p_amount
    );
  END IF;

  -- Calculate new balance
  v_new_balance := v_float_record.current_balance - p_amount;

  -- Update float
  UPDATE mobile_money_float
  SET
    current_balance = v_new_balance,
    total_payouts = total_payouts + p_amount,
    last_payout_at = NOW(),
    updated_at = NOW()
  WHERE id = v_float_record.id;

  -- Record history
  INSERT INTO mobile_money_float_history (
    float_id, provider_id, currency, transaction_type, amount, fee,
    previous_balance, new_balance, reference, description, transaction_id, user_id
  )
  VALUES (
    v_float_record.id, p_provider_id, p_currency, 'payout', p_amount, p_fee,
    v_float_record.current_balance, v_new_balance, p_reference, p_description, p_transaction_id, p_user_id
  )
  RETURNING id INTO v_history_id;

  RETURN jsonb_build_object(
    'success', true,
    'float_id', v_float_record.id,
    'history_id', v_history_id,
    'previous_balance', v_float_record.current_balance,
    'new_balance', v_new_balance,
    'amount', p_amount
  );
END;
$$;

-- Function to get float summary for dashboard
CREATE OR REPLACE FUNCTION get_mobile_money_float_summary()
RETURNS TABLE (
  provider_id VARCHAR(50),
  provider_name VARCHAR(100),
  currency VARCHAR(10),
  current_balance DECIMAL(20, 2),
  total_deposits DECIMAL(20, 2),
  total_payouts DECIMAL(20, 2),
  total_fees_collected DECIMAL(20, 2),
  net_flow DECIMAL(20, 2),
  last_deposit_at TIMESTAMPTZ,
  last_payout_at TIMESTAMPTZ,
  status VARCHAR(20)
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    f.provider_id,
    f.provider_name,
    f.currency,
    f.current_balance,
    f.total_deposits,
    f.total_payouts,
    f.total_fees_collected,
    (f.total_deposits - f.total_payouts) as net_flow,
    f.last_deposit_at,
    f.last_payout_at,
    f.status
  FROM mobile_money_float f
  ORDER BY f.provider_name;
$$;

-- RLS Policies
ALTER TABLE mobile_money_float ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_money_float_history ENABLE ROW LEVEL SECURITY;

-- Superadmin can view and manage float
CREATE POLICY "superadmin_view_float" ON mobile_money_float
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'SUPERADMIN'
    )
  );

CREATE POLICY "superadmin_manage_float" ON mobile_money_float
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'SUPERADMIN'
    )
  );

CREATE POLICY "superadmin_view_float_history" ON mobile_money_float_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'SUPERADMIN'
    )
  );

-- Prevent modification of history (immutable audit log)
CREATE POLICY "no_update_float_history" ON mobile_money_float_history
  FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY "no_delete_float_history" ON mobile_money_float_history
  FOR DELETE TO authenticated
  USING (false);
