-- Deploy supakey:add_auth_activity_notify_triggers to pg
BEGIN;

-- Ensure required extension
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Settings table to hold function URL and secret (idempotent)
CREATE TABLE IF NOT EXISTS supakey.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL
);
REVOKE ALL ON TABLE supakey.app_settings FROM PUBLIC;
GRANT SELECT ON TABLE supakey.app_settings TO service_role;

-- Helper: call Edge function with event + email (+ optional provider)
CREATE OR REPLACE FUNCTION supakey.notify_edge_auth_event(p_event text, p_email text, p_provider text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = supakey, public, auth, extensions
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
    RETURN; -- not configured
  END IF;

  v_headers := jsonb_build_object(
    'Content-Type','application/json',
    'x-supakey-internal', v_secret
  );
  v_payload := jsonb_build_object('event', p_event, 'email', p_email);
  IF p_provider IS NOT NULL THEN
    v_payload := v_payload || jsonb_build_object('provider', p_provider);
  END IF;

  PERFORM net.http_post(v_url, v_headers, v_payload);
END;
$$;

-- Trigger fn: after user signup
CREATE OR REPLACE FUNCTION supakey.trg_notify_auth_signed_up()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = supakey, public, auth, extensions
AS $$
DECLARE v_provider text;
BEGIN
  -- Attempt to derive provider from identities
  SELECT provider INTO v_provider
  FROM auth.identities
  WHERE user_id = NEW.id
  ORDER BY created_at ASC
  LIMIT 1;

  PERFORM supakey.notify_edge_auth_event('SIGNED_UP', NEW.email, v_provider);
  RETURN NEW;
END;
$$;

-- Trigger fn: after sign-in (when last_sign_in_at changes)
CREATE OR REPLACE FUNCTION supakey.trg_notify_auth_signed_in()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = supakey, public, auth, extensions
AS $$
DECLARE v_provider text;
BEGIN
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    SELECT provider INTO v_provider
    FROM auth.identities
    WHERE user_id = NEW.id
    ORDER BY last_sign_in_at DESC NULLS LAST, created_at DESC
    LIMIT 1;

    PERFORM supakey.notify_edge_auth_event('SIGNED_IN', NEW.email, v_provider);
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION supakey.trg_notify_auth_signed_up();

DROP TRIGGER IF EXISTS on_auth_user_signed_in ON auth.users;
CREATE TRIGGER on_auth_user_signed_in
AFTER UPDATE OF last_sign_in_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION supakey.trg_notify_auth_signed_in();

COMMIT;

