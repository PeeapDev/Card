-- School Parent Chat System Migration V2
-- Run each section separately if needed

-- ========================================
-- SECTION 1: Parent Connections
-- ========================================
CREATE TABLE IF NOT EXISTS school_parent_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    peeap_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(peeap_user_id, school_id, school_parent_id)
);

-- ========================================
-- SECTION 2: Parent Children
-- ========================================
CREATE TABLE IF NOT EXISTS school_parent_children (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES school_parent_connections(id) ON DELETE CASCADE,
    nsi VARCHAR(50) NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    student_id_in_school VARCHAR(100),
    class_id VARCHAR(100),
    class_name VARCHAR(100),
    section_name VARCHAR(100),
    profile_photo_url TEXT,
    student_account_id UUID,
    student_wallet_id UUID,
    relationship VARCHAR(50) DEFAULT 'parent',
    is_primary_guardian BOOLEAN DEFAULT false,
    can_pay_fees BOOLEAN DEFAULT true,
    can_topup_wallet BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(connection_id, nsi)
);

-- ========================================
-- SECTION 3: Chat Threads
-- ========================================
CREATE TABLE IF NOT EXISTS school_chat_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(100) NOT NULL,
    peeap_school_id VARCHAR(100),
    school_name VARCHAR(255) NOT NULL,
    school_logo_url TEXT,
    thread_type VARCHAR(20) NOT NULL DEFAULT 'direct',
    parent_connection_id UUID REFERENCES school_parent_connections(id),
    parent_user_id UUID REFERENCES auth.users(id),
    parent_name VARCHAR(255),
    class_id VARCHAR(100),
    class_name VARCHAR(100),
    title VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    parent_unread_count INTEGER DEFAULT 0,
    school_unread_count INTEGER DEFAULT 0,
    last_message_preview TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE,
    last_message_by VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- SECTION 4: Chat Messages (NO self-reference FK)
-- ========================================
CREATE TABLE IF NOT EXISTS school_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES school_chat_threads(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL DEFAULT 'parent',
    sender_id VARCHAR(100),
    sender_name VARCHAR(255),
    sender_role VARCHAR(100),
    message_type VARCHAR(30) NOT NULL DEFAULT 'text',
    content TEXT,
    rich_content JSONB,
    attachments JSONB,
    reply_to_message_id UUID,
    status VARCHAR(20) DEFAULT 'sent',
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- SECTION 5: Indexes
-- ========================================
CREATE INDEX IF NOT EXISTS idx_spc_user ON school_parent_connections(peeap_user_id);
CREATE INDEX IF NOT EXISTS idx_spc_school ON school_parent_connections(school_id);
CREATE INDEX IF NOT EXISTS idx_spch_conn ON school_parent_children(connection_id);
CREATE INDEX IF NOT EXISTS idx_spch_nsi ON school_parent_children(nsi);
CREATE INDEX IF NOT EXISTS idx_sct_parent ON school_chat_threads(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_sct_conn ON school_chat_threads(parent_connection_id);
CREATE INDEX IF NOT EXISTS idx_scm_thread ON school_chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_scm_created ON school_chat_messages(created_at DESC);

-- ========================================
-- SECTION 6: RLS
-- ========================================
ALTER TABLE school_parent_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_parent_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "spc_all" ON school_parent_connections;
DROP POLICY IF EXISTS "spch_all" ON school_parent_children;
DROP POLICY IF EXISTS "sct_all" ON school_chat_threads;
DROP POLICY IF EXISTS "scm_all" ON school_chat_messages;

-- Allow all for service role
CREATE POLICY "spc_all" ON school_parent_connections FOR ALL USING (true);
CREATE POLICY "spch_all" ON school_parent_children FOR ALL USING (true);
CREATE POLICY "sct_all" ON school_chat_threads FOR ALL USING (true);
CREATE POLICY "scm_all" ON school_chat_messages FOR ALL USING (true);
