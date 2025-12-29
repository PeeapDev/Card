-- POS Terminal and Staff Management System
-- Enables offline POS with terminal registration and staff PIN authentication

-- ============================================================================
-- POS TERMINALS TABLE
-- Stores registered POS terminals that can work offline
-- ============================================================================
CREATE TABLE IF NOT EXISTS pos_terminals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Terminal identification
    terminal_code VARCHAR(10) UNIQUE NOT NULL, -- e.g., 'A1B2C3D4' (8 chars)
    name VARCHAR(100) NOT NULL,

    -- Merchant linkage
    merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES merchant_businesses(id) ON DELETE SET NULL,

    -- Terminal details
    location VARCHAR(200), -- e.g., 'Main Store - Counter 1'
    device_info JSONB DEFAULT '{}', -- Browser, OS, screen size info

    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    is_registered BOOLEAN DEFAULT FALSE, -- True after first PWA install/link
    registered_at TIMESTAMPTZ,

    -- Sync tracking
    last_sync_at TIMESTAMPTZ,
    last_sale_at TIMESTAMPTZ,
    pending_sync_count INTEGER DEFAULT 0,

    -- Settings
    settings JSONB DEFAULT '{
        "auto_logout_minutes": 15,
        "require_pin_for_void": true,
        "require_pin_for_discount": true,
        "allow_offline_sales": true,
        "max_offline_sales": 100,
        "receipt_printer_enabled": false
    }'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast terminal code lookup
CREATE INDEX IF NOT EXISTS idx_pos_terminals_code ON pos_terminals(terminal_code);
CREATE INDEX IF NOT EXISTS idx_pos_terminals_merchant ON pos_terminals(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pos_terminals_business ON pos_terminals(business_id);

-- ============================================================================
-- MERCHANT STAFF TABLE
-- Staff members who can login to POS with PIN
-- ============================================================================
CREATE TABLE IF NOT EXISTS merchant_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Staff identification
    staff_code VARCHAR(10) UNIQUE NOT NULL, -- e.g., 'STF-12345'
    name VARCHAR(100) NOT NULL,

    -- Merchant linkage
    merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES merchant_businesses(id) ON DELETE SET NULL,

    -- Authentication
    pin_hash VARCHAR(255), -- Hashed 8-digit PIN
    pin_set_at TIMESTAMPTZ,
    requires_pin_reset BOOLEAN DEFAULT TRUE, -- New staff must set PIN
    failed_pin_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,

    -- Role and permissions
    role VARCHAR(30) DEFAULT 'cashier' CHECK (role IN ('cashier', 'supervisor', 'manager', 'admin')),
    permissions JSONB DEFAULT '{
        "can_void_sale": false,
        "can_apply_discount": false,
        "can_view_reports": false,
        "can_manage_inventory": false,
        "can_open_drawer": true,
        "can_process_refund": false,
        "max_discount_percent": 0
    }'::jsonb,

    -- Contact (for PIN reset notifications)
    phone VARCHAR(20),
    email VARCHAR(255),

    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),

    -- Session tracking
    current_terminal_id UUID REFERENCES pos_terminals(id) ON DELETE SET NULL,
    last_login_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_merchant_staff_merchant ON merchant_staff(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_staff_business ON merchant_staff(business_id);
CREATE INDEX IF NOT EXISTS idx_merchant_staff_code ON merchant_staff(staff_code);

-- ============================================================================
-- STAFF SESSIONS TABLE
-- Track active staff sessions on terminals
-- ============================================================================
CREATE TABLE IF NOT EXISTS pos_staff_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    staff_id UUID NOT NULL REFERENCES merchant_staff(id) ON DELETE CASCADE,
    terminal_id UUID NOT NULL REFERENCES pos_terminals(id) ON DELETE CASCADE,

    -- Session details
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,

    -- Activity summary
    total_sales INTEGER DEFAULT 0,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    total_voids INTEGER DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    end_reason VARCHAR(50), -- 'logout', 'timeout', 'forced', 'shift_end'

    UNIQUE(staff_id, terminal_id, is_active) -- Only one active session per staff per terminal
);

