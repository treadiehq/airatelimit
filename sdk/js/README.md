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
  projectKey: 'pk_your_key_here',
});

// Regular chat
const result = await client.chat({
  identity: 'user-123',
  tier: 'free',
  model: 'gpt-4-turbo-preview',
  messages: [{ role: 'user', content: 'Hello!' }],
});

console.log(result.raw.choices[0].message.content);

// Streaming
for await (const chunk of client.chatStream({
  identity: 'user-123',
  tier: 'free',
  model: 'gpt-4-turbo-preview',
  messages: [{ role: 'user', content: 'Tell me a story' }],
})) {
  process.stdout.write(chunk);
}
```

## Error Handling

```typescript
import { LimitExceededError } from '@ai-ratelimit/sdk';

try {
  const result = await client.chat({ ... });
} catch (err) {
  if (err instanceof LimitExceededError) {
    // Limit exceeded - show upgrade prompt
    console.log(err.response.message);
    
    // Optional: Navigate to upgrade page
    if (err.response.deepLink) {
      window.location.href = err.response.deepLink;
    }
  }
}
```

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

See [LICENSE](../../LICENSE) for details.
