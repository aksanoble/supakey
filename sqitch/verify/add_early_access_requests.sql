-- Verify supakey:add_early_access_requests on pg

BEGIN;

-- Table exists
SELECT 1 FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'supakey' AND c.relname = 'early_access_requests' AND c.relkind = 'r';

-- Columns exist
SELECT email, status, requested_at FROM supakey.early_access_requests WHERE FALSE;

-- Index exists
SELECT 1 FROM pg_indexes
WHERE schemaname = 'supakey' AND indexname = 'idx_early_access_requests_email_lower';

COMMIT;

