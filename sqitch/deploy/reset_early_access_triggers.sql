-- Deploy supakey:reset_early_access_triggers to pg
BEGIN;

-- Drop ALL triggers on supakey.early_access_requests, then install only the intended one
DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT t.tgname
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'supakey' AND c.relname = 'early_access_requests' AND NOT t.tgisinternal
  ) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON supakey.early_access_requests', r.tgname);
  END LOOP;
END $$;

-- Ensure function exists (created in add_early_access_function_trigger)
-- Recreate the single canonical trigger
CREATE TRIGGER trg_notify_early_access
AFTER INSERT ON supakey.early_access_requests
FOR EACH ROW EXECUTE FUNCTION supakey.notify_edge_early_access();

COMMIT;

