-- Verify supakey:add_oauth_tables on pg

BEGIN;

-- Check tables exist
SELECT 1 FROM supakey.oauth_clients LIMIT 1;
SELECT 1 FROM supakey.oauth_consents LIMIT 1;
SELECT 1 FROM supakey.oauth_authorization_codes LIMIT 1;

ROLLBACK;


