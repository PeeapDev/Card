-- =============================================
-- School Utilities App for Users
-- =============================================
-- This allows parents/guardians to link their children's
-- school accounts and view fees, wallet balance, lunch, etc.
-- =============================================

-- Add school_utilities columns to user_apps_settings
ALTER TABLE user_apps_settings
ADD COLUMN IF NOT EXISTS school_utilities_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS school_utilities_setup_completed BOOLEAN DEFAULT false;

-- Create table for linked children
CREATE TABLE IF NOT EXISTS user_linked_children (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    school_id VARCHAR(100) NOT NULL,  -- ID from school SaaS
    school_name VARCHAR(255) NOT NULL,
    school_subdomain VARCHAR(100) NOT NULL,  -- e.g., "ses" from ses.gov.school.edu.sl
    child_name VARCHAR(255) NOT NULL,
    index_number VARCHAR(100) NOT NULL,  -- Student index number
    class_name VARCHAR(100),
    admission_number VARCHAR(100),
    peeap_wallet_id UUID REFERENCES wallets(id),  -- If linked to Peeap wallet
    profile_photo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, school_subdomain, index_number)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_linked_children_user_id ON user_linked_children(user_id);
CREATE INDEX IF NOT EXISTS idx_user_linked_children_index_number ON user_linked_children(index_number);
CREATE INDEX IF NOT EXISTS idx_user_linked_children_school ON user_linked_children(school_subdomain);

-- Create table for caching school data (to reduce API calls)
CREATE TABLE IF NOT EXISTS school_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(100) NOT NULL UNIQUE,
    subdomain VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    school_type VARCHAR(100),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    logo_url TEXT,
    primary_color VARCHAR(20),
    is_peeap_connected BOOLEAN DEFAULT false,
    peeap_school_id UUID,
    student_count INTEGER,
    api_available BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_registry_subdomain ON school_registry(subdomain);
CREATE INDEX IF NOT EXISTS idx_school_registry_name ON school_registry(name);

-- Enable RLS
ALTER TABLE user_linked_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_registry ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_linked_children
DROP POLICY IF EXISTS "Users can view their own linked children" ON user_linked_children;
CREATE POLICY "Users can view their own linked children" ON user_linked_children
    FOR SELECT USING (user_id = auth.uid() OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Users can insert their own linked children" ON user_linked_children;
CREATE POLICY "Users can insert their own linked children" ON user_linked_children
    FOR INSERT WITH CHECK (user_id = auth.uid() OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Users can update their own linked children" ON user_linked_children;
CREATE POLICY "Users can update their own linked children" ON user_linked_children
    FOR UPDATE USING (user_id = auth.uid() OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Users can delete their own linked children" ON user_linked_children;
CREATE POLICY "Users can delete their own linked children" ON user_linked_children
    FOR DELETE USING (user_id = auth.uid() OR auth.uid() IS NULL);

-- RLS Policies for school_registry (read-only for users)
DROP POLICY IF EXISTS "Anyone can view school registry" ON school_registry;
CREATE POLICY "Anyone can view school registry" ON school_registry
    FOR SELECT USING (true);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_user_linked_children_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS user_linked_children_updated_at ON user_linked_children;
CREATE TRIGGER user_linked_children_updated_at
    BEFORE UPDATE ON user_linked_children
    FOR EACH ROW
    EXECUTE FUNCTION update_user_linked_children_updated_at();

-- Notify completion
DO $$
BEGIN
  RAISE NOTICE 'School Utilities app tables created successfully';
END $$;
