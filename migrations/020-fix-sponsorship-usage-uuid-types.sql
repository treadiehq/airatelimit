-- Migration: Fix organizationId and projectId types to be UUID

-- Change organizationId from VARCHAR to UUID
ALTER TABLE sponsorship_usage 
ALTER COLUMN "organizationId" TYPE UUID USING "organizationId"::uuid;

-- Change projectId from VARCHAR to UUID
ALTER TABLE sponsorship_usage 
ALTER COLUMN "projectId" TYPE UUID USING "projectId"::uuid;

