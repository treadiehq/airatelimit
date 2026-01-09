import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createLimiter } from './limiter';
import { MemoryStorage } from './storage/memory';

describe('createLimiter', () => {
  let storage: MemoryStorage;
  
  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('should create a limiter with valid options', () => {
    const limiter = createLimiter({
      storage,
      plans: {
        default: {
          rateLimit: { capacity: 10, refillRate: 1 },
        },
      },
    });
    
    expect(limiter).toBeDefined();
    expect(limiter.enforce).toBeInstanceOf(Function);
    expect(limiter.reportUsage).toBeInstanceOf(Function);
    expect(limiter.getUsage).toBeInstanceOf(Function);
    expect(limiter.middleware).toBeInstanceOf(Function);
  });

  it('should throw if no plans provided', () => {
    expect(() => createLimiter({
      storage,
      plans: {},
    })).toThrow('At least one plan must be defined');
  });

  describe('enforce', () => {
    it('should allow request when under rate limit', async () => {
      const limiter = createLimiter({
        storage,
        plans: {
          default: {
            rateLimit: { capacity: 10, refillRate: 1 },
          },
        },
      });

      const result = await limiter.enforce({ tenantId: 'tenant_1' });
      
      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.rateLimit.remaining).toBeLessThan(10);
      }
    });

    it('should deny request when rate limit exceeded', async () => {
      const limiter = createLimiter({
        storage,
        plans: {
          default: {
            rateLimit: { capacity: 2, refillRate: 0.1 }, // Very limited
          },
        },
      });

      // Exhaust the bucket
      await limiter.enforce({ tenantId: 'tenant_1' });
      await limiter.enforce({ tenantId: 'tenant_1' });
      const result = await limiter.enforce({ tenantId: 'tenant_1' });
      
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.error).toBe('rate_limit_exceeded');
        expect(result.retryAfterMs).toBeGreaterThan(0);
      }
    });

    it('should deny request when quota exceeded', async () => {
      const limiter = createLimiter({
        storage,
        plans: {
          default: {
            rateLimit: { capacity: 10, refillRate: 1 },
            quota: { maxTokens: 100 },
          },
        },
      });

      // Use up the quota
      await limiter.reportUsage({ tenantId: 'tenant_1', inputTokens: 100, outputTokens: 50 });

      const result = await limiter.enforce({ tenantId: 'tenant_1' });
      
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.error).toBe('quota_exceeded');
      }
    });
  });

  describe('reportUsage', () => {
    it('should increment token usage', async () => {
      const limiter = createLimiter({
        storage,
        plans: {
          default: {
            rateLimit: { capacity: 10, refillRate: 1 },
          },
        },
      });

      await limiter.reportUsage({
        tenantId: 'tenant_1',
        inputTokens: 100,
        outputTokens: 50,
      });

      const usage = await limiter.getUsage('tenant_1');
      expect(usage.tokensUsed).toBe(150);
    });

    it('should increment cost if provided', async () => {
      const limiter = createLimiter({
        storage,
        plans: {
          default: {
            rateLimit: { capacity: 10, refillRate: 1 },
          },
        },
      });

      await limiter.reportUsage({
        tenantId: 'tenant_1',
        inputTokens: 100,
        outputTokens: 50,
        costUsd: 0.015,
      });

      const usage = await limiter.getUsage('tenant_1');
      expect(usage.costUsed).toBe(0.015);
    });
  });

  describe('getUsage', () => {
    it('should return zero usage for new tenant', async () => {
      const limiter = createLimiter({
        storage,
        plans: {
          default: {
            rateLimit: { capacity: 10, refillRate: 1 },
            quota: { maxTokens: 100000 },
          },
        },
      });

      const usage = await limiter.getUsage('new_tenant');
      
      expect(usage.tokensUsed).toBe(0);
      expect(usage.tokenLimit).toBe(100000);
      expect(usage.percentUsed).toBe(0);
    });

    it('should return actual usage for existing tenant', async () => {
      const limiter = createLimiter({
        storage,
        plans: {
          default: {
            rateLimit: { capacity: 10, refillRate: 1 },
            quota: { maxTokens: 100000 },
          },
        },
      });

      await limiter.reportUsage({ tenantId: 'tenant_1', inputTokens: 30000, outputTokens: 20000 });

      const usage = await limiter.getUsage('tenant_1');
      
      expect(usage.tokensUsed).toBe(50000);
      expect(usage.percentUsed).toBe(50);
    });
  });

  describe('hooks', () => {
    it('should call onRateLimited hook when rate limited', async () => {
      const onRateLimited = vi.fn();
      
      const limiter = createLimiter({
        storage,
        plans: {
          default: {
            rateLimit: { capacity: 1, refillRate: 0.01 },
          },
        },
        hooks: { onRateLimited },
      });

      // Exhaust bucket then trigger rate limit
      await limiter.enforce({ tenantId: 'tenant_1' });
      await limiter.enforce({ tenantId: 'tenant_1' });
      
      expect(onRateLimited).toHaveBeenCalledWith('tenant_1', expect.any(Number));
    });

    it('should call onQuotaExceeded hook when quota exceeded', async () => {
      const onQuotaExceeded = vi.fn();
      
      const limiter = createLimiter({
        storage,
        plans: {
          default: {
            rateLimit: { capacity: 10, refillRate: 1 },
            quota: { maxTokens: 100 },
          },
        },
        hooks: { onQuotaExceeded },
      });

      await limiter.reportUsage({ tenantId: 'tenant_1', inputTokens: 100, outputTokens: 50 });
      await limiter.enforce({ tenantId: 'tenant_1' });
      
      expect(onQuotaExceeded).toHaveBeenCalled();
    });
  });
});

describe('middleware', () => {
  it('should call next() when request is allowed', async () => {
    const storage = new MemoryStorage();
    const limiter = createLimiter({
      storage,
      plans: {
        default: {
          rateLimit: { capacity: 10, refillRate: 1 },
        },
      },
    });

    const middleware = limiter.middleware({
      getTenantId: (req: any) => req.tenantId,
    });

    const req = { tenantId: 'tenant_1' };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();

    await middleware(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 429 when rate limited', async () => {
    const storage = new MemoryStorage();
    const limiter = createLimiter({
      storage,
      plans: {
        default: {
          rateLimit: { capacity: 1, refillRate: 0.01 },
        },
      },
    });

    const middleware = limiter.middleware({
      getTenantId: (req: any) => req.tenantId,
    });

    const req = { tenantId: 'tenant_1' };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();

    // First request passes
    await middleware(req as any, res as any, next);
    
    // Reset mocks
    next.mockClear();
    res.status.mockClear();
    res.json.mockClear();
    
    // Second request should be rate limited
    await middleware(req as any, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'rate_limit_exceeded',
      })
    );
  });

  it('should return 400 if tenant ID is missing', async () => {
    const storage = new MemoryStorage();
    const limiter = createLimiter({
      storage,
      plans: {
        default: {
          rateLimit: { capacity: 10, refillRate: 1 },
        },
      },
    });

    const middleware = limiter.middleware({
      getTenantId: () => '',
    });

    const req = {};
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();

    await middleware(req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'missing_tenant_id',
      })
    );
  });
});

