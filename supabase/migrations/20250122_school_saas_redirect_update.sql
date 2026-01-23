-- Update school_saas OAuth client to support redirecting to school.peeap.com
-- This enables the new flow: SaaS -> my.peeap.com -> school.peeap.com -> back to SaaS

UPDATE oauth_clients
SET redirect_uris = ARRAY[
    -- NEW: Allow redirect to school.peeap.com for the setup wizard flow
    'https://school.peeap.com/auth/callback',
    -- Existing: Wildcard patterns for all schools (*.gov.school.edu.sl)
    'https://*.gov.school.edu.sl/peeap/callback',
    'https://*.gov.school.edu.sl/peeap/student-callback',
    'https://*.gov.school.edu.sl/peeap-settings/callback',
    'https://*.gov.school.edu.sl/peeap-settings/student-callback',
    -- Development/testing
    'http://localhost:8000/peeap/callback',
    'http://localhost:8000/peeap-settings/callback',
    'http://localhost:5173/auth/callback'
]
WHERE client_id = 'school_saas';

-- Log the update
DO $$
BEGIN
  RAISE NOTICE 'Updated school_saas OAuth client redirect_uris to include school.peeap.com/auth/callback';
END $$;
