-- Add usage tracking fields to organizations
-- These track requests/tokens per billing period for plan limit enforcement

ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "monthly_request_count" integer DEFAULT 0;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "monthly_token_count" bigint DEFAULT 0;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "usage_period_start" timestamp;

-- Initialize usage_period_start to current month start for existing orgs
UPDATE "organizations" 
SET "usage_period_start" = date_trunc('month', CURRENT_TIMESTAMP)
WHERE "usage_period_start" IS NULL;

