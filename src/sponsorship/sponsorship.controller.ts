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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FeatureGuard, RequireFeature } from '../common/guards/feature.guard';
import { SponsorshipService } from './sponsorship.service';
import { CreateSponsorKeyDto, UpdateSponsorKeyDto } from './dto/create-sponsor-key.dto';
import {
  CreateSponsorshipDto,
  UpdateSponsorshipDto,
  RevokeSponsorshipDto,
} from './dto/create-sponsorship.dto';

/**
 * Sponsorship Controller
 * 
 * Endpoints for sponsors to manage their keys and sponsorships.
 * All endpoints require authentication and sponsoredUsage feature flag.
 */
@Controller('sponsorships')
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireFeature('sponsoredUsage')
export class SponsorshipController {
  constructor(private readonly sponsorshipService: SponsorshipService) {}

  // =====================================================
  // SPONSOR KEYS
  // =====================================================

  /**
   * Register a new provider API key for sponsorship
   */
  @Post('keys')
  async createSponsorKey(
    @Request() req,
    @Body() dto: CreateSponsorKeyDto,
  ) {
    const result = await this.sponsorshipService.createSponsorKey(
      req.user.organizationId,
      dto,
    );
    
    return {
      id: result.key.id,
      name: result.key.name,
      provider: result.key.provider,
      keyHint: result.keyHint,
      createdAt: result.key.createdAt,
    };
  }

  /**
   * List sponsor keys for my organization
   */
  @Get('keys')
  async listSponsorKeys(@Request() req) {
    const keys = await this.sponsorshipService.listSponsorKeys(req.user.organizationId);
    
    return keys.map((key) => ({
      id: key.id,
      name: key.name,
      provider: key.provider,
      keyHint: key.keyHint,
      baseUrl: key.baseUrl,
      createdAt: key.createdAt,
    }));
  }

  /**
   * Get sponsor key details
   */
  @Get('keys/:id')
  async getSponsorKey(@Request() req, @Param('id') id: string) {
    const key = await this.sponsorshipService.getSponsorKey(id, req.user.organizationId);
    
    return {
      id: key.id,
      name: key.name,
      provider: key.provider,
      keyHint: key.keyHint,
      baseUrl: key.baseUrl,
      createdAt: key.createdAt,
    };
  }

  /**
   * Update sponsor key
   */
  @Patch('keys/:id')
  async updateSponsorKey(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateSponsorKeyDto,
  ) {
    const key = await this.sponsorshipService.updateSponsorKey(
      id,
      req.user.organizationId,
      dto,
    );
    
    return {
      id: key.id,
      name: key.name,
      provider: key.provider,
      keyHint: key.keyHint,
      baseUrl: key.baseUrl,
      updatedAt: key.updatedAt,
    };
  }

  /**
   * Delete sponsor key
   */
  @Delete('keys/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSponsorKey(@Request() req, @Param('id') id: string) {
    await this.sponsorshipService.deleteSponsorKey(id, req.user.organizationId);
  }

  // =====================================================
  // SPONSORSHIPS (as sponsor)
  // =====================================================

  /**
   * Create a new sponsorship
   * Returns the sponsorship details AND the one-time visible token
   */
  @Post()
  async createSponsorship(
    @Request() req,
    @Body() dto: CreateSponsorshipDto,
  ) {
    const result = await this.sponsorshipService.createSponsorship(
      req.user.organizationId,
      dto,
    );

    return {
      sponsorship: this.formatSponsorship(result.sponsorship),
      token: result.token, // Only shown once!
      tokenWarning: 'This token will only be shown once. Store it securely.',
    };
  }

  /**
   * List sponsorships I've created
   */
  @Get()
  async listSponsorships(@Request() req) {
    const sponsorships = await this.sponsorshipService.listSponsorshipsAsSponsor(
      req.user.organizationId,
    );
    
    return sponsorships.map((s) => this.formatSponsorship(s));
  }

  /**
   * Get sponsorship details
   */
  @Get(':id')
  async getSponsorship(@Request() req, @Param('id') id: string) {
    const sponsorship = await this.sponsorshipService.getSponsorship(
      id,
      req.user.organizationId,
      'sponsor',
    );
    
    return this.formatSponsorship(sponsorship);
  }

