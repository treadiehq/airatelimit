import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsageCounter } from './usage.entity';
import { Project } from '../projects/projects.entity';
import { IdentityLimitsService } from '../identity-limits/identity-limits.service';

const DEFAULT_LIMIT_RESPONSE = {
  error: 'limit_exceeded',
  message: 'Free tier limit reached. Please upgrade to continue.',
};

interface CheckAndUpdateParams {
  project: Project;
  identity: string;
  tier?: string; // User's tier/plan
  model?: string; // Model being used (e.g., "gpt-4o", "claude-3-5-sonnet")
  periodStart: Date;
  requestedTokens?: number;
  requestedRequests?: number;
}

interface CheckAndUpdateResult {
  allowed: boolean;
  limitResponse?: any;
  usageCounter?: UsageCounter;
  usagePercent?: { requests?: number; tokens?: number }; // For rule engine
}

interface FinalizeParams {
  project: Project;
  identity: string;
  model?: string; // Model being used
  periodStart: Date;
  actualTokensUsed: number;
}

@Injectable()
export class UsageService {
  constructor(
    @InjectRepository(UsageCounter)
    private usageRepository: Repository<UsageCounter>,
    @Inject(forwardRef(() => IdentityLimitsService))
    private identityLimitsService: IdentityLimitsService,
  ) {}

  async checkAndUpdateUsage(
    params: CheckAndUpdateParams,
  ): Promise<CheckAndUpdateResult> {
    const { project, identity, tier, model = '', periodStart, requestedTokens = 0, requestedRequests = 0 } = params;

    // Check if this identity is enabled (identity-level kill switch)
    const identityLimit = await this.identityLimitsService.getForIdentity(
      project.id,
      identity,
    );

    if (identityLimit && !identityLimit.enabled) {
      return {
        allowed: false,
        limitResponse: identityLimit.customResponse || {
          error: 'identity_disabled',
          message: 'This identity has been disabled.',
        },
      };
    }

    // Get limits with identity-aware hierarchy (identity > tier > model > project)
    const limits = this.getLimitsForIdentity(project, tier, model, identityLimit);

    // Determine which limits to check
    const shouldCheckRequests = project.limitType === 'requests' || project.limitType === 'both';
    const shouldCheckTokens = project.limitType === 'tokens' || project.limitType === 'both';

    // Effective limits (null = unlimited, so we use a very high number for SQL)
    const effectiveRequestLimit = (shouldCheckRequests && limits.requestLimit !== null && limits.requestLimit) 
      ? limits.requestLimit 
      : null;
    const effectiveTokenLimit = (shouldCheckTokens && limits.tokenLimit !== null && limits.tokenLimit) 
      ? limits.tokenLimit 
      : null;

    // Format periodStart as date string for PostgreSQL
    const periodStartStr = periodStart.toISOString().split('T')[0];

    // Step 1: Ensure the row exists (atomic upsert)
    await this.usageRepository.query(
      `INSERT INTO usage_counters (id, "projectId", identity, model, "periodStart", "requestsUsed", "tokensUsed", "inputTokens", "outputTokens", "costUsd", "blockedRequests", "savedUsd", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 0, 0, 0, 0, 0, 0, 0, NOW(), NOW())
       ON CONFLICT ("projectId", identity, "periodStart", model) DO NOTHING`,
      [project.id, identity, model, periodStartStr],
    );

    // Step 2: Atomic UPDATE with limit check in WHERE clause
    // This is the key: the UPDATE only succeeds if we're under the limit
    const updateResult = await this.usageRepository.query(
      `UPDATE usage_counters
       SET 
         "requestsUsed" = "requestsUsed" + $1,
         "tokensUsed" = "tokensUsed" + $2,
         "updatedAt" = NOW()
       WHERE 
         "projectId" = $3
         AND identity = $4
         AND model = $5
         AND "periodStart" = $6
         AND ($7::int IS NULL OR "requestsUsed" + $1 <= $7)
         AND ($8::int IS NULL OR "tokensUsed" + $2 <= $8)
       RETURNING *`,
      [
        requestedRequests,
        requestedTokens,
        project.id,
        identity,
        model,
        periodStartStr,
        effectiveRequestLimit,
        effectiveTokenLimit,
      ],
    );

    // If UPDATE returned a row, the request was allowed
    if (updateResult.length > 0) {
      const usage = updateResult[0] as UsageCounter;
      
      // Calculate usage percentages for rule engine
      const usagePercent = {
        requests: effectiveRequestLimit ? (usage.requestsUsed / effectiveRequestLimit) * 100 : 0,
        tokens: effectiveTokenLimit ? (usage.tokensUsed / effectiveTokenLimit) * 100 : 0,
      };

      return {
        allowed: true,
        usageCounter: usage,
        usagePercent,
      };
    }

    // Step 3: UPDATE failed - limit was exceeded
    // Fetch current usage to include in the error message
    const currentUsage = await this.usageRepository.findOne({
      where: {
        projectId: project.id,
        identity,
        model,
        periodStart,
      },
    });

    const currentRequests = currentUsage?.requestsUsed || 0;
    const currentTokens = currentUsage?.tokensUsed || 0;

    // Determine which limit was exceeded
    const requestsExceeded = effectiveRequestLimit && (currentRequests + requestedRequests > effectiveRequestLimit);
    const tokensExceeded = effectiveTokenLimit && (currentTokens + requestedTokens > effectiveTokenLimit);

    const response = limits.customResponse || this.getLimitResponse(project);
    
    // Return appropriate error based on which limit was hit
    if (requestsExceeded) {
      return {
        allowed: false,
        limitResponse: this.interpolateVariables(response, {
          tier,
          limit: effectiveRequestLimit,
          usage: currentRequests,
          limitType: 'requests',
          period: project.limitPeriod || 'daily',
        }),
      };
    }

    return {
      allowed: false,
      limitResponse: this.interpolateVariables(response, {
        tier,
        limit: effectiveTokenLimit,
        usage: currentTokens,
        limitType: 'tokens',
        period: project.limitPeriod || 'daily',
      }),
    };
  }

