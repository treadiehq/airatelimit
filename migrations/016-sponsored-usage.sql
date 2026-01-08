-- =====================================================
-- SPONSORED USAGE FEATURE
-- Allows sponsors to donate API usage to recipients
-- =====================================================

-- Sponsorship status enum
CREATE TYPE sponsorship_status AS ENUM ('active', 'paused', 'revoked', 'exhausted', 'expired');

-- =====================================================
-- SPONSOR KEYS
-- Provider API keys registered by sponsors
-- =====================================================
CREATE TABLE IF NOT EXISTS sponsor_keys (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Owner (sponsor's organization)
  "organizationId" uuid NOT NULL REFERENCES organizations("id") ON DELETE CASCADE,
  
  -- Provider info
  "provider" varchar NOT NULL CHECK ("provider" IN ('openai', 'anthropic', 'google', 'xai')),
  "name" varchar NOT NULL,  -- Display name (e.g., "My Claude Production Key")
  
  -- Encrypted API key (AES-256-GCM via CryptoService)
  "encryptedApiKey" text NOT NULL,
  
  -- Key hint for display (last 4 chars, e.g., "...ab12")
  "keyHint" varchar(8),
  
  -- Optional: base URL override for enterprise/custom deployments
  "baseUrl" varchar,
  
  -- Soft delete
  "isDeleted" boolean DEFAULT false,
  
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "IDX_sponsor_keys_org" ON sponsor_keys("organizationId");
CREATE INDEX IF NOT EXISTS "IDX_sponsor_keys_provider" ON sponsor_keys("organizationId", "provider");

-- =====================================================
-- SPONSORSHIPS
-- Budget allocations from sponsors to recipients
-- =====================================================
CREATE TABLE IF NOT EXISTS sponsorships (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Sponsor info
  "sponsorKeyId" uuid NOT NULL REFERENCES sponsor_keys("id") ON DELETE RESTRICT,
  "sponsorOrgId" uuid NOT NULL REFERENCES organizations("id") ON DELETE CASCADE,
  
  -- Recipient info (nullable until claimed)
  "recipientOrgId" uuid REFERENCES organizations("id") ON DELETE SET NULL,
  "recipientEmail" varchar,  -- Optional: target email for invite
  
  -- Display name
  "name" varchar NOT NULL,  -- e.g., "OSS Grant for @developer"
  "description" text,
  
  -- Budget constraints (one or both can be set)
  "spendCapUsd" decimal(12,4),        -- Total budget in USD
  "spendCapTokens" bigint,            -- Alternative: budget in tokens
  "spentUsd" decimal(12,4) DEFAULT 0, -- Running total spent
  "spentTokens" bigint DEFAULT 0,     -- Running total tokens
  
  -- Usage constraints
  "allowedModels" jsonb,              -- e.g., ["claude-3-5-sonnet", "claude-3-5-haiku"]
  "maxTokensPerRequest" integer,      -- Max tokens per single request
  "maxRequestsPerMinute" integer,     -- Rate limit
  "maxRequestsPerDay" integer,        -- Daily cap
  
  -- Temporal constraints
  "expiresAt" timestamp,
  
  -- Status
  "status" sponsorship_status DEFAULT 'active',
  "revokedAt" timestamp,
  "revokedReason" text,
  
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "IDX_sponsorships_sponsor_org" ON sponsorships("sponsorOrgId");
CREATE INDEX IF NOT EXISTS "IDX_sponsorships_recipient_org" ON sponsorships("recipientOrgId");
CREATE INDEX IF NOT EXISTS "IDX_sponsorships_status" ON sponsorships("status");
CREATE INDEX IF NOT EXISTS "IDX_sponsorships_sponsor_key" ON sponsorships("sponsorKeyId");

-- =====================================================
-- SPONSORED TOKENS
-- Bearer tokens issued to recipients for API access
-- =====================================================
CREATE TABLE IF NOT EXISTS sponsored_tokens (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to sponsorship
  "sponsorshipId" uuid NOT NULL REFERENCES sponsorships("id") ON DELETE CASCADE,
  
  -- Token (hashed for storage, format: spt_live_xxx or spt_test_xxx)
  "tokenHash" varchar NOT NULL UNIQUE,
  "tokenHint" varchar(8) NOT NULL,  -- Last 4 chars for display
  
  -- Metadata
  "isActive" boolean DEFAULT true,
  "lastUsedAt" timestamp,
  "usageCount" integer DEFAULT 0,
  
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "revokedAt" timestamp
);

CREATE INDEX IF NOT EXISTS "IDX_sponsored_tokens_hash" ON sponsored_tokens("tokenHash");
CREATE INDEX IF NOT EXISTS "IDX_sponsored_tokens_sponsorship" ON sponsored_tokens("sponsorshipId");

-- =====================================================
-- SPONSORSHIP USAGE LEDGER
-- Immutable log of all usage against sponsorships
-- Privacy-safe: no prompt/completion content
-- =====================================================
CREATE TABLE IF NOT EXISTS sponsorship_usage (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  "sponsorshipId" uuid NOT NULL REFERENCES sponsorships("id") ON DELETE CASCADE,
  "sponsoredTokenId" uuid REFERENCES sponsored_tokens("id") ON DELETE SET NULL,
  
  -- Request metadata (privacy-safe)
  "model" varchar NOT NULL,
  "provider" varchar NOT NULL,
  "inputTokens" integer NOT NULL DEFAULT 0,
  "outputTokens" integer NOT NULL DEFAULT 0,
  "totalTokens" integer NOT NULL DEFAULT 0,
  "costUsd" decimal(12,6) NOT NULL DEFAULT 0,
  
  -- Request context (no PII)
  "requestId" varchar,        -- For correlation
  "isStreaming" boolean DEFAULT false,
  "statusCode" integer,       -- Response status (200, 429, etc.)
  
  -- Timestamp
  "timestamp" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "IDX_sponsorship_usage_sponsorship" ON sponsorship_usage("sponsorshipId");
CREATE INDEX IF NOT EXISTS "IDX_sponsorship_usage_timestamp" ON sponsorship_usage("timestamp");
CREATE INDEX IF NOT EXISTS "IDX_sponsorship_usage_model" ON sponsorship_usage("sponsorshipId", "model");

-- =====================================================
-- SPONSORSHIP POOLS (Phase 2)
-- Allows multiple sponsors to contribute to a shared pool
-- =====================================================
CREATE TABLE IF NOT EXISTS sponsorship_pools (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Owner (recipient who created the pool)
  "ownerOrgId" uuid NOT NULL REFERENCES organizations("id") ON DELETE CASCADE,
  
  -- Pool metadata
  "name" varchar NOT NULL,
  "description" text,
  
  -- Pool-level constraints
  "allowedProviders" jsonb,  -- e.g., ["openai", "anthropic"]
  
  -- Routing strategy
  "routingStrategy" varchar DEFAULT 'proportional' CHECK ("routingStrategy" IN (
    'proportional',    -- Route based on remaining budget ratio
    'round_robin',     -- Rotate through sponsors
    'priority',        -- Use sponsors in priority order
    'cheapest_first',  -- Prefer sponsors with lower costs
    'random'           -- Random selection
  )),
  
  -- Status
  "isActive" boolean DEFAULT true,
  
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "IDX_sponsorship_pools_owner" ON sponsorship_pools("ownerOrgId");

-- =====================================================
-- POOL MEMBERSHIPS
-- Links sponsorships to pools
-- =====================================================
CREATE TABLE IF NOT EXISTS sponsorship_pool_members (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  "poolId" uuid NOT NULL REFERENCES sponsorship_pools("id") ON DELETE CASCADE,
  "sponsorshipId" uuid NOT NULL REFERENCES sponsorships("id") ON DELETE CASCADE,
  
  -- Pool-specific settings
  "priority" integer DEFAULT 0,  -- Higher = preferred (for priority routing)
  "weight" integer DEFAULT 1,    -- For weighted routing
  
  -- Status within pool
  "isActive" boolean DEFAULT true,
  
  "joinedAt" timestamp NOT NULL DEFAULT now(),
  
  UNIQUE ("poolId", "sponsorshipId")
);

CREATE INDEX IF NOT EXISTS "IDX_pool_members_pool" ON sponsorship_pool_members("poolId");
CREATE INDEX IF NOT EXISTS "IDX_pool_members_sponsorship" ON sponsorship_pool_members("sponsorshipId");

-- =====================================================
-- POOL TOKENS
-- Bearer tokens for accessing pools (Phase 2)
-- =====================================================
CREATE TABLE IF NOT EXISTS pool_tokens (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  "poolId" uuid NOT NULL REFERENCES sponsorship_pools("id") ON DELETE CASCADE,
  
  -- Token (hashed, format: spp_live_xxx or spp_test_xxx)
  "tokenHash" varchar NOT NULL UNIQUE,
  "tokenHint" varchar(8) NOT NULL,
  
  "isActive" boolean DEFAULT true,
  "lastUsedAt" timestamp,
  "usageCount" integer DEFAULT 0,
  
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "revokedAt" timestamp
);

CREATE INDEX IF NOT EXISTS "IDX_pool_tokens_hash" ON pool_tokens("tokenHash");
CREATE INDEX IF NOT EXISTS "IDX_pool_tokens_pool" ON pool_tokens("poolId");

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if a sponsorship has remaining budget
CREATE OR REPLACE FUNCTION check_sponsorship_budget(p_sponsorship_id uuid)
RETURNS TABLE (
  has_budget boolean,
  remaining_usd decimal,
  remaining_tokens bigint,
  reason text
) AS $$
DECLARE
  v_sponsorship RECORD;
BEGIN
  SELECT * INTO v_sponsorship FROM sponsorships WHERE id = p_sponsorship_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::decimal, 0::bigint, 'Sponsorship not found'::text;
    RETURN;
  END IF;
  
  -- Check status
  IF v_sponsorship.status != 'active' THEN
    RETURN QUERY SELECT false, 0::decimal, 0::bigint, 
      ('Sponsorship is ' || v_sponsorship.status)::text;
    RETURN;
  END IF;
  
  -- Check expiry
  IF v_sponsorship."expiresAt" IS NOT NULL AND v_sponsorship."expiresAt" < now() THEN
    RETURN QUERY SELECT false, 0::decimal, 0::bigint, 'Sponsorship has expired'::text;
    RETURN;
  END IF;
  
  -- Check USD budget
  IF v_sponsorship."spendCapUsd" IS NOT NULL THEN
    IF v_sponsorship."spentUsd" >= v_sponsorship."spendCapUsd" THEN
      RETURN QUERY SELECT false, 0::decimal, 0::bigint, 'Budget exhausted (USD)'::text;
      RETURN;
    END IF;
  END IF;
  
  -- Check token budget
  IF v_sponsorship."spendCapTokens" IS NOT NULL THEN
    IF v_sponsorship."spentTokens" >= v_sponsorship."spendCapTokens" THEN
      RETURN QUERY SELECT false, 0::decimal, 0::bigint, 'Budget exhausted (tokens)'::text;
      RETURN;
    END IF;
  END IF;
  
  -- Return remaining budgets
  RETURN QUERY SELECT 
    true,
    COALESCE(v_sponsorship."spendCapUsd" - v_sponsorship."spentUsd", 999999.99::decimal),
    COALESCE(v_sponsorship."spendCapTokens" - v_sponsorship."spentTokens", 999999999::bigint),
    'OK'::text;
END;
$$ LANGUAGE plpgsql;

-- Function to atomically consume sponsorship budget
CREATE OR REPLACE FUNCTION consume_sponsorship_budget(
  p_sponsorship_id uuid,
  p_cost_usd decimal,
  p_tokens bigint
) RETURNS TABLE (
  success boolean,
  new_spent_usd decimal,
  new_spent_tokens bigint,
  reason text
) AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- First check if we have budget
  SELECT * INTO v_result FROM check_sponsorship_budget(p_sponsorship_id);
  
  IF NOT v_result.has_budget THEN
    RETURN QUERY SELECT false, 0::decimal, 0::bigint, v_result.reason;
    RETURN;
  END IF;
  
  -- Atomic update with budget check in WHERE clause
  UPDATE sponsorships
  SET 
    "spentUsd" = "spentUsd" + p_cost_usd,
    "spentTokens" = "spentTokens" + p_tokens,
    "updatedAt" = now()
  WHERE id = p_sponsorship_id
    AND status = 'active'
    AND ("expiresAt" IS NULL OR "expiresAt" > now())
    AND ("spendCapUsd" IS NULL OR "spentUsd" + p_cost_usd <= "spendCapUsd")
    AND ("spendCapTokens" IS NULL OR "spentTokens" + p_tokens <= "spendCapTokens")
  RETURNING "spentUsd", "spentTokens" INTO v_result;
  
  IF NOT FOUND THEN
    -- Update failed - likely budget exceeded during race
    RETURN QUERY SELECT false, 0::decimal, 0::bigint, 'Budget exceeded or sponsorship inactive'::text;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, v_result."spentUsd", v_result."spentTokens", 'OK'::text;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- AUTO-UPDATE STATUS TRIGGER
-- Automatically set status to 'exhausted' when budget is depleted
-- =====================================================
CREATE OR REPLACE FUNCTION update_sponsorship_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if budget is exhausted
  IF NEW."spendCapUsd" IS NOT NULL AND NEW."spentUsd" >= NEW."spendCapUsd" THEN
    NEW.status = 'exhausted';
  ELSIF NEW."spendCapTokens" IS NOT NULL AND NEW."spentTokens" >= NEW."spendCapTokens" THEN
    NEW.status = 'exhausted';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sponsorship_status
  BEFORE UPDATE ON sponsorships
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION update_sponsorship_status();

