import { Storage, getCurrentPeriod } from './interface';

/**
 * Token bucket state
 */
interface BucketState {
  tokens: number;
  lastRefill: number;
}

/**
 * In-memory storage backend
 * 
 * Good for:
 * - Local development
 * - Testing
 * - Single-server deployments
 * 
 * Limitations:
 * - Data is lost on restart
 * - Doesn't work across multiple server instances
 */
export class MemoryStorage implements Storage {
  private buckets: Map<string, BucketState> = new Map();
  private quotas: Map<string, number> = new Map();
  private costs: Map<string, number> = new Map();

  // ============================================================
  // KEY HELPERS
  // ============================================================

  private bucketKey(tenantId: string): string {
    return `bucket:${tenantId}`;
  }

  private quotaKey(tenantId: string, period: string): string {
    return `quota:${tenantId}:${period}`;
  }

  private costKey(tenantId: string, period: string): string {
    return `cost:${tenantId}:${period}`;
  }

  // ============================================================
  // TOKEN BUCKET RATE LIMITING
  // ============================================================

  async tryConsume(
    tenantId: string,
    capacity: number,
    refillRate: number
  ): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
    const key = this.bucketKey(tenantId);
    const now = Date.now();

    let state = this.buckets.get(key);

    if (!state) {
      // Initialize with full bucket minus one token
      state = { tokens: capacity - 1, lastRefill: now };
      this.buckets.set(key, state);
      return { allowed: true, remaining: capacity - 1, resetMs: 0 };
    }

    // Calculate tokens to add based on time elapsed
    const elapsed = (now - state.lastRefill) / 1000;
    const tokensToAdd = elapsed * refillRate;
    let tokens = Math.min(capacity, state.tokens + tokensToAdd);

    // Try to consume one token
    if (tokens >= 1) {
      tokens -= 1;
      state.tokens = tokens;
      state.lastRefill = now;
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
    const key = this.bucketKey(tenantId);
    const now = Date.now();

    const state = this.buckets.get(key);

    if (!state) {
      return { tokens: capacity, resetMs: 0 };
    }

    // Calculate current tokens based on refill
    const elapsed = (now - state.lastRefill) / 1000;
    const tokens = Math.min(capacity, state.tokens + elapsed * refillRate);

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
    const key = this.quotaKey(tenantId, period);
    const tokens = this.quotas.get(key) ?? 0;
    return { tokens, period };
  }

  async getCostUsage(tenantId: string): Promise<{ cost: number; period: string }> {
    const period = getCurrentPeriod();
    const key = this.costKey(tenantId, period);
    const cost = this.costs.get(key) ?? 0;
    return { cost, period };
  }

  async addTokenUsage(tenantId: string, tokens: number): Promise<number> {
    const period = getCurrentPeriod();
    const key = this.quotaKey(tenantId, period);
    const current = this.quotas.get(key) ?? 0;
    const newTotal = current + tokens;
    this.quotas.set(key, newTotal);
    return newTotal;
  }

  async addCostUsage(tenantId: string, cost: number): Promise<number> {
    const period = getCurrentPeriod();
    const key = this.costKey(tenantId, period);
    const current = this.costs.get(key) ?? 0;
    const newTotal = current + cost;
    this.costs.set(key, newTotal);
    return newTotal;
  }

  // ============================================================
  // ADMIN OPERATIONS
  // ============================================================

  async resetUsage(tenantId: string): Promise<void> {
    const period = getCurrentPeriod();
    this.buckets.delete(this.bucketKey(tenantId));
    this.quotas.delete(this.quotaKey(tenantId, period));
    this.costs.delete(this.costKey(tenantId, period));
  }

  /**
   * Clear all data (useful for testing)
   */
  clear(): void {
    this.buckets.clear();
    this.quotas.clear();
    this.costs.clear();
  }
}

