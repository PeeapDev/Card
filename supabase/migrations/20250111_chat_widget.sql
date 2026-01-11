-- =============================================
-- Chat Widget SDK Database Migration
-- Enables embeddable chat for third-party websites
-- =============================================

-- =============================================
-- 1. Chat Widget Platforms
-- Registered third-party platforms using the widget
-- =============================================
CREATE TABLE IF NOT EXISTS chat_widget_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Developer who registered this platform
  developer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,

  -- Platform details
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  allowed_origins TEXT[] DEFAULT '{}',

  -- Widget configuration (stored defaults)
  config JSONB DEFAULT '{
    "theme": "light",
    "position": "bottom-right",
    "primaryColor": "#3b82f6",
    "collectName": false,
    "collectEmail": false
  }'::jsonb,

  -- Target Peeap user (optional - for direct merchant support)
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_business_id UUID,

  -- Usage tracking
  total_conversations INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint on api key + domain
  UNIQUE(api_key_id, domain)
);

-- Indexes for platforms
CREATE INDEX IF NOT EXISTS idx_chat_platforms_api_key ON chat_widget_platforms(api_key_id);
CREATE INDEX IF NOT EXISTS idx_chat_platforms_domain ON chat_widget_platforms(domain);
CREATE INDEX IF NOT EXISTS idx_chat_platforms_developer ON chat_widget_platforms(developer_id);
CREATE INDEX IF NOT EXISTS idx_chat_platforms_active ON chat_widget_platforms(is_active) WHERE is_active = true;

-- =============================================
-- 2. Widget Anonymous Sessions
-- Track anonymous users from third-party websites
-- =============================================
CREATE TABLE IF NOT EXISTS widget_anonymous_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Platform association
  platform_id UUID REFERENCES chat_widget_platforms(id) ON DELETE CASCADE,

  -- Session identity
  session_token VARCHAR(128) NOT NULL UNIQUE,
  fingerprint VARCHAR(128),

  -- User-provided info (optional)
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Session context
  ip_address INET,
  user_agent TEXT,
  origin_url TEXT,
  referrer TEXT,

  -- Activity tracking
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,

  -- Link to Peeap user if they later register/login
  linked_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
);

-- Indexes for sessions
CREATE INDEX IF NOT EXISTS idx_widget_sessions_token ON widget_anonymous_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_widget_sessions_platform ON widget_anonymous_sessions(platform_id);
CREATE INDEX IF NOT EXISTS idx_widget_sessions_fingerprint ON widget_anonymous_sessions(platform_id, fingerprint);
CREATE INDEX IF NOT EXISTS idx_widget_sessions_expiry ON widget_anonymous_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_widget_sessions_linked_user ON widget_anonymous_sessions(linked_user_id) WHERE linked_user_id IS NOT NULL;

-- =============================================
-- 3. Extend conversations table for widget support
-- =============================================
DO $$
BEGIN
  -- Add widget_session_id column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'widget_session_id'
  ) THEN
    ALTER TABLE conversations ADD COLUMN widget_session_id UUID REFERENCES widget_anonymous_sessions(id) ON DELETE SET NULL;
  END IF;

  -- Add platform_id column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'platform_id'
  ) THEN
    ALTER TABLE conversations ADD COLUMN platform_id UUID REFERENCES chat_widget_platforms(id) ON DELETE SET NULL;
  END IF;

  -- Add source column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'source'
  ) THEN
    ALTER TABLE conversations ADD COLUMN source VARCHAR(30) DEFAULT 'app';
  END IF;
END $$;

-- Indexes for widget conversations
CREATE INDEX IF NOT EXISTS idx_conversations_widget ON conversations(widget_session_id) WHERE widget_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_platform ON conversations(platform_id) WHERE platform_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_source ON conversations(source);

-- =============================================
-- 4. Extend messages table for widget support
-- =============================================
DO $$
BEGIN
  -- Add widget_session_id column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'widget_session_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN widget_session_id UUID REFERENCES widget_anonymous_sessions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index for widget messages
CREATE INDEX IF NOT EXISTS idx_messages_widget_session ON messages(widget_session_id) WHERE widget_session_id IS NOT NULL;

-- =============================================
-- 5. Add 'chat.widget' scope to available API scopes
-- =============================================
-- This is handled in application code, but we can track it here
COMMENT ON TABLE chat_widget_platforms IS 'Platforms registered to use the @peeap/chat-sdk widget. API keys need chat.widget scope.';

-- =============================================
-- 6. RLS Policies
-- =============================================

-- Enable RLS
ALTER TABLE chat_widget_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_anonymous_sessions ENABLE ROW LEVEL SECURITY;

-- Platforms: Developers can manage their own platforms
DROP POLICY IF EXISTS "Developers can view own platforms" ON chat_widget_platforms;
CREATE POLICY "Developers can view own platforms" ON chat_widget_platforms
  FOR SELECT USING (
    developer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND roles && ARRAY['admin'])
  );

DROP POLICY IF EXISTS "Developers can manage own platforms" ON chat_widget_platforms;
CREATE POLICY "Developers can manage own platforms" ON chat_widget_platforms
  FOR ALL USING (
    developer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND roles && ARRAY['admin'])
  );

-- Sessions: Allow service role to manage all, limited access otherwise
DROP POLICY IF EXISTS "Sessions are managed by service" ON widget_anonymous_sessions;
CREATE POLICY "Sessions are managed by service" ON widget_anonymous_sessions
  FOR ALL USING (true); -- Handled by API key validation in application

-- =============================================
-- 7. Helper Functions
-- =============================================

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_widget_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM widget_anonymous_sessions
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update platform stats
CREATE OR REPLACE FUNCTION update_widget_platform_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update message count
  IF TG_TABLE_NAME = 'messages' AND NEW.widget_session_id IS NOT NULL THEN
    UPDATE widget_anonymous_sessions
    SET message_count = message_count + 1,
        last_activity_at = NOW()
    WHERE id = NEW.widget_session_id;

    -- Also update platform stats
    UPDATE chat_widget_platforms
    SET total_messages = total_messages + 1,
        last_activity_at = NOW()
    WHERE id = (
      SELECT platform_id FROM widget_anonymous_sessions WHERE id = NEW.widget_session_id
    );
  END IF;

  -- Update conversation count
  IF TG_TABLE_NAME = 'conversations' AND NEW.platform_id IS NOT NULL THEN
    UPDATE chat_widget_platforms
    SET total_conversations = total_conversations + 1,
        last_activity_at = NOW()
    WHERE id = NEW.platform_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for stats update
DROP TRIGGER IF EXISTS trg_update_widget_message_stats ON messages;
CREATE TRIGGER trg_update_widget_message_stats
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.widget_session_id IS NOT NULL)
  EXECUTE FUNCTION update_widget_platform_stats();

DROP TRIGGER IF EXISTS trg_update_widget_conversation_stats ON conversations;
CREATE TRIGGER trg_update_widget_conversation_stats
  AFTER INSERT ON conversations
  FOR EACH ROW
  WHEN (NEW.platform_id IS NOT NULL)
  EXECUTE FUNCTION update_widget_platform_stats();

-- =============================================
-- 8. Verify migration
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'Chat Widget SDK migration completed successfully';
  RAISE NOTICE 'Created: chat_widget_platforms table';
  RAISE NOTICE 'Created: widget_anonymous_sessions table';
  RAISE NOTICE 'Added: widget_session_id, platform_id, source columns to conversations';
  RAISE NOTICE 'Added: widget_session_id column to messages';
  RAISE NOTICE 'Created: cleanup and stats functions/triggers';
END $$;
