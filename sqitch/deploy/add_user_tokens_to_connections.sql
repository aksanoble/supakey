-- Deploy supakey:add_user_tokens_to_connections to pg

BEGIN;

-- Add personal access token column for Supabase Platform API
ALTER TABLE supakey.user_connections 
ADD COLUMN personal_access_token TEXT;

-- Add user service key column for auth user creation
ALTER TABLE supakey.user_connections 
ADD COLUMN user_service_key TEXT;

COMMIT;
