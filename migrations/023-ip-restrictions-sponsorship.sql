-- Migration: Add IP restrictions to sponsorship system
-- Date: 2026-01-10
-- Description: Adds IP restriction fields to sponsor_keys and sponsorships tables

-- ====================================
-- SPONSOR KEYS: Add IP restriction fields
-- ====================================

-- Enable IP restrictions flag
ALTER TABLE "sponsor_keys" 
ADD COLUMN IF NOT EXISTS "ipRestrictionsEnabled" boolean DEFAULT false;

-- Allowed IP ranges (JSONB array of CIDR/IP strings)
ALTER TABLE "sponsor_keys" 
ADD COLUMN IF NOT EXISTS "allowedIpRanges" jsonb;

-- ====================================
-- SPONSORSHIPS: Add IP restriction fields
-- ====================================

-- IP restriction mode: 'inherit' (from sponsor key), 'custom', or 'none'
ALTER TABLE "sponsorships" 
ADD COLUMN IF NOT EXISTS "ipRestrictionMode" varchar(20) DEFAULT 'inherit';

-- Custom allowed IP ranges (JSONB array of CIDR/IP strings)
ALTER TABLE "sponsorships" 
ADD COLUMN IF NOT EXISTS "allowedIpRanges" jsonb;

-- ====================================
-- COMMENTS for documentation
-- ====================================

COMMENT ON COLUMN "sponsor_keys"."ipRestrictionsEnabled" IS 'Whether IP restrictions are enabled for this sponsor key';
COMMENT ON COLUMN "sponsor_keys"."allowedIpRanges" IS 'Array of allowed IP addresses/CIDR ranges, e.g., ["10.0.0.0/8", "192.168.1.100"]';
COMMENT ON COLUMN "sponsorships"."ipRestrictionMode" IS 'IP restriction mode: inherit (from key), custom, or none';
COMMENT ON COLUMN "sponsorships"."allowedIpRanges" IS 'Custom allowed IP ranges when mode is custom';
