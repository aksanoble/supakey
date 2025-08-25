-- Verify supakey:add_user_tokens_to_connections on pg

BEGIN;

-- Verify that the new columns exist
SELECT personal_access_token, user_service_key 
FROM supakey.user_connections 
WHERE FALSE;

ROLLBACK;
