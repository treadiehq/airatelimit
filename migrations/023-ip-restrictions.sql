-- Migration: Add IP range restrictions for enterprise security
-- Allows restricting API keys to specific IP addresses or CIDR ranges

-- Add allowedIpRanges column to projects table
-- Stores array of IP addresses or CIDR notation (e.g., ["10.0.0.0/8", "192.168.1.100"])
ALTER TABLE projects ADD COLUMN IF NOT EXISTS "allowedIpRanges" JSONB DEFAULT NULL;

-- Add ipRestrictionsEnabled flag
ALTER TABLE projects ADD COLUMN IF NOT EXISTS "ipRestrictionsEnabled" BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN projects."allowedIpRanges" IS 'Array of allowed IP addresses or CIDR ranges (e.g., ["10.0.0.0/8", "192.168.1.100"])';
COMMENT ON COLUMN projects."ipRestrictionsEnabled" IS 'When enabled, requests are blocked if client IP is not in allowedIpRanges';
