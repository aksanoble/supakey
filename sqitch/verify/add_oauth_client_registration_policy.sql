-- Verify supakey:add_oauth_client_registration_policy on pg

BEGIN;

-- Check that the policy exists
SELECT 1 FROM pg_policy 
WHERE polname = 'register_clients' 
AND polrelid = 'supakey.oauth_clients'::regclass;

ROLLBACK;