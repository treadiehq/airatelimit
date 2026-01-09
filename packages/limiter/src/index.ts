// Core
export { createLimiter } from './limiter';

// Simple API
export { protect, createProtect } from './protect';
export type { ProtectOptions } from './protect';

// Storage backends
export { MemoryStorage } from './storage/memory';
export { RedisStorage } from './storage/redis';
export { PostgresStorage } from './storage/postgres';
export type { PostgresClient } from './storage/postgres';

// Storage interface (for custom backends)
export type { Storage } from './storage/interface';
export { getCurrentPeriod } from './storage/interface';

// Types
export type {
  // Core types
  Limiter,
  LimiterOptions,
  LimiterHooks,
  Plan,
  Plans,
  RateLimitConfig,
  QuotaConfig,
  
  // Enforce types
  EnforceOptions,
  EnforceResult,
  EnforceResultAllowed,
  EnforceResultDenied,
  
  // Usage types
  ReportUsageOptions,
  QuotaUsage,
  
  // Middleware types
  MiddlewareOptions,
  MiddlewareHandler,
  
  // Error types
  LimiterErrorResponse,
} from './types';

