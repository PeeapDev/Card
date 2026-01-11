-- Fix School OAuth redirect URIs
-- Simplified: wildcards cover all 100+ schools

UPDATE oauth_clients
SET redirect_uris = ARRAY[
    -- Wildcard patterns for all schools (*.gov.school.edu.sl)
    'https://*.gov.school.edu.sl/peeap/callback',
    'https://*.gov.school.edu.sl/peeap/student-callback',
    'https://*.gov.school.edu.sl/peeap-settings/callback',
    'https://*.gov.school.edu.sl/peeap-settings/student-callback',
    -- Development/testing
    'http://localhost:8000/peeap/callback',
    'http://localhost:8000/peeap-settings/callback'
],
updated_at = NOW()
WHERE client_id = 'school_saas';
