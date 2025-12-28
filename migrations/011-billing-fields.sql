-- Migration: Add billing fields to organizations
-- Only used in cloud mode, but schema is always present for consistency

-- Add Stripe customer and subscription tracking
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP;

-- Index for Stripe customer lookups
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer_id ON organizations(stripe_customer_id);

-- Comment explaining these fields
COMMENT ON COLUMN organizations.stripe_customer_id IS 'Stripe customer ID (cloud mode only)';
COMMENT ON COLUMN organizations.stripe_subscription_id IS 'Stripe subscription ID (cloud mode only)';
COMMENT ON COLUMN organizations.plan IS 'Subscription plan: trial, basic, pro, enterprise';
COMMENT ON COLUMN organizations.trial_started_at IS 'When the 7-day trial started (null = use org createdAt)';

