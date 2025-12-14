-- Migration: 036_merchant_subscriptions.sql
-- Description: Create merchant subscriptions table for managing Plus tiers and trials
-- Created: 2024-12-14

-- Create merchant_subscriptions table
CREATE TABLE IF NOT EXISTS merchant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES merchant_businesses(id) ON DELETE SET NULL,
  tier VARCHAR(50) NOT NULL DEFAULT 'basic',
  status VARCHAR(20) NOT NULL DEFAULT 'trialing',
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  price_monthly DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'NLE',
  selected_addons JSONB DEFAULT '[]'::jsonb,
  preferences JSONB DEFAULT '{}'::jsonb,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index on user_id to ensure one subscription per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_merchant_subscriptions_user_id
  ON merchant_subscriptions(user_id);

-- Create index on business_id for lookup
CREATE INDEX IF NOT EXISTS idx_merchant_subscriptions_business_id
  ON merchant_subscriptions(business_id);

-- Create index on status for querying active/trialing subscriptions
CREATE INDEX IF NOT EXISTS idx_merchant_subscriptions_status
  ON merchant_subscriptions(status);

-- Create index on trial_ends_at for finding expiring trials
CREATE INDEX IF NOT EXISTS idx_merchant_subscriptions_trial_ends
  ON merchant_subscriptions(trial_ends_at)
  WHERE trial_ends_at IS NOT NULL;

-- Enable RLS
ALTER TABLE merchant_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view their own subscription"
  ON merchant_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own subscription
CREATE POLICY "Users can insert their own subscription"
  ON merchant_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscription
CREATE POLICY "Users can update their own subscription"
  ON merchant_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
  ON merchant_subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'superadmin')
    )
  );

-- Admins can manage all subscriptions
CREATE POLICY "Admins can manage all subscriptions"
  ON merchant_subscriptions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'superadmin')
    )
  );

-- Create subscription billing history table
CREATE TABLE IF NOT EXISTS merchant_subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES merchant_subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'NLE',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on subscription_id for lookups
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_subscription_id
  ON merchant_subscription_invoices(subscription_id);

-- Index on user_id for user's invoice history
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_user_id
  ON merchant_subscription_invoices(user_id);

-- Enable RLS on invoices
ALTER TABLE merchant_subscription_invoices ENABLE ROW LEVEL SECURITY;

-- Users can view their own invoices
CREATE POLICY "Users can view their own invoices"
  ON merchant_subscription_invoices
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can manage all invoices
CREATE POLICY "Admins can manage all invoices"
  ON merchant_subscription_invoices
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'superadmin')
    )
  );

-- Function to start a trial subscription
CREATE OR REPLACE FUNCTION start_merchant_trial(
  p_user_id UUID,
  p_business_id UUID DEFAULT NULL,
  p_tier VARCHAR DEFAULT 'business_plus',
  p_trial_days INTEGER DEFAULT 7,
  p_price_monthly DECIMAL DEFAULT 500.00
)
RETURNS merchant_subscriptions AS $$
DECLARE
  v_subscription merchant_subscriptions;
BEGIN
  INSERT INTO merchant_subscriptions (
    user_id,
    business_id,
    tier,
    status,
    trial_started_at,
    trial_ends_at,
    price_monthly,
    currency
  ) VALUES (
    p_user_id,
    p_business_id,
    p_tier,
    'trialing',
    NOW(),
    NOW() + (p_trial_days || ' days')::INTERVAL,
    p_price_monthly,
    'NLE'
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    business_id = COALESCE(EXCLUDED.business_id, merchant_subscriptions.business_id),
    tier = EXCLUDED.tier,
    status = EXCLUDED.status,
    trial_started_at = EXCLUDED.trial_started_at,
    trial_ends_at = EXCLUDED.trial_ends_at,
    price_monthly = EXCLUDED.price_monthly,
    updated_at = NOW()
  RETURNING * INTO v_subscription;

  RETURN v_subscription;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to activate a subscription (after trial or payment)
CREATE OR REPLACE FUNCTION activate_merchant_subscription(
  p_user_id UUID,
  p_period_months INTEGER DEFAULT 1
)
RETURNS merchant_subscriptions AS $$
DECLARE
  v_subscription merchant_subscriptions;
BEGIN
  UPDATE merchant_subscriptions
  SET
    status = 'active',
    current_period_start = NOW(),
    current_period_end = NOW() + (p_period_months || ' months')::INTERVAL,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING * INTO v_subscription;

  IF v_subscription IS NULL THEN
    RAISE EXCEPTION 'Subscription not found for user %', p_user_id;
  END IF;

  RETURN v_subscription;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel a subscription
CREATE OR REPLACE FUNCTION cancel_merchant_subscription(
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS merchant_subscriptions AS $$
DECLARE
  v_subscription merchant_subscriptions;
BEGIN
  UPDATE merchant_subscriptions
  SET
    status = 'cancelled',
    cancelled_at = NOW(),
    cancel_reason = p_reason,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING * INTO v_subscription;

  IF v_subscription IS NULL THEN
    RAISE EXCEPTION 'Subscription not found for user %', p_user_id;
  END IF;

  RETURN v_subscription;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get subscription with trial days remaining
CREATE OR REPLACE FUNCTION get_merchant_subscription_with_trial_days(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  business_id UUID,
  tier VARCHAR,
  status VARCHAR,
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  trial_days_remaining INTEGER,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  price_monthly DECIMAL,
  currency VARCHAR,
  selected_addons JSONB,
  preferences JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ms.id,
    ms.user_id,
    ms.business_id,
    ms.tier,
    ms.status,
    ms.trial_started_at,
    ms.trial_ends_at,
    CASE
      WHEN ms.status = 'trialing' AND ms.trial_ends_at > NOW()
      THEN EXTRACT(DAY FROM (ms.trial_ends_at - NOW()))::INTEGER
      ELSE 0
    END as trial_days_remaining,
    ms.current_period_start,
    ms.current_period_end,
    ms.price_monthly,
    ms.currency,
    ms.selected_addons,
    ms.preferences
  FROM merchant_subscriptions ms
  WHERE ms.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION start_merchant_trial TO authenticated;
GRANT EXECUTE ON FUNCTION activate_merchant_subscription TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_merchant_subscription TO authenticated;
GRANT EXECUTE ON FUNCTION get_merchant_subscription_with_trial_days TO authenticated;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_subscription_updated_at ON merchant_subscriptions;
CREATE TRIGGER trigger_update_subscription_updated_at
  BEFORE UPDATE ON merchant_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();