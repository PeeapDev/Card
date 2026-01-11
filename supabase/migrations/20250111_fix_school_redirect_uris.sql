-- Fix School OAuth redirect URIs
-- Add peeap-settings callback paths

UPDATE oauth_clients
SET redirect_uris = ARRAY[
    -- Production redirect URIs (wildcard pattern handled in code)
    'https://*.gov.school.edu.sl/peeap/callback',
    'https://*.gov.school.edu.sl/peeap/student-callback',
    'https://*.gov.school.edu.sl/peeap-settings/callback',
    'https://*.gov.school.edu.sl/peeap-settings/student-callback',
    -- Allow any subdomain callback
    'https://ses.gov.school.edu.sl/peeap/callback',
    'https://ses.gov.school.edu.sl/peeap/student-callback',
    'https://ses.gov.school.edu.sl/peeap-settings/callback',
    'https://ses.gov.school.edu.sl/peeap-settings/student-callback',
    'https://fyp.gov.school.edu.sl/peeap/callback',
    'https://fyp.gov.school.edu.sl/peeap/student-callback',
    'https://fyp.gov.school.edu.sl/peeap-settings/callback',
    'https://fyp.gov.school.edu.sl/peeap-settings/student-callback',
    -- Development/testing
    'http://localhost:8000/peeap/callback',
    'http://localhost:8000/peeap/student-callback',
    'http://localhost:8000/peeap-settings/callback',
    'http://127.0.0.1:8000/peeap/callback',
    'http://127.0.0.1:8000/peeap/student-callback',
    'http://127.0.0.1:8000/peeap-settings/callback'
],
updated_at = NOW()
WHERE client_id = 'school_saas';

-- Verify the update
DO $$
DECLARE
  v_uris TEXT[];
BEGIN
  SELECT redirect_uris INTO v_uris FROM oauth_clients WHERE client_id = 'school_saas';
  RAISE NOTICE 'Updated school_saas redirect_uris: %', v_uris;
END $$;
