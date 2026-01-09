import { createLimiter } from './limiter';
import { MemoryStorage } from './storage/memory';
import type { MiddlewareHandler } from './types';

/**
 * Simple limit string format: "100/day", "1000/month", "60/minute", "10/hour"
 */
type LimitString = `${number}/${'minute' | 'hour' | 'day' | 'week' | 'month'}`;

/**
 * Options for the protect() helper
 */
export interface ProtectOptions<TReq = unknown> {
  /**
   * Extract tenant ID from request
   * @example (req) => req.user.id
   * @example (req) => req.headers['x-tenant-id']
   */
  tenant: (req: TReq) => string | Promise<string>;

  /**
   * Rate limit in simple format: "100/day", "1000/month", etc.
   * @default "100/day"
   */
  limit?: LimitString;

  /**
   * Monthly token quota (optional)
   * @example 100000 for 100k tokens/month
   */
  tokens?: number;
}

/**
 * Parse limit string into rate limit config
 */
function parseLimit(limit: LimitString): { capacity: number; refillRate: number } {
  const match = limit.match(/^(\d+)\/(minute|hour|day|week|month)$/);
  if (!match) {
    throw new Error(`Invalid limit format: "${limit}". Use format like "100/day" or "1000/month"`);
  }

  const count = parseInt(match[1], 10);
  const period = match[2];

  // Convert to tokens per second (refill rate) and burst capacity
  const secondsPerPeriod: Record<string, number> = {
    minute: 60,
    hour: 3600,
    day: 86400,
    week: 604800,
    month: 2592000, // 30 days
  };

  const seconds = secondsPerPeriod[period];
  const refillRate = count / seconds;

  // Capacity = allow burst of 10% of limit or at least 5 requests
  const capacity = Math.max(5, Math.ceil(count * 0.1));

  return { capacity, refillRate };
}

/**
 * Zero-config rate limiting middleware
 * 
 * @example
 * // Basic usage - 100 requests per day per tenant
 * app.use('/api/ai', protect({
 *   tenant: (req) => req.user.id
 * }));
 * 
 * @example
 * // Custom limit
 * app.use('/api/ai', protect({
 *   tenant: (req) => req.user.orgId,
 *   limit: '1000/day'
 * }));
 * 
 * @example
 * // With token quota
 * app.use('/api/ai', protect({
 *   tenant: (req) => req.user.id,
 *   limit: '100/day',
 *   tokens: 100000  // 100k tokens/month
 * }));
 */
export function protect<TReq = unknown>(options: ProtectOptions<TReq>): MiddlewareHandler {
  const { tenant, limit = '100/day', tokens } = options;

  const rateLimit = parseLimit(limit);

  const limiter = createLimiter({
    storage: new MemoryStorage(),
    plans: {
      default: {
        rateLimit,
        ...(tokens && { quota: { maxTokens: tokens } }),
      },
    },
  });

  return limiter.middleware<TReq>({
    getTenantId: tenant,
  });
}

/**
 * Create a protect function with custom storage (for production use)
 * 
 * @example
 * import { createProtect, RedisStorage } from '@ai-ratelimit/limiter';
 * import Redis from 'ioredis';
 * 
 * const protect = createProtect({ storage: new RedisStorage(new Redis()) });
 * 
 * app.use('/api/ai', protect({
 *   tenant: (req) => req.user.id,
 *   limit: '1000/day'
 * }));
 */
export function createProtect(config: { storage: InstanceType<typeof MemoryStorage> | any }) {
  return function protect<TReq = unknown>(options: ProtectOptions<TReq>): MiddlewareHandler {
    const { tenant, limit = '100/day', tokens } = options;

    const rateLimit = parseLimit(limit);

    const limiter = createLimiter({
      storage: config.storage,
      plans: {
        default: {
          rateLimit,
          ...(tokens && { quota: { maxTokens: tokens } }),
        },
      },
    });

    return limiter.middleware<TReq>({
      getTenantId: tenant,
    });
  };
}
