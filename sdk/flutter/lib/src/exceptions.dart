/// Exceptions for AI Ratelimit SDK
library;

import 'models.dart';

/// Exception thrown when rate limit is exceeded
class LimitExceededException implements Exception {
  /// Response details from the server
  final LimitExceededResponse response;

  LimitExceededException(this.response);

  @override
  String toString() => 'LimitExceededException: ${response.message}';
}

/// Exception thrown when the API request fails
class AIRateLimitException implements Exception {
  /// Error message
  final String message;

  /// HTTP status code (if applicable)
  final int? statusCode;

  /// Original error
  final dynamic originalError;

  AIRateLimitException(
    this.message, {
    this.statusCode,
    this.originalError,
  });

  @override
  String toString() {
    if (statusCode != null) {
      return 'AIRateLimitException ($statusCode): $message';
    }
    return 'AIRateLimitException: $message';
  }
}

/// Exception thrown when authentication fails
class UnauthorizedException extends AIRateLimitException {
  UnauthorizedException([String message = 'Missing or invalid project key'])
      : super(message, statusCode: 401);
}

