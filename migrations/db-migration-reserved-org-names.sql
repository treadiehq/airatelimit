-- Create reserved organization names table
CREATE TABLE IF NOT EXISTS reserved_organization_names (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar NOT NULL UNIQUE,
  "reason" varchar,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

-- Create index on name for fast lookups
CREATE INDEX IF NOT EXISTS "IDX_reserved_org_names_name" ON reserved_organization_names("name");

-- Insert common reserved names
INSERT INTO reserved_organization_names ("name", "reason") VALUES
  ('admin', 'System reserved'),
  ('administrator', 'System reserved'),
  ('system', 'System reserved'),
  ('root', 'System reserved'),
  ('superuser', 'System reserved'),
  ('api', 'System reserved'),
  ('app', 'System reserved'),
  ('help', 'System reserved'),
  ('support', 'System reserved'),
  ('security', 'System reserved'),
  ('abuse', 'System reserved'),
  ('billing', 'System reserved'),
  ('sales', 'System reserved'),
  ('marketing', 'System reserved'),
  ('noreply', 'System reserved'),
  ('no-reply', 'System reserved'),
  ('postmaster', 'System reserved'),
  ('hostmaster', 'System reserved'),
  ('webmaster', 'System reserved'),
  ('info', 'System reserved'),
  ('contact', 'System reserved'),
  ('privacy', 'System reserved'),
  ('terms', 'System reserved'),
  ('legal', 'System reserved'),
  ('status', 'System reserved'),
  ('default', 'System reserved'),
  ('null', 'System reserved'),
  ('undefined', 'System reserved'),
  ('test', 'System reserved'),
  ('demo', 'System reserved'),
  ('example', 'System reserved'),
  ('sample', 'System reserved')
ON CONFLICT ("name") DO NOTHING;

