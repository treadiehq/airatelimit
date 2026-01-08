-- Migration: Add renewal type to sponsorships
-- This allows sponsorships to be either monthly (auto-reset) or one-time (like gifted tokens)

-- Create the enum type for renewal
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sponsorships_renewaltype_enum') THEN
        CREATE TYPE sponsorships_renewaltype_enum AS ENUM ('monthly', 'one-time');
    END IF;
END$$;

-- Add the renewal type column with default 'monthly' for existing sponsorships
ALTER TABLE sponsorships 
ADD COLUMN IF NOT EXISTS "renewalType" sponsorships_renewaltype_enum NOT NULL DEFAULT 'monthly';

-- Add a comment for documentation
COMMENT ON COLUMN sponsorships."renewalType" IS 'monthly = budget resets each month, one-time = fixed budget like gifted tokens';

