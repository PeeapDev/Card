-- ============================================================================
-- ENHANCED MODULE SYSTEM
-- Standardized module architecture with REST API support
-- ============================================================================

-- Add new columns to modules table
ALTER TABLE modules ADD COLUMN IF NOT EXISTS is_beta BOOLEAN DEFAULT false;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS config_schema JSONB;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS provides TEXT[];
ALTER TABLE modules ADD COLUMN IF NOT EXISTS events TEXT[];
ALTER TABLE modules ADD COLUMN IF NOT EXISTS api_endpoints JSONB DEFAULT '[]';
ALTER TABLE modules ADD COLUMN IF NOT EXISTS webhooks JSONB DEFAULT '[]';
ALTER TABLE modules ADD COLUMN IF NOT EXISTS documentation_url VARCHAR(500);
ALTER TABLE modules ADD COLUMN IF NOT EXISTS settings_path VARCHAR(255);

-- Module events table for audit trail
CREATE TABLE IF NOT EXISTS module_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    module_code VARCHAR(100) NOT NULL,
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_module_events_type ON module_events(event_type);
CREATE INDEX IF NOT EXISTS idx_module_events_module ON module_events(module_code);
CREATE INDEX IF NOT EXISTS idx_module_events_created ON module_events(created_at DESC);

-- ============================================================================
-- REST API MODULE TABLES
-- ============================================================================

-- API Keys for external authentication
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_prefix VARCHAR(20) NOT NULL,     -- First chars shown (pk_live_xxxx)
    key_hash VARCHAR(64) NOT NULL,       -- SHA256 hash for verification
    name VARCHAR(255) NOT NULL,
    description TEXT,
    permissions TEXT[] NOT NULL DEFAULT '{}',
    environment VARCHAR(10) NOT NULL DEFAULT 'test', -- 'live' or 'test'
    rate_limit INTEGER DEFAULT 1000,     -- Requests per hour
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_env ON api_keys(environment);

-- Webhooks for external notifications
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url VARCHAR(500) NOT NULL,
    events TEXT[] NOT NULL DEFAULT '{}',
    secret VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    retry_count INTEGER DEFAULT 3,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    last_status VARCHAR(20),             -- 'success' or 'failed'
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_webhooks_events ON webhooks USING GIN(events);

-- Webhook delivery history
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'delivered', 'failed'
    response_status INTEGER,
    response_body TEXT,
    attempts INTEGER DEFAULT 0,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created ON webhook_deliveries(created_at DESC);

-- API request logging for rate limiting and analytics
CREATE TABLE IF NOT EXISTS api_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    method VARCHAR(10) NOT NULL,
    path VARCHAR(500) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_requests_key ON api_requests(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_requests_created ON api_requests(created_at DESC);

-- Partition api_requests by time for better performance (optional - for high volume)
-- CREATE INDEX IF NOT EXISTS idx_api_requests_key_created ON api_requests(api_key_id, created_at DESC);

-- ============================================================================
-- ADD REST API MODULE
-- ============================================================================

INSERT INTO modules (
    code, name, description, category, version,
    is_enabled, is_system, icon, settings_path,
    provides, events, config
)
VALUES (
    'rest_api',
    'REST API',
    'External API connectivity with API keys, webhooks, and rate limiting. Connect external services and receive real-time event notifications.',
    'api',
    '1.0.0',
    true,  -- Enabled by default
    true,  -- System module
    '🔌',
    '/admin/settings/api',
    ARRAY['api_keys', 'webhooks', 'rate_limiting'],
    ARRAY['api.request', 'api.rate_limit_exceeded', 'webhook.delivered', 'webhook.failed'],
    '{
        "default_rate_limit": 1000,
        "webhook_retry_count": 3,
        "webhook_timeout_ms": 30000,
        "log_retention_days": 30
    }'::jsonb
)
ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    provides = EXCLUDED.provides,
    events = EXCLUDED.events,
    config = EXCLUDED.config,
    settings_path = EXCLUDED.settings_path;

-- ============================================================================
-- UPDATE EXISTING MODULES WITH SETTINGS PATHS
-- ============================================================================

UPDATE modules SET settings_path = '/admin/settings/payment' WHERE code IN ('monime', 'paystack', 'stripe', 'deposits', 'withdrawals');
UPDATE modules SET settings_path = '/admin/settings/kyc' WHERE code = 'kyc_advanced';
UPDATE modules SET settings_path = '/admin/settings/loyalty' WHERE code = 'loyalty_rewards';
UPDATE modules SET settings_path = '/admin/settings/billing' WHERE code = 'bill_payments';
UPDATE modules SET settings_path = '/admin/settings/cards' WHERE code = 'card_issuance';
UPDATE modules SET settings_path = '/admin/settings/merchant' WHERE code = 'merchant_api';

-- Add events to payment modules
UPDATE modules SET events = ARRAY['payment.initiated', 'payment.completed', 'payment.failed', 'payment.refunded'] WHERE code = 'monime';
UPDATE modules SET events = ARRAY['payment.initiated', 'payment.completed', 'payment.failed'] WHERE code IN ('paystack', 'stripe');
UPDATE modules SET events = ARRAY['deposit.initiated', 'deposit.completed', 'deposit.failed'] WHERE code = 'deposits';
UPDATE modules SET events = ARRAY['withdrawal.initiated', 'withdrawal.completed', 'withdrawal.failed'] WHERE code = 'withdrawals';

-- Add provides to modules
UPDATE modules SET provides = ARRAY['mobile_money_payments', 'checkout'] WHERE code = 'monime';
UPDATE modules SET provides = ARRAY['card_payments', 'bank_transfers'] WHERE code = 'paystack';
UPDATE modules SET provides = ARRAY['card_payments', 'apple_pay', 'google_pay'] WHERE code = 'stripe';
UPDATE modules SET provides = ARRAY['wallet_deposits'] WHERE code = 'deposits';
UPDATE modules SET provides = ARRAY['wallet_withdrawals'] WHERE code = 'withdrawals';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- API Keys - only admins can manage
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage api_keys" ON api_keys
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.roles @> ARRAY['admin'] OR users.roles @> ARRAY['superadmin'])
        )
    );

-- Webhooks - only admins can manage
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage webhooks" ON webhooks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.roles @> ARRAY['admin'] OR users.roles @> ARRAY['superadmin'])
        )
    );

-- Webhook deliveries - admins can view
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook_deliveries" ON webhook_deliveries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.roles @> ARRAY['admin'] OR users.roles @> ARRAY['superadmin'])
        )
    );

-- API Requests - admins can view
ALTER TABLE api_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view api_requests" ON api_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.roles @> ARRAY['admin'] OR users.roles @> ARRAY['superadmin'])
        )
    );

-- Module events - admins can view
ALTER TABLE module_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view module_events" ON module_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.roles @> ARRAY['admin'] OR users.roles @> ARRAY['superadmin'])
        )
    );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE api_keys IS 'API keys for external service authentication';
COMMENT ON TABLE webhooks IS 'Webhook endpoints for event notifications';
COMMENT ON TABLE webhook_deliveries IS 'History of webhook delivery attempts';
COMMENT ON TABLE api_requests IS 'API request log for rate limiting and analytics';
COMMENT ON TABLE module_events IS 'Audit trail of module events';
