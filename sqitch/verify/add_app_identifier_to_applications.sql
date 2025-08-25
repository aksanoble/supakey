-- Verify supakey:add_app_identifier_to_applications on pg

BEGIN;

-- Check that app_identifier column exists
SELECT app_identifier FROM supakey.applications WHERE FALSE;

-- Check that index exists
SELECT 1 FROM pg_indexes WHERE schemaname = 'supakey' AND indexname = 'idx_applications_app_identifier';

-- Check that unique constraint exists
SELECT 1 FROM pg_constraint WHERE conname = 'unique_app_per_user_connection';

ROLLBACK;
