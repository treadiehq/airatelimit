-- Add plan expiry date to organizations
-- This allows admins to set when a plan upgrade expires

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS "planExpiresAt" TIMESTAMP WITH TIME ZONE;

-- Index for efficient expiry queries
CREATE INDEX IF NOT EXISTS idx_organizations_plan_expires 
ON organizations ("planExpiresAt") 
WHERE "planExpiresAt" IS NOT NULL;

