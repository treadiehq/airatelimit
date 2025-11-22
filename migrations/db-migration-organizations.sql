-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar NOT NULL UNIQUE,
  "description" varchar,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

-- Create index on organization name
CREATE INDEX IF NOT EXISTS "IDX_organizations_name" ON organizations("name");

-- Add organizationId to users table (nullable first)
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS "organizationId" uuid;

-- Create index on users.organizationId
CREATE INDEX IF NOT EXISTS "IDX_users_organizationId" ON users("organizationId");

-- Add organizationId to projects table (nullable first)
ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS "organizationId" uuid;

-- Create index on projects.organizationId
CREATE INDEX IF NOT EXISTS "IDX_projects_organizationId" ON projects("organizationId");

-- Handle existing data: Create default organization if there are existing users
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE "organizationId" IS NULL) THEN
    -- Create default organization
    INSERT INTO organizations ("name", "description") 
    VALUES ('Default Organization', 'Auto-created for existing users')
    ON CONFLICT ("name") DO NOTHING;
    
    -- Assign all existing users to default organization
    UPDATE users 
    SET "organizationId" = (SELECT id FROM organizations WHERE name = 'Default Organization')
    WHERE "organizationId" IS NULL;
    
    -- Assign all existing projects to their owner's organization
    UPDATE projects 
    SET "organizationId" = (
      SELECT "organizationId" FROM users WHERE users.id = projects."ownerId"
    )
    WHERE "organizationId" IS NULL;
  END IF;
END $$;

-- Now add foreign key constraints
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS "FK_users_organization";
  
ALTER TABLE users
  ADD CONSTRAINT "FK_users_organization" 
  FOREIGN KEY ("organizationId") 
  REFERENCES organizations("id") 
  ON DELETE SET NULL;

ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS "FK_projects_organization";

ALTER TABLE projects
  ADD CONSTRAINT "FK_projects_organization" 
  FOREIGN KEY ("organizationId") 
  REFERENCES organizations("id") 
  ON DELETE CASCADE;

