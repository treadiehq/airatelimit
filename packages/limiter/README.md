# AI Ratelimit Limiter

Per-tenant AI rate limiting for Node.js.

```bash
npm install @airatelimit/limiter
```

## The Problem

You have one OpenAI API key. You have many customers. One bad actor burns through your budget.

## The Solution

```typescript
import { createLimiter, MemoryStorage } from '@airatelimit/limiter';

const limiter = createLimiter({
  storage: new MemoryStorage(),
  plans: {
    free: {
      rateLimit: { capacity: 20, refillRate: 1 },
      quota: { maxTokens: 100_000 },
    },
  },
  getPlan: (tenantId) => 'free',
});

// Middleware
app.use('/api/ai', limiter.middleware({
  getTenantId: (req) => req.user.orgId,
}));

// Report usage after AI call
await limiter.reportUsage({
  tenantId: 'org_123',
  inputTokens: response.usage.prompt_tokens,
  outputTokens: response.usage.completion_tokens,
});
```

## Storage Backends

```typescript
import { MemoryStorage, RedisStorage, PostgresStorage } from '@airatelimit/limiter';

// Development (no deps)
new MemoryStorage()

// Production (npm i ioredis)
new RedisStorage(new Redis())

// PostgreSQL (npm i pg)
new PostgresStorage(pool)
```

## API

| Method | Description |
|--------|-------------|
| `limiter.middleware(opts)` | Express middleware |
| `limiter.enforce({ tenantId })` | Manual check |
| `limiter.reportUsage({ tenantId, inputTokens, outputTokens })` | Record usage |
| `limiter.getUsage(tenantId)` | Get current usage |
| `limiter.resetUsage(tenantId)` | Reset usage |

## License

[FSL-1.1-MIT](LICENSE)
