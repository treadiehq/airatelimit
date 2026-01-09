import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional JWT Auth Guard
 * 
 * Unlike JwtAuthGuard, this guard doesn't throw if the user isn't authenticated.
 * Instead, it allows the request to proceed with req.user = undefined.
 * 
 * Useful for endpoints that work differently for authenticated vs anonymous users.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    // Don't throw on missing/invalid token - just return null user
    if (err || !user) {
      return null;
    }
    return user;
  }

  canActivate(context: ExecutionContext) {
    // Call the parent canActivate to trigger the JWT strategy
    // This will populate req.user if a valid token is present
    return super.canActivate(context);
  }
}
