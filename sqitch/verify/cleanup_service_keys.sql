-- Verify supakey:cleanup_service_keys on pg

BEGIN;

-- Verify user_service_key column is removed
SELECT 1/COUNT(*) FROM information_schema.columns 
WHERE table_schema = 'supakey' 
  AND table_name = 'user_connections' 
  AND column_name = 'user_service_key';

-- Verify supabase_secret_key column exists
SELECT supabase_secret_key FROM supakey.user_connections WHERE FALSE;

ROLLBACK;
