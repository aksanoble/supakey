-- Deploy supakey:remove_oauth_client_fkey to pg

BEGIN;

SET search_path TO supakey, public;

-- Remove foreign key constraint to allow dynamic client registration
-- Client validation will be done during token exchange instead
ALTER TABLE supakey.oauth_authorization_codes 
DROP CONSTRAINT IF EXISTS oauth_authorization_codes_client_id_fkey;

-- Add an index for performance since we lost the foreign key index
CREATE INDEX IF NOT EXISTS idx_oauth_authorization_codes_client_id 
ON supakey.oauth_authorization_codes(client_id);

SET search_path TO public;

COMMIT;