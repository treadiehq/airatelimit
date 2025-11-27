-- Migration: Add secretKeyHash column for secure secret key storage
-- This allows us to store hashed versions of secret keys instead of plaintext

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS "secretKeyHash" TEXT;

-- Note: After migration, run a script to hash existing secret keys
-- For now, the code handles both hashed and unhashed keys during the transition period

