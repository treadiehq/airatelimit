# Firebase Integration Guide

Use AI Ratelimit with Firebase Auth to track usage per user.

## Quick Start

### Use Firebase UID as Identity

```typescript
import { createClient } from '@ai-ratelimit/sdk';
import { getAuth } from 'firebase/auth';

const client = createClient({
  baseUrl: 'https://your-service.railway.app/api',
  projectKey: 'pk_your_key_here',
});

const user = getAuth().currentUser;

const result = await client.chat({
  identity: user.uid,  // Use Firebase UID
  tier: 'free',
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

### Custom Claims for Tiers

Store subscription tiers in Firebase custom claims:

```typescript
// Server-side: Set custom claims
import { getAuth } from 'firebase-admin/auth';

await getAuth().setCustomUserClaims(uid, { tier: 'pro' });

// Client-side: Read custom claims
const user = getAuth().currentUser;
const idTokenResult = await user.getIdTokenResult();
const tier = idTokenResult.claims.tier || 'free';

const result = await client.chat({
  identity: user.uid,
  tier: tier,  // From custom claims
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

### Anonymous Users

```typescript
import { signInAnonymously } from 'firebase/auth';

const userCredential = await signInAnonymously(getAuth());

const result = await client.chat({
  identity: userCredential.user.uid,  // Anonymous UID
  tier: 'free',
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

## React Example

```tsx
import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { createClient, LimitExceededError } from '@ai-ratelimit/sdk';

const client = createClient({
  baseUrl: 'https://your-service.railway.app/api',
  projectKey: 'pk_your_key_here',
});

function ChatComponent() {
  const [user, setUser] = useState(null);
  const [tier, setTier] = useState('free');

  useEffect(() => {
    const auth = getAuth();
    return auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const idTokenResult = await firebaseUser.getIdTokenResult();
        setTier(idTokenResult.claims.tier || 'free');
      }
    });
  }, []);

  const sendMessage = async (content) => {
    if (!user) return;

    try {
      const result = await client.chat({
        identity: user.uid,
        tier,
        model: 'gpt-4o',
        messages: [{ role: 'user', content }],
      });
      return result.raw.choices[0].message.content;
    } catch (error) {
      if (error instanceof LimitExceededError) {
        alert(error.response.message);
        if (error.response.deepLink) {
          window.location.href = error.response.deepLink;
        }
      }
    }
  };

  return <div>{/* Your chat UI */}</div>;
}
```

## Flutter Example

```dart
import 'package:firebase_auth/firebase_auth.dart';
import 'package:ai_ratelimit_sdk/ai_ratelimit_sdk.dart';

final client = AIRateLimitClient(
  baseUrl: 'https://your-service.railway.app/api',
  projectKey: 'pk_your_key_here',
);

final user = FirebaseAuth.instance.currentUser;
final idTokenResult = await user!.getIdTokenResult();
final tier = idTokenResult.claims?['tier'] ?? 'free';

final result = await client.chat(
  identity: user.uid,
  tier: tier,
  model: 'gpt-4o',
  messages: [ChatMessage.user('Hello!')],
);
```

See [Flutter SDK docs](../sdk/flutter/README.md) for more details.

## Firebase Cloud Functions

For secure server-side rate limiting:

```typescript
import { onRequest } from 'firebase-functions/v2/https';
import { createClient } from '@ai-ratelimit/sdk';

const client = createClient({
  baseUrl: process.env.RATELIMIT_BASE_URL,
  projectKey: process.env.RATELIMIT_PROJECT_KEY,
});

