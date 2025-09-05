-- Deploy supakey:remove_application_migrations to pg

BEGIN;

SET search_path TO supakey, public;

-- Drop function if present
DROP FUNCTION IF EXISTS supakey.log_migration_run(uuid, text, text, text);

-- Drop view if present
DROP VIEW IF EXISTS supakey.application_last_migration;

-- Drop table if present
DROP TABLE IF EXISTS supakey.application_migrations;

SET search_path TO public;

COMMIT;

