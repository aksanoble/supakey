-- Verify supakey:fix_auth_activity_notify_http_post on pg
SELECT 1
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'supakey' AND p.proname = 'notify_edge_auth_event';

