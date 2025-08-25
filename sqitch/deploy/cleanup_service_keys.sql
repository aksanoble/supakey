-- Deploy supakey:cleanup_service_keys to pg

BEGIN;

-- Remove the duplicate user_service_key column
ALTER TABLE supakey.user_connections 
DROP COLUMN IF EXISTS user_service_key;

-- Rename supabase_service_role to supabase_secret_key for clarity
ALTER TABLE supakey.user_connections 
RENAME COLUMN supabase_service_role TO supabase_secret_key;

COMMIT;
