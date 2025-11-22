import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const adminKey = request.headers['x-admin-key'];
    const expectedKey = this.configService.get<string>('globalAdminKey');

    if (!adminKey || adminKey !== expectedKey) {
      throw new ForbiddenException('Invalid or missing admin key');
    }

    return true;
  }
}