  // Get limits with identity-aware hierarchy
  // Priority: identity limits > tier.modelLimits[model] > project.modelLimits[model] > tier general > project general
  // Note: -1 or null = explicitly unlimited (no fallback), undefined = fallback to next level
  private getLimitsForIdentity(
    project: Project,
    tier?: string,
    model?: string,
    identityLimit?: { requestLimit?: number | null; tokenLimit?: number | null; customResponse?: any } | null,
  ): { requestLimit?: number | null; tokenLimit?: number | null; customResponse?: any } {
    let limits: { requestLimit?: number | null; tokenLimit?: number | null; customResponse?: any } = {};

    // Start with project-level general limits as base
    limits.requestLimit = project.dailyRequestLimit;
    limits.tokenLimit = project.dailyTokenLimit;

    // Override with tier general limits if available
    if (tier && project.tiers && project.tiers[tier]) {
      const tierConfig = project.tiers[tier];
      if (tierConfig.requestLimit !== undefined) {
        limits.requestLimit = tierConfig.requestLimit;
      }
      if (tierConfig.tokenLimit !== undefined) {
        limits.tokenLimit = tierConfig.tokenLimit;
      }
      if (tierConfig.customResponse !== undefined) {
        limits.customResponse = tierConfig.customResponse;
      }
    }

    // Override with project-level model-specific limits if available
    if (model && project.modelLimits && project.modelLimits[model]) {
      const modelConfig = project.modelLimits[model];
      if (modelConfig.requestLimit !== undefined) {
        // -1 or null means explicitly unlimited
        limits.requestLimit = (modelConfig.requestLimit === -1 || modelConfig.requestLimit === null) ? null : modelConfig.requestLimit;
      }
      if (modelConfig.tokenLimit !== undefined) {
        limits.tokenLimit = (modelConfig.tokenLimit === -1 || modelConfig.tokenLimit === null) ? null : modelConfig.tokenLimit;
      }
    }

    // Override with tier model-specific limits
    if (tier && model && project.tiers && project.tiers[tier]?.modelLimits && project.tiers[tier].modelLimits[model]) {
      const tierModelConfig = project.tiers[tier].modelLimits[model];
      if (tierModelConfig.requestLimit !== undefined) {
        // -1 or null means explicitly unlimited
        limits.requestLimit = (tierModelConfig.requestLimit === -1 || tierModelConfig.requestLimit === null) ? null : tierModelConfig.requestLimit;
      }
      if (tierModelConfig.tokenLimit !== undefined) {
        limits.tokenLimit = (tierModelConfig.tokenLimit === -1 || tierModelConfig.tokenLimit === null) ? null : tierModelConfig.tokenLimit;
      }
    }

    // Override with identity-specific limits (HIGHEST PRIORITY)
    if (identityLimit) {
      if (identityLimit.requestLimit !== undefined && identityLimit.requestLimit !== null) {
        // -1 means explicitly unlimited
        limits.requestLimit = identityLimit.requestLimit === -1 ? null : identityLimit.requestLimit;
      }
      if (identityLimit.tokenLimit !== undefined && identityLimit.tokenLimit !== null) {
        limits.tokenLimit = identityLimit.tokenLimit === -1 ? null : identityLimit.tokenLimit;
      }
      if (identityLimit.customResponse !== undefined) {
        limits.customResponse = identityLimit.customResponse;
      }
    }

    return limits;
  }

