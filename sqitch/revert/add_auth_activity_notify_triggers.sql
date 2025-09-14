-- Revert supakey:add_auth_activity_notify_triggers from pg
BEGIN;

DROP TRIGGER IF EXISTS on_auth_user_signed_in ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP FUNCTION IF EXISTS supakey.trg_notify_auth_signed_in();
DROP FUNCTION IF EXISTS supakey.trg_notify_auth_signed_up();
DROP FUNCTION IF EXISTS supakey.notify_edge_auth_event(text, text, text);

COMMIT;

