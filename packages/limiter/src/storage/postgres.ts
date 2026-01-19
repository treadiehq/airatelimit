import { Storage, getCurrentPeriod } from './interface';

/**
 * PostgreSQL client interface (minimal, compatible with 'pg' package)
 */
export interface PostgresClient {
  query<T = any>(text: string, values?: any[]): Promise<{ rows: T[] }>;
}

/**
 * PostgreSQL storage backend
 * 
 * Good for:
 * - When you already have PostgreSQL
 * - Audit trail requirements
 * - Simpler infrastructure (no Redis)
 * 
 * Limitations:
 * - Slower than Redis for high-frequency operations
 * - Requires table setup
 * 
 * Required tables (run migrations first):
 * ```sql
 * CREATE TABLE IF NOT EXISTS limiter_buckets (
 *   tenant_id VARCHAR(255) PRIMARY KEY,
 *   tokens DECIMAL(10, 2) NOT NULL,
 *   last_refill BIGINT NOT NULL,
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * CREATE TABLE IF NOT EXISTS limiter_usage (
 *   tenant_id VARCHAR(255) NOT NULL,
 *   period VARCHAR(7) NOT NULL,
 *   tokens BIGINT NOT NULL DEFAULT 0,
 *   cost DECIMAL(10, 4) NOT NULL DEFAULT 0,
 *   updated_at TIMESTAMPTZ DEFAULT NOW(),
 *   PRIMARY KEY (tenant_id, period)
 * );
 * ```
 */
export class PostgresStorage implements Storage {
  private client: PostgresClient;
  private tablePrefix: string;

  constructor(client: PostgresClient, tablePrefix: string = 'limiter_') {
    this.client = client;
    this.tablePrefix = tablePrefix;
  }

  // ============================================================
  // TABLE NAMES
  // ============================================================

  private get bucketsTable(): string {
    return `${this.tablePrefix}buckets`;
  }

  private get usageTable(): string {
    return `${this.tablePrefix}usage`;
  }

  // ============================================================
  // TOKEN BUCKET RATE LIMITING
  // ============================================================

  /**
   * Atomically try to consume a token from the bucket.
   * 
   * Uses a single SQL statement with CTE to ensure atomicity:
   * 1. Refill tokens based on elapsed time
   * 2. Check if tokens >= 1
   * 3. If yes, consume one token atomically
   * 
   * This prevents race conditions where concurrent requests could
   * both read the same token count before either consumes.
   */
  async tryConsume(
    tenantId: string,
    capacity: number,
    refillRate: number
  ): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
    const now = Date.now();

    // Atomic token bucket operation using CTE
    // This combines read, check, and consume into a single atomic SQL statement
    const result = await this.client.query<{
      allowed: string;
      tokens: string;
      last_refill: string;
    }>(
      `
      WITH refilled AS (
        -- Step 1: Insert or update bucket with refilled tokens
        INSERT INTO ${this.bucketsTable} (tenant_id, tokens, last_refill)
        VALUES ($1, $2, $3)
        ON CONFLICT (tenant_id) DO UPDATE SET
          tokens = LEAST($2, ${this.bucketsTable}.tokens + 
            (($3 - ${this.bucketsTable}.last_refill) / 1000.0 * $4)),
          last_refill = $3
        RETURNING tenant_id, tokens, last_refill
      ),
      consumed AS (
        -- Step 2: Atomically consume one token if available
        UPDATE ${this.bucketsTable}
        SET tokens = tokens - 1
        WHERE tenant_id = $1 
          AND (SELECT tokens FROM refilled) >= 1
        RETURNING tokens
      )
      -- Step 3: Return the result
      SELECT 
        CASE WHEN EXISTS (SELECT 1 FROM consumed) THEN 1 ELSE 0 END as allowed,
        COALESCE(
          (SELECT tokens FROM consumed), 
          (SELECT tokens FROM refilled)
        ) as tokens,
        (SELECT last_refill FROM refilled) as last_refill
      `,
      [tenantId, capacity, now, refillRate]
    );

    const allowed = result.rows[0].allowed === '1';
    const tokens = parseFloat(result.rows[0].tokens);

    if (allowed) {
      return { allowed: true, remaining: Math.floor(tokens), resetMs: 0 };
    }

