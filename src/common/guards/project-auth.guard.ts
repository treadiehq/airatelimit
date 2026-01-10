import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ProjectsService } from '../../projects/projects.service';
import { OrganizationsService } from '../../organizations/organizations.service';

/**
 * Guard that accepts either:
 * 1. JWT token from dashboard login (Authorization: Bearer <jwt>)
 * 2. Project secret key (Authorization: Bearer sk_xxx)
 *
 * For secret key auth, the project is attached to request.project
 * For JWT auth, the user is attached to request.user
 */
@Injectable()
export class ProjectAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private projectsService: ProjectsService,
    private organizationsService: OrganizationsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const token = authHeader.substring(7);

    // Check if it's a secret key (starts with sk_)
    if (token.startsWith('sk_')) {
      return this.validateSecretKey(token, request);
    }

    // Otherwise, try to validate as JWT
    return this.validateJwt(token, request);
  }

  private async validateSecretKey(
    secretKey: string,
    request: any,
  ): Promise<boolean> {
    const project = await this.projectsService.findBySecretKey(secretKey);

    if (!project) {
      throw new UnauthorizedException('Invalid secret key');
    }

    // Verify with constant-time comparison or bcrypt
    const isValid = await this.projectsService.verifySecretKey(
      secretKey,
      project,
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid secret key');
    }

    // Attach project to request for downstream use
    request.project = project;
    request.authType = 'secret_key';

    return true;
  }

  private async validateJwt(token: string, request: any): Promise<boolean> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Load organization with plan for PlanGuard
      const organization = payload.organizationId
        ? await this.organizationsService.findById(payload.organizationId)
        : null;

      request.user = {
        userId: payload.sub,
        email: payload.email,
        organizationId: payload.organizationId,
        organization: organization ? { id: organization.id, plan: organization.plan } : null,
      };
      request.authType = 'jwt';

      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
