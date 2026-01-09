import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { Sponsorship } from './sponsorship.entity';
import { SponsoredToken } from './sponsored-token.entity';
import { User } from '../users/user.entity';
import { CryptoService } from '../common/crypto.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { CreatePublicSponsorshipDto } from './dto/public-sponsorship.dto';

const BCRYPT_ROUNDS = 10;
const SPONSORED_TOKEN_PREFIX = 'spt_live_';
const TOKEN_BYTES = 24;

interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string; organizationId: string };
}

/**
 * Public Sponsorship Controller
 * 
 * Handles sponsorship creation via public badge/link.
 * Supports both authenticated and anonymous sponsors.
 */
@Controller('public/sponsor')
export class PublicSponsorshipController {
  constructor(
    @InjectRepository(Sponsorship)
    private sponsorshipRepository: Repository<Sponsorship>,
    @InjectRepository(SponsoredToken)
    private sponsoredTokenRepository: Repository<SponsoredToken>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private cryptoService: CryptoService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  /**
   * Get recipient info for badge page
   * Public endpoint - no auth required
   */
  @Get(':username')
  async getRecipientInfo(@Param('username') username: string) {
    // Look up user by GitHub username
    const user = await this.userRepository.findOne({
      where: { linkedGitHubUsername: username.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException(`User @${username} not found or hasn't linked their GitHub`);
    }

    return {
      username: user.linkedGitHubUsername,
      displayName: user.linkedGitHubUsername, // Could be enhanced with profile info
    };
  }

  /**
   * Create a sponsorship via public badge
   * Supports both authenticated and anonymous sponsors
   */
  @Post(':username')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createPublicSponsorship(
    @Param('username') recipientUsername: string,
    @Body() dto: CreatePublicSponsorshipDto,
    @Req() req: AuthenticatedRequest,
  ) {
    // Validate recipient exists
    const recipient = await this.userRepository.findOne({
      where: { linkedGitHubUsername: recipientUsername.toLowerCase() },
    });

    if (!recipient) {
      throw new NotFoundException(`User @${recipientUsername} not found`);
    }

    // Validate budget
    if (!dto.spendCapUsd && !dto.spendCapTokens) {
      throw new BadRequestException('Either spendCapUsd or spendCapTokens is required');
    }

    // Validate API key format matches provider
    const keyValidation = this.validateApiKeyFormat(dto.apiKey, dto.provider);
    if (!keyValidation.valid) {
      throw new BadRequestException(keyValidation.error);
    }

    const isAuthenticated = !!req.user;

    // Anonymous sponsors must provide email
    if (!isAuthenticated && !dto.sponsorEmail) {
      throw new BadRequestException('Email is required for anonymous sponsorships');
    }

    // Encrypt the API key
    const encryptedApiKey = this.cryptoService.encrypt(dto.apiKey);

    // Generate management token for anonymous sponsors
    let managementToken: string | undefined;
    let managementTokenHash: string | undefined;

    if (!isAuthenticated) {
      managementToken = crypto.randomBytes(32).toString('hex');
      managementTokenHash = await bcrypt.hash(managementToken, BCRYPT_ROUNDS);
    }

    // Create sponsorship name if not provided
    const name = dto.name || `Sponsorship for @${recipientUsername}`;

    // Create the sponsorship
    const sponsorship = this.sponsorshipRepository.create({
      // Recipient info
      recipientOrgId: recipient.organizationId,
      targetGitHubUsername: recipientUsername.toLowerCase(),
      
      // Anonymous sponsor info
      sponsorEmail: (dto.sponsorEmail || req.user?.email)?.toLowerCase(),
      encryptedApiKeyDirect: encryptedApiKey,
      providerDirect: dto.provider,
      managementTokenHash,
      
      // For authenticated sponsors, link to their org
      sponsorOrgId: isAuthenticated ? req.user.organizationId : null,
      sponsorKeyId: null, // No sponsor key for public sponsorships
      
      // Sponsorship details
      name,
      description: dto.description,
      spendCapUsd: dto.spendCapUsd,
      spendCapTokens: dto.spendCapTokens,
      allowedModels: dto.allowedModels,
      maxTokensPerRequest: dto.maxTokensPerRequest,
      maxRequestsPerMinute: dto.maxRequestsPerMinute,
      maxRequestsPerDay: dto.maxRequestsPerDay,
      billingPeriod: 'one_time',
      status: 'pending', // Pending until recipient accepts
    });

    await this.sponsorshipRepository.save(sponsorship);

    // Note: Token will be generated when recipient accepts the sponsorship

    // Send management email to anonymous sponsors
    if (!isAuthenticated && dto.sponsorEmail) {
      const dashboardUrl = this.configService.get<string>('dashboardUrl') || 'http://localhost:3001';
      const manageLink = `${dashboardUrl}/manage-sponsorship/${managementToken}`;

      await this.emailService.sendSponsorshipManagementEmail({
        sponsorEmail: dto.sponsorEmail,
        recipientUsername,
        sponsorshipName: name,
        spendCapUsd: dto.spendCapUsd,
        provider: dto.provider,
        manageLink,
      });
    }

    return {
      id: sponsorship.id,
      name: sponsorship.name,
      recipientUsername,
      spendCapUsd: dto.spendCapUsd,
      provider: dto.provider,
      status: 'pending',
      managementToken: !isAuthenticated ? managementToken : undefined,
      createdAt: sponsorship.createdAt,
      message: 'Sponsorship created! The recipient will need to accept it to receive their API token.',
    };
  }

  /**
   * View sponsorship via management token (anonymous sponsors)
   */
  @Get('manage/:token')
  async viewSponsorshipByToken(@Param('token') token: string) {
    const sponsorship = await this.findSponsorshipByManagementToken(token);
    
    return {
      id: sponsorship.id,
      name: sponsorship.name,
      targetGitHubUsername: sponsorship.targetGitHubUsername,
      spendCapUsd: sponsorship.spendCapUsd,
      spentUsd: sponsorship.spentUsd,
      provider: sponsorship.providerDirect,
      status: sponsorship.status,
      createdAt: sponsorship.createdAt,
    };
  }

  /**
   * Revoke sponsorship via management token (anonymous sponsors)
   */
  @Delete('manage/:token')
  @HttpCode(HttpStatus.OK)
  async revokeSponsorshipByToken(
    @Param('token') token: string,
    @Body() body: { reason?: string },
  ) {
    const sponsorship = await this.findSponsorshipByManagementToken(token);

    if (sponsorship.status === 'revoked') {
      throw new BadRequestException('Sponsorship is already revoked');
    }

    sponsorship.status = 'revoked';
    sponsorship.revokedAt = new Date();
    sponsorship.revokedReason = body.reason || 'Revoked via management link';

    await this.sponsorshipRepository.save(sponsorship);

    return {
      message: 'Sponsorship revoked successfully',
      id: sponsorship.id,
    };
  }

  /**
   * Find sponsorship by management token
   */
  private async findSponsorshipByManagementToken(token: string): Promise<Sponsorship> {
    // Find all sponsorships with management tokens
    const sponsorships = await this.sponsorshipRepository.find({
      where: {
        managementTokenHash: Not(IsNull()),
      },
    });

    // Verify token against each
    for (const sponsorship of sponsorships) {
      const isValid = await bcrypt.compare(token, sponsorship.managementTokenHash);
      if (isValid) {
        return sponsorship;
      }
    }

    throw new NotFoundException('Invalid or expired management token');
  }

  /**
   * Validate API key format matches the expected provider pattern
   */
  private validateApiKeyFormat(
    apiKey: string,
    provider: 'openai' | 'anthropic' | 'google' | 'xai',
  ): { valid: boolean; error?: string } {
    const trimmedKey = apiKey.trim();
    
    if (!trimmedKey || trimmedKey.length < 10) {
      return { valid: false, error: 'API key is too short' };
    }

    // Provider-specific format validation
    switch (provider) {
      case 'openai':
        // OpenAI keys: sk-... or sk-proj-... (newer format)
        if (!trimmedKey.startsWith('sk-')) {
          return { 
            valid: false, 
            error: 'OpenAI API keys should start with "sk-"' 
          };
        }
        break;

      case 'anthropic':
        // Anthropic keys: sk-ant-...
        if (!trimmedKey.startsWith('sk-ant-')) {
          return { 
            valid: false, 
            error: 'Anthropic API keys should start with "sk-ant-"' 
          };
        }
        break;

      case 'google':
        // Google AI keys: AIza...
        if (!trimmedKey.startsWith('AIza')) {
          return { 
            valid: false, 
            error: 'Google AI API keys should start with "AIza"' 
          };
        }
        break;

      case 'xai':
        // xAI keys: xai-...
        if (!trimmedKey.startsWith('xai-')) {
          return { 
            valid: false, 
            error: 'xAI API keys should start with "xai-"' 
          };
        }
        break;

      default:
        return { valid: false, error: 'Unknown provider' };
    }

    return { valid: true };
  }

}
