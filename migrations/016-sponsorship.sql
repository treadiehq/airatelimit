-- Sponsorship System: Token donations and key pooling
-- Allows users to sponsor others with API credits and pool API keys for load balancing

-- ====================================
-- SPONSORSHIPS TABLE
-- ====================================
-- Tracks token/request/cost donations from sponsors to recipients

CREATE TABLE IF NOT EXISTS sponsorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Project this sponsorship applies to
  "projectId" UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Sponsor (the donor)
  "sponsorId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "sponsorOrgId" UUID REFERENCES organizations(id),
  
  -- Recipient identity (matches x-identity header)
  "recipientIdentity" VARCHAR(512) NOT NULL,
  "recipientName" VARCHAR(255),
  
  -- Budget configuration
  "budgetType" VARCHAR(20) NOT NULL DEFAULT 'tokens' CHECK ("budgetType" IN ('tokens', 'requests', 'cost')),
  "monthlyBudget" INTEGER NOT NULL,
  "currentPeriodUsage" INTEGER NOT NULL DEFAULT 0,
  "totalUsage" BIGINT NOT NULL DEFAULT 0,
  "currentPeriodStart" DATE,
  
  -- Status
  active BOOLEAN NOT NULL DEFAULT true,
  "expiresAt" TIMESTAMP WITH TIME ZONE,
  
  -- Sponsor message and visibility
  message TEXT,
  "isPublic" BOOLEAN NOT NULL DEFAULT true,
  
  -- Notification preferences
  notifications JSONB DEFAULT '{"notifyOnLowBudget": true, "lowBudgetThreshold": 20, "notifyRecipientOnCreate": true}',
  
  -- Timestamps
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for sponsorships
CREATE UNIQUE INDEX IF NOT EXISTS idx_sponsorships_sponsor_recipient 
ON sponsorships ("sponsorId", "recipientIdentity", "projectId");

CREATE INDEX IF NOT EXISTS idx_sponsorships_project_recipient 
ON sponsorships ("projectId", "recipientIdentity");

CREATE INDEX IF NOT EXISTS idx_sponsorships_sponsor 
ON sponsorships ("sponsorId");

CREATE INDEX IF NOT EXISTS idx_sponsorships_recipient 
ON sponsorships ("recipientIdentity");

-- ====================================
-- KEY POOL ENTRIES TABLE
-- ====================================
-- API keys contributed to a shared pool for load balancing

CREATE TABLE IF NOT EXISTS key_pool_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Project this key is pooled for
  "projectId" UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Contributor of this key
  "contributorId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Provider configuration
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google', 'xai', 'other')),
  "apiKey" TEXT NOT NULL, -- ENCRYPTED at rest
  "baseUrl" TEXT,
  name VARCHAR(255),
  
  -- Budget limits (0 = unlimited)
  "monthlyTokenLimit" INTEGER NOT NULL DEFAULT 0,
  "monthlyCostLimitCents" INTEGER NOT NULL DEFAULT 0,
  
  -- Current period usage
  "currentPeriodTokens" BIGINT NOT NULL DEFAULT 0,
  "currentPeriodCostCents" INTEGER NOT NULL DEFAULT 0,
  "currentPeriodRequests" INTEGER NOT NULL DEFAULT 0,
  "currentPeriodStart" DATE,
  
  -- Lifetime usage
  "totalTokens" BIGINT NOT NULL DEFAULT 0,
  "totalCostCents" BIGINT NOT NULL DEFAULT 0,
  "totalRequests" INTEGER NOT NULL DEFAULT 0,
  
  -- Load balancing
  weight INTEGER NOT NULL DEFAULT 1,
  priority INTEGER NOT NULL DEFAULT 0,
  
  -- Health tracking
  active BOOLEAN NOT NULL DEFAULT true,
  "rateLimited" BOOLEAN NOT NULL DEFAULT false,
  "rateLimitedUntil" TIMESTAMP WITH TIME ZONE,
  "consecutiveErrors" INTEGER NOT NULL DEFAULT 0,
  "lastUsedAt" TIMESTAMP WITH TIME ZONE,
  "lastErrorAt" TIMESTAMP WITH TIME ZONE,
  "lastError" TEXT,
  
  -- Restrictions
  "allowedModels" JSONB, -- Array of model names
  "allowedIdentities" JSONB, -- Array of identity strings
  
  -- Timestamps
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for key pool
CREATE INDEX IF NOT EXISTS idx_key_pool_project_provider 
ON key_pool_entries ("projectId", provider);

CREATE INDEX IF NOT EXISTS idx_key_pool_contributor 
ON key_pool_entries ("contributorId");

CREATE INDEX IF NOT EXISTS idx_key_pool_active 
ON key_pool_entries ("projectId", provider, active, weight) 
WHERE active = true AND weight > 0;

-- ====================================
-- ADD SPONSORSHIP-RELATED FIELDS TO PROJECTS
-- ====================================

-- Enable key pooling for a project
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS "keyPoolEnabled" BOOLEAN DEFAULT false;

-- Load balancing strategy for pooled keys
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS "keyPoolStrategy" VARCHAR(20) DEFAULT 'weighted-random';

-- ====================================
-- TRIGGER FOR UPDATED_AT
-- ====================================

CREATE OR REPLACE FUNCTION update_sponsorship_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sponsorships_updated_at
  BEFORE UPDATE ON sponsorships
  FOR EACH ROW
  EXECUTE FUNCTION update_sponsorship_updated_at();

CREATE TRIGGER key_pool_entries_updated_at
  BEFORE UPDATE ON key_pool_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_sponsorship_updated_at();

