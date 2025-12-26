-- Migration: 067_agent_request_columns.sql
-- Description: Add columns for agent role requests

-- Add national_id column for agent applications
ALTER TABLE user_role_requests
ADD COLUMN IF NOT EXISTS national_id TEXT;

-- Add agent_location column for where agent operates
ALTER TABLE user_role_requests
ADD COLUMN IF NOT EXISTS agent_location TEXT;

-- Create index for agent location queries
CREATE INDEX IF NOT EXISTS idx_user_role_requests_agent_location
ON user_role_requests(agent_location)
WHERE agent_location IS NOT NULL;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
