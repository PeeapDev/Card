-- ============================================
-- RBAC (Role-Based Access Control) Migration
-- Production Security Implementation
-- ============================================

-- 1. CREATE ROLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    level INTEGER NOT NULL DEFAULT 0, -- Higher level = more permissions
    is_system BOOLEAN DEFAULT FALSE, -- System roles cannot be deleted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CREATE PERMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'users.read', 'users.write'
    display_name VARCHAR(150) NOT NULL,
    description TEXT,
    resource VARCHAR(50) NOT NULL, -- e.g., 'users', 'wallets', 'transactions'
    action VARCHAR(50) NOT NULL, -- e.g., 'read', 'write', 'delete', 'admin'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CREATE ROLE_PERMISSIONS JUNCTION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- 4. CREATE USER_ROLES TABLE (for multiple roles per user)
-- ============================================
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional role expiration
    UNIQUE(user_id, role_id)
);

-- 5. INSERT DEFAULT ROLES
-- ============================================
INSERT INTO roles (name, display_name, description, level, is_system) VALUES
    ('superadmin', 'Super Administrator', 'Full system access with all permissions', 100, TRUE),
    ('admin', 'Administrator', 'Administrative access to manage users, transactions, and settings', 80, TRUE),
    ('support', 'Support Staff', 'Customer support access to view and assist users', 60, FALSE),
    ('merchant', 'Merchant', 'Business account with payment processing capabilities', 40, TRUE),
    ('agent', 'Agent', 'Field agent for cash-in/cash-out operations', 40, TRUE),
    ('user', 'Regular User', 'Standard user with basic wallet and transfer capabilities', 10, TRUE)
ON CONFLICT (name) DO NOTHING;

-- 6. INSERT DEFAULT PERMISSIONS
-- ============================================
INSERT INTO permissions (name, display_name, resource, action, description) VALUES
    -- User permissions
    ('users.read.own', 'Read Own Profile', 'users', 'read', 'View own user profile'),
    ('users.write.own', 'Update Own Profile', 'users', 'write', 'Update own user profile'),
    ('users.read.all', 'Read All Users', 'users', 'read', 'View all user profiles'),
    ('users.write.all', 'Update All Users', 'users', 'write', 'Update any user profile'),
    ('users.delete', 'Delete Users', 'users', 'delete', 'Delete user accounts'),
    ('users.suspend', 'Suspend Users', 'users', 'admin', 'Suspend/activate user accounts'),

    -- Wallet permissions
    ('wallets.read.own', 'Read Own Wallets', 'wallets', 'read', 'View own wallets'),
    ('wallets.write.own', 'Manage Own Wallets', 'wallets', 'write', 'Create/update own wallets'),
    ('wallets.read.all', 'Read All Wallets', 'wallets', 'read', 'View all wallets'),
    ('wallets.write.all', 'Manage All Wallets', 'wallets', 'write', 'Manage any wallet'),
    ('wallets.adjust', 'Adjust Balances', 'wallets', 'admin', 'Adjust wallet balances'),

    -- Transaction permissions
    ('transactions.read.own', 'Read Own Transactions', 'transactions', 'read', 'View own transactions'),
    ('transactions.create', 'Create Transactions', 'transactions', 'write', 'Initiate transfers'),
    ('transactions.read.all', 'Read All Transactions', 'transactions', 'read', 'View all transactions'),
    ('transactions.reverse', 'Reverse Transactions', 'transactions', 'admin', 'Reverse/refund transactions'),

    -- Card permissions
    ('cards.read.own', 'Read Own Cards', 'cards', 'read', 'View own cards'),
    ('cards.manage.own', 'Manage Own Cards', 'cards', 'write', 'Freeze/unfreeze own cards'),
    ('cards.read.all', 'Read All Cards', 'cards', 'read', 'View all cards'),
    ('cards.issue', 'Issue Cards', 'cards', 'admin', 'Issue new cards'),
    ('cards.manage.all', 'Manage All Cards', 'cards', 'admin', 'Manage any card'),

    -- KYC permissions
    ('kyc.submit', 'Submit KYC', 'kyc', 'write', 'Submit KYC documents'),
    ('kyc.review', 'Review KYC', 'kyc', 'admin', 'Review and approve KYC submissions'),

    -- Fee permissions
    ('fees.read', 'Read Fees', 'fees', 'read', 'View fee configurations'),
    ('fees.manage', 'Manage Fees', 'fees', 'admin', 'Create/update fee configurations'),

    -- Merchant permissions
    ('merchant.dashboard', 'Merchant Dashboard', 'merchant', 'read', 'Access merchant dashboard'),
    ('merchant.payments', 'Accept Payments', 'merchant', 'write', 'Accept customer payments'),
    ('merchant.refund', 'Issue Refunds', 'merchant', 'write', 'Issue refunds to customers'),

    -- Agent permissions
    ('agent.dashboard', 'Agent Dashboard', 'agent', 'read', 'Access agent dashboard'),
    ('agent.cashin', 'Cash In', 'agent', 'write', 'Perform cash-in operations'),
    ('agent.cashout', 'Cash Out', 'agent', 'write', 'Perform cash-out operations'),

    -- Admin permissions
    ('admin.dashboard', 'Admin Dashboard', 'admin', 'read', 'Access admin dashboard'),
    ('admin.settings', 'System Settings', 'admin', 'admin', 'Manage system settings'),
    ('admin.logs', 'View Logs', 'admin', 'read', 'View system logs'),
    ('admin.reports', 'View Reports', 'admin', 'read', 'View system reports'),

    -- Role management
    ('roles.read', 'Read Roles', 'roles', 'read', 'View roles and permissions'),
    ('roles.manage', 'Manage Roles', 'roles', 'admin', 'Create/update roles and permissions'),
    ('roles.assign', 'Assign Roles', 'roles', 'admin', 'Assign roles to users')
