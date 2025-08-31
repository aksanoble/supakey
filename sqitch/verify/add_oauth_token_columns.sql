-- Verify supakey:add_oauth_token_columns on pg

SET search_path TO supakey, public;

-- Verify columns exist
SELECT 1 FROM information_schema.columns 
WHERE table_schema = 'supakey' 
  AND table_name = 'oauth_authorization_codes' 
  AND column_name = 'supakey_access_token';

SELECT 1 FROM information_schema.columns 
WHERE table_schema = 'supakey' 
  AND table_name = 'oauth_authorization_codes' 
  AND column_name = 'supakey_refresh_token';

