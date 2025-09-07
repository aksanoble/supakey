-- Deploy supakey:grant_anon_usage_for_early_access to pg

BEGIN;

-- Ensure the anon role can access the supakey schema and insert into early_access_requests
GRANT USAGE ON SCHEMA supakey TO anon;
GRANT INSERT ON TABLE supakey.early_access_requests TO anon;

COMMIT;

