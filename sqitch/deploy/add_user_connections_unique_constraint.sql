-- Deploy supakey:add_user_connections_unique_constraint to pg

BEGIN;

-- Add unique constraint on user_id in user_connections table
ALTER TABLE supakey.user_connections ADD CONSTRAINT user_connections_user_id_unique UNIQUE (user_id);

COMMIT;
