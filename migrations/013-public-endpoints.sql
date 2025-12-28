-- Migration: 013-public-endpoints
-- Description: Add public endpoints feature for frontend-safe API access
-- This allows customers to use the API from their frontend without exposing API keys

-- Add public mode flag (default false for security)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS "publicModeEnabled" BOOLEAN DEFAULT false;

-- Add allowed origins array (JSONB for flexibility)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS "allowedOrigins" JSONB DEFAULT NULL;

-- Add index for faster lookups on public mode projects
CREATE INDEX IF NOT EXISTS idx_projects_public_mode ON projects("publicModeEnabled") WHERE "publicModeEnabled" = true;

-- Comment for documentation
COMMENT ON COLUMN projects."publicModeEnabled" IS 'When true, allows frontend requests using only x-project-key (no Authorization header required). Requires stored provider keys and origin validation.';
COMMENT ON COLUMN projects."allowedOrigins" IS 'Array of allowed origins for public mode. Example: ["https://myapp.com", "https://staging.myapp.com"]. Requests from other origins are rejected.';

