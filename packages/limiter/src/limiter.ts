import type { Storage } from './storage/interface';
import type {
  Limiter,
  LimiterOptions,
  Plans,
  Plan,
  EnforceOptions,
  EnforceResult,
  ReportUsageOptions,
  QuotaUsage,
  MiddlewareOptions,
  MiddlewareHandler,
  LimiterErrorResponse,
  LimiterHooks,
} from './types';

/**
 * Default plan used when getPlan returns an unknown plan
 */
const DEFAULT_PLAN: Plan = {
  rateLimit: {
    capacity: 10,
    refillRate: 1,
  },
  quota: {
    maxTokens: 100_000,
  },
};

/**
 * Create a rate limiter instance
 */
export function createLimiter(options: LimiterOptions): Limiter {
  const {
    storage,
    plans,
    getPlan = () => 'default',
    hooks = {},
  } = options;

  // Validate that at least one plan exists
  if (Object.keys(plans).length === 0) {
    throw new Error('At least one plan must be defined');
  }

  /**
   * Get the plan configuration for a tenant
   */
  async function getPlanConfig(tenantId: string): Promise<{ plan: Plan; planName: string }> {
    const planName = await getPlan(tenantId);
    const plan = plans[planName] ?? plans['default'] ?? DEFAULT_PLAN;
    return { plan, planName };
  }

  /**
   * Check quota and trigger warning hook if needed
   */
  async function checkQuotaWarning(
    tenantId: string,
    usage: QuotaUsage
  ): Promise<void> {
    if (hooks.onQuotaWarning && usage.percentUsed >= 80 && usage.percentUsed < 100) {
      await hooks.onQuotaWarning(tenantId, usage);
    }
  }

  // ============================================================
  // ENFORCE
  // ============================================================

  async function enforce(opts: EnforceOptions): Promise<EnforceResult> {
    const { tenantId, estimatedTokens } = opts;
    const { plan, planName } = await getPlanConfig(tenantId);

    // Step 1: Check rate limit
    const rateLimitResult = await storage.tryConsume(
      tenantId,
      plan.rateLimit.capacity,
      plan.rateLimit.refillRate
    );

    if (!rateLimitResult.allowed) {
      // Trigger hook
      if (hooks.onRateLimited) {
        await hooks.onRateLimited(tenantId, rateLimitResult.resetMs);
      }

      return {
        allowed: false,
        tenantId,
        plan: planName,
        error: 'rate_limit_exceeded',
        retryAfterMs: rateLimitResult.resetMs,
        limit: {
          type: 'rate_limit',
          limit: plan.rateLimit.capacity,
          current: plan.rateLimit.capacity - rateLimitResult.remaining,
        },
      };
    }

    // Step 2: Check monthly quota (if configured)
    if (plan.quota) {
      const tokenUsage = await storage.getTokenUsage(tenantId);
      const projectedUsage = tokenUsage.tokens + (estimatedTokens ?? 0);

      if (projectedUsage >= plan.quota.maxTokens) {
        const usage = await getUsage(tenantId);
        
        // Trigger hook
        if (hooks.onQuotaExceeded) {
          await hooks.onQuotaExceeded(tenantId, usage);
        }

        return {
          allowed: false,
          tenantId,
          plan: planName,
          error: 'quota_exceeded',
          limit: {
            type: 'quota',
            limit: plan.quota.maxTokens,
            current: tokenUsage.tokens,
          },
        };
      }

      // Check for warning threshold
      const currentPercent = (tokenUsage.tokens / plan.quota.maxTokens) * 100;
      if (currentPercent >= 80) {
        await checkQuotaWarning(tenantId, await getUsage(tenantId));
      }

      return {
        allowed: true,
        tenantId,
        plan: planName,
        rateLimit: {
          remaining: rateLimitResult.remaining,
          resetMs: rateLimitResult.resetMs,
        },
        quota: {
          used: tokenUsage.tokens,
          limit: plan.quota.maxTokens,
          percentUsed: currentPercent,
        },
      };
    }

    // No quota configured, just return rate limit info
    return {
      allowed: true,
      tenantId,
      plan: planName,
      rateLimit: {
        remaining: rateLimitResult.remaining,
        resetMs: rateLimitResult.resetMs,
      },
    };
  }

  // ============================================================
  // REPORT USAGE
  // ============================================================

  async function reportUsage(opts: ReportUsageOptions): Promise<void> {
    const { tenantId, inputTokens, outputTokens, costUsd } = opts;
    const totalTokens = inputTokens + outputTokens;

    // Record token usage
    await storage.addTokenUsage(tenantId, totalTokens);

    // Record cost if provided
    if (costUsd !== undefined) {
      await storage.addCostUsage(tenantId, costUsd);
    }

    // Check for quota warning after reporting
    const { plan } = await getPlanConfig(tenantId);
    if (plan.quota) {
      const usage = await getUsage(tenantId);
      await checkQuotaWarning(tenantId, usage);
    }
  }

  // ============================================================
  // GET USAGE
  // ============================================================

  async function getUsage(tenantId: string): Promise<QuotaUsage> {
    const { plan } = await getPlanConfig(tenantId);
    const tokenUsage = await storage.getTokenUsage(tenantId);
    const costUsage = await storage.getCostUsage(tenantId);

    const tokenLimit = plan.quota?.maxTokens ?? Infinity;
    const percentUsed = tokenLimit === Infinity 
      ? 0 
      : (tokenUsage.tokens / tokenLimit) * 100;

    return {
      tokensUsed: tokenUsage.tokens,
      tokenLimit,
      costUsed: costUsage.cost,
      costLimit: plan.quota?.maxCostUsd,
      percentUsed: Math.min(100, percentUsed),
      period: tokenUsage.period,
    };
  }

  // ============================================================
  // RESET USAGE
  // ============================================================

  async function resetUsage(tenantId: string): Promise<void> {
    await storage.resetUsage(tenantId);
  }

  // ============================================================
  // EXPRESS MIDDLEWARE
  // ============================================================

  function middleware<TReq = unknown>(opts: MiddlewareOptions<TReq>): MiddlewareHandler {
    const { getTenantId, getEstimatedTokens, getModel } = opts;

    return async (req: any, res: any, next: (error?: any) => void): Promise<void> => {
      try {
        const tenantId = await getTenantId(req as TReq);
        
        if (!tenantId) {
          res.status(400).json({
            error: 'missing_tenant_id',
            message: 'Tenant ID is required',
          });
          return;
        }

        const estimatedTokens = getEstimatedTokens?.(req as TReq);
        const model = getModel?.(req as TReq);

        const result = await enforce({
          tenantId,
          estimatedTokens,
          model,
        });

        if (!result.allowed) {
          const errorResponse: LimiterErrorResponse = {
            error: result.error,
            message: result.error === 'rate_limit_exceeded'
              ? 'Too many requests. Please slow down.'
              : 'Monthly quota exceeded. Please upgrade your plan.',
            tenantId: result.tenantId,
            limit: result.limit,
            retryAfterMs: result.retryAfterMs,
          };

          // Add current usage for quota errors
          if (result.error === 'quota_exceeded') {
            errorResponse.currentUsage = await getUsage(tenantId);
          }

          // Set standard rate limit headers
          const statusCode = result.error === 'rate_limit_exceeded' ? 429 : 403;
          
          if (result.retryAfterMs) {
            res.setHeader('Retry-After', Math.ceil(result.retryAfterMs / 1000));
          }
          res.setHeader('X-RateLimit-Limit', result.limit.limit);
          res.setHeader('X-RateLimit-Remaining', Math.max(0, result.limit.limit - result.limit.current));

          res.status(statusCode).json(errorResponse);
          return;
        }

        // Attach result to request for downstream use
        req.rateLimit = result;

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  // ============================================================
  // RETURN LIMITER INSTANCE
  // ============================================================

  return {
    enforce,
    reportUsage,
    getUsage,
    middleware,
    resetUsage,
  };
}

