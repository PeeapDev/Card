-- Migration: User Role Switch Requests
-- Allows users to request role changes (e.g., user -> merchant)

-- Drop existing table if exists
DROP TABLE IF EXISTS user_role_requests CASCADE;

-- Create user role requests table
CREATE TABLE user_role_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT,
    user_email TEXT,
    from_role TEXT NOT NULL,
    to_role TEXT NOT NULL,
    business_name TEXT,
    business_type TEXT,
    business_address TEXT,
    business_phone TEXT,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_user_role_requests_user_id ON user_role_requests(user_id);
CREATE INDEX idx_user_role_requests_status ON user_role_requests(status);
CREATE INDEX idx_user_role_requests_to_role ON user_role_requests(to_role);
CREATE INDEX idx_user_role_requests_created_at ON user_role_requests(created_at DESC);

-- Disable RLS for now (simpler management)
ALTER TABLE user_role_requests DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON user_role_requests TO authenticated;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_user_role_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_role_requests_updated_at
    BEFORE UPDATE ON user_role_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_user_role_requests_updated_at();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
