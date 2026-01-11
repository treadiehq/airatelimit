-- Migration: Add claimable sponsorships feature
-- Date: 2026-01-11
-- Description: Adds support for link-based and code-based sponsorship claims

-- ====================================
-- SPONSORSHIPS: Add claim fields
-- ====================================

-- Claim type: how this sponsorship can be claimed
-- 'targeted' = traditional (email/GitHub)
-- 'single_link' = one-time shareable link
-- 'multi_link' = multiple people can claim from same link
-- 'code' = claim code entry
ALTER TABLE "sponsorships" 
ADD COLUMN IF NOT EXISTS "claimType" varchar(20) DEFAULT 'targeted';

-- Unique claim token for link-based claims
ALTER TABLE "sponsorships" 
ADD COLUMN IF NOT EXISTS "claimToken" varchar(255) UNIQUE;

-- User-friendly claim code (e.g., HACK2026-ABCD-1234)
ALTER TABLE "sponsorships" 
ADD COLUMN IF NOT EXISTS "claimCode" varchar(50) UNIQUE;

-- Maximum number of claims allowed
ALTER TABLE "sponsorships" 
ADD COLUMN IF NOT EXISTS "maxClaims" integer;

-- Current number of successful claims
ALTER TABLE "sponsorships" 
ADD COLUMN IF NOT EXISTS "currentClaims" integer DEFAULT 0;

-- Per-claim budget (for multi_link sponsorships)
ALTER TABLE "sponsorships" 
ADD COLUMN IF NOT EXISTS "perClaimBudgetUsd" decimal(16,8);

-- ====================================
-- INDEXES
-- ====================================

CREATE INDEX IF NOT EXISTS "idx_sponsorships_claim_token" ON "sponsorships" ("claimToken");
CREATE INDEX IF NOT EXISTS "idx_sponsorships_claim_code" ON "sponsorships" ("claimCode");
CREATE INDEX IF NOT EXISTS "idx_sponsorships_claim_type" ON "sponsorships" ("claimType");

-- ====================================
-- COMMENTS
-- ====================================

COMMENT ON COLUMN "sponsorships"."claimType" IS 'How this sponsorship can be claimed: targeted, single_link, multi_link, or code';
COMMENT ON COLUMN "sponsorships"."claimToken" IS 'Unique token for link-based claims (used in /claim/:token URL)';
COMMENT ON COLUMN "sponsorships"."claimCode" IS 'User-friendly claim code (e.g., HACK2026-ABCD-1234)';
COMMENT ON COLUMN "sponsorships"."maxClaims" IS 'Maximum number of claims allowed (for multi_link type)';
COMMENT ON COLUMN "sponsorships"."currentClaims" IS 'Current number of successful claims';
COMMENT ON COLUMN "sponsorships"."perClaimBudgetUsd" IS 'Budget allocated per claim (for multi_link type)';

-- ====================================
-- SPONSORED_TOKENS: Add recipient org tracking
-- ====================================

-- Track which organization claimed this token (for claimable sponsorships)
ALTER TABLE "sponsored_tokens" 
ADD COLUMN IF NOT EXISTS "recipientOrgId" uuid;

CREATE INDEX IF NOT EXISTS "idx_sponsored_tokens_recipient_org" ON "sponsored_tokens" ("recipientOrgId");

COMMENT ON COLUMN "sponsored_tokens"."recipientOrgId" IS 'Organization that claimed this token (for claimable sponsorships)';
