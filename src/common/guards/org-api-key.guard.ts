import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OrganizationsService } from '../../organizations/organizations.service';

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
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Load organization with plan
      const organization = payload.organizationId
        ? await this.organizationsService.findById(payload.organizationId)
        : null;

      request.user = {
        userId: payload.sub,
        email: payload.email,
        organizationId: payload.organizationId,
        organization: organization ? { id: organization.id, plan: organization.plan } : null,
      };
      request.organization = organization;
      request.organizationId = payload.organizationId;
      request.authType = 'jwt';

      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
