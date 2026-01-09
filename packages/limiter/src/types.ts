import type { Storage } from './storage/interface';

// ============================================================
// CORE TYPES
// ============================================================

/**
 * Rate limit configuration using token bucket algorithm
 */
export interface RateLimitConfig {
  /** Maximum requests allowed in burst (bucket capacity) */
  capacity: number;
  /** Tokens added per second (sustained rate) */
  refillRate: number;
}

/**
 * Monthly quota configuration
 */
export interface QuotaConfig {
  /** Maximum tokens allowed per month */
  maxTokens: number;
  /** Optional: Maximum cost in USD per month */
  maxCostUsd?: number;
}

/**
 * Plan definition with rate limit and quota settings
 */
export interface Plan {
  /** Rate limiting configuration */
  rateLimit: RateLimitConfig;
  /** Monthly quota configuration */
  quota?: QuotaConfig;
}

/**
 * Plans dictionary keyed by plan name
 */
export type Plans = Record<string, Plan>;

// ============================================================
// LIMITER OPTIONS
// ============================================================

/**
 * Callback hooks for events
 */
export interface LimiterHooks {
  /** Called when a tenant reaches 80% of their monthly quota */
  onQuotaWarning?: (tenantId: string, usage: QuotaUsage) => void | Promise<void>;
  /** Called when a tenant is rate limited */
  onRateLimited?: (tenantId: string, retryAfterMs: number) => void | Promise<void>;
  /** Called when a tenant exceeds their quota */
  onQuotaExceeded?: (tenantId: string, usage: QuotaUsage) => void | Promise<void>;
}

/**
 * Options for creating a limiter instance
 */
export interface LimiterOptions {
  /** Storage backend (RedisStorage, MemoryStorage, or PostgresStorage) */
  storage: Storage;
  /** Plan definitions */
  plans: Plans;
  /** Function to get plan name for a tenant. Defaults to returning 'default' */
  getPlan?: (tenantId: string) => string | Promise<string>;
  /** Optional hooks for events */
  hooks?: LimiterHooks;
}

// ============================================================
// ENFORCEMENT TYPES
// ============================================================

/**
 * Options for the enforce check
 */
export interface EnforceOptions {
  /** Tenant identifier */
  tenantId: string;
  /** Optional: Estimated tokens for pre-call quota check */
  estimatedTokens?: number;
  /** Optional: Model name for tracking */
  model?: string;
}

/**
 * Result of an enforce check when allowed
 */
export interface EnforceResultAllowed {
  allowed: true;
  tenantId: string;
  plan: string;
  rateLimit: {
    remaining: number;
    resetMs: number;
  };
  quota?: {
    used: number;
    limit: number;
    percentUsed: number;
  };
}

/**
 * Result of an enforce check when denied
 */
export interface EnforceResultDenied {
  allowed: false;
  tenantId: string;
  plan: string;
  error: 'rate_limit_exceeded' | 'quota_exceeded';
  retryAfterMs?: number;
  limit: {
    type: 'rate_limit' | 'quota';
    limit: number;
    current: number;
  };
}

export type EnforceResult = EnforceResultAllowed | EnforceResultDenied;

// ============================================================
// USAGE TYPES
// ============================================================

/**
 * Options for reporting usage
 */
export interface ReportUsageOptions {
  /** Tenant identifier */
  tenantId: string;
  /** Input/prompt tokens used */
  inputTokens: number;
  /** Output/completion tokens used */
  outputTokens: number;
  /** Optional: Model name */
  model?: string;
  /** Optional: Cost in USD (if known) */
  costUsd?: number;
}

/**
 * Current quota usage for a tenant
 */
export interface QuotaUsage {
  /** Tokens used this month */
  tokensUsed: number;
  /** Token limit for the month */
  tokenLimit: number;
  /** Cost used this month (USD) */
  costUsed: number;
  /** Cost limit for the month (USD), if any */
  costLimit?: number;
  /** Percentage of token quota used (0-100) */
  percentUsed: number;
  /** Billing period (YYYY-MM) */
  period: string;
}

// ============================================================
// MIDDLEWARE TYPES
// ============================================================

/**
 * Options for Express middleware
 * TReq is the request type your application uses (e.g., express.Request)
 */
export interface MiddlewareOptions<TReq = unknown> {
  /** Function to extract tenant ID from request */
  getTenantId: (req: TReq) => string | Promise<string>;
  /** Optional: Function to extract estimated tokens from request */
  getEstimatedTokens?: (req: TReq) => number | undefined;
  /** Optional: Function to extract model name from request */
  getModel?: (req: TReq) => string | undefined;
}

/**
 * Generic middleware handler type
 * Compatible with Express, Fastify, or any framework
 */
export type MiddlewareHandler = (req: any, res: any, next: (error?: any) => void) => Promise<void>;

// ============================================================
// ERROR RESPONSE
// ============================================================

/**
 * Standard error response format
 */
export interface LimiterErrorResponse {
  error: 'rate_limit_exceeded' | 'quota_exceeded';
  message: string;
  tenantId: string;
  limit: {
    type: 'rate_limit' | 'quota';
    limit: number;
    current: number;
  };
  retryAfterMs?: number;
  currentUsage?: QuotaUsage;
}

// ============================================================
// LIMITER INTERFACE
// ============================================================

/**
 * Main limiter instance interface
 */
export interface Limiter {
  /** Check if a request should be allowed */
  enforce(options: EnforceOptions): Promise<EnforceResult>;
  
  /** Report usage after an AI call */
  reportUsage(options: ReportUsageOptions): Promise<void>;
  
  /** Get current quota usage for a tenant */
  getUsage(tenantId: string): Promise<QuotaUsage>;
  
  /** Express middleware factory */
  middleware<TReq = unknown>(options: MiddlewareOptions<TReq>): MiddlewareHandler;
  
  /** Reset a tenant's usage (for testing or admin purposes) */
  resetUsage(tenantId: string): Promise<void>;
}

