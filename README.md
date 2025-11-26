# AI Ratelimit

Add usage limits to your AI app in 5 minutes.

```
Your App → AI Ratelimit → OpenAI / Anthropic / Google / Any AI
                ↓
          Check limits
          Track usage
          Forward request
```

**How it works:** Point your AI requests at our proxy. We check limits, then forward to the real API. Your API key passes through—we never store it.

```diff
- baseURL: 'https://api.openai.com/v1'
+ baseURL: 'https://api.airatelimit.com/v1'
+ headers: { 'x-project-key': 'pk_xxx', 'x-identity': userId }
```

Works with any AI provider.

## Quick Start

### 1. Deploy

**Railway (Recommended):**
1. Push to GitHub
2. Connect to [Railway](https://railway.app)
3. Add PostgreSQL
4. Set `DATABASE_URL` and `JWT_SECRET` env vars
5. Deploy

**Local:**
```bash
npm install && cd dashboard && npm install && cd ..
docker run --name ai-proxy-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=ai_proxy -p 5433:5432 -d postgres:15
cp env.example .env  # Edit with your settings
npm run start
```

Dashboard: `http://localhost:3001` | Backend: `http://localhost:3000`

### 2. Create Project

1. Open dashboard → Sign up
2. Create project → get your project key (`pk_...`)
3. Configure limits

### 3. Integrate

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'sk-xxx',
  baseURL: 'https://api.airatelimit.com/v1',
  defaultHeaders: {
    'x-project-key': 'pk_xxx',
    'x-identity': getUserId(),
  },
});

// Use normally
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

## Required Headers

| Header | Description | Example |
|--------|-------------|---------|
| `Authorization` | Your AI provider API key | `Bearer sk-xxx` |
| `x-project-key` | Your project key from dashboard | `pk_abc123` |
| `x-identity` | Your user's ID (from your app) | `user_abc`, `session_xyz` |
| `x-tier` | (Optional) Pricing tier | `free`, `pro` |

> **`x-identity`** is whatever you use to identify users—a user ID, session ID, or device ID. Each identity gets its own usage limits.

## Features

### Per-Model Limits

Set different limits for each model:

```
gpt-4o: 5 requests/day (expensive)
gemini-2.0-flash: unlimited (cheap)
claude-3-5-sonnet: 50 requests/day
```

### Pricing Tiers

Different limits for free vs pro users:

```
free: { gpt-4o: 5, gemini: unlimited }
pro:  { gpt-4o: 500, gemini: unlimited }
```

### Custom Messages

Show upgrade prompts with deep links when limits are hit:

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
- Logs all security events

### Privacy-First

- Never stores prompts or responses
- Never stores your API keys
- Only tracks: identity, usage counts, timestamps

## Limit Periods

Choose when limits reset:
- **Daily** - Reset at midnight UTC
- **Weekly** - Reset Monday midnight UTC
- **Monthly** - Reset 1st of month UTC

## Error Response

When limits are exceeded (HTTP 429):

```json
{
  "error": {
    "message": "You've used 5/5 free requests. Upgrade to Pro!",
    "type": "rate_limit_exceeded",
    "code": "limit_exceeded"
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

## Examples

### Python

```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-xxx",
    base_url="https://api.airatelimit.com/v1",
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
curl https://api.airatelimit.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-xxx" \
  -H "x-project-key: pk_xxx" \
  -H "x-identity: user-123" \
  -d '{"model": "gpt-4o", "messages": [{"role": "user", "content": "Hello!"}]}'
```

### Anthropic / Claude

Use the same code—just change the model and API key:

```python
client = OpenAI(
    api_key="sk-ant-xxx",  # Anthropic key
    base_url="https://api.airatelimit.com/v1",
    default_headers={
        "x-project-key": "pk_xxx",
        "x-identity": "user-123",
    }
)

response = client.chat.completions.create(
    model="claude-3-5-sonnet-20241022",  # Claude model
    messages=[{"role": "user", "content": "Hello!"}]
)
```

## Resources

- [Security Features](docs/SECURITY.md) - Prompt injection protection
- [Firebase Integration](docs/FIREBASE.md) - Use with Firebase Auth

## License

[FSL-1.1-MIT](LICENSE)
