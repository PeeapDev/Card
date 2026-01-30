-- STEP 1: Run this first
CREATE TABLE IF NOT EXISTS school_parent_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    peeap_user_id UUID NOT NULL,
    peeap_wallet_id UUID,
    school_id VARCHAR(100) NOT NULL,
    peeap_school_id VARCHAR(100),
    school_name VARCHAR(255) NOT NULL,
    school_logo_url TEXT,
    school_domain VARCHAR(255),
    school_parent_id VARCHAR(100) NOT NULL,
    parent_name VARCHAR(255),
    parent_email VARCHAR(255),
    parent_phone VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    is_verified BOOLEAN DEFAULT true,
    chat_enabled BOOLEAN DEFAULT true,
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
