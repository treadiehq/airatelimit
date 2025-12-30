-- AI Ratelimit - Team Management
-- Adds organization members and invitations for team collaboration

-- =====================================================
-- MEMBER ROLE ENUM
-- =====================================================
DO $$ BEGIN
  CREATE TYPE member_role_type AS ENUM ('owner', 'admin', 'member');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- ORGANIZATION MEMBERS
-- =====================================================
-- Junction table for organization membership with roles
CREATE TABLE IF NOT EXISTS organization_members (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL REFERENCES organizations("id") ON DELETE CASCADE,
  "userId" uuid NOT NULL REFERENCES users("id") ON DELETE CASCADE,
  "role" member_role_type NOT NULL DEFAULT 'member',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  UNIQUE ("organizationId", "userId")
);

CREATE INDEX IF NOT EXISTS "IDX_org_members_org" ON organization_members("organizationId");
CREATE INDEX IF NOT EXISTS "IDX_org_members_user" ON organization_members("userId");
CREATE INDEX IF NOT EXISTS "IDX_org_members_role" ON organization_members("role");

-- =====================================================
-- ORGANIZATION INVITES
-- =====================================================
-- Pending invitations for users to join an organization
CREATE TABLE IF NOT EXISTS organization_invites (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL REFERENCES organizations("id") ON DELETE CASCADE,
  "email" varchar NOT NULL,
  "role" member_role_type NOT NULL DEFAULT 'member',
  "token" varchar NOT NULL UNIQUE,
  "invitedById" uuid NOT NULL REFERENCES users("id") ON DELETE CASCADE,
  "expiresAt" timestamp NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  UNIQUE ("organizationId", "email")
);

CREATE INDEX IF NOT EXISTS "IDX_org_invites_org" ON organization_invites("organizationId");
CREATE INDEX IF NOT EXISTS "IDX_org_invites_email" ON organization_invites("email");
CREATE INDEX IF NOT EXISTS "IDX_org_invites_token" ON organization_invites("token");

-- =====================================================
-- MIGRATE EXISTING USERS TO MEMBERS TABLE
-- =====================================================
-- All existing users become owners of their organization
INSERT INTO organization_members ("organizationId", "userId", "role")
SELECT "organizationId", "id", 'owner'
FROM users
WHERE "organizationId" IS NOT NULL
ON CONFLICT ("organizationId", "userId") DO NOTHING;

