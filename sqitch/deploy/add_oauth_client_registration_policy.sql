-- Deploy supakey:add_oauth_client_registration_policy to pg

BEGIN;

SET search_path TO supakey, public;

-- Add policy to allow authenticated users to register OAuth clients
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'register_clients' AND polrelid = 'supakey.oauth_clients'::regclass) THEN
    CREATE POLICY "register_clients" ON supakey.oauth_clients
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

SET search_path TO public;

COMMIT;