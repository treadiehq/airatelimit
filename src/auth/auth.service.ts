import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RequestMagicLinkDto } from './dto/request-magic-link.dto';
import { VerifyMagicLinkDto } from './dto/verify-magic-link.dto';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private organizationsService: OrganizationsService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async signup(signupDto: SignupDto) {
    const existing = await this.usersService.findByEmail(signupDto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Check if organization name is already taken
    const existingOrg = await this.organizationsService.findByName(
      signupDto.organizationName,
    );
    if (existingOrg) {
      throw new ConflictException('Organization name already taken');
    }

    // Create organization first
    const organization = await this.organizationsService.create(
      signupDto.organizationName,
    );

    // Create user with organization - they'll use magic links
    const user = await this.usersService.create(
      signupDto.email,
      organization.id,
    );

    // Automatically send magic link for first login
    await this.requestMagicLink({ email: user.email });

    return {
      message: 'Account created! Check your email for a magic link to sign in.',
      email: user.email,
      organizationName: organization.name,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await this.usersService.validatePassword(
      user,
      loginDto.password,
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  async requestMagicLink(dto: RequestMagicLinkDto) {
    const user = await this.usersService.findByEmail(dto.email);

    // Don't auto-create users from login - they must sign up first
    if (!user) {
      throw new UnauthorizedException(
        'No account found with this email. Please sign up first.',
      );
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');

    // Token expires in 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Save token to user
    await this.usersService.saveMagicLinkToken(user, token, expiresAt);

    // Generate magic link
    const frontendUrl = this.configService.get('corsOrigin') || 'http://localhost:3001';
    const magicLink = `${frontendUrl}/auth/verify?token=${token}`;

    // Send email (or log to console in development)
    await this.emailService.sendMagicLink(user.email, magicLink);

    return {
      message: 'Magic link sent! Check your email (or console in development).',
    };
  }

  async verifyMagicLink(dto: VerifyMagicLinkDto) {
    const user = await this.usersService.findByMagicLinkToken(dto.token);

    if (!user) {
      throw new BadRequestException('Invalid or expired magic link');
    }

    // Check if token has expired
    if (user.magicLinkExpiresAt < new Date()) {
      await this.usersService.clearMagicLinkToken(user);
      throw new BadRequestException('Magic link has expired');
    }

    // Clear the magic link token
    await this.usersService.clearMagicLinkToken(user);

    // Generate JWT with organizationId
    const payload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        organizationId: user.organizationId,
      },
    };
  }
}