ON CONFLICT (name) DO NOTHING;

-- 7. ASSIGN PERMISSIONS TO ROLES
-- ============================================

-- SuperAdmin gets ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'superadmin'
ON CONFLICT DO NOTHING;

-- Admin permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.name IN (
    'users.read.own', 'users.write.own', 'users.read.all', 'users.write.all', 'users.suspend',
    'wallets.read.own', 'wallets.write.own', 'wallets.read.all', 'wallets.adjust',
    'transactions.read.own', 'transactions.create', 'transactions.read.all', 'transactions.reverse',
    'cards.read.own', 'cards.manage.own', 'cards.read.all', 'cards.issue', 'cards.manage.all',
    'kyc.submit', 'kyc.review',
    'fees.read', 'fees.manage',
    'admin.dashboard', 'admin.settings', 'admin.logs', 'admin.reports',
    'roles.read', 'roles.assign'
)
ON CONFLICT DO NOTHING;

-- Support staff permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'support' AND p.name IN (
    'users.read.own', 'users.write.own', 'users.read.all',
    'wallets.read.own', 'wallets.read.all',
    'transactions.read.own', 'transactions.read.all',
    'cards.read.own', 'cards.read.all',
    'kyc.review',
    'admin.dashboard', 'admin.logs'
)
ON CONFLICT DO NOTHING;

-- Merchant permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'merchant' AND p.name IN (
    'users.read.own', 'users.write.own',
    'wallets.read.own', 'wallets.write.own',
    'transactions.read.own', 'transactions.create',
    'cards.read.own', 'cards.manage.own',
    'kyc.submit',
    'merchant.dashboard', 'merchant.payments', 'merchant.refund'
)
ON CONFLICT DO NOTHING;

