# Firebase Integration Guide

Use AI Ratelimit with Firebase Auth to track usage per user.

## Quick Start

### Use Firebase UID as Identity

```typescript
import OpenAI from 'openai';
import { getAuth } from 'firebase/auth';

const user = getAuth().currentUser;

const openai = new OpenAI({
  apiKey: 'sk-your-openai-key',
  baseURL: 'https://your-proxy.com/v1',
  defaultHeaders: {
    'x-project-key': 'pk_xxx',
    'x-identity': user.uid,  // Use Firebase UID
    'x-tier': 'free',
  },
});

const response = await openai.chat.completions.create({
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

const openai = new OpenAI({
  apiKey: 'sk-your-key',
  baseURL: 'https://your-proxy.com/v1',
  defaultHeaders: {
    'x-project-key': 'pk_xxx',
    'x-identity': user.uid,
    'x-tier': tier,  // From custom claims
  },
});
```

### Anonymous Users

```typescript
import { signInAnonymously } from 'firebase/auth';

const userCredential = await signInAnonymously(getAuth());

const openai = new OpenAI({
  apiKey: 'sk-your-key',
  baseURL: 'https://your-proxy.com/v1',
  defaultHeaders: {
    'x-project-key': 'pk_xxx',
    'x-identity': userCredential.user.uid,  // Anonymous UID
    'x-tier': 'free',
  },
});
```

## React Example

```tsx
import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import OpenAI from 'openai';

function ChatComponent() {
  const [user, setUser] = useState(null);
  const [tier, setTier] = useState('free');
  const [openai, setOpenai] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    return auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const idTokenResult = await firebaseUser.getIdTokenResult();
        setTier(idTokenResult.claims.tier || 'free');
        
        setOpenai(new OpenAI({
          apiKey: 'sk-your-key',
          baseURL: 'https://your-proxy.com/v1',
          defaultHeaders: {
            'x-project-key': 'pk_xxx',
            'x-identity': firebaseUser.uid,
            'x-tier': idTokenResult.claims.tier || 'free',
          },
          dangerouslyAllowBrowser: true,
        }));
      }
    });
  }, []);

  const sendMessage = async (content) => {
    if (!openai) return;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content }],
      });
      return response.choices[0].message.content;
    } catch (error) {
      if (error.status === 429) {
        alert('Rate limit exceeded! Please upgrade.');
      }
    }
  };

  return <div>{/* Your chat UI */}</div>;
}
```

## Flutter Example

```dart
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

Future<String> chat(String message) async {
  final user = FirebaseAuth.instance.currentUser;
  final idTokenResult = await user!.getIdTokenResult();
  final tier = idTokenResult.claims?['tier'] ?? 'free';

  final response = await http.post(
    Uri.parse('https://your-proxy.com/v1/chat/completions'),
    headers: {
      'Authorization': 'Bearer sk-your-openai-key',
      'Content-Type': 'application/json',
      'x-project-key': 'pk_xxx',
      'x-identity': user.uid,
      'x-tier': tier,
    },
    body: jsonEncode({
      'model': 'gpt-4o',
      'messages': [{'role': 'user', 'content': message}],
    }),
  );

  if (response.statusCode == 429) {
    throw Exception('Rate limit exceeded');
  }

  final data = jsonDecode(response.body);
  return data['choices'][0]['message']['content'];
}
```

## Firebase Cloud Functions

For secure server-side rate limiting:

```typescript
import { onRequest } from 'firebase-functions/v2/https';

export const chatWithAI = onRequest(async (req, res) => {
  const { userId, messages, tier } = req.body;

  try {
    const response = await fetch('https://your-proxy.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'x-project-key': process.env.RATELIMIT_PROJECT_KEY,
        'x-identity': userId,
        'x-tier': tier || 'free',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
      }),
    });

    if (response.status === 429) {
      const error = await response.json();
      res.status(429).json(error);
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Internal error' });
  }
});
```

## Architecture Options

### Client-Side (Simplest)

```
[App] → [AI Ratelimit] → [OpenAI/Anthropic/etc]
  ↓
[Firebase Auth]
```

**Pros**: Simple, no server needed  
**Cons**: API key visible in client (use environment variables)

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
  const token = req.headers.authorization?.split('Bearer ')[1];
  
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    
    const response = await fetch('https://your-proxy.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'x-project-key': 'pk_xxx',
        'x-identity': decodedToken.uid,  // Verified!
        'x-tier': decodedToken.tier || 'free',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: req.body.messages,
      }),
    });
    
    res.json(await response.json());
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
  const response = await openai.chat.completions.create({ ... });
} catch (error) {
  if (error.status === 429) {
    // Show upgrade dialog
    showUpgradeDialog();
  }
}

async function onUpgradeComplete(userId, tier) {
  // Update custom claims (server-side)
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
// ...

// User signs up - link accounts
const credential = EmailAuthProvider.credential(email, password);
await linkWithCredential(anonUser.user, credential);

// Same UID, usage preserved!
```

## Multi-Device Sync

Firebase Auth syncs across devices automatically. Usage limits apply everywhere:

```typescript
// Same user.uid on phone, tablet, web
const openai = new OpenAI({
  // ...
  defaultHeaders: {
    'x-identity': user.uid,  // Works everywhere
  },
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

## Resources

- [Main Documentation](../README.md)
