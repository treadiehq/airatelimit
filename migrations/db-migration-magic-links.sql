-- Add magic link authentication fields to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS "magicLinkToken" varchar,
  ADD COLUMN IF NOT EXISTS "magicLinkExpiresAt" timestamp;

-- Make password hash nullable (for users who only use magic links)
ALTER TABLE users 
  ALTER COLUMN "passwordHash" DROP NOT NULL;
