-- Revert supakey:add_early_access_requests from pg

BEGIN;

DROP TRIGGER IF EXISTS set_ear_updated_at ON supakey.early_access_requests;
DROP FUNCTION IF EXISTS supakey.set_updated_at();
DROP TABLE IF EXISTS supakey.early_access_requests;

COMMIT;

