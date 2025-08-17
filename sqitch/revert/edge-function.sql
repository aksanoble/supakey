-- Revert edge function migration

-- Drop the migration logging function
DROP FUNCTION IF EXISTS supakey.log_migration_run(uuid, text, text, text);
