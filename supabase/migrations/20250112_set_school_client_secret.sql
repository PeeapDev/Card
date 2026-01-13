-- =============================================
-- Set Fixed Client Secret for School SaaS Integration
-- =============================================
-- This sets a known, fixed secret for the school integration
-- to prevent unauthorized changes to the integration setup.
--
-- Secret: peeap_school_integration_2024_sl
-- =============================================

UPDATE oauth_clients
SET client_secret = 'peeap_school_integration_2024_sl'
WHERE client_id = 'school_saas';

-- Verify the update
DO $$
BEGIN
  RAISE NOTICE 'Updated school_saas client_secret to fixed value';
END $$;
