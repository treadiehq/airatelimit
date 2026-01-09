/**
 * Storage interface that all backends must implement
 */
export interface Storage {
  // ============================================================
  // TOKEN BUCKET RATE LIMITING
  // ============================================================

  /**
   * Try to consume a token from the bucket
   * Returns { allowed, remaining, resetMs }
   */
  tryConsume(
    tenantId: string,
    capacity: number,
    refillRate: number
  ): Promise<{ allowed: boolean; remaining: number; resetMs: number }>;

  /**
   * Get current bucket state without consuming
   */
  getBucketState(
    tenantId: string,
    capacity: number,
    refillRate: number
  ): Promise<{ tokens: number; resetMs: number }>;

  // ============================================================
  // MONTHLY QUOTA TRACKING
  // ============================================================

  /**
   * Get current token usage for the month
   */
  getTokenUsage(tenantId: string): Promise<{ tokens: number; period: string }>;

  /**
   * Get current cost usage for the month
   */
  getCostUsage(tenantId: string): Promise<{ cost: number; period: string }>;

  /**
   * Add token usage for the month
   */
  addTokenUsage(tenantId: string, tokens: number): Promise<number>;

  /**
   * Add cost usage for the month
   */
  addCostUsage(tenantId: string, cost: number): Promise<number>;

  // ============================================================
  // ADMIN OPERATIONS
  // ============================================================

  /**
   * Reset all usage for a tenant
   */
  resetUsage(tenantId: string): Promise<void>;
}

/**
 * Get current billing period key (YYYY-MM)
 */
export function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

