# AI Ratelimit

Add usage limits to your AI mobile app in 5 minutes. Track usage per user, set limits per model, create pricing tiers, all without storing prompts or API keys.

```
Your App → AI Ratelimit → OpenAI / Anthropic / Google / Any AI
                ↓
          Check limits
          Track usage
          Forward request
```

**How it works:** Point your AI requests at our proxy. We check limits, then forward to the real API. Pass your API key per-request, or store it encrypted in the dashboard.

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

**[Deployment](./docs/DEPLOYMENT.md)**

Quick steps:
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

| Header | Description | Required | Example |
|--------|-------------|----------|---------|
| `x-project-key` | Your project key from dashboard | Always | `pk_abc123` |
| `x-identity` | Your user's ID (from your app) | Always | `user_abc`, `session_xyz` |
| `Authorization` | Your AI provider API key | Pass-through only | `Bearer sk-xxx` |
| `x-tier` | Pricing tier | Optional | `free`, `pro` |

> **`x-identity`** is whatever you use to identify users—a user ID, session ID, or device ID. Each identity gets its own usage limits.

### Two Integration Modes

**Pass-through Mode** (server-side apps):
- Pass your AI provider API key in the `Authorization` header
- We forward it to OpenAI/Anthropic/Google, never store it

**Stored Keys Mode** (mobile apps):
- Store your AI provider API keys in Dashboard settings
- Your app only needs `x-project-key`, no AI keys exposed in client code
- Keys are encrypted at rest

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

# Upgrade their limit
PUT /identities/user-123  {"tokenLimit": 50000}

# Gift tokens to a user
curl -X POST .../identities/user-123/gift -d '{"tokens": 10000}'

# Give unlimited access until date
curl -X POST .../identities/user-123/promo -d '{"unlimitedUntil": "2025-12-31"}'

# Reset usage after payment (clears current period's usage)
curl -X POST .../identities/user-123/reset -d '{"resetTokens": true, "resetRequests": true}'
```

Find your secret key in Dashboard → Project Settings → API Access.

### System Prompts (Optional)

Store system prompts server-side so they're hidden from mobile app code:

```bash
# Create a prompt
curl -X POST .../prompts -d '{"name": "assistant-v1", "content": "You are a helpful assistant."}'
```

Then reference by name in requests: `{"systemPrompt": "assistant-v1", "messages": [...]}`

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
- API keys only stored if you choose Stored Keys Mode (encrypted at rest)
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

## BE Environment Variables

```bash
# Required
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
CORS_ORIGIN=https://your-dashboard.railway.app
NODE_ENV=production

# Required for Stored Keys Mode (production)
ENCRYPTION_KEY=your-32-char-key  # Generate with: openssl rand -hex 32

# Optional
PORT=3000
RESEND_API_KEY=re_...  # For magic link emails
EMAIL_FROM=noreply@yourdomain.com
```

## Dashboard Environment Variables

```bash
NODE_ENV=production

# Backend API URL (update after backend is deployed)
NUXT_PUBLIC_API_BASE_URL=https://your-backend-url.railway.app/api
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

## Sponsorship API

Issue API keys to users with USD-based budgets. Get your org key from **Dashboard → Sponsorships → Generate API Key**.

```bash
# Create a user token with $10 budget
curl -X POST https://api.airatelimit.com/api/v1/sponsorships \
  -H "Authorization: Bearer org_sk_xxx" \
  -d '{"sponsorKeyId": "key-uuid", "name": "User 123", "spendCapUsd": 10.00}'
# → {"token": "spt_live_xxx"}

# User makes requests with their token
curl https://api.airatelimit.com/v1/chat/completions \
  -H "Authorization: Bearer spt_live_xxx" \
  -d '{"model": "gpt-4o", "messages": [...]}'
```

See [Sponsorship API docs](docs/SPONSORSHIP-API.md) for full reference.

## Resources

- [Identity API](docs/IDENTITY-API.md) - Manage per-user limits programmatically
- [Sponsorship API](docs/SPONSORSHIP-API.md) - Issue tokens to users programmatically
- [Remote Config](docs/REMOTE-CONFIG.md) - Switch AI providers without app updates
- [Prompt Injection](docs/PROMPT.md) - Prompt injection protection

