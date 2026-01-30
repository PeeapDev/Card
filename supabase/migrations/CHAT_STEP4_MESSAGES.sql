-- STEP 4: Run this fourth
CREATE TABLE IF NOT EXISTS school_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL,
    sender_type VARCHAR(20) DEFAULT 'parent',
    sender_id VARCHAR(100),
    sender_name VARCHAR(255),
    sender_role VARCHAR(100),
    message_type VARCHAR(30) DEFAULT 'text',
    content TEXT,
    rich_content JSONB,
    attachments JSONB,
    reply_to_message_id UUID,
    status VARCHAR(20) DEFAULT 'sent',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
