-- Revert supakey:remove_name_from_user_connections from pg

BEGIN;

-- Add name column back to user_connections table
ALTER TABLE supakey.user_connections ADD COLUMN name text;

COMMIT;
