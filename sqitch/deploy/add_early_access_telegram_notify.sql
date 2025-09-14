-- Deploy supakey:add_early_access_telegram_notify to pg
BEGIN;

-- Ensure pg_net is available for outbound HTTP
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Settings table to hold secrets (bot token, chat id)
CREATE TABLE IF NOT EXISTS supakey.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL
);

-- Lock down settings
REVOKE ALL ON TABLE supakey.app_settings FROM PUBLIC;
GRANT SELECT ON TABLE supakey.app_settings TO service_role;

-- Notification function: send Telegram message on new request
CREATE OR REPLACE FUNCTION supakey.notify_telegram_early_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = supakey, public, extensions
AS $$
DECLARE
  v_token text;
  v_chat_id text;
  v_url text;
  v_headers jsonb := jsonb_build_object('Content-Type','application/json');
  v_payload jsonb;
BEGIN
  SELECT value INTO v_token FROM supakey.app_settings WHERE key = 'telegram_bot_token';
  SELECT value INTO v_chat_id FROM supakey.app_settings WHERE key = 'telegram_chat_id';
  IF v_token IS NULL OR v_chat_id IS NULL THEN
    RETURN NEW; -- not configured
  END IF;

  v_url := 'https://api.telegram.org/bot' || v_token || '/sendMessage';
  v_payload := jsonb_build_object(
    'chat_id', v_chat_id,
    'text', 'New Supakey early access request: ' || NEW.email
  );

  -- Best-effort HTTP POST (pg_net)
  PERFORM net.http_post(v_url, v_headers, v_payload);
  RETURN NEW;
END;
$$;

-- Trigger on insert
DROP TRIGGER IF EXISTS trg_notify_early_access ON supakey.early_access_requests;
CREATE TRIGGER trg_notify_early_access
AFTER INSERT ON supakey.early_access_requests
FOR EACH ROW EXECUTE FUNCTION supakey.notify_telegram_early_access();

COMMIT;

