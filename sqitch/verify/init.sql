-- Verify initial schema for Supakey application

-- Check that schema exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'supakey') THEN
        RAISE EXCEPTION 'Schema supakey does not exist';
    END IF;
END $$;

-- Check that tables exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'supakey' AND table_name = 'user_connections') THEN
        RAISE EXCEPTION 'Table supakey.user_connections does not exist';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'supakey' AND table_name = 'applications') THEN
        RAISE EXCEPTION 'Table supakey.applications does not exist';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'supakey' AND table_name = 'application_migrations') THEN
        RAISE EXCEPTION 'Table supakey.application_migrations does not exist';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'supakey' AND table_name = 'application_last_migration') THEN
        RAISE EXCEPTION 'View supakey.application_last_migration does not exist';
    END IF;
END $$;
