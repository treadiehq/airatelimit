-- Migration: Public Sponsorship Badge Support
-- Adds fields for anonymous/public sponsorship creation via embeddable badges

-- Make sponsor_key_id nullable for anonymous sponsorships
ALTER TABLE sponsorships ALTER COLUMN sponsor_key_id DROP NOT NULL;

-- Make sponsor_org_id nullable for anonymous sponsorships
ALTER TABLE sponsorships ALTER COLUMN sponsor_org_id DROP NOT NULL;

-- Add direct API key storage for anonymous sponsorships
ALTER TABLE sponsorships ADD COLUMN IF NOT EXISTS encrypted_api_key_direct TEXT;

-- Add provider for anonymous sponsorships
ALTER TABLE sponsorships ADD COLUMN IF NOT EXISTS provider_direct VARCHAR(50);

-- Add sponsor email for anonymous sponsorships (the person creating the sponsorship)
ALTER TABLE sponsorships ADD COLUMN IF NOT EXISTS sponsor_email VARCHAR(255);

-- Add management token hash for magic link access
ALTER TABLE sponsorships ADD COLUMN IF NOT EXISTS management_token_hash VARCHAR(255);

-- Add management token expiry (nullable, for future use)
ALTER TABLE sponsorships ADD COLUMN IF NOT EXISTS management_token_expires_at TIMESTAMP;

-- Index for looking up sponsorships by sponsor email
CREATE INDEX IF NOT EXISTS idx_sponsorships_sponsor_email ON sponsorships(sponsor_email);
