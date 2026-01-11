# Sponsorship API

Issue API keys to users and manage their budgets programmatically. Perfect for:
- Giving each user their own API key
- Managing USD-based spending limits per user
- Tracking usage per user
- Pausing/revoking access instantly

## Getting Started

### 1. Generate Your Organization API Key

1. Go to **Dashboard → Sponsorships → Sponsor** tab
2. Look for **"Programmatic API Access"** section
3. Click **"Generate API Key"**
4. **Save the key** (`org_sk_xxx`) - it's only shown once!

### 2. Register a Provider Key

Before creating sponsorships, register your AI provider API key:

```bash
curl -X POST https://api.airatelimit.com/api/v1/sponsorships/keys \
  -H "Authorization: Bearer org_sk_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production OpenAI",
    "provider": "openai",
    "apiKey": "sk-..."
  }'
```

**Response:**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Production OpenAI",
    "provider": "openai",
    "keyHint": "...ab12",
    "createdAt": "2025-01-11T10:00:00Z"
  }
}
```

### 3. Create a Sponsorship (Issue Token)

```bash
curl -X POST https://api.airatelimit.com/api/v1/sponsorships \
  -H "Authorization: Bearer org_sk_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "sponsorKeyId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "User 12345",
    "spendCapUsd": 10.00,
    "allowedModels": ["gpt-4o", "gpt-4o-mini"],
    "maxRequestsPerDay": 100
  }'
```

**Response:**
```json
{
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "User 12345",
    "status": "active",
    "spendCapUsd": 10.00,
    "spentUsd": 0,
    "remainingBudgetUsd": 10.00,
    "allowedModels": ["gpt-4o", "gpt-4o-mini"],
    "maxRequestsPerDay": 100,
    "provider": "openai",
    "createdAt": "2025-01-11T10:00:00Z"
  },
  "token": "spt_live_abc123xyz789...",
  "tokenWarning": "Save this token! It will only be shown once."
}
```

**⚠️ Important:** Save the `token` value! It's only shown once.

### 4. User Makes Requests

Your user can now make requests using their token:

```bash
curl https://api.airatelimit.com/v1/chat/completions \
  -H "Authorization: Bearer spt_live_abc123xyz789..." \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

No `x-project-key` or `x-identity` headers needed - the token handles everything.

---

## API Reference

**Base URL:** `https://api.airatelimit.com/api/v1/sponsorships`

**Authentication:** `Authorization: Bearer org_sk_xxx`

---

### Provider Keys

#### List Keys
```http
GET /keys
```

#### Create Key
```http
POST /keys
Content-Type: application/json

{
  "name": "My OpenAI Key",
  "provider": "openai",        // openai | anthropic | google | xai | openrouter
  "apiKey": "sk-..."
}
```

#### Delete Key
```http
DELETE /keys/:id
```

---

### Sponsorships

#### List Sponsorships
```http
GET /
GET /?status=active
```

#### Create Sponsorship
```http
POST /
Content-Type: application/json

{
  "sponsorKeyId": "uuid",           // Required: which provider key to use
  "name": "User 12345",             // Required: identifier for this sponsorship
  "description": "Pro user",        // Optional
  
  // Budget (at least one recommended)
  "spendCapUsd": 10.00,             // USD spending limit
  "spendCapTokens": 100000,         // Token limit (alternative)
  
  // Billing period
  "billingPeriod": "one_time",      // one_time | monthly
  
  // Usage constraints (all optional)
  "allowedModels": ["gpt-4o"],      // Restrict to specific models
  "maxTokensPerRequest": 4000,      // Max tokens per request
  "maxRequestsPerMinute": 10,       // Rate limit
  "maxRequestsPerDay": 100,         // Daily limit
  
  // Expiration
  "expiresAt": "2025-12-31T23:59:59Z"  // Optional expiry date
}
```

**Response includes `token` - save it!**

#### Get Sponsorship
```http
GET /:id
```

#### Update Sponsorship
```http
PATCH /:id
Content-Type: application/json

{
  "spendCapUsd": 25.00,              // Increase budget
  "maxRequestsPerDay": 200           // Adjust limits
}
```

#### Pause Sponsorship
Temporarily disable the token:
```http
POST /:id/pause
```

#### Resume Sponsorship
Re-enable a paused token:
```http
POST /:id/resume
```

#### Revoke Sponsorship
Permanently disable (cannot be undone):
```http
POST /:id/revoke
Content-Type: application/json

{
  "reason": "Account closed"  // Optional
}
```

#### Delete Sponsorship
Only works if already revoked:
```http
DELETE /:id
```

#### Regenerate Token
Get a new token (revokes old one):
```http
POST /:id/regenerate-token
```

**Response includes new `token` - save it!**

---

### Usage

#### Get Usage Summary
```http
GET /:id/usage
```

**Response:**
```json
{
  "data": {
    "totalRequests": 150,
    "totalTokens": 45000,
    "totalCostUsd": 2.34,
    "remainingBudgetUsd": 7.66
  }
}
```

#### Get Usage History
```http
GET /:id/usage/history
GET /:id/usage/history?days=7
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "model": "gpt-4o",
      "provider": "openai",
      "inputTokens": 100,
      "outputTokens": 250,
      "totalTokens": 350,
      "costUsd": 0.015,
      "timestamp": "2025-01-11T10:30:00Z"
    }
  ]
}
```

---

## Common Use Cases

### After User Purchase (Stripe Webhook)

```javascript
// In your Stripe webhook handler
app.post('/webhook/stripe', async (req, res) => {
  const event = req.body;
  
  if (event.type === 'checkout.session.completed') {
    const userId = event.data.object.client_reference_id;
    const amount = event.data.object.amount_total / 100; // cents to dollars
    
    // Create sponsorship for user
    const response = await fetch('https://api.airatelimit.com/api/v1/sponsorships', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.ORG_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sponsorKeyId: process.env.SPONSOR_KEY_ID,
        name: `User ${userId}`,
        spendCapUsd: amount,
      }),
    });
    
    const { token } = await response.json();
    
    // Save token for user
    await db.users.update(userId, { apiToken: token });
  }
});
```

### Top Up User's Budget

```bash
curl -X PATCH https://api.airatelimit.com/api/v1/sponsorships/{id} \
  -H "Authorization: Bearer org_sk_xxx" \
  -d '{"spendCapUsd": 50.00}'
```

### Disable User Access

```bash
curl -X POST https://api.airatelimit.com/api/v1/sponsorships/{id}/revoke \
  -H "Authorization: Bearer org_sk_xxx" \
  -d '{"reason": "Subscription cancelled"}'
```

### Check User's Remaining Budget

```bash
curl https://api.airatelimit.com/api/v1/sponsorships/{id}/usage \
  -H "Authorization: Bearer org_sk_xxx"
```

---

## Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

Common errors:
- `401 Unauthorized` - Invalid or missing API key
- `403 Forbidden` - Feature not enabled or access denied
- `404 Not Found` - Sponsorship/key not found
- `400 Bad Request` - Invalid request body

---

## Migration

Before using this feature, run the migration:

```bash
./scripts/run-migration.sh 025-organization-api-key.sql
```
