-- School Accounting System
-- Tracks income and expenses for schools
-- File named with 'z_' prefix to ensure it runs after other 20250124 migrations

-- Accounting entries table
CREATE TABLE IF NOT EXISTS school_accounting_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount BIGINT NOT NULL,
  reference TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  payment_method TEXT,
  transaction_id TEXT,
  vendor_name TEXT,
  vendor_id TEXT,
  receipt_url TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounting_school ON school_accounting_entries(school_id);
CREATE INDEX IF NOT EXISTS idx_accounting_type ON school_accounting_entries(type);
CREATE INDEX IF NOT EXISTS idx_accounting_date ON school_accounting_entries(date);
CREATE INDEX IF NOT EXISTS idx_accounting_category ON school_accounting_entries(category);

-- Accounting categories table
CREATE TABLE IF NOT EXISTS school_accounting_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, name, type)
);

-- Insert default categories
INSERT INTO school_accounting_categories (school_id, name, type, description, is_default) VALUES
  ('default', 'School Fees', 'income', 'Tuition and registration fees', TRUE),
  ('default', 'Exam Fees', 'income', 'Examination and assessment fees', TRUE),
  ('default', 'Donations', 'income', 'Donations and grants', TRUE),
  ('default', 'Sales', 'income', 'Product and service sales', TRUE),
  ('default', 'Other Income', 'income', 'Miscellaneous income', TRUE),
  ('default', 'Salaries', 'expense', 'Staff salaries and wages', TRUE),
  ('default', 'Utilities', 'expense', 'Electricity, water, internet', TRUE),
  ('default', 'Supplies', 'expense', 'Office and teaching supplies', TRUE),
  ('default', 'Maintenance', 'expense', 'Building and equipment maintenance', TRUE),
  ('default', 'Equipment', 'expense', 'Furniture, computers, etc.', TRUE),
  ('default', 'Transport', 'expense', 'Transportation costs', TRUE),
  ('default', 'Other Expense', 'expense', 'Miscellaneous expenses', TRUE)
ON CONFLICT (school_id, name, type) DO NOTHING;

-- Staff salary configuration (simple - no generated columns)
CREATE TABLE IF NOT EXISTS school_staff_salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  staff_name TEXT NOT NULL,
  staff_email TEXT,
  staff_phone TEXT,
  department TEXT,
  position TEXT,
  base_salary BIGINT NOT NULL DEFAULT 0,
  allowances JSONB DEFAULT '[]'::JSONB,
  deductions JSONB DEFAULT '[]'::JSONB,
  total_allowances BIGINT NOT NULL DEFAULT 0,
  total_deductions BIGINT NOT NULL DEFAULT 0,
  net_salary BIGINT NOT NULL DEFAULT 0,
  bank_name TEXT,
  account_number TEXT,
  peeap_user_id UUID,
  peeap_wallet_id UUID,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_salaries_school ON school_staff_salaries(school_id);

-- RLS Policies
ALTER TABLE school_accounting_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_accounting_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_staff_salaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounting_entries_policy" ON school_accounting_entries;
CREATE POLICY "accounting_entries_policy" ON school_accounting_entries FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "accounting_categories_policy" ON school_accounting_categories;
CREATE POLICY "accounting_categories_policy" ON school_accounting_categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "staff_salaries_policy" ON school_staff_salaries;
CREATE POLICY "staff_salaries_policy" ON school_staff_salaries FOR ALL USING (true) WITH CHECK (true);
