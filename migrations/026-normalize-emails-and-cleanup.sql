-- Migration: Normalize emails to lowercase, add sponsored_tokens FK, drop redundant indices
-- Related issues: #48 (email case), #52 (sponsored token entity fixes)
-- Date: 2026-02-27

-- 1. Normalize existing user emails to lowercase (issue #48)
--    The application now stores and looks up emails in lowercase.
--    This prevents duplicate accounts via case variants (e.g. Admin@example.com vs admin@example.com).
UPDATE users SET email = LOWER(email) WHERE email != LOWER(email);

-- Add a unique index on lowercase email to prevent future case-variant duplicates
-- (safe even if all emails are already lowercase; enforces it going forward)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));

-- 2. Add foreign key constraint for recipientOrgId on sponsored_tokens (issue #52)
--    The entity now has a @ManyToOne relation but synchronize is off in production.
ALTER TABLE sponsored_tokens
  ADD CONSTRAINT IF NOT EXISTS "FK_sponsored_tokens_recipientOrgId"
  FOREIGN KEY ("recipientOrgId") REFERENCES organizations(id) ON DELETE SET NULL;

-- 3. Drop redundant indices on tokenHash (issue #52)
--    unique: true on the column already creates an index; the explicit @Index() was redundant.
DROP INDEX IF EXISTS "IDX_sponsored_tokens_tokenHash";
DROP INDEX IF EXISTS "IDX_pool_tokens_tokenHash";
