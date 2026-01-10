import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';

export interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private organizationsService: OrganizationsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwtSecret'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }

    // Load organization with plan for feature/plan guards
    const organization = user.organizationId
      ? await this.organizationsService.findById(user.organizationId)
      : null;

    return {
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      organization: organization ? { id: organization.id, plan: organization.plan } : null,
    };
  }
}
