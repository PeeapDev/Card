-- =============================================
-- PEEAP PLUS - STAFF, ROLES & PERMISSIONS TABLES
-- =============================================

-- 1. ROLES TABLE - Defines available roles for Plus businesses
CREATE TABLE IF NOT EXISTS plus_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES plus_businesses(id) ON DELETE CASCADE,

  -- Role info
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL, -- e.g., 'owner', 'admin', 'manager', 'accountant', 'employee'
  description TEXT,
  color VARCHAR(20) DEFAULT '#6B7280', -- For UI display

  -- Role level (higher = more permissions)
  level INTEGER NOT NULL DEFAULT 0,

  -- System roles cannot be deleted
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(business_id, code)
);

-- 2. PERMISSIONS TABLE - Defines all available permissions
CREATE TABLE IF NOT EXISTS plus_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Permission info
  code VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'invoices.create', 'expenses.approve', 'cards.manage'
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- 'invoices', 'expenses', 'cards', 'team', 'settings', 'reports'

  -- Minimum tier required for this permission
  min_tier VARCHAR(20) DEFAULT 'business', -- 'business' or 'business_plus'

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ROLE PERMISSIONS - Maps roles to permissions
CREATE TABLE IF NOT EXISTS plus_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES plus_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES plus_permissions(id) ON DELETE CASCADE,

  -- Can be granted or denied explicitly
  granted BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(role_id, permission_id)
);

-- 4. DEPARTMENTS TABLE - Organize staff into departments
CREATE TABLE IF NOT EXISTS plus_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES plus_businesses(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  code VARCHAR(50),
  description TEXT,

  -- Budget tracking
  monthly_budget DECIMAL(15, 2),
  budget_currency VARCHAR(3) DEFAULT 'NLE',

  -- Department head
  head_staff_id UUID, -- Will reference plus_staff after it's created

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(business_id, name)
);

-- 5. STAFF TABLE - Team members for Plus businesses
CREATE TABLE IF NOT EXISTS plus_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES plus_businesses(id) ON DELETE CASCADE,

  -- Link to Peeap user (from my.peeap.com)
  user_id UUID NOT NULL, -- References users table

  -- Staff info (cached from user profile)
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(50),
  avatar_url TEXT,

  -- Role assignment
  role_id UUID REFERENCES plus_roles(id) ON DELETE SET NULL,
  department_id UUID REFERENCES plus_departments(id) ON DELETE SET NULL,

  -- Job info
  job_title VARCHAR(100),
  employee_id VARCHAR(50), -- Internal employee ID

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'suspended', 'removed'
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  invited_by UUID, -- Staff ID who sent the invite

  -- Card settings (for Business++ with cards)
  has_card BOOLEAN DEFAULT false,
  card_id UUID, -- Reference to issued card
  spending_limit DECIMAL(15, 2),
  spending_limit_period VARCHAR(20) DEFAULT 'monthly', -- 'daily', 'weekly', 'monthly'

  -- Expense settings
  expense_approval_required BOOLEAN DEFAULT true,
  auto_approve_limit DECIMAL(15, 2) DEFAULT 0,

  -- Permissions override (additional permissions beyond role)
  extra_permissions JSONB DEFAULT '[]',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(business_id, user_id),
  UNIQUE(business_id, email)
);

-- Add foreign key for department head after plus_staff is created
ALTER TABLE plus_departments
  ADD CONSTRAINT fk_department_head
  FOREIGN KEY (head_staff_id)
  REFERENCES plus_staff(id)
  ON DELETE SET NULL;

-- 6. STAFF INVITATIONS - Track pending invitations
CREATE TABLE IF NOT EXISTS plus_staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES plus_businesses(id) ON DELETE CASCADE,

  -- Invitee info
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  first_name VARCHAR(100),
  last_name VARCHAR(100),

  -- Role and department assignment
  role_id UUID REFERENCES plus_roles(id) ON DELETE SET NULL,
  department_id UUID REFERENCES plus_departments(id) ON DELETE SET NULL,
  job_title VARCHAR(100),

  -- Invitation details
  invitation_token VARCHAR(100) NOT NULL UNIQUE,
  invited_by UUID NOT NULL, -- Staff ID
  message TEXT, -- Personal message

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'expired'
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(business_id, email, status) -- Can only have one pending invite per email
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_plus_roles_business ON plus_roles(business_id);
CREATE INDEX IF NOT EXISTS idx_plus_role_permissions_role ON plus_role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_plus_departments_business ON plus_departments(business_id);
CREATE INDEX IF NOT EXISTS idx_plus_staff_business ON plus_staff(business_id);
CREATE INDEX IF NOT EXISTS idx_plus_staff_user ON plus_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_plus_staff_email ON plus_staff(email);
CREATE INDEX IF NOT EXISTS idx_plus_staff_status ON plus_staff(status);
CREATE INDEX IF NOT EXISTS idx_plus_invitations_business ON plus_staff_invitations(business_id);
CREATE INDEX IF NOT EXISTS idx_plus_invitations_email ON plus_staff_invitations(email);
CREATE INDEX IF NOT EXISTS idx_plus_invitations_token ON plus_staff_invitations(invitation_token);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE plus_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plus_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plus_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plus_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE plus_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE plus_staff_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for plus_roles
CREATE POLICY "Allow read plus_roles" ON plus_roles FOR SELECT USING (true);
CREATE POLICY "Allow insert plus_roles" ON plus_roles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update plus_roles" ON plus_roles FOR UPDATE USING (true);
CREATE POLICY "Allow delete plus_roles" ON plus_roles FOR DELETE USING (true);

