import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FeatureGuard, RequireFeature } from '../common/guards/feature.guard';
import { SponsorshipService } from './sponsorship.service';

/**
 * Claim Controller
 * 
 * Endpoints for claiming sponsorships via links or codes.
 * GET endpoints are public (to show claim page info).
 * POST endpoints require authentication.
 */
@Controller('claim')
export class ClaimController {
  constructor(
    private readonly sponsorshipService: SponsorshipService,
  ) {}

  // =====================================================
  // PUBLIC ENDPOINTS (no auth required)
  // =====================================================

  /**
   * Get claimable sponsorship info by token (for public claim page)
   */
  @Get('token/:token')
  async getClaimableSponsorshipByToken(@Param('token') token: string) {
    return this.sponsorshipService.getClaimableSponsorshipByToken(token);
  }

  /**
   * Get claimable sponsorship info by code (for code lookup)
   */
  @Get('code/:code')
  async getClaimableSponsorshipByCode(@Param('code') code: string) {
    return this.sponsorshipService.getClaimableSponsorshipByCode(code);
  }

  // =====================================================
  // AUTHENTICATED ENDPOINTS
  // =====================================================

  /**
   * Claim a sponsorship by token
   */
  @Post('token/:token')
  @UseGuards(JwtAuthGuard, FeatureGuard)
  @RequireFeature('sponsoredUsage')
  async claimSponsorshipByToken(
    @Param('token') token: string,
    @Request() req,
  ) {
    const result = await this.sponsorshipService.claimSponsorshipByToken(
      token,
      req.user.organizationId,
    );

    return {
      success: true,
      message: 'Sponsorship claimed successfully!',
      sponsorship: {
        id: result.sponsorship.id,
        name: result.sponsorship.name,
        description: result.sponsorship.description,
        budgetUsd: result.sponsorship.spendCapUsd ? Number(result.sponsorship.spendCapUsd) : null,
        perClaimBudgetUsd: result.sponsorship.perClaimBudgetUsd ? Number(result.sponsorship.perClaimBudgetUsd) : null,
      },
      token: result.token,
    };
  }

  /**
   * Claim a sponsorship by code
   */
  @Post('code/:code')
  @UseGuards(JwtAuthGuard, FeatureGuard)
  @RequireFeature('sponsoredUsage')
  async claimSponsorshipByCode(
    @Param('code') code: string,
    @Request() req,
  ) {
    const result = await this.sponsorshipService.claimSponsorshipByCode(
      code,
      req.user.organizationId,
    );

    return {
      success: true,
      message: 'Sponsorship claimed successfully!',
      sponsorship: {
        id: result.sponsorship.id,
        name: result.sponsorship.name,
        description: result.sponsorship.description,
        budgetUsd: result.sponsorship.spendCapUsd ? Number(result.sponsorship.spendCapUsd) : null,
        perClaimBudgetUsd: result.sponsorship.perClaimBudgetUsd ? Number(result.sponsorship.perClaimBudgetUsd) : null,
      },
      token: result.token,
    };
  }
}
