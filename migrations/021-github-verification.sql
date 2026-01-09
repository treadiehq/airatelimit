-- Migration: GitHub Verification for Sponsorship Claims
-- Adds GitHub identity linking to users and GitHub targeting to sponsorships

-- Add GitHub verification fields to users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "linkedGitHubUsername" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "linkedGitHubId" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "linkedGitHubAt" TIMESTAMP;

-- Create index for GitHub username lookups
CREATE INDEX IF NOT EXISTS idx_users_linked_github_username 
ON users ("linkedGitHubUsername");

-- Add target GitHub username to sponsorships
ALTER TABLE sponsorships
ADD COLUMN IF NOT EXISTS "targetGitHubUsername" VARCHAR(255);

-- Create index for finding sponsorships by target GitHub username
CREATE INDEX IF NOT EXISTS idx_sponsorships_target_github_username 
ON sponsorships ("targetGitHubUsername");

