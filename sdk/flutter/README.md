# AI Ratelimit SDK for Flutter/Dart

Flutter/Dart client for AI Ratelimit. Add usage limits to your AI app in minutes.

## Installation

Add to `pubspec.yaml`:

```yaml
dependencies:
  ai_ratelimit_sdk:
    git:
      url: https://github.com/yourusername/ai-ratelimit.git
      path: sdk/flutter
```

Then run:

```bash
flutter pub get
```

## Quick Start

```dart
import 'package:ai_ratelimit_sdk/ai_ratelimit_sdk.dart';

final client = AIRateLimitClient(
  baseUrl: 'https://your-service.railway.app/api',
  projectKey: 'pk_your_key_here',
);

try {
  final result = await client.chat(
    identity: 'user-123',
    tier: 'free',
    model: 'gpt-4o',
    messages: [
      ChatMessage.user('Hello!'),
    ],
  );

  print(result.content);
} on LimitExceededException catch (e) {
  print('Limit exceeded: ${e.response.message}');
} catch (e) {
  print('Error: $e');
}
```

## Streaming

```dart
await for (final chunk in client.chatStream(
  identity: 'user-123',
  model: 'gpt-4o',
  messages: [ChatMessage.user('Tell me a story')],
)) {
  print(chunk);
}
```

## Firebase Integration

```dart
import 'package:firebase_auth/firebase_auth.dart';

final user = FirebaseAuth.instance.currentUser;

final result = await client.chat(
  identity: user!.uid,  // Use Firebase UID
  tier: 'free',
  model: 'gpt-4o',
  messages: [ChatMessage.user('Hello!')],
);
```

### With Custom Claims (Tiers)

```dart
final user = FirebaseAuth.instance.currentUser;
final idTokenResult = await user!.getIdTokenResult();
final tier = idTokenResult.claims?['tier'] ?? 'free';

final result = await client.chat(
  identity: user.uid,
  tier: tier,  // From Firebase custom claim
  model: 'gpt-4o',
  messages: [ChatMessage.user('Hello!')],
);
```

## API

### AIRateLimitClient

```dart
AIRateLimitClient({
  required String baseUrl,
  required String projectKey,
  Duration timeout = const Duration(seconds: 30),
})
```

### Methods

#### chat()

```dart
Future<ChatResult> chat({
  required String identity,    // User/device ID
  required String model,       // 'gpt-4o', 'claude-3-5-sonnet', etc.
  required List<ChatMessage> messages,
  String? tier,                // 'free', 'pro', etc.
  int? maxTokens,
  double? temperature,
  double? topP,
})
```

#### chatStream()

```dart
Stream<String> chatStream({
  // Same parameters as chat()
})
```

### ChatMessage

```dart
ChatMessage.system('You are a helpful assistant')
ChatMessage.user('What is the capital of France?')
ChatMessage.assistant('The capital of France is Paris')
```

### ChatResult

```dart
result.content          // AI response text
result.totalTokens      // Tokens used
result.model            // Model name
result.raw              // Full response
```

## Error Handling

### LimitExceededException

```dart
on LimitExceededException catch (e) {
  print(e.response.message);   // "You've used 5/5 requests..."
  print(e.response.usage);      // 5
  print(e.response.limit);      // 5
  print(e.response.deepLink);   // "app://upgrade"
}
```

### Show Upgrade Dialog

```dart
on LimitExceededException catch (e) {
  showDialog(
    context: context,
    builder: (context) => AlertDialog(
      title: Text('Limit Reached'),
      content: Text(e.response.message),
      actions: [
        ElevatedButton(
          onPressed: () {
            // Navigate to upgrade
          },
          child: Text('Upgrade'),
        ),
      ],
    ),
  );
}
```

## Supported Models

Works with any model from your configured provider:

- **OpenAI**: `gpt-4o`, `gpt-4o-mini`, `o1-preview`, etc.
- **Anthropic**: `claude-3-5-sonnet-20241022`, etc.
- **Google**: `gemini-1.5-pro`, `gemini-1.5-flash`, etc.
- **xAI**: `grok-beta`, etc.
- **Other**: Any OpenAI-compatible API

## Troubleshooting

### Missing project key

```dart
AIRateLimitClient(
  projectKey: 'pk_your_key_here',  // Must start with pk_
)
```

### Wrong base URL

```dart
// ✅ Correct
baseUrl: 'https://your-service.railway.app/api'

// ❌ Wrong (missing /api)
baseUrl: 'https://your-service.railway.app'
```

### Timeout

```dart
AIRateLimitClient(
  timeout: Duration(seconds: 60),  // Increase for slow networks
)
```

## Resources

- [Main Documentation](../../README.md)
- [Firebase Integration Guide](../../docs/FIREBASE_INTEGRATION.md)
- [JavaScript SDK](../js/README.md)
- [Full Examples](./example/main.dart)

## License

See [FSL-1.1-MIT](../../LICENSE) for details.
