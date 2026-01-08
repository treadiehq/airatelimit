import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlanGuard, RequirePlanFeature } from '../common/guards/plan.guard';
import { FeatureGuard, RequireFeature } from '../common/guards/feature.guard';
import { SponsorshipService } from './sponsorship.service';
import { KeyPoolService } from './key-pool.service';
import { CreateSponsorshipDto } from './dto/create-sponsorship.dto';
import { UpdateSponsorshipDto } from './dto/update-sponsorship.dto';
import { CreateKeyPoolEntryDto } from './dto/create-key-pool-entry.dto';
import { UpdateKeyPoolEntryDto } from './dto/update-key-pool-entry.dto';

/**
 * Sponsorship Controller
 * 
 * Available in:
 * - Cloud mode: Pro and Enterprise plans only
 * - Enterprise mode: Always available
 * - Self-hosted mode: Not available
 */
@Controller('sponsorships')
@UseGuards(JwtAuthGuard, FeatureGuard, PlanGuard)
@RequireFeature('sponsorship')
@RequirePlanFeature('sponsorship')
export class SponsorshipController {
  constructor(
    private readonly sponsorshipService: SponsorshipService,
    private readonly keyPoolService: KeyPoolService,
  ) {}

  // ====================================
  // SPONSORSHIPS (Token Donations)
  // ====================================

  /**
   * Create a new sponsorship (donate tokens to a recipient)
   */
  @Post()
  async createSponsorship(
    @Request() req: any,
    @Body() dto: CreateSponsorshipDto,
  ) {
    return this.sponsorshipService.create(
      req.user.userId,
      req.user.organizationId,
      dto,
    );
  }

  /**
   * Get all sponsorships I've created
   */
  @Get('given')
  async getMySponsorships(@Request() req: any) {
    return this.sponsorshipService.findBySponsor(req.user.userId);
  }

  /**
   * Get my sponsor stats
   */
  @Get('given/stats')
  async getMySponsorStats(@Request() req: any) {
    return this.sponsorshipService.getSponsorStats(req.user.userId);
  }

  /**
   * Get sponsorships received by an identity (for recipients to see their sponsors)
   */
  @Get('received')
  async getReceivedSponsorships(
    @Request() req: any,
    @Query('identity') identity?: string,
    @Query('projectId') projectId?: string,
  ) {
    // Default to the user's email as identity if not specified
    const recipientIdentity = identity || req.user.email;
    return this.sponsorshipService.findByRecipient(recipientIdentity, projectId);
  }

  /**
   * Get available budget for a recipient
   */
  @Get('budget')
  async getAvailableBudget(
    @Query('projectId') projectId: string,
    @Query('identity') identity: string,
    @Query('budgetType') budgetType: 'tokens' | 'requests' = 'tokens',
  ) {
    return this.sponsorshipService.getAvailableBudget(projectId, identity, budgetType);
  }

  /**
   * Get a single sponsorship
   */
  @Get(':id')
  async getSponsorship(@Param('id') id: string) {
    return this.sponsorshipService.findOne(id);
  }

  /**
   * Update a sponsorship (only sponsor can update)
   */
  @Put(':id')
  async updateSponsorship(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateSponsorshipDto,
  ) {
    return this.sponsorshipService.update(id, req.user.userId, dto);
  }

  /**
   * Delete a sponsorship (only sponsor can delete)
   */
  @Delete(':id')
  async deleteSponsorship(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    await this.sponsorshipService.remove(id, req.user.userId);
    return { success: true };
  }

  // ====================================
  // KEY POOL (Contributed API Keys)
  // ====================================

  /**
   * Contribute an API key to the pool
   */
  @Post('keys')
  async contributeKey(
    @Request() req: any,
    @Body() dto: CreateKeyPoolEntryDto,
  ) {
    return this.keyPoolService.contribute(req.user.userId, dto);
  }

  /**
   * Get all my contributed keys
   */
  @Get('keys/mine')
  async getMyContributedKeys(@Request() req: any) {
    return this.keyPoolService.findByContributor(req.user.userId);
  }

  /**
   * Get my key contribution stats
   */
  @Get('keys/mine/stats')
  async getMyContributorStats(@Request() req: any) {
    return this.keyPoolService.getContributorStats(req.user.userId);
  }

  /**
   * Get key pool for a project (project members only)
   */
  @Get('keys/project/:projectId')
  async getProjectKeyPool(@Param('projectId') projectId: string) {
    return this.keyPoolService.findByProject(projectId);
  }

  /**
   * Get key pool stats for a project
   */
  @Get('keys/project/:projectId/stats')
  async getProjectPoolStats(@Param('projectId') projectId: string) {
    return this.keyPoolService.getPoolStats(projectId);
  }

  /**
   * Update a contributed key (only contributor can update)
   */
  @Put('keys/:id')
  async updateContributedKey(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateKeyPoolEntryDto,
  ) {
    return this.keyPoolService.update(id, req.user.userId, dto);
  }

  /**
   * Remove a contributed key (only contributor can remove)
   */
  @Delete('keys/:id')
  async removeContributedKey(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    await this.keyPoolService.remove(id, req.user.userId);
    return { success: true };
  }

  // ====================================
  // KEY POOL INVITES (Contribution Links)
  // ====================================

  /**
   * Create an invite link for a project
   */
  @Post('invites')
  async createInvite(
    @Request() req: any,
    @Body() body: { projectId: string; name?: string; expiresAt?: string; maxContributions?: number },
  ) {
    return this.keyPoolService.createInvite(body.projectId, req.user.userId, {
      name: body.name,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      maxContributions: body.maxContributions,
    });
  }

  /**
   * Get all invites for a project
   */
  @Get('invites/project/:projectId')
  async getProjectInvites(
    @Request() req: any,
    @Param('projectId') projectId: string,
  ) {
    return this.keyPoolService.getInvitesByProject(projectId, req.user.userId);
  }

  /**
   * Revoke an invite (deactivate but keep for records)
   */
  @Put('invites/:id/revoke')
  async revokeInvite(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    await this.keyPoolService.revokeInvite(id, req.user.userId);
    return { success: true };
  }

  /**
   * Delete an invite
   */
  @Delete('invites/:id')
  async deleteInvite(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    await this.keyPoolService.deleteInvite(id, req.user.userId);
    return { success: true };
  }
}

