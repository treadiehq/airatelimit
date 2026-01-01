import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { RateLimitService } from '../common/rate-limit.service';
import { MembersService } from '../members/members.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RequestMagicLinkDto } from './dto/request-magic-link.dto';
import { VerifyMagicLinkDto } from './dto/verify-magic-link.dto';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  // Rate limit: 5 magic link requests per email per hour
  private readonly MAGIC_LINK_LIMIT = 5;
  private readonly MAGIC_LINK_WINDOW = 60 * 60 * 1000; // 1 hour

  // Rate limit: 10 verification attempts per IP per 15 minutes
  private readonly VERIFY_LIMIT = 10;
  private readonly VERIFY_WINDOW = 15 * 60 * 1000; // 15 minutes

  constructor(
    private usersService: UsersService,
    private organizationsService: OrganizationsService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private configService: ConfigService,
    private rateLimitService: RateLimitService,
    @Inject(forwardRef(() => MembersService))
    private membersService: MembersService,
  ) {}

  async signup(signupDto: SignupDto) {
    const existing = await this.usersService.findByEmail(signupDto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Handle invite-based signup
    if (signupDto.inviteToken) {
      return this.signupWithInvite(signupDto.email, signupDto.inviteToken);
    }

    // Regular signup - requires organization name
    if (!signupDto.organizationName) {
      throw new BadRequestException('Organization name is required');
    }

    // Check if organization name is already taken
    const existingOrg = await this.organizationsService.findByName(
      signupDto.organizationName,
    );
    if (existingOrg) {
      throw new ConflictException('Organization name already taken');
    }

    // Create organization first (admins get enterprise plan automatically)
    const organization = await this.organizationsService.create(
      signupDto.organizationName,
      undefined,
      { email: signupDto.email },
    );

    // Create user with organization - they'll use magic links
    const user = await this.usersService.create(
      signupDto.email,
      organization.id,
    );

    // Create membership record (user is owner of new org)
    await this.membersService.ensureMembership(user.id, organization.id);

    // Automatically send magic link for first login
    await this.requestMagicLink({ email: user.email }, true);

    return {
      message: 'Account created! Check your email for a magic link to sign in.',
      email: user.email,
      organizationName: organization.name,
    };
  }

  /**
   * Signup with an invite token - creates user and accepts invite in one step
   */
  private async signupWithInvite(email: string, inviteToken: string) {
    // Validate the invite token first
    const inviteDetails = await this.membersService.getInviteByToken(inviteToken);
    if (!inviteDetails) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    // Verify email matches the invite
    if (email.toLowerCase() !== inviteDetails.email.toLowerCase()) {
      throw new BadRequestException(
        `This invitation was sent to ${inviteDetails.email}. Please use that email address.`,
      );
    }

    // Create user with the organization from the invite
    const user = await this.usersService.create(email, inviteDetails.organizationId);

    // Accept the invite (this creates membership and deletes the invite)
    await this.membersService.acceptInvite(inviteToken, user.id);

    // Send magic link for first login
    await this.requestMagicLink({ email: user.email }, true);

    return {
      message: `Account created! You've joined ${inviteDetails.organizationName}. Check your email for a magic link to sign in.`,
      email: user.email,
      organizationName: inviteDetails.organizationName,
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

  async requestMagicLink(dto: RequestMagicLinkDto, isNewUser: boolean = false) {
    // Check if user exists FIRST - prevents attackers from consuming
    // rate limit quota for legitimate users by making failed requests
    const user = await this.usersService.findByEmail(dto.email);

    // Don't auto-create users from login - they must sign up first
    if (!user) {
      throw new UnauthorizedException(
        'No account found with this email. Please sign up first.',
      );
    }

    // Only apply rate limiting for valid users - this prevents denial-of-service
    // attacks where attackers lock out legitimate users by exhausting their quota
    const rateLimitKey = `magic-link:${dto.email.toLowerCase()}`;
    const rateLimit = this.rateLimitService.check(
      rateLimitKey,
      this.MAGIC_LINK_LIMIT,
      this.MAGIC_LINK_WINDOW,
    );

    if (!rateLimit.allowed) {
      throw new HttpException(
        {
          message: 'Too many magic link requests. Please try again later.',
          retryAfter: rateLimit.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');

    // Token expires in 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Save token to user
    await this.usersService.saveMagicLinkToken(user, token, expiresAt);

    // Generate magic link
    const frontendUrl =
      this.configService.get('corsOrigin') || 'http://localhost:3001';
    const magicLink = `${frontendUrl}/auth/verify?token=${token}`;

    // Send email (or log to console in development)
    await this.emailService.sendMagicLink(user.email, magicLink, isNewUser);

    return {
      message: 'Magic link sent! Check your email (or console in development).',
    };
  }

  async verifyMagicLink(dto: VerifyMagicLinkDto, clientIp?: string) {
    // Rate limit verification attempts per IP to prevent brute force
    const rateLimitKey = `verify:${clientIp || 'unknown'}`;
    const rateLimit = this.rateLimitService.check(
      rateLimitKey,
      this.VERIFY_LIMIT,
      this.VERIFY_WINDOW,
    );

    if (!rateLimit.allowed) {
      throw new HttpException(
        {
          message: 'Too many verification attempts. Please try again later.',
          retryAfter: rateLimit.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

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

    // Reset rate limit on successful verification
    this.rateLimitService.reset(rateLimitKey);

    // Auto-manage admin emails: upgrade if admin member exists, downgrade if none
    if (user.organizationId) {
      const org = await this.organizationsService.findById(user.organizationId);

      if (org) {
        // Check if ANY member of the organization is an admin email (not just current user)
        const members = await this.membersService.getMembers(user.organizationId);
        const hasAdminMember = members.some(member =>
          this.organizationsService.isAdminEmail(member.user?.email)
        );

        if (hasAdminMember && org.plan !== 'enterprise') {
          // Organization has admin email member(s) → ensure enterprise plan
          await this.organizationsService.upgradePlan(user.organizationId, 'enterprise');
        } else if (!hasAdminMember && org.plan === 'enterprise' && !org.stripeSubscriptionId) {
          // No admin members, on enterprise, no paid subscription → downgrade to trial
          await this.organizationsService.upgradePlan(user.organizationId, 'trial');
        }
      }

      // Ensure user has a membership record (for users created before team management)
      await this.membersService.ensureMembership(user.id, user.organizationId);
    }

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
