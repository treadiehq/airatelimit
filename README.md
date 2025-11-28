# AI Ratelimit

Add usage limits to your AI app in 5 minutes. Track usage per user, set limits per model, create pricing tiers—all without storing 
prompts or API keys.

```
Your App → AI Ratelimit → OpenAI / Anthropic / Google / Any AI
                ↓
          Check limits
          Track usage
          Forward request
```

**How it works:** Point your AI requests at our proxy. We check limits, then forward to the real API. Your API key passes through, we never store it.

```diff
- baseURL: 'https://api.openai.com/v1'
+ baseURL: 'https://api.airatelimit.com/v1'
+ headers: { 'x-project-key': 'pk_xxx', 'x-identity': userId, 'x-tier': 'free' }
```

That's it. Works with any AI provider.

## Why?

Building an AI app? You need:
- Limit free tier without building billing
- Track anonymous users (no login required)
- Different limits per model (gpt-4o: expensive, gemini: cheap)
- Custom upgrade prompts when limits hit
- Privacy-first (never store prompts or responses)

This does all that.

## Live

Try the product live at **https://airatelimit.com**

## Community & Support

Join our Discord community for discussions, support, and updates:

[![Discord](https://img.shields.io/badge/Discord-Join%20our%20community-7289DA?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/KqdBcqRk5E)

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
export DB_PASSWORD=$(openssl rand -base64 24)
docker run --name ai-proxy-db -e POSTGRES_PASSWORD=$DB_PASSWORD -e POSTGRES_DB=ai_proxy -p 5433:5432 -d postgres:15
cp env.example .env  # Edit DATABASE_URL with your DB_PASSWORD
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
| `x-tier` | Pricing tier | `free`, `pro` |

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

### Per-Identity Limits (Optional)

Cap specific users programmatically using your project's **secret key** (`sk_xxx`):

```bash
# Set limits for one user
curl -X POST https://api.airatelimit.com/api/projects/pk_xxx/identities \
  -H "Authorization: Bearer sk_xxx" \
  -H "Content-Type: application/json" \
  -d '{"identity": "user-123", "requestLimit": 1000, "tokenLimit": 50000}'

# Disable a user
curl -X POST .../identities -d '{"identity": "user-123", "enabled": false}'
```

Find your secret key in Dashboard → Project Settings → API Access. Identity limits override all other limits.

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

- [Prompt Injection](docs/PROMPT.md) - Prompt injection protection
- [Firebase Integration](docs/FIREBASE.md) - Use with Firebase Auth

## License

[FSL-1.1-MIT](LICENSE)
