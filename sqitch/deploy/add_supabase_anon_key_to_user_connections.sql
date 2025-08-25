-- Deploy supakey:add_supabase_anon_key_to_user_connections to pg

BEGIN;

-- Add supabase_anon_key column to user_connections table
ALTER TABLE supakey.user_connections 
ADD COLUMN supabase_anon_key TEXT;

COMMIT;