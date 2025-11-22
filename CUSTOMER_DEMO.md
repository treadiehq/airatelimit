# Customer Demo Guide - Your Vision, Built!

## What We Built

Based on your [Cleft note](https://www.cleft.ai/shared/Y512f93kt3), we've implemented **all three phases** of your customizable AI rate-limiting system.

## 🎯 Your Requirements → Our Implementation

| Your Requirement | Our Implementation | Status |
|-----------------|-------------------|--------|
| "Customizable request types" | Limit type selector: Requests, Tokens, or Both | ✅ |
| "Visual designer for rules" | Full visual rule builder with drag-drop conditions | ✅ |
| "Different limits for free/pro" | Complete tier system with unlimited plans | ✅ |
| "Deep links to upgrade pages" | Custom responses with deepLink field | ✅ |
| "Privacy (tofu box)" | Zero prompt storage (already implemented) | ✅ |
| "No integration required" | Works as proxy, drop-in replacement | ✅ |

## 🚀 Quick Start for Your Flutter App

### 1. Start the Service

```bash
cd ai-ratelimit
npm run start
```

Dashboard: http://localhost:3001

### 2. Create Your Project

In the dashboard:
- **Project Name**: "My Flutter App"
- **Limit Type**: "Requests" (for image gen) or "Tokens" (for chat)
- **Configure Tiers**:
  - Free: 5 requests/day
  - Pro: 100 requests/day
  - Enterprise: Unlimited

### 3. Add Rules

Example: "Warn users at 80% usage"

```json
{
  "name": "80% Warning",
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
      "message": "You've used 4 of 5 requests. Upgrade to Pro!",
      "deepLink": "myapp://upgrade?plan=pro",
      "remainingRequests": 1
    }
  }
}
```

### 4. Integrate in Flutter

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

Future<Map<String, dynamic>> makeAIRequest({
  required String userId,
  required String userPlan,
  required List<Map<String, String>> messages,
}) async {
  final response = await http.post(
    Uri.parse('https://your-proxy.com/api/v1/proxy/chat'),
    headers: {
      'x-project-key': 'pk_YOUR_KEY_HERE',
      'Content-Type': 'application/json',
    },
    body: jsonEncode({
      'identity': userId,  // Anonymous or hashed
      'tier': userPlan,    // 'free', 'pro', etc.
      'model': 'gpt-4',
      'messages': messages,
    }),
  );

  if (response.statusCode == 429) {
    // Limit exceeded
    final error = jsonDecode(response.body);
    
    if (error['deepLink'] != null) {
      // Navigate to upgrade page
      // Navigator.pushNamed(context, '/upgrade');
    }
    
    throw Exception(error['message']);
  }

  return jsonDecode(response.body);
}

// Usage
try {
  final result = await makeAIRequest(
    userId: 'user-123',
    userPlan: 'free',
    messages: [
      {'role': 'user', 'content': 'Hello!'}
    ],
  );
  print(result['choices'][0]['message']['content']);
} catch (e) {
  // Show upgrade prompt
}
```

## 🎨 Dashboard Features

### Basic Limits Tab
- Choose limit type (requests/tokens/both)
- Set daily limits
- Custom limit exceeded message

### Plan Tiers Tab
- Add unlimited tiers (free, pro, enterprise, etc.)
- Different limits per tier
- Per-tier custom responses

### Visual Rules Tab
- Create complex rules visually
- Conditions:
  - Usage percentage (e.g., >= 80%)
  - Absolute usage (e.g., > 1000 tokens)
  - Tier matching (e.g., tier == "free")
- Actions:
  - Allow (continue)
  - Block (stop with error)
  - Custom response (with deep links!)

## 📊 Example Configurations

### Image Generation App

```json
{
  "limitType": "requests",
  "tiers": {
    "free": {
      "requestLimit": 5,
      "customResponse": {
        "error": "limit_exceeded",
        "message": "You've generated 5 images today. Upgrade to Pro for 100/day!",
        "deepLink": "myapp://upgrade",
        "webUrl": "https://myapp.com/pricing"
      }
    },
    "pro": {
      "requestLimit": 100
    },
    "enterprise": {
      "requestLimit": null
    }
  },
  "rules": [
    {
      "name": "Free tier 80% warning",
      "condition": {
        "type": "usage_percent",
        "metric": "requests",
        "operator": "gte",
        "threshold": 80
      },
      "action": {
        "type": "custom_response",
        "response": {
          "warning": "You've used 4 of 5 free generations",
          "deepLink": "myapp://upgrade"
        }
      }
    }
  ]
}
```

### Chat App

```json
{
  "limitType": "tokens",
  "tiers": {
    "free": {
      "tokenLimit": 10000
    },
    "pro": {
      "tokenLimit": 500000
    }
  }
}
```

## 🔐 Privacy Guarantee

As you requested, **zero prompt content is stored**:
- ✅ Prompts flow through but never logged
- ✅ Only metadata tracked (identity, tier, counts)
- ✅ Your users' conversations stay private

## 📈 Usage Tracking

Dashboard shows:
- Today's total requests/tokens
- Usage by identity (anonymous IDs)
- Percentage of limit used
- Status (within limits / exceeded)

## 🎯 Perfect for Your Use Case

Based on your requirements:

1. **No billing integration needed** ✅
   - You manage plans in your Flutter app
   - Just pass the tier string to the proxy

2. **No user accounts in proxy** ✅
   - Use anonymous identity strings
   - Hash Firebase UIDs if needed

3. **Configurable responses** ✅
   - JSON responses with deep links
   - Different messages per tier/rule

4. **Works with any stack** ✅
   - Flutter, React Native, web, etc.
   - Just HTTP requests

## 🚢 Deployment

When ready to deploy:

1. **Host the backend** (Vercel, Railway, Fly.io, etc.)
2. **Host the dashboard** (same or separate)
3. **Point your Flutter app** to the hosted URL
4. **Done!** ✨

## 💡 Advanced Examples

### Progressive Warnings

```javascript
// Rule 1: 50% warning (soft)
{
  "condition": { "type": "usage_percent", "threshold": 50 },
  "action": {
    "type": "allow",  // Continue but add warning
    "response": {
      "data": { /* normal response */ },
      "warning": "You're halfway to your daily limit"
    }
  }
}

// Rule 2: 80% warning (urgent)
{
  "condition": { "type": "usage_percent", "threshold": 80 },
  "action": {
    "type": "allow",
    "response": {
      "data": { /* normal response */ },
      "warning": "Only 20% remaining! Upgrade now.",
      "deepLink": "myapp://upgrade"
    }
  }
}

// Rule 3: 100% block
{
  "condition": { "type": "usage_percent", "threshold": 100 },
  "action": {
    "type": "block",
    "response": {
      "error": "Daily limit reached",
      "deepLink": "myapp://upgrade"
    }
  }
}
```

### Tier-Specific Messages

```javascript
// Free tier at limit
{
  "condition": {
    "type": "composite",
    "operator": "AND",
    "conditions": [
      { "type": "tier_match", "tierValue": "free" },
      { "type": "usage_percent", "threshold": 100 }
    ]
  },
  "action": {
    "type": "block",
    "response": {
      "message": "Free tier limit reached. Upgrade to Pro for 20x more!",
      "deepLink": "myapp://upgrade?plan=pro"
    }
  }
}

// Pro tier at limit
{
  "condition": {
    "type": "composite",
    "operator": "AND",
    "conditions": [
      { "type": "tier_match", "tierValue": "pro" },
      { "type": "usage_percent", "threshold": 100 }
    ]
  },
  "action": {
    "type": "block",
    "response": {
      "message": "You've maxed out your Pro plan. Contact us for Enterprise!",
      "deepLink": "mailto:sales@myapp.com"
    }
  }
}
```

## 📝 Summary

You asked for:
> "Basically an AI chat proxy that does rate limiting for you so you can offer free tier or usage based AI in your app without requiring complex billing or user accounts"

You got:
- ✅ AI chat proxy with rate limiting
- ✅ Free tier support (with tiers)
- ✅ No billing system needed
- ✅ No user accounts needed (identity strings)
- ✅ **PLUS** visual rule builder, deep links, progressive warnings!

## 🎉 Ready to Test!

```bash
npm run start
```

Then open http://localhost:3001 and create your first project!

---

Questions? Check:
- `README.md` - Full documentation
- `sdk/js/README.md` - SDK usage (we also support raw HTTP from Flutter!)

