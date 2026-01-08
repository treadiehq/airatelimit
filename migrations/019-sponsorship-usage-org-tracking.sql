-- Migration: Track which organization/project used each sponsored request
-- This allows multiple orgs to use the same sponsored token

-- Add organization and project tracking to usage
ALTER TABLE sponsorship_usage 
ADD COLUMN IF NOT EXISTS "organizationId" UUID;

ALTER TABLE sponsorship_usage 
ADD COLUMN IF NOT EXISTS "projectId" UUID;

-- Add index for efficient lookups by organization
CREATE INDEX IF NOT EXISTS idx_sponsorship_usage_org 
ON sponsorship_usage ("organizationId", "sponsorshipId");

-- Add index for efficient lookups by project
CREATE INDEX IF NOT EXISTS idx_sponsorship_usage_project 
ON sponsorship_usage ("projectId", "sponsorshipId");

