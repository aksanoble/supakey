-- Deploy supakey:add_oauth_tables to pg

BEGIN;

SET search_path TO supakey, public;

-- OAuth clients table (public clients supported; secret optional for confidential clients)
CREATE TABLE IF NOT EXISTS supakey.oauth_clients (
  client_id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  app_identifier TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Consents given by users to clients
CREATE TABLE IF NOT EXISTS supakey.oauth_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES supakey.oauth_clients(client_id) ON DELETE CASCADE,
  scope TEXT DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, client_id)
);

-- Authorization codes (PKCE supported)
CREATE TABLE IF NOT EXISTS supakey.oauth_authorization_codes (
  code TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES supakey.oauth_clients(client_id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  code_challenge TEXT,
  code_challenge_method TEXT,
  scope TEXT DEFAULT 'default',
  app_identifier TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Basic RLS setup
ALTER TABLE supakey.oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE supakey.oauth_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE supakey.oauth_authorization_codes ENABLE ROW LEVEL SECURITY;

-- Allow users to read clients (for consent display) and manage their own consents/codes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'read_clients' AND polrelid = 'supakey.oauth_clients'::regclass) THEN
    CREATE POLICY "read_clients" ON supakey.oauth_clients
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'manage_own_consents' AND polrelid = 'supakey.oauth_consents'::regclass) THEN
    CREATE POLICY "manage_own_consents" ON supakey.oauth_consents
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'manage_own_codes' AND polrelid = 'supakey.oauth_authorization_codes'::regclass) THEN
    CREATE POLICY "manage_own_codes" ON supakey.oauth_authorization_codes
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

GRANT USAGE ON SCHEMA supakey TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE supakey.oauth_clients TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE supakey.oauth_consents TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE supakey.oauth_authorization_codes TO authenticated, service_role;

SET search_path TO public;

COMMIT;


