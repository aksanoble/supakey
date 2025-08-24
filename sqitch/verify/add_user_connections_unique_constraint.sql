-- Verify supakey:add_user_connections_unique_constraint on pg

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'supakey' 
        AND table_name = 'user_connections' 
        AND constraint_name = 'user_connections_user_id_unique'
        AND constraint_type = 'UNIQUE'
    ) THEN
        RAISE EXCEPTION 'Unique constraint user_connections_user_id_unique does not exist on supakey.user_connections';
    END IF;
END $$;
