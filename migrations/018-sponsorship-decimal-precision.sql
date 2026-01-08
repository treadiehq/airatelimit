-- Migration: Increase decimal precision for USD amounts in sponsorships
-- Needed because API costs can be very small (e.g., $0.000007 per request)

-- Increase precision for spentUsd (4 -> 8 decimal places)
ALTER TABLE sponsorships 
ALTER COLUMN "spentUsd" TYPE NUMERIC(16,8);

-- Increase precision for spendCapUsd (4 -> 8 decimal places)
ALTER TABLE sponsorships 
ALTER COLUMN "spendCapUsd" TYPE NUMERIC(16,8);

-- Also update sponsorship_usage costUsd column
ALTER TABLE sponsorship_usage 
ALTER COLUMN "costUsd" TYPE NUMERIC(16,8);

