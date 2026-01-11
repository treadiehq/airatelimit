# Programmatic User Management API

Issue unique keys (identities) to users and manage their balances/limits server-side.

## Overview

Each project has a **secret key** (`sk_xxx`) that enables server-side API access. Use this to:
- Create identities (users) programmatically
- Set per-user token/request limits
- Gift credits or reset usage
- Enable/disable users instantly

## Authentication

All endpoints require the project secret key:

```bash
Authorization: Bearer sk_xxx
```

Find your secret key in Dashboard → Project → Settings → API Keys.

## Base URL

```
https://your-api.com/api/projects/:projectKey/identities
```

Replace `:projectKey` with your project key (e.g., `pk_abc123`).

## Endpoints

### List All Users

```http
GET /api/projects/:projectKey/identities?limit=100&offset=0
```

**Response:**
```json
{
  "items": [
    {
      "identity": "user-123",
      "tokenLimit": 10000,
      "requestLimit": 100,
      "giftedTokens": 5000,
      "giftedRequests": 0,
      "unlimitedUntil": null,
      "enabled": true,
      "metadata": { "email": "user@example.com" },
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 100,
  "offset": 0
}
```

### Get User

```http
GET /api/projects/:projectKey/identities/:identity
```

**Response:**
```json
{
  "identity": "user-123",
  "tokenLimit": 10000,
  "requestLimit": 100,
  "giftedTokens": 5000,
  "giftedRequests": 0,
  "unlimitedUntil": null,
  "customResponse": null,
  "metadata": { "email": "user@example.com" },
  "enabled": true,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

### Create User

```http
POST /api/projects/:projectKey/identities
```

**Request:**
```json
{
  "identity": "user-123",
  "tokenLimit": 10000,
  "requestLimit": 100,
  "metadata": { "email": "user@example.com", "plan": "free" },
  "enabled": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `identity` | string | **Required.** Unique identifier for this user |
| `tokenLimit` | number | Max tokens per period (null = project default) |
| `requestLimit` | number | Max requests per period (null = project default) |
| `customResponse` | object | Custom response when limit is hit |
| `metadata` | object | Arbitrary data for your reference |
| `enabled` | boolean | Whether user can make requests (default: true) |

### Update User

```http
PUT /api/projects/:projectKey/identities/:identity
```

**Request:**
```json
{
  "tokenLimit": 50000,
  "requestLimit": 500
}
```

### Delete User

Reverts to project defaults (doesn't block the user).

```http
DELETE /api/projects/:projectKey/identities/:identity
```

### Bulk Create/Update

```http
POST /api/projects/:projectKey/identities/bulk
```

**Request:**
```json
{
  "items": [
    { "identity": "user-1", "tokenLimit": 10000 },
    { "identity": "user-2", "tokenLimit": 20000 },
    { "identity": "user-3", "tokenLimit": 5000 }
  ]
}
```

**Response:**
```json
{
  "items": [...],
  "count": 3
}
```

---

## Credit Management

### Gift Tokens/Requests

Add bonus credits that are consumed before hitting limits.

```http
POST /api/projects/:projectKey/identities/:identity/gift
```

**Request:**
```json
{
  "tokens": 5000,
  "requests": 10,
  "reason": "Purchased credits"
}
```

**Response:**
```json
{
  "identity": "user-123",
  "giftedTokens": 5000,
  "giftedRequests": 10,
  "message": "Gifted 5000 tokens and 10 requests"
}
```

> **Note:** Gifted credits are additive. Calling this endpoint twice with 5000 tokens results in 10000 gifted tokens.

### Get Credit Balance

```http
GET /api/projects/:projectKey/identities/:identity/credits
```

**Response:**
```json
{
  "identity": "user-123",
  "giftedTokens": 5000,
  "giftedRequests": 10,
  "unlimitedUntil": null,
  "isCurrentlyUnlimited": false
}
```

### Reset Usage

Clear tokens/requests used in the current period. Useful after a payment.

```http
POST /api/projects/:projectKey/identities/:identity/reset
```

**Request:**
```json
{
  "resetTokens": true,
  "resetRequests": true,
  "reason": "Stripe payment received"
}
```

**Response:**
```json
{
  "identity": "user-123",
  "tokensReset": 8500,
  "requestsReset": 45,
  "message": "Reset 8500 tokens and 45 requests for user-123",
  "period": "daily"
}
```

---

## Promotional Access

### Set Unlimited Access

Grant unlimited access until a specific date.

```http
POST /api/projects/:projectKey/identities/:identity/promo
```

**Request:**
```json
{
  "unlimitedUntil": "2025-02-01T00:00:00.000Z",
  "reason": "14-day trial"
}
```

**Response:**
```json
{
  "identity": "user-123",
  "unlimitedUntil": "2025-02-01T00:00:00.000Z",
  "message": "Unlimited access granted until 2025-02-01T00:00:00.000Z"
}
```

### Remove Promotional Access

```http
POST /api/projects/:projectKey/identities/:identity/promo
```

**Request:**
```json
{
  "unlimitedUntil": null
}
```

---

## Quick Reference

| Action | Method | Endpoint |
|--------|--------|----------|
| List users | GET | `/identities` |
| Get user | GET | `/identities/:identity` |
| Create user | POST | `/identities` |
| Update user | PUT | `/identities/:identity` |
| Delete user | DELETE | `/identities/:identity` |
| Bulk upsert | POST | `/identities/bulk` |
| Gift credits | POST | `/identities/:identity/gift` |
| Get credits | GET | `/identities/:identity/credits` |
| Reset usage | POST | `/identities/:identity/reset` |
| Set promo | POST | `/identities/:identity/promo` |

---

## Use Cases

### 1. Issue Key Per User on Signup

```javascript
// Your backend - when user signs up
const response = await fetch(
  `https://api.example.com/api/projects/${projectKey}/identities`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      identity: user.id,  // Use your user ID as the identity
      tokenLimit: 10000,  // Free tier limit
      metadata: { email: user.email, plan: 'free' }
    }),
  }
);
```

### 2. Upgrade User After Payment

```javascript
// Stripe webhook handler
async function handlePaymentSuccess(event) {
  const userId = event.data.object.metadata.user_id;
  
  // Increase their limit
  await fetch(
    `https://api.example.com/api/projects/${projectKey}/identities/${userId}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tokenLimit: 100000,  // Pro tier limit
        metadata: { plan: 'pro' }
      }),
    }
  );
  
  // Reset their usage so they start fresh
  await fetch(
    `https://api.example.com/api/projects/${projectKey}/identities/${userId}/reset`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${secretKey}` },
      body: JSON.stringify({ resetTokens: true, resetRequests: true }),
    }
  );
}
```

### 3. Credit-Based System (Prepaid)

```javascript
// User purchases 50,000 tokens
async function handleCreditPurchase(userId, tokensPurchased) {
  await fetch(
    `https://api.example.com/api/projects/${projectKey}/identities/${userId}/gift`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tokens: tokensPurchased,
        reason: `Purchased ${tokensPurchased} credits`
      }),
    }
  );
}
```

### 4. Free Trial Period

```javascript
// Grant 14-day unlimited trial
async function startTrial(userId) {
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);
  
  await fetch(
    `https://api.example.com/api/projects/${projectKey}/identities/${userId}/promo`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        unlimitedUntil: trialEnd.toISOString(),
        reason: '14-day free trial'
      }),
    }
  );
}
```

### 5. Disable Abusive User

```javascript
// Instantly block a user
await fetch(
  `https://api.example.com/api/projects/${projectKey}/identities/${userId}`,
  {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      enabled: false,
      customResponse: {
        error: 'account_suspended',
        message: 'Your account has been suspended. Contact support.'
      }
    }),
  }
);
```

---

## How Limits Work

### Priority Order

When a request comes in, limits are checked in this order:

1. **Identity limit** (per-user override) — highest priority
2. **Tier limit** (if tier is specified in request)
3. **Model limit** (if model-specific limits are set)
4. **Project limit** (default fallback)

### Gifted Credits

Gifted tokens/requests act as bonus credits:
- They are consumed first before counting toward limits
- They persist across billing periods
- They stack (calling gift twice adds to the total)

### Promotional Override

When `unlimitedUntil` is set and in the future:
- All limit checks are bypassed
- Usage is still tracked (for analytics)
- Automatically expires at the specified date

---

## Error Responses

| Status | Meaning |
|--------|---------|
| 401 | Invalid or missing secret key |
| 403 | Secret key doesn't match project |
| 404 | Project or identity not found |
| 400 | Invalid request body |

**Example error:**
```json
{
  "statusCode": 404,
  "message": "No limits found for identity: user-123"
}
```

---

## SDK Examples

### Node.js

```javascript
class AIRatelimitClient {
  constructor(projectKey, secretKey, baseUrl = 'https://api.example.com') {
    this.projectKey = projectKey;
    this.secretKey = secretKey;
    this.baseUrl = `${baseUrl}/api/projects/${projectKey}/identities`;
  }

