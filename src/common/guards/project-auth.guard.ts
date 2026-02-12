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
import { UsersService } from '../../users/users.service';

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
    private usersService: UsersService,
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
      if (
        !payload.organizationId ||
        payload.organizationId !== user.organizationId
      ) {
        throw new UnauthorizedException(
          'Organization context has changed. Please log in again.',
        );
      }

      // Load organization with plan for PlanGuard
      const organization = await this.organizationsService.findById(
        user.organizationId,
      );

      request.user = {
        userId: user.id,
        email: user.email,
        organizationId: user.organizationId,
        organization: organization ? { id: organization.id, plan: organization.plan } : null,
      };
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
