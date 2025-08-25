-- Revert supakey:add_user_tokens_to_connections from pg

BEGIN;

-- Remove personal access token and user service key columns
ALTER TABLE supakey.user_connections 
DROP COLUMN IF EXISTS personal_access_token;

ALTER TABLE supakey.user_connections 
DROP COLUMN IF EXISTS user_service_key;

COMMIT;
