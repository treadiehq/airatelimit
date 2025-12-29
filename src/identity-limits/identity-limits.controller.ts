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
  HttpCode,
  HttpStatus,
  Req,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ProjectAuthGuard } from '../common/guards/project-auth.guard';
import {
  IdentityLimitsService,
  CreateIdentityLimitDto,
  UpdateIdentityLimitDto,
} from './identity-limits.service';
import { ProjectsService } from '../projects/projects.service';
import { UsageService } from '../usage/usage.service';

/**
 * Identity Limits Controller
 *
 * Supports two authentication methods:
 * 1. JWT token from dashboard login (for UI access)
 * 2. Project secret key (for programmatic/server-side access)
 *
 * Example with secret key:
 *   curl -X POST /api/projects/pk_xxx/identities \
 *     -H "Authorization: Bearer sk_xxx" \
 *     -d '{"identity": "user-123", "requestLimit": 1000}'
 */
@Controller('projects/:projectKey/identities')
@UseGuards(ProjectAuthGuard)
export class IdentityLimitsController {
  constructor(
    private readonly identityLimitsService: IdentityLimitsService,
    private readonly projectsService: ProjectsService,
    private readonly usageService: UsageService,
  ) {}

  /**
   * Get the project - either from secret key auth or by looking up projectKey
   */
  private async getProject(projectKey: string, request: any) {
    // If authenticated via secret key, project is already attached
    if (request.authType === 'secret_key' && request.project) {
      // Verify the projectKey matches the authenticated project
      if (request.project.projectKey !== projectKey) {
        throw new Error('Project key does not match authenticated project');
      }
      return request.project;
    }

    // Otherwise, look up by projectKey (JWT auth)
    const project = await this.projectsService.findByProjectKey(projectKey);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Verify user owns this project - prevents cross-tenant access
    if (project.ownerId !== request.user?.userId) {
      throw new ForbiddenException('Access denied');
    }

    return project;
  }

