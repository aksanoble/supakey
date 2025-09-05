-- Verify supakey:remove_application_migrations on pg

DO $$
BEGIN
  -- Ensure objects no longer exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'supakey' AND table_name = 'application_migrations') THEN
    RAISE EXCEPTION 'Table supakey.application_migrations still exists';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'supakey' AND table_name = 'application_last_migration') THEN
    RAISE EXCEPTION 'View supakey.application_last_migration still exists';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'supakey' AND routine_name = 'log_migration_run'
  ) THEN
    RAISE EXCEPTION 'Function supakey.log_migration_run still exists';
  END IF;
END $$;

