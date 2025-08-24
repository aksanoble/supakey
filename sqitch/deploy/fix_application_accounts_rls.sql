-- Deploy supakey:fix_application_accounts_rls to pg

BEGIN;

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "user can manage own application accounts" ON supakey.application_accounts;

-- Add service_role permissions  
GRANT select, insert, update, delete ON ALL TABLES IN SCHEMA supakey TO service_role;

-- Create a more flexible policy that allows:
-- 1. Service role to bypass RLS entirely
-- 2. Users to create accounts (will be linked to applications later)
-- 3. Users to manage accounts linked to their applications
CREATE POLICY "flexible_application_accounts_policy" ON supakey.application_accounts
	FOR ALL USING (
		-- Allow service role full access
		current_setting('role') = 'service_role'
		OR
		-- Allow users to see accounts linked to their applications
		EXISTS (
			SELECT 1 FROM supakey.applications a
			JOIN supakey.user_connections uc ON a.user_connection_id = uc.id
			WHERE a.application_account_id = application_accounts.id 
			AND uc.user_id = auth.uid()
		)
	) 
	WITH CHECK (
		-- Allow service role full access
		current_setting('role') = 'service_role'
		OR
		-- Allow users to create/modify accounts (validation happens in application logic)
		auth.uid() IS NOT NULL
	);

COMMIT;