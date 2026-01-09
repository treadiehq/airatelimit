/**
 * Example: Per-tenant AI rate limiting with Express and OpenAI
 * 
 * This demonstrates the "Ben path":
 * - One OpenAI API key held server-side
 * - Multiple tenants (customers) using your API
 * - Per-tenant rate limits and monthly quotas
 * 
 * Run with: npm start
 * Requires: Redis running on localhost:6379
 */

import express from 'express';
import { createLimiter, RedisStorage, MemoryStorage } from '@airatelimit/limiter';
import Redis from 'ioredis';
import OpenAI from 'openai';

// ============================================================
// SETUP
// ============================================================

const app = express();
app.use(express.json());

// Initialize storage backend
// Use Redis in production, Memory for development
const storage = process.env.REDIS_HOST
  ? new RedisStorage(new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT ?? '6379'),
    }))
  : new MemoryStorage();

console.log(`Using ${storage.constructor.name} storage backend`);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize rate limiter
const limiter = createLimiter({
  storage,
  plans: {
    // Free tier: Limited usage
    free: {
      rateLimit: { 
        capacity: 10,      // 10 requests burst
        refillRate: 0.5,   // 1 request per 2 seconds sustained
      },
      quota: { 
        maxTokens: 50_000,  // 50k tokens/month
      },
    },
    // Pro tier: Higher limits
    pro: {
      rateLimit: { 
        capacity: 60,      // 60 requests burst
        refillRate: 2,     // 2 requests/second sustained
      },
      quota: { 
        maxTokens: 1_000_000,  // 1M tokens/month
      },
    },
    // Enterprise tier: Very high limits
    enterprise: {
      rateLimit: { 
        capacity: 200,
        refillRate: 10,
      },
      quota: { 
        maxTokens: 10_000_000,
      },
    },
  },
  // In a real app, you'd look this up from your database
  getPlan: async (tenantId) => {
    // Mock: tenant IDs starting with 'pro_' get pro plan
    if (tenantId.startsWith('pro_')) return 'pro';
    if (tenantId.startsWith('ent_')) return 'enterprise';
    return 'free';
  },
  hooks: {
    onQuotaWarning: (tenantId, usage) => {
      console.log(`⚠️  ${tenantId} at ${usage.percentUsed.toFixed(1)}% of monthly quota`);
    },
    onRateLimited: (tenantId, retryAfterMs) => {
      console.log(`🚫 ${tenantId} rate limited, retry in ${retryAfterMs}ms`);
    },
    onQuotaExceeded: (tenantId, usage) => {
      console.log(`❌ ${tenantId} exceeded monthly quota (${usage.tokensUsed}/${usage.tokenLimit})`);
    },
  },
});

// ============================================================
// MOCK AUTH MIDDLEWARE
// ============================================================

// Extend Express Request with our user type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        orgId: string;
      };
    }
  }
}

function mockAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Get tenant ID from header (in real app, extract from auth token)
  const tenantId = req.headers['x-tenant-id'] as string;
  
  if (!tenantId) {
    res.status(401).json({ error: 'Missing x-tenant-id header' });
    return;
  }

  req.user = {
    id: 'user_123',
    orgId: tenantId,
  };
  
  next();
}

// ============================================================
// ROUTES
// ============================================================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Chat completion endpoint with rate limiting
app.post('/api/chat',
  mockAuth,
  limiter.middleware<express.Request>({
    getTenantId: (req) => req.user!.orgId,
  }),
  async (req: express.Request, res) => {
    try {
      const { messages, model = 'gpt-3.5-turbo' } = req.body;

      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ error: 'messages array is required' });
        return;
      }

      console.log(`📤 Request from ${req.user!.orgId}: ${messages.length} messages`);

      // Make the OpenAI call
      const response = await openai.chat.completions.create({
        model,
        messages,
      });

      // Report actual usage
      await limiter.reportUsage({
        tenantId: req.user!.orgId,
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
        model,
      });

      console.log(`📥 Response: ${response.usage?.total_tokens} tokens`);

      res.json(response);
    } catch (error: any) {
      console.error('OpenAI error:', error.message);
      res.status(500).json({ error: 'AI request failed', message: error.message });
    }
  }
);

// Get usage for a tenant
app.get('/api/usage',
  mockAuth,
  async (req: express.Request, res) => {
    const usage = await limiter.getUsage(req.user!.orgId);
    res.json(usage);
  }
);

// Admin: Reset usage for a tenant (for testing)
app.post('/api/admin/reset/:tenantId', async (req, res) => {
  await limiter.resetUsage(req.params.tenantId);
  res.json({ success: true, message: `Reset usage for ${req.params.tenantId}` });
});

// ============================================================
// START SERVER
// ============================================================

const PORT = process.env.PORT ?? 3002;

app.listen(PORT, () => {
  console.log(`
🚀 Example server running on http://localhost:${PORT}

Try these commands:

# Free tier request (rate limited after 10 requests)
curl -X POST http://localhost:${PORT}/api/chat \\
  -H "Content-Type: application/json" \\
  -H "x-tenant-id: free_org_123" \\
  -d '{"messages": [{"role": "user", "content": "Hello!"}]}'

# Pro tier request (higher limits)
curl -X POST http://localhost:${PORT}/api/chat \\
  -H "Content-Type: application/json" \\
  -H "x-tenant-id: pro_org_456" \\
  -d '{"messages": [{"role": "user", "content": "Hello!"}]}'

# Check usage
curl http://localhost:${PORT}/api/usage -H "x-tenant-id: free_org_123"

# Reset usage (for testing)
curl -X POST http://localhost:${PORT}/api/admin/reset/free_org_123
`);
});

