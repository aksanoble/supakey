-- Verify supakey:fix_application_accounts_rls on pg

BEGIN;

-- Check that the new policy exists
SELECT 1/COUNT(*) FROM pg_policies 
WHERE schemaname = 'supakey' 
AND tablename = 'application_accounts' 
AND policyname = 'flexible_application_accounts_policy';

-- Check that service_role has permissions
SELECT 1/COUNT(*) FROM information_schema.role_table_grants
WHERE grantee = 'service_role'
AND table_schema = 'supakey'
AND table_name = 'application_accounts'
AND privilege_type = 'SELECT';

ROLLBACK;