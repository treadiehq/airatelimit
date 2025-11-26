-- AI Ratelimit - Initial Database Schema
-- This is a consolidated schema for fresh installations.
-- Run this once to set up all required tables.

-- =====================================================
-- ORGANIZATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS organizations (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar NOT NULL UNIQUE,
  "description" varchar,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "IDX_organizations_name" ON organizations("name");

-- Reserved organization names
CREATE TABLE IF NOT EXISTS reserved_organization_names (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar NOT NULL UNIQUE,
  "reason" varchar,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "IDX_reserved_org_names_name" ON reserved_organization_names("name");

-- Insert common reserved names
INSERT INTO reserved_organization_names ("name", "reason") VALUES
  ('admin', 'System reserved'),
  ('administrator', 'System reserved'),
  ('system', 'System reserved'),
  ('root', 'System reserved'),
  ('api', 'System reserved'),
  ('app', 'System reserved'),
  ('help', 'System reserved'),
  ('support', 'System reserved'),
  ('security', 'System reserved'),
  ('billing', 'System reserved'),
  ('noreply', 'System reserved'),
  ('postmaster', 'System reserved'),
  ('test', 'System reserved'),
  ('demo', 'System reserved')
ON CONFLICT ("name") DO NOTHING;

-- =====================================================
-- USERS
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" varchar NOT NULL UNIQUE,
  "passwordHash" varchar,
  "magicLinkToken" varchar,
  "magicLinkExpiresAt" timestamp,
  "organizationId" uuid REFERENCES organizations("id") ON DELETE SET NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "IDX_users_email" ON users("email");
CREATE INDEX IF NOT EXISTS "IDX_users_organizationId" ON users("organizationId");

-- =====================================================
-- PROJECTS
-- =====================================================
CREATE TYPE provider_type AS ENUM ('openai', 'anthropic', 'google', 'xai', 'other');
CREATE TYPE limit_period_type AS ENUM ('daily', 'weekly', 'monthly');
CREATE TYPE limit_type_type AS ENUM ('requests', 'tokens', 'both');
CREATE TYPE security_mode_type AS ENUM ('block', 'log');

CREATE TABLE IF NOT EXISTS projects (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar NOT NULL,
  "projectKey" varchar UNIQUE,
  "ownerId" uuid REFERENCES users("id") ON DELETE SET NULL,
  "organizationId" uuid REFERENCES organizations("id") ON DELETE CASCADE,
  
  -- Provider configuration (legacy single provider - kept for backwards compat)
  "provider" provider_type,
  "baseUrl" varchar,
  "openaiApiKey" varchar,
  
  -- Multi-provider configuration
  "providerKeys" JSONB,
  
  -- Rate limiting
  "dailyRequestLimit" integer,
  "dailyTokenLimit" integer,
  "limitPeriod" limit_period_type DEFAULT 'daily',
  "limitType" limit_type_type DEFAULT 'both',
  "limitExceededResponse" text,
  
  -- Model-specific limits
  "modelLimits" JSONB,
  
  -- Tier-based limits
  "tiers" JSONB,
  
  -- Visual rule engine
  "rules" JSONB,
  
  -- Security configuration
  "securityEnabled" boolean DEFAULT false,
  "securityMode" security_mode_type DEFAULT 'block',
  "securityCategories" JSONB DEFAULT '["systemPromptExtraction", "roleManipulation", "instructionOverride", "boundaryBreaking", "obfuscation", "directLeakage"]'::jsonb,
  "securityHeuristicsEnabled" boolean DEFAULT false,
  
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "IDX_projects_projectKey" ON projects("projectKey");
CREATE INDEX IF NOT EXISTS "IDX_projects_organizationId" ON projects("organizationId");
CREATE INDEX IF NOT EXISTS "IDX_projects_ownerId" ON projects("ownerId");

-- =====================================================
-- USAGE COUNTERS
-- =====================================================
CREATE TABLE IF NOT EXISTS usage_counters (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectId" uuid NOT NULL,
  "identity" varchar NOT NULL,
  "periodStart" date NOT NULL,
  "model" varchar DEFAULT '',
  "requestsUsed" integer DEFAULT 0,
  "tokensUsed" integer DEFAULT 0,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  UNIQUE ("projectId", "identity", "periodStart", "model")
);

CREATE INDEX IF NOT EXISTS "IDX_usage_project_period" ON usage_counters("projectId", "periodStart");
CREATE INDEX IF NOT EXISTS "IDX_usage_project_model" ON usage_counters("projectId", "model");

-- =====================================================
-- SECURITY EVENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS security_events (
  "id" SERIAL PRIMARY KEY,
  "projectId" uuid NOT NULL REFERENCES projects("id") ON DELETE CASCADE,
  "identity" varchar NOT NULL,
  "pattern" varchar NOT NULL,
  "severity" varchar NOT NULL,
  "reason" text,
  "blocked" boolean DEFAULT true,
  "messagePreview" text,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "IDX_security_events_projectId" ON security_events("projectId");
CREATE INDEX IF NOT EXISTS "IDX_security_events_createdAt" ON security_events("createdAt");
CREATE INDEX IF NOT EXISTS "IDX_security_events_severity" ON security_events("severity");

