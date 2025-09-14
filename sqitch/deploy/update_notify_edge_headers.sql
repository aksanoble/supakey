-- Deploy supakey:update_notify_edge_headers to pg
BEGIN;

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
    'x-supakey-internal', v_secret,
    'x-email', NEW.email
  );
  v_payload := jsonb_build_object('email', NEW.email);
  PERFORM net.http_post(v_url, v_headers, v_payload);
  RETURN NEW;
END;
$$;

COMMIT;

