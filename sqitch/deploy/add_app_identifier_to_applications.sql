-- Deploy supakey:add_app_identifier_to_applications to pg

BEGIN;

-- Add app_identifier column to applications table
ALTER TABLE supakey.applications 
ADD COLUMN IF NOT EXISTS app_identifier TEXT;

-- Create index for faster lookups by app_identifier
CREATE INDEX IF NOT EXISTS idx_applications_app_identifier 
ON supakey.applications(app_identifier);

-- Create unique constraint to ensure one app per user connection per app_identifier
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_app_per_user_connection') THEN
        ALTER TABLE supakey.applications 
        ADD CONSTRAINT unique_app_per_user_connection 
        UNIQUE (user_connection_id, app_identifier);
    END IF;
END $$;

COMMIT;
