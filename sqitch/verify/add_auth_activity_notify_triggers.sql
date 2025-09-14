-- Verify supakey:add_auth_activity_notify_triggers on pg
-- Check helper function exists
SELECT 1
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'supakey' AND p.proname = 'notify_edge_auth_event';

-- Check triggers exist on auth.users
SELECT 1
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'auth' AND c.relname = 'users' AND t.tgname = 'on_auth_user_created';

SELECT 1
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'auth' AND c.relname = 'users' AND t.tgname = 'on_auth_user_signed_in';

