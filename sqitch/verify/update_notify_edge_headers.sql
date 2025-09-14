-- Verify supakey:update_notify_edge_headers on pg
BEGIN;

-- Function exists
SELECT 1 FROM pg_proc WHERE proname = 'notify_edge_early_access' AND pg_function_is_visible(oid);

COMMIT;

