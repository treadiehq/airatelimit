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

  // =====================================================
  // PENDING SPONSORSHIPS & CLAIMING (MUST BE BEFORE :id ROUTES)
  // =====================================================

  /**
   * Get all pending sponsorships for the current user
   * Checks both GitHub username and email
   */
  @Get('pending')
  async getPendingSponsorships(@Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    
    // Find pending by email
    const pendingByEmail = await this.sponsorshipService.findPendingSponsorshipsByEmail(
      user.email,
    );
    
    // Find pending by GitHub (if linked)
    let pendingByGitHub: any[] = [];
    if (user?.linkedGitHubUsername) {
      pendingByGitHub = await this.sponsorshipService.findPendingSponsorshipsByGitHub(
        user.linkedGitHubUsername,
      );
    }

    // Combine and dedupe (a sponsorship could match both email and GitHub)
    const allPendingMap = new Map<string, any>();
    
    for (const s of [...pendingByEmail, ...pendingByGitHub]) {
      if (!allPendingMap.has(s.id)) {
        allPendingMap.set(s.id, {
          id: s.id,
          name: s.name,
          description: s.description,
          provider: s.sponsorKey?.provider,
          spendCapUsd: s.spendCapUsd ? Number(s.spendCapUsd) : null,
          spendCapTokens: s.spendCapTokens ? Number(s.spendCapTokens) : null,
          sponsorName: s.sponsorOrg?.name,
          targetGitHubUsername: s.targetGitHubUsername,
          recipientEmail: s.recipientEmail,
          expiresAt: s.expiresAt,
          createdAt: s.createdAt,
          // Can claim directly if no GitHub requirement
          canClaimDirectly: !s.targetGitHubUsername,
        });
      }
    }

    return {
      githubLinked: Boolean(user?.linkedGitHubUsername),
      githubUsername: user?.linkedGitHubUsername || null,
      email: user.email,
      pending: Array.from(allPendingMap.values()),
    };
  }

  /**
   * Get pending sponsorships for the current user's linked GitHub account
   * @deprecated Use GET /pending instead
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

  // =====================================================
  // SPONSORSHIP DETAILS (PARAMETERIZED ROUTES AFTER STATIC)
  // =====================================================

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

  /**
   * Claim a specific pending sponsorship
   */
  @Post('claim/:id')
  async claimSponsorship(@Request() req, @Param('id') id: string) {
    const user = await this.usersService.findById(req.user.userId);
    
    // First check if this is an email-only sponsorship (no GitHub required)
    try {
      const claimed = await this.sponsorshipService.claimSponsorshipByEmail(
        id,
        user.email,
        req.user.organizationId,
      );
      return {
        success: true,
        sponsorship: {
          id: claimed.id,
          name: claimed.name,
        },
      };
    } catch (error) {
      // If it requires GitHub, check if user has linked GitHub
      if (error.message?.includes('GitHub verification') || error.message?.includes('no email recipient')) {
        if (!user?.linkedGitHubUsername) {
          return {
            success: false,
            error: 'This sponsorship requires GitHub verification. Please link your GitHub account first.',
            requiresGitHub: true,
          };
        }
        
        // Try to claim via GitHub
        const claimed = await this.sponsorshipService.claimSponsorshipByGitHub(
          id,
          user.linkedGitHubUsername,
          req.user.organizationId,
        );
        return {
          success: true,
          sponsorship: {
            id: claimed.id,
            name: claimed.name,
          },
        };
      }
      throw error;
    }
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

