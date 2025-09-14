-- Verify supakey:harden_app_settings_rls on pg
BEGIN;

-- RLS enabled
SELECT 1 FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname='supakey' AND c.relname='app_settings' AND c.relrowsecurity;

-- No direct privileges for anon/authenticated
SELECT has_table_privilege('anon', 'supakey.app_settings', 'SELECT') = false;
SELECT has_table_privilege('authenticated', 'supakey.app_settings', 'SELECT') = false;

COMMIT;

