import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { OrgApiKeyGuard } from '../common/guards/org-api-key.guard';
import { FeatureGuard, RequireFeature } from '../common/guards/feature.guard';
import { SponsorshipService } from './sponsorship.service';
import { CreateSponsorKeyDto, UpdateSponsorKeyDto } from './dto/create-sponsor-key.dto';
import {
  CreateSponsorshipDto,
  UpdateSponsorshipDto,
} from './dto/create-sponsorship.dto';

/**
 * Programmatic Sponsorship API
 * 
 * This controller provides API access to sponsorship management using
 * organization API keys (org_sk_xxx) for authentication.
 * 
 * Base URL: /api/v1/sponsorships
 * Auth: Authorization: Bearer org_sk_xxx
 * 
 * Use case: Server-side programmatic management of sponsored tokens
 * - Issue tokens to users
 * - Manage budgets
 * - Track usage
 */
@Controller('v1/sponsorships')
@UseGuards(OrgApiKeyGuard, FeatureGuard)
@RequireFeature('sponsoredUsage')
export class SponsorshipApiController {
  constructor(private readonly sponsorshipService: SponsorshipService) {}

  // =====================================================
  // SPONSOR KEYS
  // =====================================================

  /**
   * List all sponsor keys
   * GET /api/v1/sponsorships/keys
   */
  @Get('keys')
  async listKeys(@Request() req) {
    const keys = await this.sponsorshipService.listSponsorKeys(req.organizationId);
    
    return {
      data: keys.map((key) => ({
        id: key.id,
        name: key.name,
        provider: key.provider,
        keyHint: key.keyHint,
        baseUrl: key.baseUrl,
        createdAt: key.createdAt,
      })),
    };
  }

  /**
   * Register a new provider API key
   * POST /api/v1/sponsorships/keys
   */
  @Post('keys')
  async createKey(@Request() req, @Body() dto: CreateSponsorKeyDto) {
    const result = await this.sponsorshipService.createSponsorKey(
      req.organizationId,
      dto,
    );
    
    return {
      data: {
        id: result.key.id,
        name: result.key.name,
        provider: result.key.provider,
        keyHint: result.keyHint,
        createdAt: result.key.createdAt,
      },
    };
  }

  /**
   * Delete a sponsor key
   * DELETE /api/v1/sponsorships/keys/:id
   */
  @Delete('keys/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteKey(@Request() req, @Param('id') id: string) {
    await this.sponsorshipService.deleteSponsorKey(id, req.organizationId);
  }

  // =====================================================
  // SPONSORSHIPS (Token Management)
  // =====================================================

  /**
   * List all sponsorships (tokens you've issued)
   * GET /api/v1/sponsorships
   */
  @Get()
  async list(@Request() req, @Query('status') status?: string) {
    const sponsorships = await this.sponsorshipService.listSponsorshipsAsSponsor(
      req.organizationId,
    );
    
    // Filter by status if provided
    const filtered = status 
      ? sponsorships.filter(s => s.status === status)
      : sponsorships;
    
    return {
      data: filtered.map((s) => this.formatSponsorship(s)),
      total: filtered.length,
    };
  }

  /**
   * Create a new sponsorship (issue a token)
   * POST /api/v1/sponsorships
   * 
   * Returns the token - SAVE IT! It's only shown once.
   */
  @Post()
  async create(@Request() req, @Body() dto: CreateSponsorshipDto) {
    const result = await this.sponsorshipService.createSponsorship(
      req.organizationId,
      dto,
    );

    return {
      data: this.formatSponsorship(result.sponsorship),
      token: result.token,
      tokenWarning: result.token 
        ? 'Save this token! It will only be shown once.'
        : null,
      claimUrl: result.claimUrl,
      claimCode: result.claimCode,
    };
  }

  /**
   * Get sponsorship details
   * GET /api/v1/sponsorships/:id
   */
  @Get(':id')
  async get(@Request() req, @Param('id') id: string) {
    const sponsorship = await this.sponsorshipService.getSponsorship(
      id,
      req.organizationId,
      'sponsor',
    );
    
    return {
      data: this.formatSponsorship(sponsorship),
    };
  }

  /**
   * Update sponsorship (adjust budget, limits, etc.)
   * PATCH /api/v1/sponsorships/:id
   */
  @Patch(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateSponsorshipDto,
  ) {
    const sponsorship = await this.sponsorshipService.updateSponsorship(
      id,
      req.organizationId,
      dto,
    );
    
    return {
      data: this.formatSponsorship(sponsorship),
    };
  }