-- Policies for plus_permissions (read-only for most users)
CREATE POLICY "Allow read plus_permissions" ON plus_permissions FOR SELECT USING (true);
CREATE POLICY "Allow admin insert plus_permissions" ON plus_permissions FOR INSERT WITH CHECK (true);

-- Policies for plus_role_permissions
CREATE POLICY "Allow read plus_role_permissions" ON plus_role_permissions FOR SELECT USING (true);
CREATE POLICY "Allow insert plus_role_permissions" ON plus_role_permissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow delete plus_role_permissions" ON plus_role_permissions FOR DELETE USING (true);

-- Policies for plus_departments
CREATE POLICY "Allow read plus_departments" ON plus_departments FOR SELECT USING (true);
CREATE POLICY "Allow insert plus_departments" ON plus_departments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update plus_departments" ON plus_departments FOR UPDATE USING (true);
CREATE POLICY "Allow delete plus_departments" ON plus_departments FOR DELETE USING (true);

-- Policies for plus_staff
CREATE POLICY "Allow read plus_staff" ON plus_staff FOR SELECT USING (true);
CREATE POLICY "Allow insert plus_staff" ON plus_staff FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update plus_staff" ON plus_staff FOR UPDATE USING (true);
CREATE POLICY "Allow delete plus_staff" ON plus_staff FOR DELETE USING (true);

-- Policies for plus_staff_invitations
CREATE POLICY "Allow read plus_staff_invitations" ON plus_staff_invitations FOR SELECT USING (true);
CREATE POLICY "Allow insert plus_staff_invitations" ON plus_staff_invitations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update plus_staff_invitations" ON plus_staff_invitations FOR UPDATE USING (true);
CREATE POLICY "Allow delete plus_staff_invitations" ON plus_staff_invitations FOR DELETE USING (true);

-- =============================================
-- SEED DATA - DEFAULT PERMISSIONS
-- =============================================

INSERT INTO plus_permissions (code, name, description, category, min_tier) VALUES
  -- Dashboard
  ('dashboard.view', 'View Dashboard', 'Access the main dashboard', 'dashboard', 'business'),

  -- Invoices
  ('invoices.view', 'View Invoices', 'View all invoices', 'invoices', 'business'),
  ('invoices.create', 'Create Invoices', 'Create new invoices', 'invoices', 'business'),
  ('invoices.edit', 'Edit Invoices', 'Edit existing invoices', 'invoices', 'business'),
  ('invoices.delete', 'Delete Invoices', 'Delete invoices', 'invoices', 'business'),
  ('invoices.send', 'Send Invoices', 'Send invoices to customers', 'invoices', 'business'),

  -- Subscriptions
  ('subscriptions.view', 'View Subscriptions', 'View subscription plans', 'subscriptions', 'business'),
  ('subscriptions.create', 'Create Subscriptions', 'Create subscription plans', 'subscriptions', 'business'),
  ('subscriptions.edit', 'Edit Subscriptions', 'Edit subscription plans', 'subscriptions', 'business'),
  ('subscriptions.cancel', 'Cancel Subscriptions', 'Cancel subscriptions', 'subscriptions', 'business'),

  -- Expenses
  ('expenses.view', 'View Expenses', 'View all expenses', 'expenses', 'business_plus'),
  ('expenses.create', 'Create Expenses', 'Submit expense reports', 'expenses', 'business_plus'),
  ('expenses.approve', 'Approve Expenses', 'Approve or reject expenses', 'expenses', 'business_plus'),
  ('expenses.reimburse', 'Reimburse Expenses', 'Process expense reimbursements', 'expenses', 'business_plus'),

  -- Cards
  ('cards.view', 'View Cards', 'View corporate cards', 'cards', 'business_plus'),
  ('cards.issue', 'Issue Cards', 'Issue new corporate cards', 'cards', 'business_plus'),
  ('cards.manage', 'Manage Cards', 'Set limits, freeze/unfreeze cards', 'cards', 'business_plus'),
  ('cards.transactions', 'View Card Transactions', 'View card transaction history', 'cards', 'business_plus'),

  -- Team
  ('team.view', 'View Team', 'View team members', 'team', 'business'),
  ('team.invite', 'Invite Members', 'Invite new team members', 'team', 'business'),
  ('team.manage', 'Manage Team', 'Edit roles, remove members', 'team', 'business'),
  ('team.departments', 'Manage Departments', 'Create and manage departments', 'team', 'business_plus'),

  -- Reports
  ('reports.view', 'View Reports', 'View financial reports', 'reports', 'business'),
  ('reports.export', 'Export Reports', 'Export reports to CSV/PDF', 'reports', 'business'),
  ('reports.advanced', 'Advanced Reports', 'Access advanced analytics', 'reports', 'business_plus'),

  -- Settings
  ('settings.view', 'View Settings', 'View business settings', 'settings', 'business'),
  ('settings.edit', 'Edit Settings', 'Modify business settings', 'settings', 'business'),
  ('settings.billing', 'Manage Billing', 'View and manage billing', 'settings', 'business'),
  ('settings.api', 'API Access', 'Manage API keys and webhooks', 'settings', 'business'),

  -- Payments
  ('payments.view', 'View Payments', 'View payment history', 'payments', 'business'),
  ('payments.create', 'Create Payments', 'Make payments and transfers', 'payments', 'business'),
  ('payments.batch', 'Batch Payments', 'Process batch payments', 'payments', 'business_plus'),
  ('payments.approve', 'Approve Payments', 'Approve pending payments', 'payments', 'business')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- FUNCTION: Create default roles for new business
