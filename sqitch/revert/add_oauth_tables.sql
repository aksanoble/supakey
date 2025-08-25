-- Revert supakey:add_oauth_tables from pg

BEGIN;

DROP POLICY IF EXISTS "read_clients" ON supakey.oauth_clients;
DROP POLICY IF EXISTS "manage_own_codes" ON supakey.oauth_authorization_codes;
DROP POLICY IF EXISTS "manage_own_consents" ON supakey.oauth_consents;

DROP TABLE IF EXISTS supakey.oauth_authorization_codes;
DROP TABLE IF EXISTS supakey.oauth_consents;
DROP TABLE IF EXISTS supakey.oauth_clients;

COMMIT;


