-- Verify supakey:remove_name_from_user_connections on pg

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'supakey' 
        AND table_name = 'user_connections' 
        AND column_name = 'name'
    ) THEN
        RAISE EXCEPTION 'Column name still exists in supakey.user_connections';
    END IF;
END $$;
