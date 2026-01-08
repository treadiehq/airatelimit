-- Migration: Create key_pool_invites table
-- Allows project owners to generate shareable invite links for contributors

-- Create the key_pool_invites table
CREATE TABLE IF NOT EXISTS key_pool_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "projectId" UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    "createdById" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL,
    name VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP,
    "maxContributions" INTEGER,
    "contributionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "UQ_key_pool_invites_token" UNIQUE (token)
);

-- Index for token lookups
CREATE INDEX IF NOT EXISTS "IDX_key_pool_invites_token" ON key_pool_invites(token);

-- Index for project lookups
CREATE INDEX IF NOT EXISTS "IDX_key_pool_invites_projectId" ON key_pool_invites("projectId");

-- Make contributorId nullable in key_pool_entries for anonymous contributions
ALTER TABLE key_pool_entries ALTER COLUMN "contributorId" DROP NOT NULL;

-- Add comment for documentation
COMMENT ON TABLE key_pool_invites IS 'Shareable invite links for contributing API keys to a project key pool';

