-- Deploy supakey:edge-function to pg

BEGIN;

-- XXX Add DDLs here.

-- Add Supabase Edge Function for running migrations
-- Note: This is a placeholder. The actual edge function deployment
-- should be handled by Supabase CLI with: supabase functions deploy run-app-migrations

-- Create a function to track migration runs in the supakey schema
CREATE OR REPLACE FUNCTION supakey.log_migration_run(
    application_id uuid,
    migration_name text,
    status text DEFAULT 'completed',
    error_message text DEFAULT NULL
) RETURNS void AS $$
BEGIN
    INSERT INTO supakey.application_migrations (application_id, name, created_at)
    VALUES (application_id, migration_name, now());
    
    -- Log the migration run for debugging
    RAISE NOTICE 'Migration % for application % completed with status: %', 
        migration_name, application_id, status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