  async finalizeUsage(params: FinalizeParams): Promise<void> {
    const { project, identity, model = '', periodStart, actualTokensUsed } = params;
    const periodStartStr = periodStart.toISOString().split('T')[0];

    // Atomic increment - no race condition
    await this.usageRepository.query(
      `UPDATE usage_counters
       SET "tokensUsed" = "tokensUsed" + $1, "updatedAt" = NOW()
       WHERE "projectId" = $2 AND identity = $3 AND model = $4 AND "periodStart" = $5`,
      [actualTokensUsed, project.id, identity, model, periodStartStr],
    );
  }

  async finalizeUsageWithCost(params: {
    project: Project;
    identity: string;
    model?: string;
    periodStart: Date;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }): Promise<void> {
    const { project, identity, model = '', periodStart, inputTokens, outputTokens, cost } = params;
    const periodStartStr = periodStart.toISOString().split('T')[0];

    // Atomic increment - no race condition
    await this.usageRepository.query(
      `UPDATE usage_counters
       SET 
         "tokensUsed" = "tokensUsed" + $1,
         "inputTokens" = "inputTokens" + $2,
         "outputTokens" = "outputTokens" + $3,
         "costUsd" = "costUsd" + $4,
         "updatedAt" = NOW()
       WHERE "projectId" = $5 AND identity = $6 AND model = $7 AND "periodStart" = $8`,
      [inputTokens + outputTokens, inputTokens, outputTokens, cost, project.id, identity, model, periodStartStr],
    );
  }

  async trackBlockedRequest(params: {
    project: Project;
    identity: string;
    model?: string;
    periodStart: Date;
    estimatedSavings: number;
  }): Promise<void> {
    const { project, identity, model = '', periodStart, estimatedSavings } = params;
    const periodStartStr = periodStart.toISOString().split('T')[0];

    // Atomic upsert + increment - no race condition
    await this.usageRepository.query(
      `INSERT INTO usage_counters (id, "projectId", identity, model, "periodStart", "requestsUsed", "tokensUsed", "inputTokens", "outputTokens", "costUsd", "blockedRequests", "savedUsd", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 0, 0, 0, 0, 0, 1, $5, NOW(), NOW())
       ON CONFLICT ("projectId", identity, "periodStart", model) 
       DO UPDATE SET 
         "blockedRequests" = usage_counters."blockedRequests" + 1,
         "savedUsd" = usage_counters."savedUsd" + $5,
         "updatedAt" = NOW()`,
      [project.id, identity, model, periodStartStr, estimatedSavings],
    );
  }

  async getUsage(params: {
    projectId: string;
    identity: string;
    model?: string;
    periodStart: Date;
  }): Promise<UsageCounter | null> {
    return this.usageRepository.findOne({
      where: {
        projectId: params.projectId,
        identity: params.identity,
        model: params.model || '',
        periodStart: params.periodStart,
      },
    });
  }

  async getSummaryForProject(
    projectId: string,
    periodStart: Date,
  ): Promise<{ 
    totalRequests: number; 
    totalTokens: number;
    totalCost: number;
    totalSaved: number;
    blockedRequests: number;
  }> {
    const counters = await this.usageRepository.find({
      where: {
        projectId,
        periodStart,
      },
    });

    const totalRequests = counters.reduce(
      (sum, c) => sum + c.requestsUsed,
      0,
    );
    const totalTokens = counters.reduce((sum, c) => sum + c.tokensUsed, 0);
    const totalCost = counters.reduce((sum, c) => sum + Number(c.costUsd || 0), 0);
    const totalSaved = counters.reduce((sum, c) => sum + Number(c.savedUsd || 0), 0);
    const blockedRequests = counters.reduce((sum, c) => sum + (c.blockedRequests || 0), 0);

    return { totalRequests, totalTokens, totalCost, totalSaved, blockedRequests };
  }

