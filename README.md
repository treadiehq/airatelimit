# AI Ratelimit

AI usage-limiting proxy that authenticates requests, tracks usage, and enforces daily limits before forwarding to OpenAI.

## Why AI Ratelimit?

**The same approach used by successful AI companies.**

Fast-growing AI companies don't use complex LLMOps observability tools. They keep it simple:
- ✅ Log token counts in the database
- ✅ Track request metrics
- ✅ Store prompts in code, not in databases

This is exactly what AI Ratelimit does—no bloat, no complexity, just effective usage tracking and limiting. Privacy-first by design, production-ready out of the box.

## Features

### Core Features
- ✅ Project-based authentication via `x-project-key`
- ✅ Per-identity (user/session/device) usage tracking
- ✅ Privacy-focused: **never stores prompts or responses**
- ✅ Usage summary endpoints
- ✅ Provider abstraction layer (OpenAI + future LLMs)
- ✅ Streaming endpoint (`/api/v1/proxy/chat/stream`)
- ✅ JavaScript SDK with chat & streaming support

### Advanced Limiting (New!)
- ✅ **Multi-type limits**: Requests (for image gen), Tokens (for chat), or Both
- ✅ **Plan/Tier system**: Different limits for free, pro, enterprise, etc.
- ✅ **Visual rule engine**: Complex conditions & custom responses
- ✅ **Deep link support**: Direct users to upgrade pages from limit responses
- ✅ **Usage percentage triggers**: Send warnings at 80%, block at 100%, etc.


## Quick Start

### Option A: Start Everything at Once (Recommended)

```bash
# Install dependencies
npm install
cd dashboard && npm install && cd ..

# Setup environment (first time only)
cp .env.example .env
# Edit .env with your settings

# Start PostgreSQL (first time only)
docker run --name ai-proxy-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=ai_proxy \
  -p 5433:5432 -d postgres:15

# Start all servers (Backend + Dashboard)
npm run start
```

**That's it!** Backend runs at `http://localhost:3000`, Dashboard at `http://localhost:3001`

**Management commands:**
```bash
npm run start    # Start all servers
npm run stop     # Stop all servers
npm run restart  # Restart all servers
npm run status   # Check server status
```

### Option B: Manual Setup (Development)

```bash
# Terminal 1 - Backend
npm install
npm run dev

# Terminal 2 - Dashboard
cd dashboard
npm install
npm run dev
```

### 3. SDK Usage

See `sdk/js/README.md` for full documentation.

```typescript
import { createClient } from '@ai-ratelimit/sdk';

const client = createClient({
  baseUrl: 'http://localhost:3000/api',
  projectKey: 'pk_your_key_here',
});

// Regular chat
const result = await client.chat({
  identity: 'user-123',
  model: 'gpt-4-turbo-preview',
  messages: [{ role: 'user', content: 'Hello!' }],
});

// Streaming
for await (const chunk of client.chatStream({
  identity: 'user-123',
  model: 'gpt-4-turbo-preview',
  messages: [{ role: 'user', content: 'Tell me a story' }],
})) {
  process.stdout.write(chunk);
}
```

## Environment Variables

Create a `.env` file in the root:

```env
PORT=3000
DATABASE_URL=postgres://postgres:password@localhost:5433/ai_proxy
GLOBAL_ADMIN_KEY=super-secret-admin-key
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3001
OPENAI_BASE_URL=https://api.openai.com/v1/chat/completions
NODE_ENV=development

# Magic Link Authentication (Production only)
RESEND_API_KEY=re_your_resend_api_key_here
EMAIL_FROM=noreply@yourdomain.com
```

**Note**: In development, magic links are printed to the console. In production, set `RESEND_API_KEY` to send emails via Resend. See [MAGIC_LINK_SETUP.md](./MAGIC_LINK_SETUP.md) for details.

## API Endpoints

### Authentication (Public)