    // Denied - calculate reset time
    const resetMs = Math.ceil((1 - tokens) / refillRate * 1000);
    return { allowed: false, remaining: 0, resetMs };
  }

  async getBucketState(
    tenantId: string,
    capacity: number,
    refillRate: number
  ): Promise<{ tokens: number; resetMs: number }> {
    const now = Date.now();

    const result = await this.client.query<{
      tokens: string;
      last_refill: string;
    }>(
      `SELECT tokens, last_refill FROM ${this.bucketsTable} WHERE tenant_id = $1`,
      [tenantId]
    );

    if (result.rows.length === 0) {
      return { tokens: capacity, resetMs: 0 };
    }

    const row = result.rows[0];
    const storedTokens = parseFloat(row.tokens);
    const lastRefill = parseInt(row.last_refill, 10);

    // Calculate current tokens based on refill
    const elapsed = (now - lastRefill) / 1000;
    const tokens = Math.min(capacity, storedTokens + elapsed * refillRate);

    const resetMs = tokens < 1
      ? Math.ceil((1 - tokens) / refillRate * 1000)
      : 0;

    return { tokens: Math.floor(tokens), resetMs };
  }

  // ============================================================
  // MONTHLY QUOTA TRACKING
  // ============================================================

  async getTokenUsage(tenantId: string): Promise<{ tokens: number; period: string }> {
    const period = getCurrentPeriod();

    const result = await this.client.query<{ tokens: string }>(
      `SELECT tokens FROM ${this.usageTable} WHERE tenant_id = $1 AND period = $2`,
      [tenantId, period]
    );

    const tokens = result.rows.length > 0 ? parseInt(result.rows[0].tokens, 10) : 0;
    return { tokens, period };
  }

  async getCostUsage(tenantId: string): Promise<{ cost: number; period: string }> {
    const period = getCurrentPeriod();

    const result = await this.client.query<{ cost: string }>(
      `SELECT cost FROM ${this.usageTable} WHERE tenant_id = $1 AND period = $2`,
      [tenantId, period]
    );

    const cost = result.rows.length > 0 ? parseFloat(result.rows[0].cost) : 0;
    return { cost, period };
  }

  async addTokenUsage(tenantId: string, tokens: number): Promise<number> {
    const period = getCurrentPeriod();

    const result = await this.client.query<{ tokens: string }>(
      `
      INSERT INTO ${this.usageTable} (tenant_id, period, tokens, cost)
      VALUES ($1, $2, $3, 0)
      ON CONFLICT (tenant_id, period) DO UPDATE SET
        tokens = ${this.usageTable}.tokens + $3,
        updated_at = NOW()
      RETURNING tokens
      `,
      [tenantId, period, tokens]
    );

    return parseInt(result.rows[0].tokens, 10);
  }

  async addCostUsage(tenantId: string, cost: number): Promise<number> {
    const period = getCurrentPeriod();

    const result = await this.client.query<{ cost: string }>(
      `
      INSERT INTO ${this.usageTable} (tenant_id, period, tokens, cost)
      VALUES ($1, $2, 0, $3)
      ON CONFLICT (tenant_id, period) DO UPDATE SET
        cost = ${this.usageTable}.cost + $3,
        updated_at = NOW()
      RETURNING cost
      `,
      [tenantId, period, cost]
    );

    return parseFloat(result.rows[0].cost);
  }

  // ============================================================
  // ADMIN OPERATIONS
  // ============================================================

  async resetUsage(tenantId: string): Promise<void> {
    const period = getCurrentPeriod();

    await Promise.all([
      this.client.query(
        `DELETE FROM ${this.bucketsTable} WHERE tenant_id = $1`,
        [tenantId]
      ),
      this.client.query(
        `DELETE FROM ${this.usageTable} WHERE tenant_id = $1 AND period = $2`,
        [tenantId, period]
      ),
    ]);
  }

  // ============================================================
  // SETUP
  // ============================================================

  /**
   * Create required tables if they don't exist
   */
  async createTables(): Promise<void> {
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS ${this.bucketsTable} (
        tenant_id VARCHAR(255) PRIMARY KEY,
        tokens DECIMAL(10, 2) NOT NULL,
        last_refill BIGINT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await this.client.query(`
      CREATE TABLE IF NOT EXISTS ${this.usageTable} (
        tenant_id VARCHAR(255) NOT NULL,
        period VARCHAR(7) NOT NULL,
        tokens BIGINT NOT NULL DEFAULT 0,
        cost DECIMAL(10, 4) NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (tenant_id, period)
      )
    `);
  }
}

