-- Migration: Invoice Types & Recurring Billing
-- Adds support for different invoice types and recurring invoices

-- =============================================
-- ADD INVOICE TYPE COLUMN
-- =============================================
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(30) DEFAULT 'standard';
-- Types: 'standard', 'proforma', 'quote', 'credit_note', 'debit_note', 'receipt'

COMMENT ON COLUMN invoices.invoice_type IS 'Invoice type: standard, proforma, quote, credit_note, debit_note, receipt';

-- =============================================
-- ADD RECURRING BILLING COLUMNS
-- =============================================
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS recurring_frequency VARCHAR(20);
-- Frequencies: 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS recurring_start_date DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS recurring_end_date DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS recurring_next_date DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS recurring_count INTEGER DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS recurring_max_count INTEGER;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS parent_invoice_id UUID REFERENCES invoices(id);

COMMENT ON COLUMN invoices.is_recurring IS 'Whether this is a recurring invoice';
COMMENT ON COLUMN invoices.recurring_frequency IS 'Billing frequency: weekly, biweekly, monthly, quarterly, yearly';
COMMENT ON COLUMN invoices.recurring_next_date IS 'Next date to generate recurring invoice';
COMMENT ON COLUMN invoices.parent_invoice_id IS 'Reference to parent recurring invoice template';

-- =============================================
-- RECURRING INVOICES TABLE (Templates)
-- =============================================
CREATE TABLE IF NOT EXISTS recurring_invoice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES merchant_businesses(id),
  merchant_id UUID REFERENCES profiles(id),

  -- Template name
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Customer
  customer_id UUID REFERENCES profiles(id),
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),

  -- Invoice details
  invoice_type VARCHAR(30) DEFAULT 'standard',
  title VARCHAR(255),
  currency VARCHAR(3) DEFAULT 'SLE',
  items JSONB DEFAULT '[]'::jsonb,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  terms TEXT,

  -- Recurring settings
  frequency VARCHAR(20) NOT NULL, -- 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'
  start_date DATE NOT NULL,
  end_date DATE,
  due_days INTEGER DEFAULT 14, -- Days from issue to due date
  max_occurrences INTEGER, -- NULL = unlimited

  -- Tracking
  last_generated_at TIMESTAMPTZ,
  next_generation_date DATE,
  total_generated INTEGER DEFAULT 0,
  total_amount_billed DECIMAL(15,2) DEFAULT 0,

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'cancelled', 'completed'

  -- Auto-send settings
  auto_send BOOLEAN DEFAULT true,
  send_days_before INTEGER DEFAULT 0, -- Days before due date to send

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_invoices_recurring ON invoices(is_recurring) WHERE is_recurring = true;
CREATE INDEX IF NOT EXISTS idx_invoices_recurring_next ON invoices(recurring_next_date) WHERE is_recurring = true AND recurring_next_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_parent ON invoices(parent_invoice_id) WHERE parent_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recurring_templates_business ON recurring_invoice_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_recurring_templates_status ON recurring_invoice_templates(status);
CREATE INDEX IF NOT EXISTS idx_recurring_templates_next ON recurring_invoice_templates(next_generation_date) WHERE status = 'active';

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE recurring_invoice_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recurring_templates_select_policy ON recurring_invoice_templates;
CREATE POLICY recurring_templates_select_policy ON recurring_invoice_templates FOR SELECT USING (
  merchant_id = auth.uid()
  OR business_id IN (SELECT id FROM merchant_businesses WHERE merchant_id = auth.uid())
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin']))
);

DROP POLICY IF EXISTS recurring_templates_insert_policy ON recurring_invoice_templates;
CREATE POLICY recurring_templates_insert_policy ON recurring_invoice_templates FOR INSERT WITH CHECK (
  merchant_id = auth.uid()
  OR business_id IN (SELECT id FROM merchant_businesses WHERE merchant_id = auth.uid())
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin']))
);

DROP POLICY IF EXISTS recurring_templates_update_policy ON recurring_invoice_templates;
CREATE POLICY recurring_templates_update_policy ON recurring_invoice_templates FOR UPDATE USING (
  merchant_id = auth.uid()
  OR business_id IN (SELECT id FROM merchant_businesses WHERE merchant_id = auth.uid())
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin']))
);