-- =============================================

CREATE OR REPLACE FUNCTION create_default_plus_roles()
RETURNS TRIGGER AS $$
DECLARE
  owner_role_id UUID;
  admin_role_id UUID;
  manager_role_id UUID;
  accountant_role_id UUID;
  employee_role_id UUID;
BEGIN
  -- Create Owner role (highest level)
  INSERT INTO plus_roles (business_id, name, code, description, level, is_system, color)
  VALUES (NEW.id, 'Owner', 'owner', 'Full access to all features', 100, true, '#7C3AED')
  RETURNING id INTO owner_role_id;

  -- Create Admin role
  INSERT INTO plus_roles (business_id, name, code, description, level, is_system, color)
  VALUES (NEW.id, 'Administrator', 'admin', 'Administrative access', 90, true, '#2563EB')
  RETURNING id INTO admin_role_id;

  -- Create Manager role
  INSERT INTO plus_roles (business_id, name, code, description, level, is_system, color)
  VALUES (NEW.id, 'Manager', 'manager', 'Team and expense management', 70, true, '#059669')
  RETURNING id INTO manager_role_id;

  -- Create Accountant role
  INSERT INTO plus_roles (business_id, name, code, description, level, is_system, color)
  VALUES (NEW.id, 'Accountant', 'accountant', 'Financial operations access', 60, true, '#D97706')
  RETURNING id INTO accountant_role_id;

  -- Create Employee role (lowest level)
  INSERT INTO plus_roles (business_id, name, code, description, level, is_system, color)
  VALUES (NEW.id, 'Employee', 'employee', 'Basic access for team members', 10, true, '#6B7280')
  RETURNING id INTO employee_role_id;

  -- Assign all permissions to Owner
  INSERT INTO plus_role_permissions (role_id, permission_id, granted)
  SELECT owner_role_id, id, true FROM plus_permissions;

  -- Assign most permissions to Admin (except settings.billing)
  INSERT INTO plus_role_permissions (role_id, permission_id, granted)
  SELECT admin_role_id, id, true FROM plus_permissions
  WHERE code NOT IN ('settings.billing');

  -- Assign manager permissions
  INSERT INTO plus_role_permissions (role_id, permission_id, granted)
  SELECT manager_role_id, id, true FROM plus_permissions
  WHERE code IN (
    'dashboard.view', 'invoices.view', 'invoices.create', 'invoices.send',
    'expenses.view', 'expenses.create', 'expenses.approve',
    'team.view', 'team.invite', 'reports.view', 'payments.view'
  );

  -- Assign accountant permissions
  INSERT INTO plus_role_permissions (role_id, permission_id, granted)
  SELECT accountant_role_id, id, true FROM plus_permissions
  WHERE code IN (
    'dashboard.view', 'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.send',
    'subscriptions.view', 'expenses.view', 'expenses.approve', 'expenses.reimburse',
    'reports.view', 'reports.export', 'reports.advanced',
    'payments.view', 'payments.create', 'payments.batch', 'payments.approve'
  );

  -- Assign employee permissions
  INSERT INTO plus_role_permissions (role_id, permission_id, granted)
  SELECT employee_role_id, id, true FROM plus_permissions
  WHERE code IN (
    'dashboard.view', 'invoices.view', 'expenses.view', 'expenses.create',
    'cards.view', 'cards.transactions', 'team.view'
  );

  -- Create default departments
  INSERT INTO plus_departments (business_id, name, code, description)
  VALUES
    (NEW.id, 'General', 'general', 'Default department for all staff'),
    (NEW.id, 'Finance', 'finance', 'Finance and accounting team'),
    (NEW.id, 'Operations', 'operations', 'Operations and logistics');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create roles when a business is created
DROP TRIGGER IF EXISTS trigger_create_default_plus_roles ON plus_businesses;
CREATE TRIGGER trigger_create_default_plus_roles
  AFTER INSERT ON plus_businesses
  FOR EACH ROW
  EXECUTE FUNCTION create_default_plus_roles();

-- =============================================
-- RELOAD SCHEMA CACHE
-- =============================================

SELECT pg_notify('pgrst', 'reload schema');
