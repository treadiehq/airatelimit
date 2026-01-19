import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT Auth Guard
 *
 * Protects routes requiring authentication. Validates JWT tokens and
 * attaches user info to the request.
 *
 * SECURITY: The handleRequest override ensures that any errors from the
 * JWT strategy (database errors, service errors, etc.) are not leaked
 * to clients. All errors result in a generic UnauthorizedException.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    // Always throw generic UnauthorizedException for any error
    // This prevents information disclosure from database/service errors
    if (err || !user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
