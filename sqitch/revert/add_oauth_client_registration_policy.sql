-- Revert supakey:add_oauth_client_registration_policy from pg

BEGIN;

DROP POLICY IF EXISTS "register_clients" ON supakey.oauth_clients;

COMMIT;