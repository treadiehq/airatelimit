# AI Ratelimit SDK

JavaScript/TypeScript client for AI Ratelimit.

## Install

```bash
npm install @ai-ratelimit/sdk
```

## Quick Start

```typescript
import { createClient } from '@ai-ratelimit/sdk';

const client = createClient({
  baseUrl: 'http://localhost:3000/api',
  projectKey: 'pk_your_key_here',  // From your dashboard
});

// Works with OpenAI, Anthropic, Google Gemini, or xAI
// Model restrictions come from your provider - not the proxy

// Regular chat - use ANY model from your configured provider
const result = await client.chat({
  identity: 'user-123',
  tier: 'free',
  model: 'gpt-4o',  // Any model: gpt-4o, claude-3-5-sonnet-20241022, gemini-1.5-pro, etc.
  messages: [{ role: 'user', content: 'Hello!' }],
});

console.log(result.raw.choices[0].message.content);

// Streaming - works with all providers
for await (const chunk of client.chatStream({
  identity: 'user-123',
  tier: 'free',
  model: 'gpt-4o',  // Future models work automatically
  messages: [{ role: 'user', content: 'Tell me a story' }],
})) {
  process.stdout.write(chunk);
}
```

## Error Handling

```typescript
import { LimitExceededError, SecurityPolicyViolationError } from '@ai-ratelimit/sdk';

try {
  const result = await client.chat({ ... });
} catch (err) {
  if (err instanceof SecurityPolicyViolationError) {
    // Security violation - prompt injection detected
    console.log('Security error:', err.message);
    console.log('Attack pattern:', err.pattern);  // e.g., "systemPromptExtraction"
    console.log('Severity:', err.severity);        // "low" | "medium" | "high"
  } else if (err instanceof LimitExceededError) {
    // Limit exceeded - show upgrade prompt
    console.log(err.response.message);
    
    // Optional: Navigate to upgrade page
    if (err.response.deepLink) {
      window.location.href = err.response.deepLink;
    }
  }
}
```

Added `SecurityPolicyViolationError` for prompt injection protection. Enable security features in your project dashboard.

## API

### `createClient(options)`

**Options:**
- `baseUrl` - Your proxy URL
- `projectKey` - Project key from dashboard

### `client.chat(options)`

**Options:**
- `identity` - User/session/device ID (required)
- `tier` - Plan tier: 'free', 'pro', etc. (optional)
- `model` - Model name (required)
- `messages` - Chat messages array (required)
- `maxTokens` - Max tokens to generate (optional)
- `temperature` - 0-2 (optional)
- `topP` - Top-p sampling (optional)

**Returns:** `ChatResult` with `raw` property (full OpenAI response)

### `client.chatStream(options)`

Same options as `chat()`.

**Returns:** `AsyncGenerator` yielding text chunks

## Different Tiers

```typescript
// Free tier (5 requests/day)
await client.chat({
  identity: 'user-123',
  tier: 'free',
  ...
});

// Pro tier (100 requests/day)
await client.chat({
  identity: 'user-456',
  tier: 'pro',
  ...
});
```

Configure tier limits in the dashboard.

## License

See [FSL-1.1-MIT](../../LICENSE) for details.
