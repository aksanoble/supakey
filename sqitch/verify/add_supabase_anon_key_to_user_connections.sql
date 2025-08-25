-- Verify supakey:add_supabase_anon_key_to_user_connections on pg

BEGIN;

-- Check if supabase_anon_key column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'supakey' 
        AND table_name = 'user_connections' 
        AND column_name = 'supabase_anon_key'
    ) THEN
        RAISE EXCEPTION 'Column supabase_anon_key does not exist in supakey.user_connections';
    END IF;
END $$;

ROLLBACK;