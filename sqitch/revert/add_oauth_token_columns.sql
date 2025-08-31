-- Revert supakey:add_oauth_token_columns from pg

BEGIN;

SET search_path TO supakey, public;

ALTER TABLE IF EXISTS supakey.oauth_authorization_codes
  DROP COLUMN IF EXISTS supakey_access_token,
  DROP COLUMN IF EXISTS supakey_refresh_token;

SET search_path TO public;

COMMIT;

