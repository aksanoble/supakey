-- Revert supakey:fix_auth_activity_notify_http_post from pg
BEGIN;

SET search_path TO supakey, public, auth, extensions;

CREATE OR REPLACE FUNCTION supakey.notify_edge_auth_event(p_event text, p_email text, p_provider text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

SET search_path TO public;

COMMIT;

