/// Data models for AI Ratelimit SDK
library;

/// Configuration options for the AI Ratelimit client
class AIRateLimitClientOptions {
  /// Base URL of your AI Ratelimit service
  /// Example: "https://your-service.railway.app/api"
  final String baseUrl;

  /// Project key from your dashboard (starts with pk_)
  final String projectKey;

  /// Optional timeout for HTTP requests (default: 30 seconds)
  final Duration timeout;

  const AIRateLimitClientOptions({
    required this.baseUrl,
    required this.projectKey,
    this.timeout = const Duration(seconds: 30),
  });
}

/// A chat message with role and content
class ChatMessage {
  /// Message role: 'system', 'user', or 'assistant'
  final String role;

  /// Message content
  final String content;

  const ChatMessage({
    required this.role,
    required this.content,
  });

  /// Create a system message
  factory ChatMessage.system(String content) {
    return ChatMessage(role: 'system', content: content);
  }

  /// Create a user message
  factory ChatMessage.user(String content) {
    return ChatMessage(role: 'user', content: content);
  }

  /// Create an assistant message
  factory ChatMessage.assistant(String content) {
    return ChatMessage(role: 'assistant', content: content);
  }

  Map<String, dynamic> toJson() {
    return {
      'role': role,
      'content': content,
    };
  }
}

/// Options for a chat completion request
class ChatOptions {
  /// User/session/device identifier
  final String identity;

  /// Model name (e.g., 'gpt-4o', 'claude-3-5-sonnet', 'gemini-1.5-pro')
  final String model;

  /// Chat messages
  final List<ChatMessage> messages;

  /// Optional tier/plan identifier (e.g., 'free', 'pro', 'enterprise')
  final String? tier;

  /// Maximum tokens to generate
  final int? maxTokens;

  /// Sampling temperature (0.0 to 2.0)
  final double? temperature;

  /// Top-p sampling
  final double? topP;

  const ChatOptions({
    required this.identity,
    required this.model,
    required this.messages,
    this.tier,
    this.maxTokens,
    this.temperature,
    this.topP,
  });

  Map<String, dynamic> toJson() {
    return {
      'identity': identity,
      'model': model,
      'messages': messages.map((m) => m.toJson()).toList(),
      if (tier != null) 'tier': tier,
      if (maxTokens != null) 'max_tokens': maxTokens,
      if (temperature != null) 'temperature': temperature,
      if (topP != null) 'top_p': topP,
    };
  }
}

/// Result from a chat completion request
class ChatResult {
  /// Full response from the AI provider (OpenAI-compatible format)
  final Map<String, dynamic> raw;

  const ChatResult({required this.raw});

  /// Get the text content from the first choice
  String? get content {
    final choices = raw['choices'] as List?;
    if (choices == null || choices.isEmpty) return null;
    
    final message = choices[0]['message'] as Map<String, dynamic>?;
    return message?['content'] as String?;
  }

  /// Get the model used
  String? get model => raw['model'] as String?;

  /// Get usage information
  Map<String, dynamic>? get usage => raw['usage'] as Map<String, dynamic>?;

  /// Get total tokens used
  int? get totalTokens => usage?['total_tokens'] as int?;

  /// Get prompt tokens used
  int? get promptTokens => usage?['prompt_tokens'] as int?;

  /// Get completion tokens used
  int? get completionTokens => usage?['completion_tokens'] as int?;
}

/// Response when rate limit is exceeded
class LimitExceededResponse {
  /// Error code
  final String error;

  /// Human-readable message
  final String message;

  /// Optional deep link for upgrade flow
  final String? deepLink;

  /// Current usage
  final int? usage;

  /// Usage limit
  final int? limit;

  /// User's tier
  final String? tier;

  /// Limit period (daily, weekly, monthly)
  final String? period;

  const LimitExceededResponse({
    required this.error,
    required this.message,
    this.deepLink,
    this.usage,
    this.limit,
    this.tier,
    this.period,
  });

  factory LimitExceededResponse.fromJson(Map<String, dynamic> json) {
    return LimitExceededResponse(
      error: json['error'] as String? ?? 'limit_exceeded',
      message: json['message'] as String? ?? 'Rate limit exceeded',
      deepLink: json['deepLink'] as String?,
      usage: json['usage'] as int?,
      limit: json['limit'] as int?,
      tier: json['tier'] as String?,
      period: json['period'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'error': error,
      'message': message,
      if (deepLink != null) 'deepLink': deepLink,
      if (usage != null) 'usage': usage,
      if (limit != null) 'limit': limit,
      if (tier != null) 'tier': tier,
      if (period != null) 'period': period,
    };
  }
}

