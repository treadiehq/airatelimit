-- Add more reserved organization names
-- Edit this file to add your custom reserved names, then run:
-- PGPASSWORD=password psql -h localhost -p 5433 -U postgres -d ai_proxy -f add-more-reserved-names.sql

INSERT INTO reserved_organization_names ("name", "reason") VALUES
  -- Your company/brand names
  ('acme', 'Reserved for ACME Corporation'),
  ('acme-corp', 'Reserved for ACME Corporation'),
  ('acmecorp', 'Reserved for ACME Corporation'),
  
  -- Competitors you want to block
  ('competitor-name', 'Reserved'),
  
  -- Future products/features
  ('enterprise', 'Reserved for enterprise tier'),
  ('premium', 'Reserved for premium tier'),
  ('pro', 'Reserved for pro tier'),
  
  -- Common variations
  ('test-company', 'Reserved'),
  ('demo-company', 'Reserved'),
  ('sample-company', 'Reserved'),
  
  -- Add your own here
  ('your-company-name', 'Your reason here'),
  ('another-name', 'Another reason')
  
ON CONFLICT ("name") DO NOTHING;  -- Prevents errors if name already reserved

