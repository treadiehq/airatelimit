# AI Ratelimit

Add usage limits and tier-based pricing to your AI app in minutes. Privacy-first proxy that tracks token/request usage without storing prompts or responses.

## Why This Exists

Building an AI app? You need to:
- Limit free tier usage without building complex billing
- Track anonymous users (no login required)
- Send upgrade prompts when users hit limits
- Not store sensitive AI conversations

That's what this does.

## What You Get

**Core:**
- Per-user/session/device usage tracking
- Privacy-first (never stores prompts or AI responses)
- Works with anonymous users (no auth required)
- Multi-provider support (OpenAI, Anthropic, Google, xAI, and any OpenAI-compatible provider)
- Streaming support for all providers
- JavaScript SDK

**Limiting:**
- Track requests (for image gen) or tokens (for chat)
- Different limits per tier (free, pro, enterprise)
- Visual rule builder with templates
- Custom upgrade messages with deep links
- Analytics to see what's working

## Deploy to Production

**Recommended Stack:**
- **Hosting:** [Railway](https://railway.app) (Backend + Dashboard + PostgreSQL)
- **Email:** [Resend](https://resend.com) (Magic link authentication)

**Quick Deploy:**
1. Push to GitHub
2. Connect to Railway
3. Add PostgreSQL (tables auto-create!)
4. Set environment variables (see `env.example`)
5. Deploy - done! ✨

## Local Development

```bash
# 1. Install
npm install
cd dashboard && npm install && cd ..

# 2. Start PostgreSQL
docker run --name ai-proxy-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=ai_proxy \
  -p 5433:5432 -d postgres:15

# 3. Setup environment
cp env.example .env
# Edit .env with your database and settings

# 4. Start everything
npm run start
```

Backend: `http://localhost:3000`  
Dashboard: `http://localhost:3001`

## Usage

### 1. Create a Project (via Dashboard)

1. Visit `http://localhost:3001/signup`
2. Enter your email (magic link sent to console in dev)
3. Create a project:
   - Choose your AI provider (OpenAI, Anthropic, Google, xAI, or Other)
   - Enter your API key for that provider
   - For "Other" providers: specify the API endpoint URL
   - Set limits (e.g., 5 requests/day for free tier)
4. Copy your project key

### 2. Use the SDK

```typescript
import { createClient } from '@ai-ratelimit/sdk';

const client = createClient({
  baseUrl: 'http://localhost:3000/api',
  projectKey: 'pk_your_key_here',
});

// Regular request - use ANY model from your provider
const result = await client.chat({
  identity: 'user-123',        // User ID, session, or device ID
  tier: 'free',                 // Optional: free, pro, etc.
  model: 'gpt-4o',              // Any model: gpt-4o, claude-3-5-sonnet-20241022, gemini-1.5-pro, etc.
  messages: [{ role: 'user', content: 'Hello!' }],
});

// Future models work automatically (no code changes needed)
const result2 = await client.chat({
  identity: 'user-123',
  model: 'gpt-5',               // Future models work immediately
  messages: [{ role: 'user', content: 'Hello from the future!' }],
});

// Streaming
for await (const chunk of client.chatStream({
  identity: 'user-123',
  tier: 'free',
  model: 'gpt-4-turbo-preview',
  messages: [{ role: 'user', content: 'Tell me a story' }],
})) {
  process.stdout.write(chunk);
}
```

### 3. Or Use the API Directly

No SDK? No problem. Just make HTTP requests:

```bash
# Regular request
curl -X POST http://localhost:3000/api/v1/proxy/chat \
  -H "x-project-key: pk_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "identity": "user-123",
    "tier": "free",
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# Streaming request with Claude
curl -X POST http://localhost:3000/api/v1/proxy/chat/stream \
  -H "x-project-key: pk_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "identity": "user-123",
    "tier": "free",
    "model": "claude-3-5-sonnet-20241022",
    "messages": [{"role": "user", "content": "Tell me a story"}]
  }'
```

**From any language:**

```python
# Python example
import requests

response = requests.post(
    'http://localhost:3000/api/v1/proxy/chat',
    headers={
        'x-project-key': 'pk_your_key_here',
        'Content-Type': 'application/json'
    },
    json={
    'identity': 'user-123',
    'tier': 'free',
    'model': 'gpt-4o',  # Or claude-3-5-sonnet-20241022, gemini-1.5-pro, grok-beta
    'messages': [{'role': 'user', 'content': 'Hello!'}]
    }
)

if response.status_code == 429:
    # Limit exceeded
    error = response.json()
    print(error['message'])
else:
    result = response.json()
    print(result)
```

### 4. Supported Providers

When creating a project, you can choose from:

| Provider | Default Base URL | Notes |
|----------|------------------|-------|
| **OpenAI** | `https://api.openai.com/v1/chat/completions` | All GPT models (gpt-4o, o1, etc.) |
| **Anthropic** | `https://api.anthropic.com/v1/messages` | All Claude models |
| **Google** | `https://generativelanguage.googleapis.com/v1/models/{model}:generateContent` | All Gemini models |
| **xAI** | `https://api.x.ai/v1/chat/completions` | All Grok models |
| **Other** | *Custom URL required* | Any OpenAI-compatible API (Together.ai, Groq, Perplexity, etc.) |

**Use Any Model:** The proxy doesn't restrict model names. Pass any model ID from your chosen provider - including future models. The proxy forwards your request directly to the provider's API.

**Format Translation:** The proxy handles API format differences automatically. Always use OpenAI-compatible format in your requests, regardless of the provider.

**Custom Providers:** When selecting "Other", you can use any provider that supports OpenAI's chat completions API format. Examples include Together.ai, Groq, Perplexity, Fireworks, or self-hosted LLMs with OpenAI-compatible servers.

### 5. Handle Limit Exceeded

```typescript
try {
  const result = await client.chat({ ... });
} catch (err) {
  if (err instanceof LimitExceededError) {
    // Show upgrade prompt
    console.log(err.response.message);
    
    // Optional: Navigate to upgrade page
    if (err.response.deepLink) {
      window.location.href = err.response.deepLink;
    }
  }
}
```

## Common Use Cases

### Image Generation App
```typescript
// Free: 5 images/day
// Pro: 100 images/day
client.chat({
  identity: 'device-abc123',  // Track by device
  tier: 'free',
  limitType: 'requests',      // Count requests, not tokens
  // ... your image gen params
})
```

### Chat App
```typescript
// Free: 10k tokens/day
// Pro: 500k tokens/day
client.chat({
  identity: 'user-456',
  tier: 'pro',
  limitType: 'tokens',  // Count tokens
  // ... your chat params
})
```

### Anonymous Users
```typescript
// No login required - track by session or device
client.chat({
  identity: crypto.randomUUID(), // Generate once per session
  tier: 'free',
  // ... params
})
```

## Rule Engine

Create smart limits in the dashboard:

**Example:** Warn users at 80% of their free tier limit

```
When: Free tier users reach 80% of request limit
Then: Return custom message with upgrade link
```

**Pre-built templates:**
- Free tier 80% warning
- Free tier 100% block
- Pro tier 95% warning
- Image generation limits
- Enterprise unlimited access

**Test rules** before deploying with the built-in simulator.

**Track what works** with analytics showing which rules trigger most.

## Privacy

**Zero conversation data stored**

We only track:
- How many requests/tokens used
- When they were used
- Which identity used them

We never store:
- User prompts
- AI responses
- Conversation history

This is how successful AI companies do it. Simple, fast, privacy-first.

## Environment Setup

Create `.env`:

```env
PORT=3000
DATABASE_URL=postgres://postgres:password@localhost:5433/ai_proxy
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3001
OPENAI_BASE_URL=https://api.openai.com/v1/chat/completions

# Production only - sends magic link emails
RESEND_API_KEY=re_your_key
EMAIL_FROM=noreply@yourdomain.com
```

## Commands

```bash
npm run start    # Start backend + dashboard
npm run stop     # Stop all servers
npm run restart  # Restart everything
npm run status   # Check if running
```

## API Reference

### Proxy Endpoints (Public)

```bash
POST /api/v1/proxy/chat
POST /api/v1/proxy/chat/stream
```

Requires `x-project-key` header.

### Dashboard API (Authenticated)

```bash
# Projects
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
DELETE /api/projects/:id

# Usage
GET    /api/projects/:id/usage/summary
GET    /api/projects/:id/usage/by-identity

# Analytics
GET    /api/projects/:id/analytics/rule-triggers
GET    /api/projects/:id/analytics/recent-triggers
```

## Production Deployment

### Railway + Resend (Recommended)

**Cost:** ~$5-10/month for small projects

1. **Backend Service**
   - Auto-deploy from GitHub
   - Add PostgreSQL database
   - Set environment variables from `env.example`
   - Deploy

2. **Dashboard Service**
   - Same repo, root directory: `/dashboard`
   - Set `NUXT_PUBLIC_API_BASE_URL`
   - Deploy

3. **Email (Resend)**
   - Sign up at [resend.com](https://resend.com)
   - Verify your domain
   - Get API key
   - Add to backend env vars

**Full guide:** [DEPLOYMENT.md](./DEPLOYMENT.md)

## Architecture

```
Your App → AI Ratelimit Proxy → OpenAI/Anthropic/Google/xAI
              ↓
          PostgreSQL
          (usage tracking)
```

**Flow:**
1. Your app sends request with `identity` and `tier`
2. Proxy checks usage limits
3. If within limits → forwards to OpenAI
4. If over limits → returns custom error
5. Tracks tokens/requests in database

## License

See [FSL-1.1-MIT](LICENSE) for full details.

---

Built for developers who want simple, privacy-first AI usage limits without the complexity.
