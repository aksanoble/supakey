-- Verify supakey:update_notify_edge_query_params on pg
BEGIN;

-- Function should exist
SELECT 1 FROM pg_proc WHERE proname = 'notify_edge_early_access' AND pg_function_is_visible(oid);

COMMIT;

