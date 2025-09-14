-- Verify supakey:reset_early_access_triggers on pg
BEGIN;

-- There should be exactly one non-internal trigger on early_access_requests
WITH trig AS (
  SELECT t.tgname
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'supakey' AND c.relname = 'early_access_requests' AND NOT t.tgisinternal
)
SELECT 1 FROM trig HAVING COUNT(*) = 1;

-- And that trigger should be named as expected
SELECT 1 FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'supakey' AND c.relname = 'early_access_requests' AND t.tgname = 'trg_notify_early_access';

COMMIT;

