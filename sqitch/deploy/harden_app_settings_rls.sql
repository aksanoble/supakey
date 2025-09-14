-- Deploy supakey:harden_app_settings_rls to pg
BEGIN;

-- Ensure RLS is enabled and privileges are tightly restricted on app_settings
ALTER TABLE IF EXISTS supakey.app_settings ENABLE ROW LEVEL SECURITY;

-- Revoke any broad grants that might have been inherited from defaults
REVOKE ALL ON TABLE supakey.app_settings FROM PUBLIC;
REVOKE ALL ON TABLE supakey.app_settings FROM anon;
REVOKE ALL ON TABLE supakey.app_settings FROM authenticated;
REVOKE ALL ON TABLE supakey.app_settings FROM service_role;

-- Owner (postgres) retains privileges; SECURITY DEFINER functions can read as needed

COMMIT;

