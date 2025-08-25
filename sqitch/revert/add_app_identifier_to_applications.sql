-- Revert supakey:add_app_identifier_to_applications from pg

BEGIN;

-- Remove unique constraint
ALTER TABLE supakey.applications 
DROP CONSTRAINT IF EXISTS unique_app_per_user_connection;

-- Remove index
DROP INDEX IF EXISTS supakey.idx_applications_app_identifier;

-- Remove app_identifier column
ALTER TABLE supakey.applications 
DROP COLUMN IF EXISTS app_identifier;

COMMIT;
