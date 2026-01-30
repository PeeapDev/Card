-- STEP 3: Run this third
CREATE TABLE IF NOT EXISTS school_chat_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(100) NOT NULL,
    peeap_school_id VARCHAR(100),
    school_name VARCHAR(255) NOT NULL,
    school_logo_url TEXT,
    thread_type VARCHAR(20) DEFAULT 'direct',
    parent_connection_id UUID,
    parent_user_id UUID,
    parent_name VARCHAR(255),
    class_id VARCHAR(100),
    class_name VARCHAR(100),
    title VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    parent_unread_count INTEGER DEFAULT 0,
    school_unread_count INTEGER DEFAULT 0,
    last_message_preview TEXT,
    last_message_at TIMESTAMPTZ,
    last_message_by VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
