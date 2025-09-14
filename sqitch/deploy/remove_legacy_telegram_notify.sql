-- Deploy supakey:remove_legacy_telegram_notify to pg
BEGIN;

-- Remove old direct Telegram notify function (edge-function path is preferred)
DROP FUNCTION IF EXISTS supakey.notify_telegram_early_access();

COMMIT;

