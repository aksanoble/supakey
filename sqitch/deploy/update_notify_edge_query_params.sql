-- Deploy supakey:update_notify_edge_query_params to pg
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
  v_q text;
  v_headers jsonb := jsonb_build_object('Content-Type','application/json');
BEGIN
  SELECT value INTO v_url FROM supakey.app_settings WHERE key = 'notify_function_url';
  SELECT value INTO v_secret FROM supakey.app_settings WHERE key = 'internal_webhook_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RETURN NEW; -- not configured
  END IF;

  -- Append query params so pg_net-delivered values survive even if headers/body are stripped.
  v_q := CASE WHEN position('?' in v_url) > 0 THEN '&' ELSE '?' END ||
         'email=' || replace(NEW.email, ' ', '%20') ||
         '&x-supakey-internal=' || replace(v_secret, ' ', '%20');
  v_url := v_url || v_q;

  PERFORM net.http_post(v_url, v_headers, NULL);
  RETURN NEW;
END;
$$;

COMMIT;

