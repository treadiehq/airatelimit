import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FeatureGuard, RequireFeature } from '../common/guards/feature.guard';
import { SponsorshipService } from './sponsorship.service';
import { UsersService } from '../users/users.service';

/**
 * Sponsored Controller
 * 
 * Endpoints for recipients to view their sponsored usage.
 * All endpoints require authentication and sponsoredUsage feature flag.
 */
@Controller('sponsored')
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireFeature('sponsoredUsage')
export class SponsoredController {
  constructor(
    private readonly sponsorshipService: SponsorshipService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * List sponsorships available to me as a recipient
   */
  @Get()
  async listMySponsorships(@Request() req) {
    const sponsorships = await this.sponsorshipService.listSponsorshipsAsRecipient(
      req.user.organizationId,
    );

    // Get org-specific spend for each sponsorship
    const results = await Promise.all(
      sponsorships.map(async (s) => {
        const mySpend = await this.sponsorshipService.getOrgSpend(
          s.id,
          req.user.organizationId,
        );

        return {
          id: s.id,
          name: s.name,
          description: s.description,
          status: s.status,
          provider: s.sponsorKey?.provider,

          // My org's spend
          mySpentUsd: mySpend.spentUsd,
          mySpentTokens: mySpend.spentTokens,

          // Total budget remaining (so recipient knows how much is left overall)
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

          // Constraints (so recipient knows limits)
          allowedModels: s.allowedModels,
          maxTokensPerRequest: s.maxTokensPerRequest,
          expiresAt: s.expiresAt,

          // Sponsor info (minimal)
          sponsorName: s.sponsorOrg?.name,

          createdAt: s.createdAt,
        };
      }),
    );

    return results;
  }

  /**
   * Get details of a specific sponsorship I'm receiving
   */
  @Get(':id')
  async getSponsorship(@Request() req, @Param('id') id: string) {
    const s = await this.sponsorshipService.getSponsorship(
      id,
      req.user.organizationId,
      'recipient',
    );

    // Get this org's specific spend
    const mySpend = await this.sponsorshipService.getOrgSpend(
      id,
      req.user.organizationId,
    );

    return {
      id: s.id,
      name: s.name,
      description: s.description,
      status: s.status,
      provider: s.sponsorKey?.provider,

      // My org's spend
      mySpentUsd: mySpend.spentUsd,
      mySpentTokens: mySpend.spentTokens,

      // Total spend (for budget context)
      totalSpentUsd: Number(s.spentUsd),
      totalSpentTokens: Number(s.spentTokens),

      // Budget remaining (overall)
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

      // Constraints
      allowedModels: s.allowedModels,
      maxTokensPerRequest: s.maxTokensPerRequest,
      maxRequestsPerMinute: s.maxRequestsPerMinute,
      maxRequestsPerDay: s.maxRequestsPerDay,
      expiresAt: s.expiresAt,

      // Sponsor info
      sponsorName: s.sponsorOrg?.name,

      createdAt: s.createdAt,
    };
  }

  /**
   * Get my usage summary for a sponsorship (only shows this org's usage)
   */
  @Get(':id/usage')
  async getUsageSummary(@Request() req, @Param('id') id: string) {
    return this.sponsorshipService.getUsageSummary(id, req.user.organizationId, 'recipient');
  }

  /**
   * Get my usage history for a sponsorship (only shows this org's usage)
   */
  @Get(':id/usage/history')
  async getUsageHistory(@Request() req, @Param('id') id: string) {
    const usage = await this.sponsorshipService.getUsageHistory(
      id,
      req.user.organizationId,
      30, // Last 30 days
      'recipient',
    );

    return usage.map((u) => ({
      id: u.id,
      model: u.model,
      inputTokens: u.inputTokens,
      outputTokens: u.outputTokens,
      totalTokens: u.totalTokens,
      costUsd: Number(u.costUsd),
      timestamp: u.timestamp,
    }));
  }

  // =====================================================
  // GITHUB-BASED CLAIMING
  // =====================================================

  /**
   * Get pending sponsorships for the current user's linked GitHub account
   */
  @Get('pending/github')
  async getPendingGitHubSponsorships(@Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    
    if (!user?.linkedGitHubUsername) {
      return {
        linked: false,
        githubUsername: null,
        pending: [],
      };
    }

    const pending = await this.sponsorshipService.findPendingSponsorshipsByGitHub(
      user.linkedGitHubUsername,
    );

    return {
      linked: true,
      githubUsername: user.linkedGitHubUsername,
      pending: pending.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        provider: s.sponsorKey?.provider,
        spendCapUsd: s.spendCapUsd ? Number(s.spendCapUsd) : null,
        spendCapTokens: s.spendCapTokens ? Number(s.spendCapTokens) : null,
        sponsorName: s.sponsorOrg?.name,
        expiresAt: s.expiresAt,
        createdAt: s.createdAt,
      })),
    };
  }

  /**
   * Claim all pending GitHub sponsorships for the current user
   */
  @Post('claim/github')
  async claimGitHubSponsorships(@Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    
    if (!user?.linkedGitHubUsername) {
      return {
        success: false,
        error: 'No GitHub account linked. Please verify your GitHub identity first.',
        claimed: [],
      };
    }

    const claimed = await this.sponsorshipService.claimSponsorshipsByGitHub(
      user.linkedGitHubUsername,
      req.user.organizationId,
    );

    return {
      success: true,
      claimed: claimed.map((s) => ({
        id: s.id,
        name: s.name,
        provider: s.sponsorKey?.provider,
        spendCapUsd: s.spendCapUsd ? Number(s.spendCapUsd) : null,
      })),
    };
  }
}

