-- Revert supakey:add_supabase_anon_key_to_user_connections from pg

BEGIN;

-- Remove supabase_anon_key column from user_connections table
ALTER TABLE supakey.user_connections 
DROP COLUMN IF EXISTS supabase_anon_key;

COMMIT;