DROP POLICY IF EXISTS recurring_templates_delete_policy ON recurring_invoice_templates;
CREATE POLICY recurring_templates_delete_policy ON recurring_invoice_templates FOR DELETE USING (
  merchant_id = auth.uid()
  OR business_id IN (SELECT id FROM merchant_businesses WHERE merchant_id = auth.uid())
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (roles @> ARRAY['admin'] OR roles @> ARRAY['superadmin']))
);

-- =============================================
-- FUNCTION: Generate Recurring Invoice
-- =============================================
CREATE OR REPLACE FUNCTION generate_recurring_invoice(template_id UUID)
RETURNS UUID AS $$
DECLARE
  template_rec RECORD;
  new_invoice_id UUID;
  subtotal DECIMAL(15,2);
  tax_amount DECIMAL(15,2);
  total_amount DECIMAL(15,2);
  new_due_date DATE;
BEGIN
  -- Get template
  SELECT * INTO template_rec FROM recurring_invoice_templates WHERE id = template_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  -- Calculate amounts
  SELECT COALESCE(SUM((item->>'quantity')::DECIMAL * (item->>'unit_price')::DECIMAL), 0)
  INTO subtotal
  FROM jsonb_array_elements(template_rec.items) AS item;

  tax_amount := subtotal * (template_rec.tax_rate / 100);
  total_amount := subtotal + tax_amount - template_rec.discount_amount;
  new_due_date := CURRENT_DATE + template_rec.due_days;

  -- Create invoice
  INSERT INTO invoices (
    business_id, merchant_id, customer_id, customer_name, customer_email, customer_phone,
    invoice_type, title, description, currency, items,
    subtotal, tax_rate, tax_amount, discount_amount, total_amount,
    due_date, notes, terms,
    is_recurring, parent_invoice_id, status
  ) VALUES (
    template_rec.business_id, template_rec.merchant_id, template_rec.customer_id,
    template_rec.customer_name, template_rec.customer_email, template_rec.customer_phone,
    template_rec.invoice_type, template_rec.title, template_rec.description,
    template_rec.currency, template_rec.items,
    subtotal, template_rec.tax_rate, tax_amount, template_rec.discount_amount, total_amount,
    new_due_date, template_rec.notes, template_rec.terms,
    true, template_id, CASE WHEN template_rec.auto_send THEN 'sent' ELSE 'draft' END
  ) RETURNING id INTO new_invoice_id;

  -- Update template tracking
  UPDATE recurring_invoice_templates SET
    last_generated_at = NOW(),
    total_generated = total_generated + 1,
    total_amount_billed = total_amount_billed + total_amount,
    next_generation_date = CASE template_rec.frequency
      WHEN 'weekly' THEN next_generation_date + INTERVAL '1 week'
      WHEN 'biweekly' THEN next_generation_date + INTERVAL '2 weeks'
      WHEN 'monthly' THEN next_generation_date + INTERVAL '1 month'
      WHEN 'quarterly' THEN next_generation_date + INTERVAL '3 months'
      WHEN 'yearly' THEN next_generation_date + INTERVAL '1 year'
    END,
    status = CASE
      WHEN template_rec.end_date IS NOT NULL AND next_generation_date > template_rec.end_date THEN 'completed'
      WHEN template_rec.max_occurrences IS NOT NULL AND total_generated >= template_rec.max_occurrences THEN 'completed'
      ELSE 'active'
    END,
    updated_at = NOW()
  WHERE id = template_id;

  RETURN new_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: Process Due Recurring Invoices
-- =============================================
CREATE OR REPLACE FUNCTION process_due_recurring_invoices()
RETURNS INTEGER AS $$
DECLARE
  template_rec RECORD;
  generated_count INTEGER := 0;
BEGIN
  FOR template_rec IN
    SELECT id FROM recurring_invoice_templates
    WHERE status = 'active'
      AND next_generation_date <= CURRENT_DATE
      AND (end_date IS NULL OR next_generation_date <= end_date)
      AND (max_occurrences IS NULL OR total_generated < max_occurrences)
  LOOP
    PERFORM generate_recurring_invoice(template_rec.id);
    generated_count := generated_count + 1;
  END LOOP;

  RETURN generated_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- GRANTS
-- =============================================
GRANT SELECT ON recurring_invoice_templates TO authenticated;