CREATE INDEX IF NOT EXISTS idx_pos_staff_sessions_active ON pos_staff_sessions(terminal_id, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- OFFLINE SALES QUEUE TABLE
-- Stores sales made offline, pending sync
-- ============================================================================
CREATE TABLE IF NOT EXISTS pos_offline_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Reference to actual sale (after sync)
    pos_sale_id UUID REFERENCES pos_sales(id) ON DELETE SET NULL,

    -- Terminal and staff
    terminal_id UUID NOT NULL REFERENCES pos_terminals(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES merchant_staff(id) ON DELETE SET NULL,

    -- Offline identifier (generated on device)
    offline_id VARCHAR(50) NOT NULL,

    -- Sale data (complete sale object as JSON)
    sale_data JSONB NOT NULL,

    -- Sync status
    sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed', 'conflict')),
    sync_attempts INTEGER DEFAULT 0,
    last_sync_attempt TIMESTAMPTZ,
    sync_error TEXT,
    synced_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(), -- When created offline

    UNIQUE(terminal_id, offline_id)
);

CREATE INDEX IF NOT EXISTS idx_pos_offline_sales_pending ON pos_offline_sales(terminal_id, sync_status) WHERE sync_status = 'pending';

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Generate unique terminal code (8 alphanumeric characters)
CREATE OR REPLACE FUNCTION generate_terminal_code()
RETURNS VARCHAR(10) AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude confusing chars (0,O,1,I)
    result VARCHAR(10) := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Generate unique staff code
CREATE OR REPLACE FUNCTION generate_staff_code()
RETURNS VARCHAR(10) AS $$
DECLARE
    code VARCHAR(10);
    exists_count INTEGER;
BEGIN
    LOOP
        code := 'STF-' || lpad(floor(random() * 100000)::text, 5, '0');
        SELECT COUNT(*) INTO exists_count FROM merchant_staff WHERE staff_code = code;
        EXIT WHEN exists_count = 0;
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate terminal code
CREATE OR REPLACE FUNCTION set_terminal_code()
RETURNS TRIGGER AS $$
DECLARE
    new_code VARCHAR(10);
    exists_count INTEGER;
BEGIN
    IF NEW.terminal_code IS NULL OR NEW.terminal_code = '' THEN
        LOOP
            new_code := generate_terminal_code();
            SELECT COUNT(*) INTO exists_count FROM pos_terminals WHERE terminal_code = new_code;
            EXIT WHEN exists_count = 0;
        END LOOP;
        NEW.terminal_code := new_code;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_terminal_code
    BEFORE INSERT ON pos_terminals
    FOR EACH ROW
    EXECUTE FUNCTION set_terminal_code();

-- Trigger to auto-generate staff code
CREATE OR REPLACE FUNCTION set_staff_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.staff_code IS NULL OR NEW.staff_code = '' THEN
        NEW.staff_code := generate_staff_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_staff_code
    BEFORE INSERT ON merchant_staff
    FOR EACH ROW
    EXECUTE FUNCTION set_staff_code();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_pos_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pos_terminals_timestamp
    BEFORE UPDATE ON pos_terminals
    FOR EACH ROW
    EXECUTE FUNCTION update_pos_timestamp();

CREATE TRIGGER trigger_update_merchant_staff_timestamp
    BEFORE UPDATE ON merchant_staff
    FOR EACH ROW
    EXECUTE FUNCTION update_pos_timestamp();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE pos_terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_staff_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_offline_sales ENABLE ROW LEVEL SECURITY;

-- Terminals: Merchants can only see their own terminals
CREATE POLICY pos_terminals_merchant_policy ON pos_terminals
    FOR ALL USING (merchant_id = auth.uid());

-- Staff: Merchants can only see their own staff
CREATE POLICY merchant_staff_merchant_policy ON merchant_staff
    FOR ALL USING (merchant_id = auth.uid());

-- Sessions: Merchants can see sessions for their terminals
CREATE POLICY pos_staff_sessions_merchant_policy ON pos_staff_sessions
    FOR ALL USING (
        terminal_id IN (SELECT id FROM pos_terminals WHERE merchant_id = auth.uid())
    );

-- Offline sales: Merchants can see offline sales for their terminals
CREATE POLICY pos_offline_sales_merchant_policy ON pos_offline_sales
    FOR ALL USING (
        terminal_id IN (SELECT id FROM pos_terminals WHERE merchant_id = auth.uid())
    );

-- Service role bypass
CREATE POLICY pos_terminals_service_policy ON pos_terminals
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY merchant_staff_service_policy ON merchant_staff
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY pos_staff_sessions_service_policy ON pos_staff_sessions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY pos_offline_sales_service_policy ON pos_offline_sales
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- SAMPLE DATA / COMMENTS
-- ============================================================================

COMMENT ON TABLE pos_terminals IS 'Registered POS terminals that can work offline with staff PIN authentication';
COMMENT ON TABLE merchant_staff IS 'Staff members who can login to merchant POS terminals with 8-digit PIN';
COMMENT ON TABLE pos_staff_sessions IS 'Active and historical staff sessions on POS terminals';
COMMENT ON TABLE pos_offline_sales IS 'Sales made while offline, pending synchronization';

COMMENT ON COLUMN pos_terminals.terminal_code IS 'Unique 8-character code for terminal registration (e.g., A1B2C3D4)';
COMMENT ON COLUMN merchant_staff.pin_hash IS 'BCrypt hash of 8-digit PIN for staff authentication';
COMMENT ON COLUMN merchant_staff.requires_pin_reset IS 'True if staff needs to set/reset their PIN on next login';