- `POST /api/auth/signup` - Create account (sends magic link)
- `POST /api/auth/magic-link/request` - Request magic link for login
- `POST /api/auth/magic-link/verify` - Verify magic link token
- `POST /api/auth/login` - Legacy password login (deprecated)

### Projects (Authenticated)

- `GET /api/projects` - List your projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Usage (Authenticated)

- `GET /api/projects/:id/usage/summary` - Today's usage summary
- `GET /api/projects/:id/usage/by-identity` - Usage breakdown by identity

### Proxy (Public, requires `x-project-key`)

- `POST /api/v1/proxy/chat` - Chat completion
- `POST /api/v1/proxy/chat/stream` - Streaming chat completion

### Admin (Internal, requires `x-admin-key`)

- `POST /api/admin/projects` - Create project (Phase 0 compat)
- `GET /api/admin/projects/:projectKey/usage/:identity` - Get usage

## Dashboard Usage

1. **Sign Up**: Visit http://localhost:3001/signup
   - Enter your organization name (must be unique, some names are reserved)
   - Enter your email
   - A magic link will be sent (in dev mode, check your terminal console)
   - Click the magic link to sign in automatically
   - Your organization and user account are created together
   
   **Note**: Organization names must be unique. Reserved names like "admin", "api", "support" cannot be used. See `RESERVED_ORG_NAMES.md` for the full list.
2. **Create Project**: 
   - Click "Create Project"
   - Enter project name and OpenAI API key
   - Set daily limits (optional)
   - Configure custom limit message (optional)
3. **View Usage**: 
   - Click on a project to see today's usage
   - View breakdown by identity
   - Edit configuration as needed
4. **Copy Project Key**: Use the key in your app with the SDK

## SDK Development

```bash
cd sdk/js
npm install
npm run build
```

## Advanced Features

### 1. Multi-Type Limits

Choose how to track usage based on your use case:

- **`requests`** - For image generation, API calls, etc.
- **`tokens`** - For chat completions (traditional LLM usage)
- **`both`** - Track both metrics simultaneously

Configure in dashboard or via API:

```json
{
  "limitType": "requests",
  "dailyRequestLimit": 50
}
```

### 2. Plan/Tier System

Define different limits for different user tiers:

```json
{
  "tiers": {
    "free": {
      "requestLimit": 5,
      "tokenLimit": 1000
    },
    "pro": {
      "requestLimit": 100,
      "tokenLimit": 50000
    },
    "enterprise": {
      "requestLimit": null,
      "tokenLimit": null
    }
  }
}
```

Your app passes the tier:

```typescript
client.chat({
  identity: 'user-123',
  tier: 'pro', // ← User's plan
  messages: [...]
})
```

### 3. Visual Rule Engine

Create complex rules with conditions and actions:

**Example Rule**: *"When free tier users reach 80% of request limit, send upgrade message"*

```json
{
  "rules": [
    {
      "id": "rule-1",
      "name": "Free tier 80% warning",
      "enabled": true,
      "condition": {
        "type": "usage_percent",
        "metric": "requests",
        "operator": "gte",
        "threshold": 80
      },
      "action": {
        "type": "custom_response",
        "response": {
          "error": "approaching_limit",
          "message": "You've used 4 of 5 free requests today. Upgrade to Pro!",
          "deepLink": "myapp://upgrade",
          "remainingRequests": 1
        }
      }
    }
  ]
}
```

**Rule Condition Types**:
- `usage_percent` - Percentage of limit used (e.g., 80%)
- `usage_absolute` - Absolute usage count (e.g., 1000 tokens)
- `tier_match` - User's tier matches value (e.g., "free")
- `composite` - Combine conditions with AND/OR logic

**Rule Actions**:
- `allow` - Continue processing
- `block` - Block with generic error
- `custom_response` - Return custom JSON with deep links, messages, etc.

### Deep Links

Use deep links to direct users to upgrade pages:

