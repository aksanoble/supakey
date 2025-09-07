-- Deploy supakey:add_early_access_requests to pg

BEGIN;

SET search_path TO supakey, public;

-- Create table to track early access requests (waitlist)
CREATE TABLE IF NOT EXISTS supakey.early_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested',   -- user requested early access
    'invited',     -- invitation sent
    'accepted',    -- user accepted invitation / signed up
    'declined',    -- user declined or bounced
    'blocked'      -- do not contact
  )),
  invited boolean NOT NULL DEFAULT false,
  invited_at timestamptz,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  notes text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure case-insensitive uniqueness on email
CREATE UNIQUE INDEX IF NOT EXISTS idx_early_access_requests_email_lower
  ON supakey.early_access_requests (lower(email));

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION supakey.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_ear_updated_at'
  ) THEN
    CREATE TRIGGER set_ear_updated_at
    BEFORE UPDATE ON supakey.early_access_requests
    FOR EACH ROW EXECUTE FUNCTION supakey.set_updated_at();
  END IF;
END $$;

-- RLS: enable and allow inserts from public (anon + authenticated), but keep reads restricted
ALTER TABLE supakey.early_access_requests ENABLE ROW LEVEL SECURITY;

-- Insert policy for both anon and authenticated
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'public_can_create_early_access_request'
      AND schemaname = 'supakey'
      AND tablename = 'early_access_requests'
  ) THEN
    CREATE POLICY public_can_create_early_access_request
    ON supakey.early_access_requests
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);
  END IF;
END $$;

-- Grant only what’s needed: allow anon to insert, authenticated already granted via defaults
-- Allow anon to use the supakey schema solely for this insert path
GRANT USAGE ON SCHEMA supakey TO anon;
GRANT INSERT ON TABLE supakey.early_access_requests TO anon;

-- Do NOT grant SELECT/UPDATE/DELETE to anon; authenticated grants exist but are governed by RLS (no read policy)

SET search_path TO public;

COMMIT;
