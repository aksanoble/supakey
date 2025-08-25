-- Revert supakey:cleanup_service_keys from pg

BEGIN;

-- Rename back to original column name
ALTER TABLE supakey.user_connections 
RENAME COLUMN supabase_secret_key TO supabase_service_role;

-- Add back the user_service_key column
ALTER TABLE supakey.user_connections 
ADD COLUMN user_service_key TEXT;

COMMIT;
