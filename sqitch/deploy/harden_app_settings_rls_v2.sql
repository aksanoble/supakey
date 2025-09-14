-- Deploy supakey:harden_app_settings_rls_v2 to pg
-- Follow-up hardening to avoid editing previously deployed migrations
BEGIN;

-- Ensure table exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='supakey' AND table_name='app_settings'
  ) THEN
    CREATE TABLE supakey.app_settings (key text PRIMARY KEY, value text NOT NULL);
  END IF;
END $$;

-- Enforce RLS and revoke grants idempotently
ALTER TABLE supakey.app_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE supakey.app_settings FROM PUBLIC;
REVOKE ALL ON TABLE supakey.app_settings FROM anon;
REVOKE ALL ON TABLE supakey.app_settings FROM authenticated;
REVOKE ALL ON TABLE supakey.app_settings FROM service_role;

COMMIT;

