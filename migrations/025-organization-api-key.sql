-- Add API key columns to organizations for programmatic sponsorship management
-- API key format: org_sk_xxx

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS api_key VARCHAR(255) UNIQUE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS api_key_hash VARCHAR(255);

-- Index for fast API key lookups
CREATE INDEX IF NOT EXISTS idx_organizations_api_key ON organizations(api_key);

COMMENT ON COLUMN organizations.api_key IS 'Organization API key (org_sk_xxx) for programmatic sponsorship management';
COMMENT ON COLUMN organizations.api_key_hash IS 'Bcrypt hash of API key for secure verification';