  async createUser(identity, options = {}) {
    return this.request('POST', '', { identity, ...options });
  }

  async updateUser(identity, options) {
    return this.request('PUT', `/${identity}`, options);
  }

  async giftCredits(identity, tokens, requests = 0) {
    return this.request('POST', `/${identity}/gift`, { tokens, requests });
  }

  async resetUsage(identity) {
    return this.request('POST', `/${identity}/reset`, {});
  }

  async request(method, path, body) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  }
}

// Usage
const client = new AIRatelimitClient('pk_xxx', 'sk_xxx');
await client.createUser('user-123', { tokenLimit: 10000 });
await client.giftCredits('user-123', 5000);
```

### Python

```python
import requests

class AIRatelimitClient:
    def __init__(self, project_key: str, secret_key: str, base_url: str = "https://api.example.com"):
        self.base_url = f"{base_url}/api/projects/{project_key}/identities"
        self.headers = {
            "Authorization": f"Bearer {secret_key}",
            "Content-Type": "application/json"
        }
    
    def create_user(self, identity: str, token_limit: int = None, request_limit: int = None):
        return requests.post(self.base_url, headers=self.headers, json={
            "identity": identity,
            "tokenLimit": token_limit,
            "requestLimit": request_limit
        }).json()
    
    def gift_credits(self, identity: str, tokens: int = 0, requests: int = 0):
        return requests.post(f"{self.base_url}/{identity}/gift", headers=self.headers, json={
            "tokens": tokens,
            "requests": requests
        }).json()
    
    def reset_usage(self, identity: str):
        return requests.post(f"{self.base_url}/{identity}/reset", headers=self.headers, json={}).json()

# Usage
client = AIRatelimitClient("pk_xxx", "sk_xxx")
client.create_user("user-123", token_limit=10000)
client.gift_credits("user-123", tokens=5000)
```
