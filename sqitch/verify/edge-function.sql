-- Verify edge function migration

-- Check that the migration logging function exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'supakey' 
        AND routine_name = 'log_migration_run'
    ) THEN
        RAISE EXCEPTION 'Function supakey.log_migration_run does not exist';
    END IF;
END $$;