  async getCostSummaryForProject(
    projectId: string,
  ): Promise<{
    today: { spent: number; saved: number; requests: number; blocked: number };
    thisWeek: { spent: number; saved: number; requests: number; blocked: number };
    thisMonth: { spent: number; saved: number; requests: number; blocked: number };
    allTime: { spent: number; saved: number; requests: number; blocked: number };
  }> {
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    // Week start (Monday)
    const dayOfWeek = now.getUTCDay();
    const daysToMonday = (dayOfWeek + 6) % 7;
    const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysToMonday));
    
    // Month start
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    // Get all usage for this project
    const allUsage = await this.usageRepository.find({
      where: { projectId },
    });

    const calculatePeriod = (usage: UsageCounter[], startDate: Date) => {
      const filtered = usage.filter(u => new Date(u.periodStart) >= startDate);
      return {
        spent: filtered.reduce((sum, c) => sum + Number(c.costUsd || 0), 0),
        saved: filtered.reduce((sum, c) => sum + Number(c.savedUsd || 0), 0),
        requests: filtered.reduce((sum, c) => sum + c.requestsUsed, 0),
        blocked: filtered.reduce((sum, c) => sum + (c.blockedRequests || 0), 0),
      };
    };

    return {
      today: calculatePeriod(allUsage, todayStart),
      thisWeek: calculatePeriod(allUsage, weekStart),
      thisMonth: calculatePeriod(allUsage, monthStart),
      allTime: {
        spent: allUsage.reduce((sum, c) => sum + Number(c.costUsd || 0), 0),
        saved: allUsage.reduce((sum, c) => sum + Number(c.savedUsd || 0), 0),
        requests: allUsage.reduce((sum, c) => sum + c.requestsUsed, 0),
        blocked: allUsage.reduce((sum, c) => sum + (c.blockedRequests || 0), 0),
      },
    };
  }

  async getByIdentity(
    projectId: string,
    periodStart: Date,
  ): Promise<
    Array<{ identity: string; model: string; requestsUsed: number; tokensUsed: number }>
  > {
    const counters = await this.usageRepository.find({
      where: {
        projectId,
        periodStart,
      },
      order: {
        requestsUsed: 'DESC',
      },
    });

    return counters.map((c) => ({
      identity: c.identity,
      model: c.model,
      requestsUsed: c.requestsUsed,
      tokensUsed: c.tokensUsed,
    }));
  }

  async getByModel(
    projectId: string,
    periodStart: Date,
  ): Promise<
    Array<{ model: string; requestsUsed: number; tokensUsed: number }>
  > {
    const counters = await this.usageRepository.find({
      where: {
        projectId,
        periodStart,
      },
    });

    // Aggregate by model
    const byModel = counters.reduce((acc, c) => {
      if (!acc[c.model]) {
        acc[c.model] = { model: c.model, requestsUsed: 0, tokensUsed: 0 };
      }
      acc[c.model].requestsUsed += c.requestsUsed;
      acc[c.model].tokensUsed += c.tokensUsed;
      return acc;
    }, {} as Record<string, { model: string; requestsUsed: number; tokensUsed: number }>);

    return Object.values(byModel).sort((a, b) => b.requestsUsed - a.requestsUsed);
  }

  async getUsageHistory(
    projectId: string,
    days: number = 7,
  ): Promise<Array<{ label: string; value: number; requests: number; tokens: number }>> {
    const history: Array<{ label: string; value: number; requests: number; tokens: number }> = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setUTCDate(date.getUTCDate() - i);
      const periodStart = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
      );

      const summary = await this.getSummaryForProject(projectId, periodStart);
      
      // Format label as short day name (Mon, Tue, etc.)
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const label = i === 0 ? 'Today' : dayNames[periodStart.getUTCDay()];

      history.push({
        label,
        value: summary.totalRequests,
        requests: summary.totalRequests,
        tokens: summary.totalTokens,
      });
    }

    return history;
  }

  private getLimitResponse(project: Project): any {
    if (project.limitExceededResponse) {
      try {
        return JSON.parse(project.limitExceededResponse);
      } catch {
        // Fallback if parsing fails
        return DEFAULT_LIMIT_RESPONSE;
      }
    }
    return DEFAULT_LIMIT_RESPONSE;
  }

  /**
   * Interpolate template variables in response messages
   * Supports: {{tier}}, {{limit}}, {{usage}}, {{limitType}}, {{period}}
   */
  private interpolateVariables(
    response: any,
    variables: {
      tier?: string;
      limit?: number;
      usage?: number;
      limitType?: string;
      period?: string;
    },
  ): any {
    if (!response) return response;

    // If response is a string, interpolate directly
    if (typeof response === 'string') {
      return this.replaceTemplateVars(response, variables);
    }

    // If response is an object, recursively interpolate all string fields
    if (typeof response === 'object') {
      const interpolated = { ...response };
      for (const key in interpolated) {
        if (typeof interpolated[key] === 'string') {
          interpolated[key] = this.replaceTemplateVars(interpolated[key], variables);
        } else if (typeof interpolated[key] === 'object') {
          interpolated[key] = this.interpolateVariables(interpolated[key], variables);
        }
      }
      return interpolated;
    }

    return response;
  }

  private replaceTemplateVars(
    text: string,
    variables: Record<string, any>,
  ): string {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      if (value !== undefined && value !== null) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        result = result.replace(regex, String(value));
      }
    }
    return result;
  }
}

