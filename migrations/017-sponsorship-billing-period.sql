-- Migration: Add billing period support to sponsorships
-- Allows sponsorships to be one-time or monthly recurring

-- Add billing period column (default to one_time for existing sponsorships)
ALTER TABLE sponsorships 
ADD COLUMN IF NOT EXISTS "billingPeriod" VARCHAR(20) DEFAULT 'one_time';

-- Add current period start tracking
ALTER TABLE sponsorships 
ADD COLUMN IF NOT EXISTS "currentPeriodStart" TIMESTAMP;

-- Set current period start for existing active sponsorships
UPDATE sponsorships 
SET "currentPeriodStart" = "createdAt" 
WHERE "currentPeriodStart" IS NULL;

-- Add index for efficient period reset queries
CREATE INDEX IF NOT EXISTS idx_sponsorships_period_reset 
ON sponsorships ("billingPeriod", "currentPeriodStart", "status")
WHERE "billingPeriod" = 'monthly' AND status = 'active';

