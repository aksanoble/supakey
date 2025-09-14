-- Deploy supakey:add_early_access_function_trigger to pg
BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Settings table may already exist
CREATE TABLE IF NOT EXISTS supakey.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL
);
REVOKE ALL ON TABLE supakey.app_settings FROM PUBLIC;
GRANT SELECT ON TABLE supakey.app_settings TO service_role;

CREATE OR REPLACE FUNCTION supakey.notify_edge_early_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = supakey, public, extensions
AS $$
DECLARE
  v_url text;
  v_secret text;
  v_headers jsonb;
  v_payload jsonb;
BEGIN
  SELECT value INTO v_url FROM supakey.app_settings WHERE key = 'notify_function_url';
  SELECT value INTO v_secret FROM supakey.app_settings WHERE key = 'internal_webhook_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RETURN NEW; -- not configured
  END IF;
  v_headers := jsonb_build_object(
    'Content-Type','application/json',
    'x-supakey-internal', v_secret
  );
  v_payload := jsonb_build_object('email', NEW.email);
  PERFORM net.http_post(v_url, v_headers, v_payload);
  RETURN NEW;
END;
$$;

-- Replace any previous trigger
DROP TRIGGER IF EXISTS trg_notify_early_access ON supakey.early_access_requests;
CREATE TRIGGER trg_notify_early_access
AFTER INSERT ON supakey.early_access_requests
FOR EACH ROW EXECUTE FUNCTION supakey.notify_edge_early_access();

COMMIT;

