/// Example usage of AI Ratelimit SDK for Flutter/Dart
///
/// This example demonstrates various ways to use the SDK.
import 'package:ai_ratelimit_sdk/ai_ratelimit_sdk.dart';

void main() async {
  // Create the client
  final client = AIRateLimitClient(
    baseUrl: 'https://your-service.railway.app/api',
    projectKey: 'pk_your_key_here',
  );

  // Example 1: Basic chat
  print('=== Example 1: Basic Chat ===');
  await basicChatExample(client);

  // Example 2: Streaming chat
  print('\n=== Example 2: Streaming Chat ===');
  await streamingChatExample(client);

  // Example 3: Error handling
  print('\n=== Example 3: Error Handling ===');
  await errorHandlingExample(client);

  // Example 4: Different tiers
  print('\n=== Example 4: Different Tiers ===');
  await tierExample(client);

  // Example 5: Multiple models
  print('\n=== Example 5: Multiple Models ===');
  await multiModelExample(client);

  // Clean up
  client.close();
}

/// Example 1: Basic chat completion
Future<void> basicChatExample(AIRateLimitClient client) async {
  try {
    final result = await client.chat(
      identity: 'user-123',
      tier: 'free',
      model: 'gpt-4o',
      messages: [
        ChatMessage.system('You are a helpful assistant'),
        ChatMessage.user('What is the capital of France?'),
      ],
    );

    print('Response: ${result.content}');
    print('Model: ${result.model}');
    print('Tokens: ${result.totalTokens}');
  } catch (e) {
    print('Error: $e');
  }
}

/// Example 2: Streaming chat
Future<void> streamingChatExample(AIRateLimitClient client) async {
  try {
    print('Streaming response:');

    final stream = client.chatStream(
      identity: 'user-123',
      model: 'gpt-4o',
      messages: [
        ChatMessage.user('Tell me a short joke'),
      ],
    );

    await for (final chunk in stream) {
      print(chunk);
    }

    print('\nStreaming complete!');
  } catch (e) {
    print('Error: $e');
  }
}

/// Example 3: Error handling with limit exceeded
Future<void> errorHandlingExample(AIRateLimitClient client) async {
  try {
    // This might exceed limits if you've used all your requests
    final result = await client.chat(
      identity: 'heavy-user',
      tier: 'free',
      model: 'gpt-4o',
      messages: [
        ChatMessage.user('Hello'),
      ],
    );

    print('Success: ${result.content}');
  } on LimitExceededException catch (e) {
    print('Rate limit exceeded!');
    print('Message: ${e.response.message}');
    print('Usage: ${e.response.usage}/${e.response.limit}');
    print('Tier: ${e.response.tier}');
    print('Period: ${e.response.period}');

    if (e.response.deepLink != null) {
      print('Upgrade at: ${e.response.deepLink}');
    }
  } on UnauthorizedException catch (e) {
    print('Authentication error: $e');
  } on AIRateLimitException catch (e) {
    print('General error: $e');
    print('Status code: ${e.statusCode}');
  }
}

/// Example 4: Different pricing tiers
Future<void> tierExample(AIRateLimitClient client) async {
  // Free tier user
  print('Free tier:');
  try {
    final freeResult = await client.chat(
      identity: 'free-user',
      tier: 'free',
      model: 'gpt-4o',
      messages: [ChatMessage.user('Hi')],
    );
    print('Response: ${freeResult.content}');
  } on LimitExceededException catch (e) {
    print('Free tier limit: ${e.response.message}');
  }

  // Pro tier user
  print('\nPro tier:');
  try {
    final proResult = await client.chat(
      identity: 'pro-user',
      tier: 'pro',
      model: 'gpt-4o',
      messages: [ChatMessage.user('Hi')],
    );
    print('Response: ${proResult.content}');
  } catch (e) {
    print('Error: $e');
  }
}

/// Example 5: Using different AI models
Future<void> multiModelExample(AIRateLimitClient client) async {
  final models = ['gpt-4o', 'claude-3-5-sonnet-20241022', 'gemini-1.5-pro'];

  for (final model in models) {
    print('Testing $model:');
    try {
      final result = await client.chat(
        identity: 'test-user',
        model: model,
        messages: [
          ChatMessage.user('Say hello in one word'),
        ],
      );

      print('  Response: ${result.content}');
      print('  Tokens: ${result.totalTokens}');
    } catch (e) {
      print('  Error: $e');
    }
  }
}

/// Example 6: Firebase integration (commented out, requires Firebase setup)
/*
import 'package:firebase_auth/firebase_auth.dart';

Future<void> firebaseExample(AIRateLimitClient client) async {
  // Get current Firebase user
  final user = FirebaseAuth.instance.currentUser;

  if (user == null) {
    print('No user logged in');
    return;
  }

  // Get custom claims for tier
  final idTokenResult = await user.getIdTokenResult();
  final tier = idTokenResult.claims?['tier'] ?? 'free';

  // Use Firebase UID as identity
  try {
    final result = await client.chat(
      identity: user.uid,
      tier: tier,
      model: 'gpt-4o',
      messages: [
        ChatMessage.user('Hello!'),
      ],
    );

    print('Response: ${result.content}');
  } on LimitExceededException catch (e) {
    print('Limit exceeded: ${e.response.message}');
    // Show upgrade dialog
  }
}
*/

/// Example 7: Building a chatbot with conversation history
class SimpleChatbot {
  final AIRateLimitClient client;
  final String userId;
  final String tier;
  final List<ChatMessage> conversationHistory = [];

  SimpleChatbot({
    required this.client,
    required this.userId,
    this.tier = 'free',
  }) {
    // Add system message
    conversationHistory.add(
      ChatMessage.system('You are a helpful and friendly assistant.'),
    );
  }

  Future<String?> sendMessage(String message) async {
    // Add user message to history
    conversationHistory.add(ChatMessage.user(message));

    try {
      final result = await client.chat(
        identity: userId,
        tier: tier,
        model: 'gpt-4o',
        messages: conversationHistory,
      );

      // Add assistant response to history
      if (result.content != null) {
        conversationHistory.add(ChatMessage.assistant(result.content!));
      }

      return result.content;
    } on LimitExceededException catch (e) {
      print('Rate limit: ${e.response.message}');
      return null;
    } catch (e) {
      print('Error: $e');
      return null;
    }
  }

  void clearHistory() {
    conversationHistory.clear();
    conversationHistory.add(
      ChatMessage.system('You are a helpful and friendly assistant.'),
    );
  }
}

/// Example 8: Using the chatbot
Future<void> chatbotExample() async {
  final client = AIRateLimitClient(
    baseUrl: 'https://your-service.railway.app/api',
    projectKey: 'pk_your_key_here',
  );

  final bot = SimpleChatbot(
    client: client,
    userId: 'user-789',
    tier: 'pro',
  );

  // Have a conversation
  var response = await bot.sendMessage('What is the capital of France?');
  print('Bot: $response');

  response = await bot.sendMessage('What about Spain?');
  print('Bot: $response');

  response = await bot.sendMessage('And Italy?');
  print('Bot: $response');

  // The bot remembers the conversation context!

  client.close();
}