```json
{
  "error": "limit_exceeded",
  "message": "Upgrade to Pro for unlimited access!",
  "deepLink": "myapp://upgrade?plan=pro",
  "webUrl": "https://myapp.com/pricing"
}
```

Your app can handle these responses:

```typescript
try {
  const result = await client.chat({ ... });
} catch (err) {
  if (err instanceof LimitExceededError) {
    if (err.response.deepLink) {
      // Navigate to upgrade page
      window.location.href = err.response.deepLink;
    }
  }
}
```

## Database Schema

### users
- `id` (uuid)
- `email` (unique, indexed)
- `passwordHash`
- `createdAt`, `updatedAt`

### projects
- `id` (uuid)
- `name`
- `projectKey` (unique, auto-generated)
- `ownerId` (FK to users)
- `provider` (default: 'openai')
- `baseUrl` (default: OpenAI chat URL)
- `openaiApiKey` (TODO: encrypt at rest)
- `limitType` (enum: 'requests', 'tokens', 'both')
- `dailyRequestLimit`, `dailyTokenLimit`
- `limitExceededResponse` (JSON)
- `tiers` (JSONB) - Tier-based limits
- `rules` (JSONB) - Visual rule engine rules
- `createdAt`, `updatedAt`

### usage_counters
- `id` (uuid)
- `projectId` (FK to projects)
- `identity` (string)
- `periodStart` (date, UTC midnight)
- `requestsUsed`, `tokensUsed`
- Composite index: `(projectId, identity, periodStart)`

## Use Cases

### For App Developers

**Problem**: You want to offer free AI features in your app without:
- Building complex billing systems
- Managing user accounts just for rate limiting
- Worrying about free tier abuse

**Solution**: This proxy lets you:
1. Set limits per anonymous user/session/device
2. Show custom upgrade messages when limits hit
3. Use different limits for different plan tiers
4. All without storing any user prompts or AI responses

### Examples

**Image Generation App (Requests-based)**
```typescript
// Free tier: 5 images/day
// Pro tier: 100 images/day
client.chat({
  identity: 'device-abc123',
  tier: 'free',
  // ... image gen params
})
```

**Chat App (Token-based)**
```typescript
// Free tier: 10k tokens/day
// Pro tier: 500k tokens/day
client.chat({
  identity: 'user-456',
  tier: 'pro',
  // ... chat params
})
```

**Progressive Limits with Rules**
- At 80% usage → Warning message
- At 100% usage → Block with upgrade deep link

## Privacy Guarantees

🔒 **No prompts or responses are ever stored in the database or logs**

**This isn't just good for privacy—it's what successful companies actually do.**

Forget expensive LLMOps platforms. The fastest-growing AI companies track what matters:
- ✅ **Token counts** - Stored efficiently in your database
- ✅ **Request counts** - Simple, actionable metrics
- ✅ **Usage metadata** - Who, when, how much

What we **don't** store:
- ❌ User prompts (they stay in your code)
- ❌ AI responses (no bloated databases)
- ❌ Sensitive conversation data

Only metadata is tracked:
- Project ID
- Identity
- Tier (if provided)
- Request/token counts
- Timestamps
- Status (allowed/limited/error)

**Simple, effective, and proven at scale.**

## Architecture

### Provider Abstraction

The provider layer (`src/providers/`) uses a router pattern:

```typescript
ProviderRouterService
  ├── OpenAIProviderService (implemented)
  ├── AnthropicProviderService (future)
  └── CustomProviderService (future)
```

To add a new provider:
1. Create `YourProviderService` in `src/providers/`
2. Implement `chat()` and `chatStream()` methods
3. Add routing logic in `ProviderRouterService`
4. Update `Project.provider` enum

### Streaming Flow

1. Client calls `/api/v1/proxy/chat/stream`
2. Check usage limits (before streaming)
3. If over limit → return JSON error (HTTP 429)
4. If allowed → stream from provider (SSE format)
5. Track actual tokens when stream completes
6. Update usage counters