  /**
   * Update sponsorship
   */
  @Patch(':id')
  async updateSponsorship(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateSponsorshipDto,
  ) {
    const sponsorship = await this.sponsorshipService.updateSponsorship(
      id,
      req.user.organizationId,
      dto,
    );
    
    return this.formatSponsorship(sponsorship);
  }

  /**
   * Pause sponsorship
   */
  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  async pauseSponsorship(@Request() req, @Param('id') id: string) {
    const sponsorship = await this.sponsorshipService.pauseSponsorship(
      id,
      req.user.organizationId,
    );
    
    return this.formatSponsorship(sponsorship);
  }

  /**
   * Resume sponsorship
   */
  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  async resumeSponsorship(@Request() req, @Param('id') id: string) {
    const sponsorship = await this.sponsorshipService.resumeSponsorship(
      id,
      req.user.organizationId,
    );
    
    return this.formatSponsorship(sponsorship);
  }

  /**
   * Revoke sponsorship instantly
   */
  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  async revokeSponsorship(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: RevokeSponsorshipDto,
  ) {
    const sponsorship = await this.sponsorshipService.revokeSponsorship(
      id,
      req.user.organizationId,
      dto,
    );
    
    return this.formatSponsorship(sponsorship);
  }

  /**
   * Regenerate token for a sponsorship
   */
  @Post(':id/regenerate-token')
  @HttpCode(HttpStatus.OK)
  async regenerateToken(@Request() req, @Param('id') id: string) {
    const result = await this.sponsorshipService.regenerateToken(
      id,
      req.user.organizationId,
    );

    return {
      tokenId: result.tokenId,
      token: result.token, // Only shown once!
      tokenHint: result.tokenHint,
      warning: 'Previous tokens have been revoked. This new token will only be shown once.',
    };
  }

  /**
   * Get usage summary for a sponsorship (sponsors see ALL usage)
   */
  @Get(':id/usage')
  async getUsageSummary(@Request() req, @Param('id') id: string) {
    return this.sponsorshipService.getUsageSummary(id, req.user.organizationId, 'sponsor');
  }

  /**
   * Get usage history for a sponsorship (sponsors see ALL usage)
   */
  @Get(':id/usage/history')
  async getUsageHistory(
    @Request() req,
    @Param('id') id: string,
    @Query('days') days?: string,
  ) {
    const usage = await this.sponsorshipService.getUsageHistory(
      id,
      req.user.organizationId,
      days ? parseInt(days, 10) : 30,
      'sponsor',
    );

    return usage.map((u) => ({
      id: u.id,
      model: u.model,
      provider: u.provider,
      inputTokens: u.inputTokens,
      outputTokens: u.outputTokens,
      totalTokens: u.totalTokens,
      costUsd: Number(u.costUsd),
      timestamp: u.timestamp,
    }));
  }

  // =====================================================
  // HELPER METHODS
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
      spentUsd: Number(s.spentUsd),
      spentTokens: Number(s.spentTokens),
      remainingBudgetUsd: s.spendCapUsd
        ? Math.max(0, Number(s.spendCapUsd) - Number(s.spentUsd))
        : null,
      remainingBudgetTokens: s.spendCapTokens
        ? Math.max(0, Number(s.spendCapTokens) - Number(s.spentTokens))
        : null,
      budgetUsedPercent: s.spendCapUsd
        ? (Number(s.spentUsd) / Number(s.spendCapUsd)) * 100
        : s.spendCapTokens
        ? (Number(s.spentTokens) / Number(s.spendCapTokens)) * 100
        : 0,

      // Billing period
      billingPeriod: s.billingPeriod || 'one_time',
      currentPeriodStart: s.currentPeriodStart,

      // Constraints
      allowedModels: s.allowedModels,
      maxTokensPerRequest: s.maxTokensPerRequest,
      maxRequestsPerMinute: s.maxRequestsPerMinute,
      maxRequestsPerDay: s.maxRequestsPerDay,
      expiresAt: s.expiresAt,

      // Provider info (from sponsor key)
      provider: s.sponsorKey?.provider,

      // Recipient info
      recipientOrgId: s.recipientOrgId,
      recipientOrgName: s.recipientOrg?.name,
      recipientEmail: s.recipientEmail,

      // Timestamps
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      revokedAt: s.revokedAt,
      revokedReason: s.revokedReason,
    };
  }
}

