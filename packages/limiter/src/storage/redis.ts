import type { Redis } from 'ioredis';
import { Storage, getCurrentPeriod } from './interface';

export { getCurrentPeriod };

/**
 * Redis storage backend for rate limiting and quota tracking
 * 
 * Good for:
 * - Production deployments
 * - Multi-server environments
 * - High-frequency operations
 * 
 * Requires: ioredis package
 */
export class RedisStorage implements Storage {
  private redis: Redis;
  private keyPrefix: string;

  constructor(redis: Redis, keyPrefix: string = 'airl') {
    this.redis = redis;
    this.keyPrefix = keyPrefix;
  }

  // ============================================================
  // KEY HELPERS
  // ============================================================

  private bucketKey(tenantId: string): string {
    return `${this.keyPrefix}:bucket:${tenantId}`;
  }

  private quotaKey(tenantId: string, period: string): string {
    return `${this.keyPrefix}:quota:${tenantId}:${period}`;
  }

  private costKey(tenantId: string, period: string): string {
    return `${this.keyPrefix}:cost:${tenantId}:${period}`;
  }

  // ============================================================
  // TOKEN BUCKET RATE LIMITING
  // ============================================================

  /**
   * Try to consume a token from the bucket
   * Returns { allowed, remaining, resetMs }
   */
  async tryConsume(
    tenantId: string,
    capacity: number,
    refillRate: number
  ): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
    const key = this.bucketKey(tenantId);
    const now = Date.now();

    // Lua script for atomic token bucket operation
    const luaScript = `
      local key = KEYS[1]
      local capacity = tonumber(ARGV[1])
      local refillRate = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])
      
      -- Get current state or initialize
      local data = redis.call('HGETALL', key)
      local tokens = capacity
      local lastRefill = now
      
      if #data > 0 then
        for i = 1, #data, 2 do
          if data[i] == 'tokens' then
            tokens = tonumber(data[i + 1])
          elseif data[i] == 'lastRefill' then
            lastRefill = tonumber(data[i + 1])
          end
        end
      end
      
      -- Calculate tokens to add based on time elapsed
      local elapsed = (now - lastRefill) / 1000
      local tokensToAdd = elapsed * refillRate
      tokens = math.min(capacity, tokens + tokensToAdd)
      
      -- Try to consume one token
      local allowed = 0
      if tokens >= 1 then
        tokens = tokens - 1
        allowed = 1
      end
      
      -- Save state
      redis.call('HSET', key, 'tokens', tokens, 'lastRefill', now)
      redis.call('EXPIRE', key, 86400)  -- Expire after 24 hours of inactivity
      
      -- Calculate reset time (when bucket will have 1 token if currently empty)
      local resetMs = 0
      if tokens < 1 then
        resetMs = math.ceil((1 - tokens) / refillRate * 1000)
      end
      
      return {allowed, math.floor(tokens), resetMs}
    `;

    const result = await this.redis.eval(
      luaScript,
      1,
      key,
      capacity,
      refillRate,
      now
    ) as [number, number, number];

    return {
      allowed: result[0] === 1,
      remaining: result[1],
      resetMs: result[2],
    };
  }

  /**
   * Get current bucket state without consuming
   */
  async getBucketState(
    tenantId: string,
    capacity: number,
    refillRate: number
  ): Promise<{ tokens: number; resetMs: number }> {
    const key = this.bucketKey(tenantId);
    const now = Date.now();

    const data = await this.redis.hgetall(key);
    
    if (!data.tokens) {
      return { tokens: capacity, resetMs: 0 };
    }

    let tokens = parseFloat(data.tokens);
    const lastRefill = parseInt(data.lastRefill, 10);
    
    // Calculate current tokens based on refill
    const elapsed = (now - lastRefill) / 1000;
    tokens = Math.min(capacity, tokens + elapsed * refillRate);

    const resetMs = tokens < 1 
      ? Math.ceil((1 - tokens) / refillRate * 1000) 
      : 0;

    return { tokens: Math.floor(tokens), resetMs };
  }

  // ============================================================
  // MONTHLY QUOTA TRACKING
  // ============================================================

  /**
   * Get current token usage for the month
   */
  async getTokenUsage(tenantId: string): Promise<{ tokens: number; period: string }> {
    const period = getCurrentPeriod();
    const key = this.quotaKey(tenantId, period);
    
    const tokens = await this.redis.get(key);
    return {
      tokens: tokens ? parseInt(tokens, 10) : 0,
      period,
    };
  }

  /**
   * Get current cost usage for the month
   */
  async getCostUsage(tenantId: string): Promise<{ cost: number; period: string }> {
    const period = getCurrentPeriod();
    const key = this.costKey(tenantId, period);
    
    const cost = await this.redis.get(key);
    return {
      cost: cost ? parseFloat(cost) : 0,
      period,
    };
  }

  /**
   * Add token usage for the month
   */
  async addTokenUsage(tenantId: string, tokens: number): Promise<number> {
    const period = getCurrentPeriod();
    const key = this.quotaKey(tenantId, period);
    
    // Increment and set expiry to end of next month (to handle month boundaries)
    const newTotal = await this.redis.incrby(key, tokens);
    
    // Set expiry to 62 days (covers 2 months for safety)
    await this.redis.expire(key, 62 * 24 * 60 * 60);
    
    return newTotal;
  }

  /**
   * Add cost usage for the month
   */
  async addCostUsage(tenantId: string, cost: number): Promise<number> {
    const period = getCurrentPeriod();
    const key = this.costKey(tenantId, period);
    
    // Use incrbyfloat for decimal precision
    const newTotal = await this.redis.incrbyfloat(key, cost);
    await this.redis.expire(key, 62 * 24 * 60 * 60);
    
    return parseFloat(String(newTotal));
  }

  // ============================================================
  // ADMIN OPERATIONS
  // ============================================================

  /**
   * Reset all usage for a tenant (for testing or admin)
   */
  async resetUsage(tenantId: string): Promise<void> {
    const period = getCurrentPeriod();
    
    await Promise.all([
      this.redis.del(this.bucketKey(tenantId)),
      this.redis.del(this.quotaKey(tenantId, period)),
      this.redis.del(this.costKey(tenantId, period)),
    ]);
  }
}

