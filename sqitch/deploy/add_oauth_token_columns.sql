-- Deploy supakey:add_oauth_token_columns to pg

BEGIN;

SET search_path TO supakey, public;

-- Add columns to store Supakey (provider) session tokens with codes
ALTER TABLE supakey.oauth_authorization_codes
  ADD COLUMN IF NOT EXISTS supakey_access_token TEXT,
  ADD COLUMN IF NOT EXISTS supakey_refresh_token TEXT;

-- Ensure RLS remains enforced; existing policies suffice as codes are per-user

SET search_path TO public;

COMMIT;

