/// AI Ratelimit client implementation
library;

import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:meta/meta.dart';

import 'models.dart';
import 'exceptions.dart';

/// Client for interacting with the AI Ratelimit service
class AIRateLimitClient {
  final AIRateLimitClientOptions _options;
  final http.Client _httpClient;

  /// Create a new AI Ratelimit client
  ///
  /// Example:
  /// ```dart
  /// final client = AIRateLimitClient(
  ///   baseUrl: 'https://your-service.railway.app/api',
  ///   projectKey: 'pk_your_key_here',
  /// );
  /// ```
  AIRateLimitClient({
    required String baseUrl,
    required String projectKey,
    Duration timeout = const Duration(seconds: 30),
    http.Client? httpClient,
  })  : _options = AIRateLimitClientOptions(
          baseUrl: baseUrl,
          projectKey: projectKey,
          timeout: timeout,
        ),
        _httpClient = httpClient ?? http.Client();

  /// Create a client from options object
  AIRateLimitClient.fromOptions(
    AIRateLimitClientOptions options, {
    http.Client? httpClient,
  })  : _options = options,
        _httpClient = httpClient ?? http.Client();

  /// Send a chat completion request
  ///
  /// Example:
  /// ```dart
  /// final result = await client.chat(
  ///   identity: 'user-123',
  ///   tier: 'free',
  ///   model: 'gpt-4o',
  ///   messages: [
  ///     ChatMessage.user('Hello!'),
  ///   ],
  /// );
  ///
  /// print(result.content);
  /// ```
  ///
  /// Throws [LimitExceededException] when rate limit is exceeded
  /// Throws [UnauthorizedException] when project key is invalid
  /// Throws [AIRateLimitException] for other errors
  Future<ChatResult> chat({
    required String identity,
    required String model,
    required List<ChatMessage> messages,
    String? tier,
    int? maxTokens,
    double? temperature,
    double? topP,
  }) async {
    final options = ChatOptions(
      identity: identity,
      model: model,
      messages: messages,
      tier: tier,
      maxTokens: maxTokens,
      temperature: temperature,
      topP: topP,
    );

    return _chat(options);
  }

  /// Send a chat completion request with options object
  Future<ChatResult> _chat(ChatOptions options) async {
    final url = Uri.parse('${_options.baseUrl}/v1/proxy/chat');

    try {
      final response = await _httpClient
          .post(
            url,
            headers: {
              'Content-Type': 'application/json',
              'x-project-key': _options.projectKey,
            },
            body: jsonEncode(options.toJson()),
          )
          .timeout(_options.timeout);

      final data = jsonDecode(response.body) as Map<String, dynamic>;

      // Check for rate limit exceeded
      if (response.statusCode == 429 || data['error'] == 'limit_exceeded') {
        throw LimitExceededException(
          LimitExceededResponse.fromJson(data),
        );
      }

      // Check for authentication error
      if (response.statusCode == 401) {
        throw UnauthorizedException(
          data['message'] as String? ?? 'Missing or invalid project key',
        );
      }

      // Check for other errors
      if (response.statusCode >= 400) {
        throw AIRateLimitException(
          data['message'] as String? ?? 'Request failed',
          statusCode: response.statusCode,
        );
      }

      return ChatResult(raw: data);
    } on TimeoutException {
      throw AIRateLimitException(
        'Request timeout after ${_options.timeout.inSeconds} seconds',
      );
    } catch (e) {
      if (e is LimitExceededException ||
          e is UnauthorizedException ||
          e is AIRateLimitException) {
        rethrow;
      }
      throw AIRateLimitException(
        'Request failed: ${e.toString()}',
        originalError: e,
      );
    }
  }

  /// Send a streaming chat completion request
  ///
  /// Returns a stream of text chunks as they arrive from the AI provider.
  ///
  /// Example:
  /// ```dart
  /// await for (final chunk in client.chatStream(
  ///   identity: 'user-123',
  ///   model: 'gpt-4o',
  ///   messages: [ChatMessage.user('Tell me a story')],
  /// )) {
  ///   print(chunk); // Print each chunk as it arrives
  /// }
  /// ```
  ///
  /// Throws [LimitExceededException] when rate limit is exceeded
  /// Throws [UnauthorizedException] when project key is invalid
  /// Throws [AIRateLimitException] for other errors
  Stream<String> chatStream({
    required String identity,
    required String model,
    required List<ChatMessage> messages,
    String? tier,
    int? maxTokens,
    double? temperature,
    double? topP,
  }) {
    final options = ChatOptions(
      identity: identity,
      model: model,
      messages: messages,
      tier: tier,
      maxTokens: maxTokens,
      temperature: temperature,
      topP: topP,
    );

    return _chatStream(options);
  }

  /// Send a streaming chat completion request with options object
  Stream<String> _chatStream(ChatOptions options) async* {
    final url = Uri.parse('${_options.baseUrl}/v1/proxy/chat/stream');

    http.StreamedResponse? response;

    try {
      final request = http.Request('POST', url)
        ..headers.addAll({
          'Content-Type': 'application/json',
          'x-project-key': _options.projectKey,
        })
        ..body = jsonEncode(options.toJson());

      response = await _httpClient.send(request).timeout(_options.timeout);

      // Check if response is JSON (error case)
      final contentType = response.headers['content-type'];
      if (contentType?.contains('application/json') ?? false) {
        final body = await response.stream.bytesToString();
        final data = jsonDecode(body) as Map<String, dynamic>;

        if (response.statusCode == 429 || data['error'] == 'limit_exceeded') {
          throw LimitExceededException(
            LimitExceededResponse.fromJson(data),
          );
        }

        if (response.statusCode == 401) {
          throw UnauthorizedException(
            data['message'] as String? ?? 'Missing or invalid project key',
          );
        }

        throw AIRateLimitException(
          data['message'] as String? ?? 'Request failed',
          statusCode: response.statusCode,
        );
      }

      if (response.statusCode >= 400) {
        throw AIRateLimitException(
          'Stream request failed',
          statusCode: response.statusCode,
        );
      }

      // Parse SSE stream
      String buffer = '';

      await for (final chunk
          in response.stream.transform(utf8.decoder).transform(const LineSplitter())) {
        if (chunk.startsWith('data: ')) {
          final data = chunk.substring(6);

          if (data == '[DONE]') {
            break;
          }

          try {
            final parsed = jsonDecode(data) as Map<String, dynamic>;

            // Extract content from delta
            final choices = parsed['choices'] as List?;
            if (choices != null && choices.isNotEmpty) {
              final delta = choices[0]['delta'] as Map<String, dynamic>?;
              final content = delta?['content'] as String?;

              if (content != null) {
                yield content;
              }
            }
          } catch (_) {
            // Skip malformed JSON
          }
        }
      }
    } on TimeoutException {
      throw AIRateLimitException(
        'Request timeout after ${_options.timeout.inSeconds} seconds',
      );
    } catch (e) {
      if (e is LimitExceededException ||
          e is UnauthorizedException ||
          e is AIRateLimitException) {
        rethrow;
      }
      throw AIRateLimitException(
        'Stream request failed: ${e.toString()}',
        originalError: e,
      );
    }
  }

  /// Close the HTTP client
  void close() {
    _httpClient.close();
  }
}

