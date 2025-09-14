-- Deploy supakey:fix_auth_activity_notify_http_post to pg
BEGIN;

SET search_path TO supakey, public, auth, extensions;

-- Replace helper to use the correct pg_net signature and include params for redundancy
CREATE OR REPLACE FUNCTION supakey.notify_edge_auth_event(p_event text, p_email text, p_provider text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url text;
  v_secret text;
  v_headers jsonb;
  v_body jsonb;
  v_params jsonb;
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

  v_body := jsonb_build_object('event', p_event, 'email', p_email);
  IF p_provider IS NOT NULL THEN
    v_body := v_body || jsonb_build_object('provider', p_provider);
  END IF;

  -- Also include data as URL params to avoid body parsing issues in some pg_net versions
  v_params := jsonb_build_object('event', p_event, 'email', p_email);
  IF p_provider IS NOT NULL THEN
    v_params := v_params || jsonb_build_object('provider', p_provider);
  END IF;

  -- Correct signature: net.http_post(url, body, params, headers, timeout_ms)
  PERFORM net.http_post(v_url, v_body, v_params, v_headers, 5000);
END;
$$;

SET search_path TO public;

COMMIT;

