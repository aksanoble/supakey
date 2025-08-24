-- Revert supakey:fix_application_accounts_rls from pg

BEGIN;

-- Drop the flexible policy
DROP POLICY IF EXISTS "flexible_application_accounts_policy" ON supakey.application_accounts;

-- Restore the original restrictive policy
CREATE POLICY "user can manage own application accounts" ON supakey.application_accounts
	FOR ALL USING (
		EXISTS (
			SELECT 1 FROM supakey.applications a
			JOIN supakey.user_connections uc ON a.user_connection_id = uc.id
			WHERE a.application_account_id = application_accounts.id AND uc.user_id = auth.uid()
		)
	) WITH CHECK (
		EXISTS (
			SELECT 1 FROM supakey.applications a
			JOIN supabase.user_connections uc ON a.user_connection_id = uc.id
			WHERE a.application_account_id = application_accounts.id AND uc.user_id = auth.uid()
		)
	);

-- Revoke service_role permissions
REVOKE select, insert, update, delete ON ALL TABLES IN SCHEMA supakey FROM service_role;

COMMIT;