-- Revert supakey:add_user_connections_unique_constraint from pg

BEGIN;

-- Remove unique constraint on user_id in user_connections table
ALTER TABLE supakey.user_connections DROP CONSTRAINT IF EXISTS user_connections_user_id_unique;

COMMIT;
