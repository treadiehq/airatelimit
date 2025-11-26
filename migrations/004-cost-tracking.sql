-- Add cost tracking columns to usage_counters table
ALTER TABLE usage_counters ADD COLUMN IF NOT EXISTS input_tokens INTEGER DEFAULT 0;
ALTER TABLE usage_counters ADD COLUMN IF NOT EXISTS output_tokens INTEGER DEFAULT 0;
ALTER TABLE usage_counters ADD COLUMN IF NOT EXISTS cost_usd DECIMAL(10, 6) DEFAULT 0;
ALTER TABLE usage_counters ADD COLUMN IF NOT EXISTS blocked_requests INTEGER DEFAULT 0;
ALTER TABLE usage_counters ADD COLUMN IF NOT EXISTS saved_usd DECIMAL(10, 6) DEFAULT 0;