-- Agent permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'agent' AND p.name IN (
    'users.read.own', 'users.write.own',
    'wallets.read.own', 'wallets.write.own',
    'transactions.read.own', 'transactions.create',
    'kyc.submit',
    'agent.dashboard', 'agent.cashin', 'agent.cashout'
)
ON CONFLICT DO NOTHING;

-- Regular user permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'user' AND p.name IN (
    'users.read.own', 'users.write.own',
    'wallets.read.own', 'wallets.write.own',
    'transactions.read.own', 'transactions.create',
    'cards.read.own', 'cards.manage.own',
    'kyc.submit'
)
ON CONFLICT DO NOTHING;

-- 8. MIGRATE EXISTING USERS TO user_roles TABLE
-- ============================================
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON (
    CASE
        WHEN u.roles ILIKE '%superadmin%' THEN r.name = 'superadmin'
        WHEN u.roles ILIKE '%admin%' THEN r.name = 'admin'
        WHEN u.roles ILIKE '%merchant%' THEN r.name = 'merchant'
        WHEN u.roles ILIKE '%agent%' THEN r.name = 'agent'
        ELSE r.name = 'user'
    END
)
ON CONFLICT DO NOTHING;

-- 9. CREATE HELPER FUNCTIONS
-- ============================================