  /**
   * List all identity limits for a project
   * GET /api/projects/:projectKey/identities
   */
  @Get()
  async list(
    @Param('projectKey') projectKey: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Req() request?: any,
  ) {
    const project = await this.getProject(projectKey, request);

    const result = await this.identityLimitsService.listForProject(project.id, {
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    return {
      items: result.items.map(this.formatIdentityLimit),
      total: result.total,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    };
  }

  /**
   * Get limits for a specific identity
   * GET /api/projects/:projectKey/identities/:identity
   */
  @Get(':identity')
  async get(
    @Param('projectKey') projectKey: string,
    @Param('identity') identity: string,
    @Req() request?: any,
  ) {
    const project = await this.getProject(projectKey, request);
    const identityLimit = await this.identityLimitsService.getForIdentity(
      project.id,
      identity,
    );

    if (!identityLimit) {
      return {
        identity,
        limits: null,
        message: 'No custom limits set. Using project/tier defaults.',
      };
    }

    return this.formatIdentityLimit(identityLimit);
  }

  /**
   * Create or update limits for an identity (upsert)
   * POST /api/projects/:projectKey/identities
   */
  @Post()
  async create(
    @Param('projectKey') projectKey: string,
    @Body() dto: CreateIdentityLimitDto,
    @Req() request?: any,
  ) {
    const project = await this.getProject(projectKey, request);
    const identityLimit = await this.identityLimitsService.upsert(
      project.id,
      dto,
    );

    return this.formatIdentityLimit(identityLimit);
  }

  /**
   * Update limits for an identity
   * PUT /api/projects/:projectKey/identities/:identity
   */
  @Put(':identity')
  async update(
    @Param('projectKey') projectKey: string,
    @Param('identity') identity: string,
    @Body() dto: UpdateIdentityLimitDto,
    @Req() request?: any,
  ) {
    const project = await this.getProject(projectKey, request);
    const identityLimit = await this.identityLimitsService.update(
      project.id,
      identity,
      dto,
    );

    return this.formatIdentityLimit(identityLimit);
  }

  /**
   * Delete limits for an identity (reverts to defaults)
   * DELETE /api/projects/:projectKey/identities/:identity
   */
  @Delete(':identity')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('projectKey') projectKey: string,
    @Param('identity') identity: string,
    @Req() request?: any,
  ) {
    const project = await this.getProject(projectKey, request);
    await this.identityLimitsService.delete(project.id, identity);
  }

  /**
   * Bulk create/update identity limits
   * POST /api/projects/:projectKey/identities/bulk
   */
  @Post('bulk')
  async bulkUpsert(
    @Param('projectKey') projectKey: string,
    @Body() body: { items: CreateIdentityLimitDto[] },
    @Req() request?: any,
  ) {
    const project = await this.getProject(projectKey, request);
    const results = await this.identityLimitsService.bulkUpsert(
      project.id,
      body.items,
    );

    return {
      items: results.map(this.formatIdentityLimit),
      count: results.length,
    };
  }

  /**
   * Gift tokens or requests to an identity
   * POST /api/projects/:projectKey/identities/:identity/gift
   */
  @Post(':identity/gift')
  async giftCredits(
    @Param('projectKey') projectKey: string,
    @Param('identity') identity: string,
    @Body() body: { tokens?: number; requests?: number; reason?: string },
    @Req() request?: any,
  ) {
    const project = await this.getProject(projectKey, request);
    if (!body.tokens && !body.requests) {
      return { error: 'Must provide either tokens or requests to gift' };
    }
    const result = await this.identityLimitsService.giftCredits(
      project.id, identity, body.tokens || 0, body.requests || 0, body.reason,
    );
    return {
      identity,
      giftedTokens: result.giftedTokens,
      giftedRequests: result.giftedRequests,
      message: `Gifted ${body.tokens || 0} tokens and ${body.requests || 0} requests`,
    };
  }

  /**
   * Set promotional override (unlimited access until date)
   * POST /api/projects/:projectKey/identities/:identity/promo
   */
  @Post(':identity/promo')
  async setPromoOverride(
    @Param('projectKey') projectKey: string,
    @Param('identity') identity: string,
    @Body() body: { unlimitedUntil: string | null; reason?: string },
    @Req() request?: any,
  ) {
    const project = await this.getProject(projectKey, request);
    const result = await this.identityLimitsService.setPromoOverride(
      project.id, identity,
      body.unlimitedUntil ? new Date(body.unlimitedUntil) : null, body.reason,
    );
    return {
      identity,
      unlimitedUntil: result.unlimitedUntil,
      message: body.unlimitedUntil
        ? `Unlimited access granted until ${body.unlimitedUntil}`
        : 'Promotional override removed',
    };
  }

  /**
   * Get gift and promo status for an identity
   * GET /api/projects/:projectKey/identities/:identity/credits
   */
  @Get(':identity/credits')
  async getCredits(
    @Param('projectKey') projectKey: string,
    @Param('identity') identity: string,
    @Req() request?: any,
  ) {
    const project = await this.getProject(projectKey, request);
    const identityLimit = await this.identityLimitsService.getForIdentity(
      project.id, identity,
    );
    const now = new Date();
    const isUnlimited = identityLimit?.unlimitedUntil && identityLimit.unlimitedUntil > now;
    return {
      identity,
      giftedTokens: identityLimit?.giftedTokens || 0,
      giftedRequests: identityLimit?.giftedRequests || 0,
      unlimitedUntil: identityLimit?.unlimitedUntil || null,
      isCurrentlyUnlimited: isUnlimited,
    };
  }

  /**
   * Reset usage counters for an identity
   * Clears tokens and/or requests used in the current period
   * 
   * Use case: After a Stripe payment, reset the user's usage so they start fresh
   * 
   * POST /api/projects/:projectKey/identities/:identity/reset
   */
  @Post(':identity/reset')
  async resetUsage(
    @Param('projectKey') projectKey: string,
    @Param('identity') identity: string,
    @Body() body: { resetTokens?: boolean; resetRequests?: boolean; reason?: string },
    @Req() request?: any,
  ) {
    const project = await this.getProject(projectKey, request);
    
    // Default to resetting both if not specified
    const resetTokens = body.resetTokens !== false;
    const resetRequests = body.resetRequests !== false;
    
    // Get current period start
    const periodStart = this.getPeriodStart(project.limitPeriod || 'daily');
    
    const result = await this.usageService.resetUsage({
      projectId: project.id,
      identity,
      resetTokens,
      resetRequests,
      periodStart,
    });

    return {
      identity,
      tokensReset: result.tokensReset,
      requestsReset: result.requestsReset,
      message: `Reset ${resetTokens ? result.tokensReset + ' tokens' : ''}${resetTokens && resetRequests ? ' and ' : ''}${resetRequests ? result.requestsReset + ' requests' : ''} for ${identity}`,
      period: project.limitPeriod || 'daily',
    };
  }

  /**
   * Get period start date based on limit period
   */
  private getPeriodStart(limitPeriod: 'hourly' | 'daily' | 'weekly' | 'monthly'): Date {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const date = now.getUTCDate();
    const hour = now.getUTCHours();
    const day = now.getUTCDay();

    switch (limitPeriod) {
      case 'hourly':
        return new Date(Date.UTC(year, month, date, hour));
      case 'daily':
        return new Date(Date.UTC(year, month, date));
      case 'weekly':
        const daysToMonday = (day + 6) % 7;
        return new Date(Date.UTC(year, month, date - daysToMonday));
      case 'monthly':
        return new Date(Date.UTC(year, month, 1));
      default:
        return new Date(Date.UTC(year, month, date));
    }
  }

  private formatIdentityLimit(limit: any) {
    return {
      identity: limit.identity,
      requestLimit: limit.requestLimit,
      tokenLimit: limit.tokenLimit,
      giftedTokens: limit.giftedTokens || 0,
      giftedRequests: limit.giftedRequests || 0,
      unlimitedUntil: limit.unlimitedUntil || null,
      customResponse: limit.customResponse,
      metadata: limit.metadata,
      enabled: limit.enabled,
      createdAt: limit.createdAt,
      updatedAt: limit.updatedAt,
    };
  }
}
