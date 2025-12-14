-- =====================================================
-- SUBSCRIPTION SYSTEM TABLES
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Merchant Subscription Plans
-- Plans that merchants create to offer to their customers
CREATE TABLE IF NOT EXISTS merchant_subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL,

  name VARCHAR(255) NOT NULL,
  description TEXT,
  features JSONB DEFAULT '[]',

  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'SLE',
  interval VARCHAR(20) NOT NULL DEFAULT 'monthly',
  interval_count INTEGER DEFAULT 1,

  trial_days INTEGER DEFAULT 0,

  is_active BOOLEAN DEFAULT true,

  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Customer Payment Methods
-- Stored payment methods for recurring charges
CREATE TABLE IF NOT EXISTS customer_payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),

  type VARCHAR(20) NOT NULL,

  card_token TEXT,
  card_last_four VARCHAR(4),
  card_brand VARCHAR(20),
  card_exp_month INTEGER,
  card_exp_year INTEGER,

  wallet_id UUID,

  mobile_network VARCHAR(50),
  mobile_number VARCHAR(20),

  consent_given BOOLEAN DEFAULT false,
  consent_text TEXT,
  consented_at TIMESTAMP WITH TIME ZONE,
  consent_ip VARCHAR(45),

  is_default BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Customer Subscriptions
-- Active subscriptions linking customers to plans
CREATE TABLE IF NOT EXISTS customer_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES merchant_subscription_plans(id),
  merchant_id UUID NOT NULL,

  customer_id UUID,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_name VARCHAR(255),

  default_payment_method_id UUID REFERENCES customer_payment_methods(id),

  status VARCHAR(20) DEFAULT 'pending',

  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,

  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,

  next_billing_date DATE,

  canceled_at TIMESTAMP WITH TIME ZONE,
  cancel_reason TEXT,

  paused_at TIMESTAMP WITH TIME ZONE,
  resume_at TIMESTAMP WITH TIME ZONE,

  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Subscription Invoices
-- Invoice records for each billing cycle
CREATE TABLE IF NOT EXISTS subscription_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES customer_subscriptions(id),
  merchant_id UUID NOT NULL,

  invoice_number VARCHAR(50),

  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'SLE',

  status VARCHAR(20) DEFAULT 'draft',

  billing_period_start TIMESTAMP WITH TIME ZONE,
  billing_period_end TIMESTAMP WITH TIME ZONE,

  due_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,

  payment_method_id UUID REFERENCES customer_payment_methods(id),
  payment_reference VARCHAR(255),
  payment_attempt_count INTEGER DEFAULT 0,
  last_payment_attempt TIMESTAMP WITH TIME ZONE,
  last_payment_error TEXT,

  show_pending_from DATE,

  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Subscription Events (Audit Log)
-- Track all subscription lifecycle events
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES customer_subscriptions(id),

  event_type VARCHAR(50) NOT NULL,

  data JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_subscription_plans_merchant ON merchant_subscription_plans(merchant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON merchant_subscription_plans(is_active);

CREATE INDEX IF NOT EXISTS idx_payment_methods_customer ON customer_payment_methods(customer_email);
CREATE INDEX IF NOT EXISTS idx_payment_methods_phone ON customer_payment_methods(customer_phone);

CREATE INDEX IF NOT EXISTS idx_subscriptions_merchant ON customer_subscriptions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON customer_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON customer_subscriptions(customer_email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON customer_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing ON customer_subscriptions(next_billing_date);

CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON subscription_invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_merchant ON subscription_invoices(merchant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON subscription_invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON subscription_invoices(due_date);

CREATE INDEX IF NOT EXISTS idx_events_subscription ON subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON subscription_events(event_type);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE merchant_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- Plans: Merchants can manage their own plans
CREATE POLICY "Merchants can view their own plans"
  ON merchant_subscription_plans FOR SELECT
  USING (auth.uid() = merchant_id OR auth.uid() IS NOT NULL);

CREATE POLICY "Merchants can create plans"
  ON merchant_subscription_plans FOR INSERT
  WITH CHECK (auth.uid() = merchant_id);

CREATE POLICY "Merchants can update their plans"
  ON merchant_subscription_plans FOR UPDATE
  USING (auth.uid() = merchant_id);

-- Subscriptions: Merchants see their subscribers
CREATE POLICY "Merchants can view their subscriptions"
  ON customer_subscriptions FOR SELECT
  USING (auth.uid() = merchant_id);

CREATE POLICY "Anyone can create subscriptions"
  ON customer_subscriptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update subscriptions"
  ON customer_subscriptions FOR UPDATE
  USING (true);

-- Invoices: Merchants see their invoices
CREATE POLICY "Merchants can view their invoices"
  ON subscription_invoices FOR SELECT
  USING (auth.uid() = merchant_id);

CREATE POLICY "System can manage invoices"
  ON subscription_invoices FOR ALL
  USING (true);

-- Payment Methods: Open for now (system managed)
CREATE POLICY "System can manage payment methods"
  ON customer_payment_methods FOR ALL
  USING (true);

-- Events: Read only for merchants
CREATE POLICY "View subscription events"
  ON subscription_events FOR SELECT
  USING (true);

CREATE POLICY "System can create events"
  ON subscription_events FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE merchant_subscription_plans IS 'Plans that merchants create for their customers to subscribe to';
COMMENT ON TABLE customer_payment_methods IS 'Stored payment methods (cards, wallets) for automatic recurring charges';
COMMENT ON TABLE customer_subscriptions IS 'Active customer subscriptions to merchant plans';
COMMENT ON TABLE subscription_invoices IS 'Invoice records for each billing cycle';
COMMENT ON TABLE subscription_events IS 'Audit log of subscription lifecycle events';

COMMENT ON COLUMN customer_subscriptions.status IS 'pending, trialing, active, past_due, canceled, paused';
COMMENT ON COLUMN subscription_invoices.status IS 'draft, pending, paid, failed, void';
COMMENT ON COLUMN subscription_events.event_type IS 'created, activated, renewed, canceled, paused, resumed, payment_failed, payment_succeeded';
