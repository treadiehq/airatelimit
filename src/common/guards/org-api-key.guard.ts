import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OrganizationsService } from '../../organizations/organizations.service';
import { UsersService } from '../../users/users.service';

/**
 * Guard that accepts either:
 * 1. JWT token from dashboard login (Authorization: Bearer <jwt>)
 * 2. Organization API key (Authorization: Bearer org_sk_xxx)
 *
 * For API key auth, the organization is attached to request.organization
 * For JWT auth, the user is attached to request.user
 */
@Injectable()
export class OrgApiKeyGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private organizationsService: OrganizationsService,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const token = authHeader.substring(7);

    // Check if it's an organization API key (starts with org_sk_)
    if (token.startsWith('org_sk_')) {
      return this.validateOrgApiKey(token, request);
    }

    // Otherwise, try to validate as JWT
    return this.validateJwt(token, request);
  }

  private async validateOrgApiKey(
    apiKey: string,
    request: any,
  ): Promise<boolean> {
    const org = await this.organizationsService.findByApiKey(apiKey);

    if (!org) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Verify with bcrypt
    const isValid = await this.organizationsService.verifyApiKey(apiKey, org);
    if (!isValid) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Attach organization to request for downstream use
    request.organization = org;
    request.organizationId = org.id;
    request.authType = 'org_api_key';

    return true;
  }

  private async validateJwt(token: string, request: any): Promise<boolean> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret:
          this.configService.get<string>('jwtSecret') ||
          this.configService.get<string>('JWT_SECRET'),
      });

      // Verify the user still exists in the database
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User no longer exists');
      }

      // Verify the user's organization context hasn't changed
      // (e.g. user was removed from the org since the JWT was issued)
      if (
        !payload.organizationId ||
        payload.organizationId !== user.organizationId
      ) {
        throw new UnauthorizedException(
          'Organization context has changed. Please log in again.',
        );
      }

      // Load organization with plan
      const organization = await this.organizationsService.findById(
        user.organizationId,
      );

      request.user = {
        userId: user.id,
        email: user.email,
        organizationId: user.organizationId,
        organization: organization ? { id: organization.id, plan: organization.plan } : null,
      };
      request.organization = organization;
      request.organizationId = user.organizationId;
      request.authType = 'jwt';

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }
}
