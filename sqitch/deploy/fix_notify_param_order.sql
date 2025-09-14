-- Deploy supakey:fix_notify_param_order to pg

BEGIN;

SET search_path TO supakey, public;

-- Fix the notify_edge_early_access function with correct parameter order
CREATE OR REPLACE FUNCTION supakey.notify_edge_early_access()
RETURNS TRIGGER AS $$
DECLARE
  v_url text;
  v_secret text;
  v_headers jsonb;
  v_params jsonb;
BEGIN
  SELECT value INTO v_url FROM supakey.app_settings WHERE key = 'notify_function_url';
  SELECT value INTO v_secret FROM supakey.app_settings WHERE key = 'internal_webhook_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RETURN NEW; -- not configured
  END IF;
  
  -- Send email as URL parameter since pg_net body handling is unreliable
  v_params := jsonb_build_object(
    'email', NEW.email,
    'x-supakey-internal', v_secret
  );
  v_headers := jsonb_build_object(
    'Content-Type', 'application/json'
  );
  
  -- Correct signature: net.http_post(url, body, params, headers, timeout_milliseconds)
  PERFORM net.http_post(
    v_url,              -- URL
    NULL::jsonb,        -- body (no body)
    v_params,           -- params (email and secret as URL params)
    v_headers,          -- headers
    5000                -- timeout in milliseconds
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