-- Function to check if user has a specific permission
CREATE OR REPLACE FUNCTION user_has_permission(p_user_id UUID, p_permission VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN role_permissions rp ON rp.role_id = ur.role_id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = p_user_id
        AND p.name = p_permission
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION user_has_role(p_user_id UUID, p_role VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = p_user_id
        AND r.name = p_role
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's highest role level
CREATE OR REPLACE FUNCTION user_role_level(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_level INTEGER;
BEGIN
    SELECT MAX(r.level) INTO v_level
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW());

    RETURN COALESCE(v_level, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all permissions for a user
CREATE OR REPLACE FUNCTION user_permissions(p_user_id UUID)
RETURNS TABLE(permission_name VARCHAR, resource VARCHAR, action VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.name, p.resource, p.action
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = p_user_id
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. SEARCH USERS FUNCTION (with RBAC)
-- ============================================
CREATE OR REPLACE FUNCTION search_users_secure(
    p_searcher_id UUID,
    p_query VARCHAR,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    id UUID,
    first_name VARCHAR,
    last_name VARCHAR,
    username VARCHAR,
    phone VARCHAR,
    email VARCHAR,
    profile_picture TEXT,
    roles VARCHAR,
    status VARCHAR
) AS $$
DECLARE
    v_searcher_level INTEGER;
BEGIN
    -- Get searcher's role level
    v_searcher_level := user_role_level(p_searcher_id);

    -- Return users based on searcher's role level
    RETURN QUERY
    SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.username,
        u.phone,
        u.email,
        u.profile_picture,
        u.roles,
        u.status
    FROM users u
    WHERE u.status = 'ACTIVE'
    AND u.id != p_searcher_id
    AND (
        -- Admins/SuperAdmins can see everyone
        v_searcher_level >= 80
        OR
        -- Regular users can only see other regular users
        (v_searcher_level < 80 AND u.roles = 'user')
    )
    AND (
        u.phone ILIKE '%' || p_query || '%'
        OR u.first_name ILIKE '%' || p_query || '%'
        OR u.last_name ILIKE '%' || p_query || '%'
        OR u.email ILIKE '%' || p_query || '%'
        OR u.username ILIKE '%' || p_query || '%'
    )
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "wallets_select_policy" ON wallets;
DROP POLICY IF EXISTS "wallets_update_policy" ON wallets;
DROP POLICY IF EXISTS "transactions_select_policy" ON transactions;
DROP POLICY IF EXISTS "transactions_insert_policy" ON transactions;
DROP POLICY IF EXISTS "cards_select_policy" ON cards;

-- Users table policies
CREATE POLICY "users_select_policy" ON users
    FOR SELECT USING (
        -- User can see themselves
        id = auth.uid()
        OR
        -- Admins can see everyone
        user_role_level(auth.uid()) >= 80
        OR
        -- Regular users can only see other regular users
        (user_role_level(auth.uid()) < 80 AND roles = 'user' AND status = 'ACTIVE')
    );

CREATE POLICY "users_update_policy" ON users
    FOR UPDATE USING (
        -- User can update themselves
        id = auth.uid()
        OR
        -- Admins can update anyone
        user_role_level(auth.uid()) >= 80
    );

-- Wallets table policies
CREATE POLICY "wallets_select_policy" ON wallets
    FOR SELECT USING (
        -- User can see their own wallets
        user_id = auth.uid()
        OR
        -- Admins can see all wallets
        user_role_level(auth.uid()) >= 80
    );

CREATE POLICY "wallets_update_policy" ON wallets
    FOR UPDATE USING (
        -- User can update their own wallets (limited operations)
        user_id = auth.uid()
        OR
        -- Admins can update any wallet
        user_role_level(auth.uid()) >= 80
    );

-- Transactions table policies
CREATE POLICY "transactions_select_policy" ON transactions
    FOR SELECT USING (
        -- User can see transactions from their wallets
        wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid())
        OR
        -- Admins can see all transactions
        user_role_level(auth.uid()) >= 80
    );

CREATE POLICY "transactions_insert_policy" ON transactions
    FOR INSERT WITH CHECK (
        -- User can create transactions from their wallets
        wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid())
        OR
        -- Admins can create any transaction
        user_role_level(auth.uid()) >= 80
    );

-- Cards table policies
CREATE POLICY "cards_select_policy" ON cards
    FOR SELECT USING (
        -- User can see their own cards
        user_id = auth.uid()
        OR
        -- Admins can see all cards
        user_role_level(auth.uid()) >= 80
    );

-- Roles table policies (read-only for most users)
CREATE POLICY "roles_select_policy" ON roles
    FOR SELECT USING (true); -- Everyone can see roles

CREATE POLICY "roles_modify_policy" ON roles
    FOR ALL USING (
        -- Only superadmins can modify roles
        user_role_level(auth.uid()) >= 100
    );

-- Permissions table policies
CREATE POLICY "permissions_select_policy" ON permissions
    FOR SELECT USING (
        -- Admins and above can see permissions
        user_role_level(auth.uid()) >= 80
    );

-- User roles table policies
CREATE POLICY "user_roles_select_policy" ON user_roles
    FOR SELECT USING (
        -- User can see their own roles
        user_id = auth.uid()
        OR
        -- Admins can see all user roles
        user_role_level(auth.uid()) >= 80
    );

CREATE POLICY "user_roles_modify_policy" ON user_roles
    FOR ALL USING (
        -- Only admins can assign roles
        user_role_level(auth.uid()) >= 80
    );

-- 12. CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_users_roles ON users(roles);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- 13. AUDIT LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Enable RLS on audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select_policy" ON audit_logs
    FOR SELECT USING (
        -- Only admins can view audit logs
        user_role_level(auth.uid()) >= 80
    );

CREATE POLICY "audit_logs_insert_policy" ON audit_logs
    FOR INSERT WITH CHECK (true); -- System can always insert

-- 14. GRANT NECESSARY PERMISSIONS
-- ============================================
GRANT SELECT ON roles TO authenticated;
GRANT SELECT ON permissions TO authenticated;
GRANT SELECT ON role_permissions TO authenticated;
GRANT SELECT, INSERT ON user_roles TO authenticated;
GRANT SELECT, INSERT ON audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_permission TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_role TO authenticated;
GRANT EXECUTE ON FUNCTION user_role_level TO authenticated;
GRANT EXECUTE ON FUNCTION user_permissions TO authenticated;
GRANT EXECUTE ON FUNCTION search_users_secure TO authenticated;

-- Done!
SELECT 'RBAC migration completed successfully!' as status;