  /**
   * Pause a sponsorship (temporarily disable the token)
   * POST /api/v1/sponsorships/:id/pause
   */
  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  async pause(@Request() req, @Param('id') id: string) {
    const sponsorship = await this.sponsorshipService.pauseSponsorship(
      id,
      req.organizationId,
    );
    
    return {
      data: this.formatSponsorship(sponsorship),
      message: 'Sponsorship paused. Token is temporarily disabled.',
    };
  }

  /**
   * Resume a paused sponsorship
   * POST /api/v1/sponsorships/:id/resume
   */
  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  async resume(@Request() req, @Param('id') id: string) {
    const sponsorship = await this.sponsorshipService.resumeSponsorship(
      id,
      req.organizationId,
    );
    
    return {
      data: this.formatSponsorship(sponsorship),
      message: 'Sponsorship resumed. Token is active again.',
    };
  }

  /**
   * Revoke a sponsorship (permanently disable the token)
   * POST /api/v1/sponsorships/:id/revoke
   */
  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  async revoke(
    @Request() req,
    @Param('id') id: string,
    @Body() body?: { reason?: string },
  ) {
    const sponsorship = await this.sponsorshipService.revokeSponsorship(
      id,
      req.organizationId,
      { reason: body?.reason },
    );
    
    return {
      data: this.formatSponsorship(sponsorship),
      message: 'Sponsorship revoked. Token is permanently disabled.',
    };
  }

  /**
   * Delete a sponsorship (only if revoked)
   * DELETE /api/v1/sponsorships/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Request() req, @Param('id') id: string) {
    await this.sponsorshipService.deleteSponsorship(id, req.organizationId);
  }

  /**
   * Regenerate token for a sponsorship
   * POST /api/v1/sponsorships/:id/regenerate-token
   */
  @Post(':id/regenerate-token')
  @HttpCode(HttpStatus.OK)
  async regenerateToken(@Request() req, @Param('id') id: string) {
    const result = await this.sponsorshipService.regenerateToken(
      id,
      req.organizationId,
    );

    return {
      token: result.token,
      tokenHint: result.tokenHint,
      warning: 'Previous token has been revoked. Save this new token!',
    };
  }

  /**
   * Get usage summary for a sponsorship
   * GET /api/v1/sponsorships/:id/usage
   */
  @Get(':id/usage')
  async getUsage(@Request() req, @Param('id') id: string) {
    const usage = await this.sponsorshipService.getUsageSummary(
      id, 
      req.organizationId, 
      'sponsor',
    );
    
    return { data: usage };
  }

  /**
   * Get usage history for a sponsorship
   * GET /api/v1/sponsorships/:id/usage/history
   */
  @Get(':id/usage/history')
  async getUsageHistory(
    @Request() req,
    @Param('id') id: string,
    @Query('days') days?: string,
  ) {
    const history = await this.sponsorshipService.getUsageHistory(
      id,
      req.organizationId,
      days ? parseInt(days, 10) : 30,
      'sponsor',
    );

    return {
      data: history.map((u) => ({
        id: u.id,
        model: u.model,
        provider: u.provider,
        inputTokens: u.inputTokens,
        outputTokens: u.outputTokens,
        totalTokens: u.totalTokens,
        costUsd: Number(u.costUsd),
        timestamp: u.timestamp,
      })),
    };
  }

  // =====================================================
  // HELPER
  // =====================================================

  private formatSponsorship(s: any) {
    return {
      id: s.id,
      name: s.name,
      description: s.description,
      status: s.status,
      
      // Budget
      spendCapUsd: s.spendCapUsd ? Number(s.spendCapUsd) : null,
      spendCapTokens: s.spendCapTokens ? Number(s.spendCapTokens) : null,
      spentUsd: Number(s.spentUsd || 0),
      spentTokens: Number(s.spentTokens || 0),
      remainingBudgetUsd: s.spendCapUsd
        ? Math.max(0, Number(s.spendCapUsd) - Number(s.spentUsd || 0))
        : null,

      // Constraints
      allowedModels: s.allowedModels,
      maxTokensPerRequest: s.maxTokensPerRequest,
      maxRequestsPerMinute: s.maxRequestsPerMinute,
      maxRequestsPerDay: s.maxRequestsPerDay,
      
      // Billing
      billingPeriod: s.billingPeriod || 'one_time',
      currentPeriodStart: s.currentPeriodStart,
      expiresAt: s.expiresAt,

      // Provider
      provider: s.sponsorKey?.provider || s.providerDirect,

      // Timestamps
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }
}
