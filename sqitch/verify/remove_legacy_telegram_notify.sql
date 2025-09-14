-- Verify supakey:remove_legacy_telegram_notify on pg
BEGIN;

-- Function should not exist
SELECT 1 WHERE NOT EXISTS (
  SELECT 1 FROM pg_proc WHERE proname = 'notify_telegram_early_access'
);

COMMIT;