## Just Need Rate Limiting?

If you just want per-tenant rate limiting without a proxy, use our npm package:

```bash
npm install @ai-ratelimit/limiter
```

See [@ai-ratelimit/limiter](./packages/limiter) for docs.

[![Sponsor me on AI Ratelimit](https://img.shields.io/badge/AI_Ratelimit-Sponsor_me-black?style=for-the-badge&logo=data:image/svg%2bxml;base64,PHN2ZyB3aWR0aD0iMzc5IiBoZWlnaHQ9IjI5NSIgdmlld0JveD0iMCAwIDM3OSAyOTUiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xODkuMzkzIDMxLjUxNDNDMjE0LjkwOCAzMS41MTQzIDI0MC4xNSAzMi42NjkzIDI2NS4wNzcgMzQuOTE2M0MyNjguMzQxIDM1LjIwNjcgMjcxLjQwNyAzNi42MTExIDI3My43NTggMzguODkzOUMyNzYuMTEgNDEuMTc2NyAyNzcuNjA1IDQ0LjE5ODkgMjc3Ljk5MiA0Ny40NTMzQzI4MC41OTYgNjkuMjUxMyAyODIuMzYgOTEuMzAxMyAyODMuMjQyIDExMy42MDNMMjQ3Ljc3MyA3OC4xMTMzQzI0NC44MDEgNzUuMjQ1NyAyNDAuODIyIDczLjY2IDIzNi42OTIgNzMuNjk3OEMyMzIuNTYzIDczLjczNTYgMjI4LjYxMyA3NS4zOTM5IDIyNS42OTQgNzguMzE1NUMyMjIuNzc1IDgxLjIzNyAyMjEuMTIxIDg1LjE4ODEgMjIxLjA4NyA4OS4zMTc4QzIyMS4wNTMgOTMuNDQ3NCAyMjIuNjQyIDk3LjQyNTEgMjI1LjUxMyAxMDAuMzk0TDI4OC40OTIgMTYzLjM5NEMyOTEuNDQ1IDE2Ni4zNDQgMjk1LjQ0OCAxNjggMjk5LjYyMiAxNjhDMzAzLjc5NiAxNjggMzA3Ljc5OSAxNjYuMzQ0IDMxMC43NTIgMTYzLjM5NEwzNzMuNzczIDEwMC4zOTRDMzc1LjMyIDk4Ljk1MjQgMzc2LjU2MSA5Ny4yMTM1IDM3Ny40MjIgOTUuMjgxNkMzNzguMjgzIDkzLjM0OTYgMzc4Ljc0NiA5MS4yNjQgMzc4Ljc4MyA4OS4xNDkyQzM3OC44MjEgODcuMDM0NSAzNzguNDMyIDg0LjkzMzkgMzc3LjYzOSA4Mi45NzI3QzM3Ni44NDcgODEuMDExNiAzNzUuNjY4IDc5LjIzMDEgMzc0LjE3MyA3Ny43MzQ1QzM3Mi42NzcgNzYuMjM4OSAzNzAuODk2IDc1LjA1OTggMzY4LjkzNCA3NC4yNjc3QzM2Ni45NzMgNzMuNDc1NiAzNjQuODczIDczLjA4NjUgMzYyLjc1OCA3My4xMjM5QzM2MC42NDMgNzMuMTYxMiAzNTguNTU4IDczLjYyNCAzNTYuNjI2IDc0LjQ4NDlDMzU0LjY5NCA3NS4zNDU3IDM1Mi45NTUgNzYuNTg2OSAzNTEuNTEzIDc4LjEzNDNMMzE0LjgwNSAxMTQuODIxQzMxMy45MzIgOTEuMDUzMyAzMTIuMDgzIDY3LjMzMTMgMzA5LjI2MSA0My43MTUzQzMwOC4wMTcgMzMuMjkwNyAzMDMuMjI4IDIzLjYxMDMgMjk1LjY5NiAxNi4yOTY1QzI4OC4xNjQgOC45ODI2NSAyNzguMzQ4IDQuNDc5NzQgMjY3Ljg5MSAzLjU0MjM2QzIxNS42NTggLTEuMTgwNzkgMTYzLjEwNiAtMS4xODA3OSAxMTAuODc0IDMuNTQyMzZDMTAwLjQyMSA0LjQ4NDMxIDkwLjYwOTEgOC45ODkyNSA4My4wODE2IDE2LjMwMjdDNzUuNTU0IDIzLjYxNjEgNzAuNzY3OSAzMy4yOTM5IDY5LjUyNDkgNDMuNzE1M0M2OC4xODM1IDU0Ljk2MjIgNjcuMDYzMiA2Ni4yMzQ0IDY2LjE2NDkgNzcuNTI1M0M2NS45NjQ0IDc5LjYwNTEgNjYuMTc5OCA4MS43MDQxIDY2Ljc5ODUgODMuNjk5OUM2Ny40MTcyIDg1LjY5NTcgNjguNDI2OSA4Ny41NDg1IDY5Ljc2ODcgODkuMTUwMkM3MS4xMTA1IDkwLjc1MiA3Mi43NTc2IDkyLjA3MDcgNzQuNjE0MSA5My4wMjk3Qzc2LjQ3MDUgOTMuOTg4NiA3OC40OTkzIDk0LjU2ODYgODAuNTgyMSA5NC43MzU3QzgyLjY2NDkgOTQuOTAyOSA4NC43NjAxIDk0LjY1NCA4Ni43NDU4IDk0LjAwMzRDODguNzMxNSA5My4zNTI5IDkwLjU2NzggOTIuMzEzOCA5Mi4xNDc5IDkwLjk0NjVDOTMuNzI4IDg5LjU3OTMgOTUuMDIwMyA4Ny45MTEzIDk1Ljk0OTQgODYuMDM5OEM5Ni44Nzg2IDg0LjE2ODIgOTcuNDI2IDgyLjEzMDUgOTcuNTU5OSA4MC4wNDUzQzk4LjQyMDkgNjkuMTI1MyA5OS41MTI5IDU4LjI0NzMgMTAwLjc5NCA0Ny40NTMzQzEwMS4xODEgNDQuMTk4OSAxMDIuNjc2IDQxLjE3NjcgMTA1LjAyNyAzOC44OTM5QzEwNy4zNzkgMzYuNjExMSAxMTAuNDQ0IDM1LjIwNjcgMTEzLjcwOSAzNC45MTYzQzEzOC44NzMgMzIuNjQ1IDE2NC4xMjcgMzEuNTA5OCAxODkuMzkzIDMxLjUxNDNaTTkwLjI5MzkgMTMwLjYzNEM4Ny4zNDA3IDEyNy42ODUgODMuMzM3NiAxMjYuMDI4IDc5LjE2MzkgMTI2LjAyOEM3NC45OTAxIDEyNi4wMjggNzAuOTg3IDEyNy42ODUgNjguMDMzOSAxMzAuNjM0TDUuMDEyODggMTkzLjYzNEMzLjQ2NTQ1IDE5NS4wNzYgMi4yMjQzIDE5Ni44MTUgMS4zNjM0NyAxOTguNzQ3QzAuNTAyNjQyIDIwMC42NzkgMC4wMzk3NjM2IDIwMi43NjQgMC4wMDI0NTExNCAyMDQuODc5Qy0wLjAzNDg2MTMgMjA2Ljk5NCAwLjM1NDE1NyAyMDkuMDk1IDEuMTQ2MyAyMTEuMDU2QzEuOTM4NDQgMjEzLjAxNyAzLjExNzQ3IDIxNC43OTggNC42MTMwNyAyMTYuMjk0QzYuMTA4NjYgMjE3Ljc4OSA3Ljg5MDE3IDIxOC45NjkgOS44NTEzMyAyMTkuNzYxQzExLjgxMjUgMjIwLjU1MyAxMy45MTMxIDIyMC45NDIgMTYuMDI3OCAyMjAuOTA1QzE4LjE0MjYgMjIwLjg2NyAyMC4yMjgyIDIyMC40MDQgMjIuMTYwMiAyMTkuNTQ0QzI0LjA5MjIgMjE4LjY4MyAyNS44MzEgMjE3LjQ0MiAyNy4yNzI5IDIxNS44OTRMNjMuOTgwOSAxNzkuMjA3QzY0Ljg2MjkgMjAzLjE2OCA2Ni43MTA5IDIyNi44NzcgNjkuNTI0OSAyNTAuMzEzQzcwLjc2ODggMjYwLjczOCA3NS41NTc5IDI3MC40MTggODMuMDg5NyAyNzcuNzMyQzkwLjYyMTUgMjg1LjA0NiAxMDAuNDM4IDI4OS41NDkgMTEwLjg5NSAyOTAuNDg2QzE2My4xMjcgMjk1LjIwNyAyMTUuNjc5IDI5NS4yMDcgMjY3LjkxMiAyOTAuNDg2QzI3OC4zNjUgMjg5LjU0NCAyODguMTc3IDI4NS4wMzkgMjk1LjcwNCAyNzcuNzI2QzMwMy4yMzIgMjcwLjQxMiAzMDguMDE4IDI2MC43MzQgMzA5LjI2MSAyNTAuMzEzQzMxMC42MDUgMjM5LjA5OSAzMTEuNzE4IDIyNy44MjIgMzEyLjYyMSAyMTYuNTAzQzMxMi44MjEgMjE0LjQyMyAzMTIuNjA2IDIxMi4zMjQgMzExLjk4NyAyMTAuMzI4QzMxMS4zNjggMjA4LjMzMyAzMTAuMzU5IDIwNi40OCAzMDkuMDE3IDIwNC44NzhDMzA3LjY3NSAyMDMuMjc2IDMwNi4wMjggMjAxLjk1OCAzMDQuMTcyIDIwMC45OTlDMzAyLjMxNSAyMDAuMDQgMzAwLjI4NiAxOTkuNDYgMjk4LjIwNCAxOTkuMjkzQzI5Ni4xMjEgMTk5LjEyNSAyOTQuMDI2IDE5OS4zNzQgMjkyLjA0IDIwMC4wMjVDMjkwLjA1NCAyMDAuNjc1IDI4OC4yMTggMjAxLjcxNSAyODYuNjM4IDIwMy4wODJDMjg1LjA1OCAyMDQuNDQ5IDI4My43NjUgMjA2LjExNyAyODIuODM2IDIwNy45ODlDMjgxLjkwNyAyMDkuODYgMjgxLjM2IDIxMS44OTggMjgxLjIyNiAyMTMuOTgzQzI4MC4zNjUgMjI0LjkwMyAyNzkuMjczIDIzNS43NiAyNzcuOTkyIDI0Ni41NzVDMjc3LjYwNSAyNDkuODMgMjc2LjExIDI1Mi44NTIgMjczLjc1OCAyNTUuMTM1QzI3MS40MDcgMjU3LjQxNyAyNjguMzQxIDI1OC44MjIgMjY1LjA3NyAyNTkuMTEyQzIxNC43MjQgMjYzLjY2NiAxNjQuMDYyIDI2My42NjYgMTEzLjcwOSAyNTkuMTEyQzExMC40NDQgMjU4LjgyMiAxMDcuMzc5IDI1Ny40MTcgMTA1LjAyNyAyNTUuMTM1QzEwMi42NzYgMjUyLjg1MiAxMDEuMTgxIDI0OS44MyAxMDAuNzk0IDI0Ni41NzVDOTguMTY4NiAyMjQuNjAzIDk2LjQxNzIgMjAyLjUzNiA5NS41NDM5IDE4MC40MjVMMTMxLjAxMyAyMTUuOTE1QzEzMy45ODUgMjE4Ljc4MyAxMzcuOTY0IDIyMC4zNjggMTQyLjA5NCAyMjAuMzMxQzE0Ni4yMjMgMjIwLjI5MyAxNTAuMTczIDIxOC42MzQgMTUzLjA5MiAyMTUuNzEzQzE1Ni4wMSAyMTIuNzkxIDE1Ny42NjUgMjA4Ljg0IDE1Ny42OTkgMjA0LjcxMUMxNTcuNzMzIDIwMC41ODEgMTU2LjE0MyAxOTYuNjAzIDE1My4yNzMgMTkzLjYzNEw5MC4yOTM5IDEzMC42MzRaIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPgo=&logoColor=white)](https://airatelimit.com/sponsor/dantelex)


## License

[FSL-1.1-MIT](LICENSE)