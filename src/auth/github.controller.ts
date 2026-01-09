import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  Request,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';

/**
 * GitHub OAuth Controller
 * 
 * Handles GitHub identity verification for claiming sponsorships.
 * This is NOT a login method - just verification to prove GitHub identity.
 */
@Controller('auth/github')
export class GitHubController {
  private readonly logger = new Logger(GitHubController.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly dashboardUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {
    this.clientId = this.configService.get<string>('GITHUB_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('GITHUB_CLIENT_SECRET') || '';
    this.dashboardUrl = this.configService.get<string>('CORS_ORIGIN') || 'http://localhost:3001';
  }

  /**
   * Initiate GitHub OAuth flow
   * User must be logged in - accepts JWT token from query parameter (for browser redirect)
   */
  @Get('connect')
  async initiateGitHubConnect(
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    if (!this.clientId) {
      throw new BadRequestException('GitHub OAuth is not configured');
    }

    if (!token) {
      throw new UnauthorizedException('Token is required');
    }

    // Verify the JWT token
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const userId = payload.sub;
    if (!userId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Store user ID in state for the callback
    const state = Buffer.from(JSON.stringify({
      userId,
      timestamp: Date.now(),
    })).toString('base64');

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: `${this.configService.get('CORS_ORIGIN')?.replace('3001', '3000') || 'http://localhost:3000'}/api/auth/github/callback`,
      scope: 'read:user user:email',
      state,
    });

    const githubAuthUrl = `https://github.com/login/oauth/authorize?${params}`;
    res.redirect(githubAuthUrl);
  }

  /**
   * GitHub OAuth callback
   * Exchanges code for token, fetches user info, links to account
   */
  @Get('callback')
  async handleGitHubCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const redirectUrl = `${this.dashboardUrl}/sponsorships?tab=received`;

    if (error) {
      this.logger.warn(`GitHub OAuth error: ${error}`);
      return res.redirect(`${redirectUrl}&github_error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return res.redirect(`${redirectUrl}&github_error=missing_params`);
    }

    try {
      // Decode state to get user ID
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      const { userId, timestamp } = stateData;

      // Check state is not too old (10 min max)
      if (Date.now() - timestamp > 10 * 60 * 1000) {
        return res.redirect(`${redirectUrl}&github_error=expired`);
      }

      // Exchange code for access token
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        this.logger.error(`GitHub token error: ${tokenData.error}`);
        return res.redirect(`${redirectUrl}&github_error=${tokenData.error}`);
      }

      const accessToken = tokenData.access_token;

      // Fetch GitHub user info
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      const githubUser = await userResponse.json();

      if (!githubUser.id || !githubUser.login) {
        return res.redirect(`${redirectUrl}&github_error=invalid_user`);
      }

      // Link GitHub to user account
      await this.authService.linkGitHubAccount(userId, {
        githubId: String(githubUser.id),
        githubUsername: githubUser.login,
      });

      this.logger.log(`Linked GitHub user ${githubUser.login} to user ${userId}`);

      // Redirect back to dashboard with success
      return res.redirect(`${redirectUrl}&github_linked=${githubUser.login}`);
    } catch (err) {
      this.logger.error(`GitHub callback error: ${err.message}`);
      return res.redirect(`${redirectUrl}&github_error=internal`);
    }
  }

  /**
   * Check if GitHub is configured
   */
  @Get('status')
  async getGitHubStatus() {
    return {
      configured: Boolean(this.clientId && this.clientSecret),
    };
  }

  /**
   * Get current user's linked GitHub info
   */
  @Get('linked')
  @UseGuards(JwtAuthGuard)
  async getLinkedGitHub(@Request() req) {
    const user = await this.authService.getUserById(req.user.userId);
    
    return {
      linked: Boolean(user?.linkedGitHubUsername),
      githubUsername: user?.linkedGitHubUsername || null,
      linkedAt: user?.linkedGitHubAt || null,
    };
  }

  /**
   * Unlink GitHub from account
   */
  @Get('unlink')
  @UseGuards(JwtAuthGuard)
  async unlinkGitHub(@Request() req) {
    await this.authService.unlinkGitHubAccount(req.user.userId);
    return { success: true };
  }
}

