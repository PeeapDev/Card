-- School Parent Chat System Migration V3 (SAFE)
-- This version handles existing tables gracefully
-- Run this in Supabase SQL Editor

-- ========================================
-- SECTION 1: Drop existing tables if they exist (clean slate)
-- ========================================
DROP TABLE IF EXISTS school_chat_messages CASCADE;
DROP TABLE IF EXISTS school_chat_threads CASCADE;
DROP TABLE IF EXISTS school_parent_children CASCADE;
DROP TABLE IF EXISTS school_parent_connections CASCADE;

-- ========================================
-- SECTION 2: Create Parent Connections Table
-- ========================================
CREATE TABLE school_parent_connections (
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
-- SECTION 3: Create Parent Children Table
-- ========================================
CREATE TABLE school_parent_children (
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
-- SECTION 4: Create Chat Threads Table
-- ========================================
CREATE TABLE school_chat_threads (
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
-- SECTION 5: Create Chat Messages Table
-- ========================================
CREATE TABLE school_chat_messages (
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
-- SECTION 6: Create Indexes
-- ========================================
CREATE INDEX idx_spc_user ON school_parent_connections(peeap_user_id);
CREATE INDEX idx_spc_school ON school_parent_connections(school_id);
CREATE INDEX idx_spch_conn ON school_parent_children(connection_id);
CREATE INDEX idx_spch_nsi ON school_parent_children(nsi);
CREATE INDEX idx_sct_parent ON school_chat_threads(parent_user_id);
CREATE INDEX idx_sct_conn ON school_chat_threads(parent_connection_id);
CREATE INDEX idx_scm_thread ON school_chat_messages(thread_id);
CREATE INDEX idx_scm_created ON school_chat_messages(created_at DESC);

-- ========================================
-- SECTION 7: Enable RLS
-- ========================================
ALTER TABLE school_parent_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_parent_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_chat_messages ENABLE ROW LEVEL SECURITY;

-- ========================================
-- SECTION 8: Create Policies (allow all for service role)
-- ========================================
CREATE POLICY "spc_all" ON school_parent_connections FOR ALL USING (true);
CREATE POLICY "spch_all" ON school_parent_children FOR ALL USING (true);
CREATE POLICY "sct_all" ON school_chat_threads FOR ALL USING (true);
CREATE POLICY "scm_all" ON school_chat_messages FOR ALL USING (true);

-- ========================================
-- SUCCESS MESSAGE
-- ========================================
DO $$
BEGIN
    RAISE NOTICE 'Chat migration completed successfully!';
    RAISE NOTICE 'Tables created: school_parent_connections, school_parent_children, school_chat_threads, school_chat_messages';
END $$;
