# Database Migrations

This folder contains SQL migration files for the AI Ratelimit project.

## How to Apply Migrations

### On Railway (Production)

1. Go to your Railway project dashboard
2. Click on your PostgreSQL database
3. Click on the "Query" tab
4. Copy and paste the SQL from the migration file
5. Click "Run Query"

### Using psql (Command Line)

```bash
# Connect to your database
psql $DATABASE_URL

# Run a migration file
\i migrations/db-migration-nullable-provider.sql
```

### Using a Database Client

Use any PostgreSQL client (TablePlus, pgAdmin, DBeaver, etc.):

1. Connect to your database
2. Open a SQL query window
3. Copy and paste the migration SQL
4. Execute the query

## Migration Files

- `db-migration-magic-links.sql` - Add magic link authentication tables
- `db-migration-organizations.sql` - Add organizations support
- `db-migration-reserved-org-names.sql` - Add reserved organization names
- `db-migration-nullable-provider.sql` - **NEW** - Make provider/baseUrl nullable for unconfigured projects

## Important Notes

- **Always backup your database before running migrations**
- Migrations are idempotent where possible (safe to run multiple times)
- Run migrations in order if deploying from scratch
- For production, test migrations on a staging database first

## Latest Migration (Required)

**`db-migration-nullable-provider.sql`** - Run this if you're updating to the latest version with the new project creation flow.

This migration:
- Removes default value from `provider` column
- Makes `provider` nullable
- Removes default value from `baseUrl` column
- Allows projects to be created without initial configuration
- Existing projects keep their current values (backward compatible)

