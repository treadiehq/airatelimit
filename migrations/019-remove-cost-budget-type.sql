-- Migration: Remove 'cost' from sponsorships budget type enum
-- The 'cost' budget type was defined but never implemented, so we're removing it

-- First, drop the new type if it exists from a previous failed attempt
DROP TYPE IF EXISTS sponsorships_budgettype_enum_new;

-- Step 1: Remove the default value from the column first
ALTER TABLE sponsorships ALTER COLUMN "budgetType" DROP DEFAULT;

-- Step 2: Create new enum without 'cost'
CREATE TYPE sponsorships_budgettype_enum_new AS ENUM ('tokens', 'requests');

-- Step 3: Update the column to use the new enum
ALTER TABLE sponsorships 
  ALTER COLUMN "budgetType" TYPE sponsorships_budgettype_enum_new 
  USING "budgetType"::text::sponsorships_budgettype_enum_new;

-- Step 4: Drop the old enum
DROP TYPE sponsorships_budgettype_enum;

-- Step 5: Rename the new enum to the original name
ALTER TYPE sponsorships_budgettype_enum_new RENAME TO sponsorships_budgettype_enum;

-- Step 6: Restore the default value
ALTER TABLE sponsorships ALTER COLUMN "budgetType" SET DEFAULT 'tokens';
