# AI Ratelimit Limiter

Per-tenant AI rate limiting for Node.js.

```bash
npm install @ai-ratelimit/limiter
```

## The Problem

You have one OpenAI API key. You have many customers. One bad actor burns through your budget.

## The Solution

```typescript
import { protect } from '@ai-ratelimit/limiter';

app.use('/api/ai', protect({
  tenant: (req) => req.user.id,
  limit: '100/day'
}));
```

That's it. Your AI endpoints are now protected from abuse.

## Options

```typescript
protect({
  // Required: identify the tenant
  tenant: (req) => req.user.id,
  
  // Optional: rate limit (default: "100/day")
  limit: '1000/day',  // or '60/minute', '500/hour', '10000/month'
  
  // Optional: monthly token quota
  tokens: 100000,  // 100k tokens/month
})
```

## Need More Control?

For multi-plan support, Redis storage, or custom hooks, use the full API:

```typescript
import { createLimiter, RedisStorage } from '@ai-ratelimit/limiter';
import Redis from 'ioredis';

const limiter = createLimiter({
  storage: new RedisStorage(new Redis()),
  plans: {
    free: { rateLimit: { capacity: 20, refillRate: 1 }, quota: { maxTokens: 100_000 } },
    pro: { rateLimit: { capacity: 100, refillRate: 5 }, quota: { maxTokens: 2_000_000 } },
  },
  getPlan: (tenantId) => db.getTenant(tenantId).plan,
});

app.use('/api/ai', limiter.middleware({ getTenantId: (req) => req.user.orgId }));
```

## Storage Backends

```typescript
import { MemoryStorage, RedisStorage, PostgresStorage } from '@ai-ratelimit/limiter';

new MemoryStorage()           // Default, no deps, dev/single-server
new RedisStorage(redis)       // Production, multi-server (npm i ioredis)
new PostgresStorage(pool)     // When you have Postgres (npm i pg)
```

## Need a Dashboard?

When you need usage analytics, plan management, and billing, check out [airatelimit.com](https://airatelimit.com).

## License

[FSL-1.1-MIT](LICENSE)
