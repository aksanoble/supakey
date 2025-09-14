-- Verify supakey:harden_app_settings_rls_v2 on pg
BEGIN;

-- RLS enabled and no broad grants remain
SELECT 1 FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname='supakey' AND c.relname='app_settings' AND c.relrowsecurity;

SELECT has_table_privilege('anon', 'supakey.app_settings', 'SELECT') = false;
SELECT has_table_privilege('authenticated', 'supakey.app_settings', 'SELECT') = false;
SELECT has_table_privilege('service_role', 'supakey.app_settings', 'SELECT') = false;

COMMIT;