export const chatWithAI = onRequest(async (req, res) => {
  const { userId, messages, tier } = req.body;

  try {
    const result = await client.chat({
      identity: userId,
      tier: tier || 'free',
      model: 'gpt-4o',
      messages,
    });
    res.json({ response: result.raw });
  } catch (error) {
    if (error.name === 'LimitExceededError') {
      res.status(429).json({
        error: 'limit_exceeded',
        message: error.response.message,
      });
    } else {
      res.status(500).json({ error: 'Internal error' });
    }
  }
});
```

Set environment variables:

```bash
firebase functions:config:set \
  ratelimit.base_url="https://your-service.railway.app/api" \
  ratelimit.project_key="pk_your_key"
```

## Architecture Options

### Client-Side (Simplest)

```
[App] → [AI Ratelimit] → [OpenAI/Anthropic/etc]
  ↓
[Firebase Auth]
```

**Pros**: Simple, no server needed  
**Cons**: Project key visible in client

### Server-Side (Secure)

```
[App] → [Cloud Function] → [AI Ratelimit] → [OpenAI/etc]
  ↓
[Firebase Auth]
```

**Pros**: Keys hidden, full control  
**Cons**: More complex, cold starts

## Security

### Verify Firebase Tokens

In Cloud Functions, verify the user's identity:

```typescript
import { getAuth } from 'firebase-admin/auth';

export const chatWithAI = onRequest(async (req, res) => {
  const token = req.headers.authorization;
  
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    const userId = decodedToken.uid;
    
    const result = await client.chat({
      identity: userId,  // Verified!
      tier: decodedToken.tier || 'free',
      model: 'gpt-4o',
      messages: req.body.messages,
    });
    
    res.json(result.raw);
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});
```

### Why Use Firebase UID

- ✅ Stable (never changes)
- ✅ Unique per user
- ✅ Works across devices
- ✅ Works for anonymous users

## Upgrade Flow

Handle limit exceeded and show upgrade:

```typescript
try {
  await client.chat({ ... });
} catch (error) {
  if (error instanceof LimitExceededError) {
    // Show upgrade dialog
    showUpgradeDialog({
      message: error.response.message,
      usage: error.response.usage,
      limit: error.response.limit,
    });
  }
}

async function onUpgradeComplete(userId, tier) {
  // Update custom claims
  await getAuth().setCustomUserClaims(userId, { tier });
  // Future requests use new tier
}
```

## Guest to Logged In

Preserve usage when user signs up:

```typescript
// Anonymous user
const anonUser = await signInAnonymously(auth);

// Use AI with anonymous UID
await client.chat({
  identity: anonUser.user.uid,
  tier: 'free',
  ...
});

// User signs up - link accounts
const credential = EmailAuthProvider.credential(email, password);
await linkWithCredential(anonUser.user, credential);

// Same UID, usage preserved!
```

## Multi-Device Sync

Firebase Auth syncs across devices automatically. Usage limits apply everywhere:

```typescript
// Same user.uid on phone, tablet, web
const result = await client.chat({
  identity: user.uid,  // Works everywhere
  tier: 'pro',
  model: 'gpt-4o',
  messages,
});
```

## FAQ

**Can I use Firestore instead of PostgreSQL?**

AI Ratelimit uses PostgreSQL for usage tracking. You can use Firestore for user data, but rate limiting stays in PostgreSQL.

**How do I sync Stripe/RevenueCat subscriptions?**

Use webhooks to update Firebase custom claims:

```typescript
export const stripeWebhook = onRequest(async (req, res) => {
  if (req.body.type === 'customer.subscription.updated') {
    const userId = req.body.data.object.metadata.firebaseUserId;
    const tier = req.body.data.object.items.data[0].price.metadata.tier;
    
    await getAuth().setCustomUserClaims(userId, { tier });
  }
  res.json({ received: true });
});
```

**Can I use Firebase Emulators?**

Yes! Point to localhost:

```typescript
const client = createClient({
  baseUrl: 'http://localhost:3000/api',
  projectKey: 'pk_dev_key',
});
```

## Resources

- [Main Documentation](../README.md)
- [JavaScript SDK](../sdk/js/README.md)
- [Flutter SDK](../sdk/flutter/README.md)
