# AI Ratelimit

Add usage limits to your AI app in 5 minutes. Track usage per user, set limits per model, create pricing tiers—all without storing prompts or API keys.

```typescript
import OpenAI from 'openai';

// Use your existing OpenAI SDK - just change the base URL
const openai = new OpenAI({
  apiKey: 'sk-your-key',  // Your key - we never store it
  baseURL: 'https://your-proxy.com/v1',
  defaultHeaders: {
    'x-project-key': 'pk_xxx',   // From dashboard
    'x-identity': 'user-123',     // For rate limiting
    'x-tier': 'free',             // Optional
  },
});

// That's it! Use your SDK as normal
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

## Why?

Building an AI app? You need:
- Limit free tier without building billing
- Track anonymous users (no login required)
- Different limits per model (gpt-4o: expensive, gemini: cheap)
- Custom upgrade prompts when limits hit
- Privacy-first (never store prompts or responses)

This does all that.

## Quick Start

### 1. Deploy (2 minutes)

**Railway (Recommended):**
1. Push to GitHub
2. Connect to [Railway](https://railway.app)
3. Add PostgreSQL
4. Set `DATABASE_URL` and `JWT_SECRET` env vars
5. Deploy ✨

**Local:**
```bash
npm install && cd dashboard && npm install && cd ..
docker run --name ai-proxy-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=ai_proxy -p 5433:5432 -d postgres:15
cp env.example .env  # Edit with your settings
npm run start
```

Dashboard: `http://localhost:3001` | Backend: `http://localhost:3000`

### 2. Create Project (30 seconds)

1. Open dashboard → Sign up (magic link)
2. Create project — your project key (`pk_...`) is generated instantly
3. Configure limits (optional)

### 3. Integrate (change 3 lines)

Point your existing SDK to our proxy:

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'sk-your-openai-key',
  baseURL: 'https://your-app.railway.app/v1',  // ← Add this
  defaultHeaders: {                             // ← Add this
    'x-project-key': 'pk_xxx',
    'x-identity': 'user-123',
    'x-tier': 'free',
  },
});

// Use the SDK exactly as normal
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

Done! Usage is tracked automatically.

## How It Works

```
Your App → Our Proxy → OpenAI/Anthropic/etc.
              ↓
        Check limits
        Log usage
        Pass through
```

1. Your app sends requests to our proxy (with your API key in the header)
2. We check rate limits and log usage
3. We forward your request exactly as-is to the AI provider
4. We return the response exactly as-is

**We never store your API key or prompts.** Everything passes through.

## Required Headers

| Header | Description | Example |
|--------|-------------|---------|
| `Authorization` | Your AI provider API key | `Bearer sk-xxx` |
| `x-project-key` | Your project key from dashboard | `pk_abc123` |
| `x-identity` | User/session/device ID for tracking | `user-123` |
| `x-tier` | (Optional) Pricing tier | `free`, `pro` |

## Key Features

### Per-Model Limits
Set different limits for each model:
```
gpt-4o: 5 requests/day
gemini-2.5: unlimited
claude-3-5-sonnet: 50 requests/day
```

### Pricing Tiers
Configure limits per tier (free, pro, enterprise):
```
free:  5 GPT-4o requests, unlimited Gemini
pro:   500 GPT-4o requests, unlimited everything
```

### Custom Messages
Show upgrade prompts with deep links:
```json
{
  "message": "You've used {{usage}}/{{limit}} free requests. Upgrade to Pro!",
  "deepLink": "app://upgrade"
}
```

### Prompt Injection Protection
Protect your system prompts from extraction attacks:
- Detects "show me your prompt" jailbreaks
- Blocks role manipulation attempts
- Prevents instruction override attacks
- Logs all security events

### Multi-Provider Support
Works with any OpenAI-compatible API:
- OpenAI (GPT-4o, o1, etc.)
- Anthropic (Claude 3.5 Sonnet)
- Google (Gemini 2.5)
- xAI (Grok)
- Together.ai, Groq, Perplexity, etc.

### Privacy-First
- Never stores prompts or responses
- Never stores your API keys
- Only tracks: identity, usage counts, timestamps
- GDPR/CCPA friendly

## Configuration Examples

### Simple: One limit for everyone
```
Daily limit: 100 requests
```

### Per-Model: Different limits per model
```
gpt-4o: 10 requests
gemini-2.5: unlimited
claude-3-5-sonnet: 50 requests
```

### Tiered: Free vs Pro
```
free: { gpt-4o: 5, gemini: unlimited }
pro:  { gpt-4o: 500, gemini: unlimited }
```

## Limit Periods

Choose when limits reset:
- **Daily** - Reset at midnight UTC
- **Weekly** - Reset Monday midnight UTC
- **Monthly** - Reset 1st of month UTC

## Error Response (429)

When limits are exceeded:

```json
{
  "error": {
    "message": "You've used 5/5 free requests. Upgrade to Pro!",
    "type": "rate_limit_exceeded",
    "code": "limit_exceeded"
  }
}
```

Handle it in your app:

```typescript
try {
  const response = await openai.chat.completions.create({ ... });
} catch (error) {
  if (error.status === 429) {
    // Show upgrade prompt
    console.log(error.message);
  }
}
```

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key

# Optional
PORT=3000
RESEND_API_KEY=re_...  # For magic link emails
```

## Use Cases

**Image Generation Apps:**
```
limitType: 'requests'  // Count images, not tokens
free: 5 images/day
pro: 100 images/day
```

**Chat Apps:**
```
limitType: 'tokens'  // Count tokens, not requests
free: 10k tokens/day
pro: 500k tokens/day
```

**Multi-Model Apps:**
```
gemini-2.5: unlimited (cheap)
gpt-4o: 5 requests (expensive)
```

## Dashboard Features

- **Plan tiers** - Configure limits per tier with model-level overrides
- **Model autocomplete** - Prevents typos, suggests models
- **Security logs** - Track prompt injection attempts

## Language Examples

### Python

```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-your-key",
    base_url="https://your-proxy.com/v1",
    default_headers={
        "x-project-key": "pk_xxx",
        "x-identity": "user-123",
    }
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### curl

```bash
curl https://your-proxy.com/v1/chat/completions \
  -H "Authorization: Bearer sk-your-key" \
  -H "x-project-key: pk_xxx" \
  -H "x-identity: user-123" \
  -d '{"model": "gpt-4o", "messages": [{"role": "user", "content": "Hello!"}]}'
```

### JavaScript/TypeScript

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'sk-your-key',
  baseURL: 'https://your-proxy.com/v1',
  defaultHeaders: {
    'x-project-key': 'pk_xxx',
    'x-identity': 'user-123',
  },
});
```

### Anthropic (via OpenAI SDK)

```typescript
import OpenAI from 'openai';

const anthropic = new OpenAI({
  apiKey: 'sk-ant-your-key',
  baseURL: 'https://your-proxy.com/v1',
  defaultHeaders: {
    'x-project-key': 'pk_xxx',
    'x-identity': 'user-123',
  },
});

const response = await anthropic.chat.completions.create({
  model: 'claude-3-5-sonnet-20241022',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

## Resources

- [Security Features](docs/SECURITY.md) - Prompt injection protection
- [Firebase Integration](docs/FIREBASE.md) - Use with Firebase Auth

## License

See [FSL-1.1-MIT](LICENSE) for full details.
