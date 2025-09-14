-- Verify supakey:add_early_access_function_trigger on pg
BEGIN;

SELECT 1 FROM pg_extension WHERE extname = 'pg_net';
SELECT 1 FROM pg_proc WHERE proname = 'notify_edge_early_access' AND pg_function_is_visible(oid);
SELECT 1
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'supakey' AND c.relname = 'early_access_requests' AND t.tgname = 'trg_notify_early_access';

COMMIT;