## Development Notes

- Auto-sync is enabled in development (TypeORM)
- For production, disable sync and use migrations
- OpenAI keys are stored as plain strings (add encryption in production)
- CORS is configured for dashboard origin
- JWT tokens expire in 7 days by default

## Testing

### Test Basic Limits

```bash
# 1. Create a user and project via dashboard with limit: 2 requests/day

# 2. Make first request (should work)
curl -X POST http://localhost:3000/api/v1/proxy/chat \
  -H "x-project-key: pk_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "identity": "test-user-1",
    "model": "gpt-4-turbo-preview",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# 3. Make second request (should work)
# 4. Make third request (should return 429 with custom limit message)
```

### Test Tier-Based Limits

```bash
# Free tier user (5 requests/day)
curl -X POST http://localhost:3000/api/v1/proxy/chat \
  -H "x-project-key: pk_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "identity": "user-456",
    "tier": "free",
    "model": "gpt-4-turbo-preview",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# Pro tier user (100 requests/day)
curl -X POST http://localhost:3000/api/v1/proxy/chat \
  -H "x-project-key: pk_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "identity": "user-789",
    "tier": "pro",
    "model": "gpt-4-turbo-preview",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Test Rules Engine

```bash
# Configure a rule in dashboard:
# - When usage >= 80% on requests
# - Send custom warning message

# Make requests until you hit 80% threshold
# Should receive custom response with deep link
```

### Test Streaming

```bash
curl -X POST http://localhost:3000/api/v1/proxy/chat/stream \
  -H "x-project-key: pk_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "identity": "user-123",
    "tier": "free",
    "model": "gpt-4-turbo-preview",
    "messages": [{"role": "user", "content": "Count to 10"}]
  }'
```

### Test with SDK

```typescript
import { createClient } from '@ai-ratelimit/sdk';

const client = createClient({
  baseUrl: 'http://localhost:3000/api',
  projectKey: 'pk_your_key_here',
});

// Test free tier
try {
  const result = await client.chat({
    identity: 'user-123',
    tier: 'free',
    model: 'gpt-4-turbo-preview',
    messages: [{ role: 'user', content: 'Hello!' }],
  });
  console.log('Success:', result.raw);
} catch (err) {
  if (err instanceof LimitExceededError) {
    console.log('Limit exceeded:', err.response);
    // Handle deep link if present
    if (err.response.deepLink) {
      console.log('Redirect to:', err.response.deepLink);
    }
  }
}
```

## Deployment

1. Set production environment variables
2. Build the backend: `npm run build`
3. Build the dashboard: `cd dashboard && npm run build`
4. Disable TypeORM sync in production
5. Use SSL/TLS for all connections
6. Implement OpenAI key encryption at rest
7. Set up proper logging and monitoring
8. Configure rate limiting at infrastructure level

## License

UNLICENSED

## Implementation Status

### ✅ Phase 1: Multi-Type Limits (COMPLETE)
- Request-based limiting (for image generation)
- Token-based limiting (for chat)
- Combined limiting (both metrics)
- Dashboard UI for limit type configuration

### ✅ Phase 2: Plan/Tier System (COMPLETE)
- Tier-based limits (free, pro, enterprise, etc.)
- Per-tier request and token limits
- Tier parameter in SDK
- Dashboard UI for tier management

### ✅ Phase 3: Visual Rule Engine (COMPLETE)
- Condition-based rules (usage %, absolute, tier match)
- Custom response actions
- Deep link support for upgrade flows
- Visual rule builder in dashboard

## Next Steps (Future Enhancements)

- [ ] Add more LLM providers (Anthropic, Cohere, etc.)
- [ ] Implement API key encryption at rest
- [ ] Composite rule conditions (AND/OR logic)
- [ ] Webhooks for limit events
- [ ] Advanced usage reports (weekly, monthly)
- [ ] Rate limiting windows (hourly, weekly)
- [ ] Usage analytics charts in dashboard
