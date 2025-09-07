-- Verify supakey:grant_anon_usage_for_early_access on pg

BEGIN;

-- Check that anon can use the supakey schema (returns a boolean)
SELECT has_schema_privilege('anon', 'supakey', 'USAGE');

-- Table exists
SELECT 1 FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'supakey' AND c.relname = 'early_access_requests' AND c.relkind = 'r';

COMMIT;

