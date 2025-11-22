# AI Rate Limit SDK

JavaScript/TypeScript SDK for calling the AI Rate Limit proxy.

## Installation

```bash
npm install @ai-ratelimit/sdk
```

## Usage

### Basic Chat Completion

```typescript
import { createClient } from '@ai-ratelimit/sdk';

const client = createClient({
  baseUrl: 'https://proxy.myapp.com/api',
  projectKey: 'pk_your_project_key_here',
});

try {
  const result = await client.chat({
    identity: 'user-123',
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'user', content: 'Hello, how are you?' }
    ],
    maxTokens: 100,
  });

  console.log(result.raw.choices[0].message.content);
} catch (err) {
  if (err instanceof LimitExceededError) {
    // Show paywall or upgrade UI
    console.log('Rate limit exceeded:', err.response);
  } else {
    console.error('Error:', err.message);
  }
}
```

### Streaming Chat Completion

```typescript
try {
  for await (const chunk of client.chatStream({
    identity: 'user-123',
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'user', content: 'Tell me a story' }
    ],
  })) {
    process.stdout.write(chunk);
  }
} catch (err) {
  if (err instanceof LimitExceededError) {
    console.log('Rate limit exceeded:', err.response);
  } else {
    console.error('Error:', err.message);
  }
}
```

### Using Tiers (Free, Pro, Enterprise, etc.)

```typescript
// Free tier user
const freeResult = await client.chat({
  identity: 'user-123',
  tier: 'free', // Tier identifier
  model: 'gpt-4-turbo-preview',
  messages: [{ role: 'user', content: 'Hello!' }],
});

// Pro tier user
const proResult = await client.chat({
  identity: 'user-456',
  tier: 'pro', // Different tier = different limits
  model: 'gpt-4-turbo-preview',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

The tier parameter allows you to configure different rate limits for different user plans in your dashboard.

## API

### `createClient(options)`

Creates a new client instance.

**Options:**
- `baseUrl` (string): Base URL of your AI Rate Limit proxy API
- `projectKey` (string): Your project key from the dashboard

**Returns:** Client instance with `chat` and `chatStream` methods

### `client.chat(options)`

Send a chat completion request.

**Options:**
- `identity` (string): User/session/device identifier
- `tier` (string, optional): Plan/tier identifier (e.g., 'free', 'pro', 'enterprise')
- `model` (string): Model name (e.g., 'gpt-4-turbo-preview')
- `messages` (array): Array of chat messages
- `maxTokens` (number, optional): Maximum tokens to generate
- `temperature` (number, optional): Temperature (0-2)
- `topP` (number, optional): Top-p sampling

**Returns:** Promise<ChatResult> with `raw` property containing the full OpenAI-compatible response

### `client.chatStream(options)`

Stream a chat completion request.

**Options:** Same as `chat()`

**Returns:** AsyncGenerator that yields text chunks

## Error Handling

The SDK throws a `LimitExceededError` when rate limits are exceeded. This error contains the custom limit response configured in your project.

```typescript
import { LimitExceededError } from '@ai-ratelimit/sdk';

try {
  const result = await client.chat({ /* ... */ });
} catch (err) {
  if (err instanceof LimitExceededError) {
    // err.response contains your custom limit exceeded message
    console.log(err.response.message);
  }
}
```

## License

MIT

