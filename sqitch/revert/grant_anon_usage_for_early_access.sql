-- Revert supakey:grant_anon_usage_for_early_access from pg

BEGIN;

REVOKE INSERT ON TABLE supakey.early_access_requests FROM anon;
REVOKE USAGE ON SCHEMA supakey FROM anon;

COMMIT;

