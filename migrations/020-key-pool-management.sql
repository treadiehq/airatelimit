-- Add management token and contributor email for anonymous contributor management
-- This allows anonymous contributors to manage/revoke their contributions via a secret link

-- Add management token column (unique, nullable - only for anonymous contributors)
ALTER TABLE "key_pool_entries" 
ADD COLUMN IF NOT EXISTS "managementToken" VARCHAR(255) UNIQUE;

-- Add contributor email column (nullable - optional for notifications)
ALTER TABLE "key_pool_entries" 
ADD COLUMN IF NOT EXISTS "contributorEmail" VARCHAR(255);

-- Create index on management token for fast lookups
CREATE INDEX IF NOT EXISTS "IDX_key_pool_entries_managementToken" 
ON "key_pool_entries" ("managementToken") 
WHERE "managementToken" IS NOT NULL;

