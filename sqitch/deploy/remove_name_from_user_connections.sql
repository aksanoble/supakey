-- Deploy supakey:remove_name_from_user_connections to pg

BEGIN;

-- Remove name column from user_connections table
ALTER TABLE supakey.user_connections DROP COLUMN IF EXISTS name;

COMMIT;
