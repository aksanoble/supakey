-- Deploy supakey:fix_notify_trigger_params to pg

BEGIN;

SET search_path TO supakey, public;

-- Fix the notify_edge_early_access function to use correct net.http_post signature
CREATE OR REPLACE FUNCTION supakey.notify_edge_early_access()
RETURNS TRIGGER AS $$
DECLARE
  v_url text;
  v_secret text;
  v_headers jsonb;
  v_body jsonb;
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
  v_body := jsonb_build_object('email', NEW.email);
  
  -- Correct signature: net.http_post(url, params, headers, body, timeout_milliseconds)
  PERFORM net.http_post(
    v_url,
    NULL::jsonb, -- no URL params
    v_headers,
    v_body,
    5000 -- 5 second timeout
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the insert
  RAISE WARNING 'notify_edge_early_access failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SET search_path TO public;

COMMIT;