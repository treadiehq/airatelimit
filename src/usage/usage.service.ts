import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsageCounter } from './usage.entity';
import { Project } from '../projects/projects.entity';

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
  ) {}

  async checkAndUpdateUsage(
    params: CheckAndUpdateParams,
  ): Promise<CheckAndUpdateResult> {
    const { project, identity, tier, model = '', periodStart, requestedTokens = 0, requestedRequests = 0 } = params;

    // Load or create usage counter (per-model tracking)
    let usage = await this.usageRepository.findOne({
      where: {
        projectId: project.id,
        identity,
        model,
        periodStart,
      },
    });

    if (!usage) {
      usage = this.usageRepository.create({
        projectId: project.id,
        identity,
        model,
        periodStart,
        requestsUsed: 0,
        tokensUsed: 0,
      });
    }

    // Calculate next usage values
    const nextRequests = usage.requestsUsed + requestedRequests;
    const nextTokens = usage.tokensUsed + requestedTokens;

    // Get limits with model-aware hierarchy
    const limits = this.getLimitsForTier(project, tier, model);

    // Check limits based on limit type
    const shouldCheckRequests = project.limitType === 'requests' || project.limitType === 'both';
    const shouldCheckTokens = project.limitType === 'tokens' || project.limitType === 'both';

    // Check request limit
    if (shouldCheckRequests && limits.requestLimit && nextRequests > limits.requestLimit) {
    const response = limits.customResponse || this.getLimitResponse(project);
      return {
        allowed: false,
      limitResponse: this.interpolateVariables(response, {
        tier,
        limit: limits.requestLimit,
        usage: nextRequests,
        limitType: 'requests',
        period: project.limitPeriod || 'daily',
      }),
      };
    }

    // Check token limit
    if (shouldCheckTokens && limits.tokenLimit && nextTokens > limits.tokenLimit) {
    const response = limits.customResponse || this.getLimitResponse(project);
      return {
        allowed: false,
      limitResponse: this.interpolateVariables(response, {
        tier,
        limit: limits.tokenLimit,
        usage: nextTokens,
        limitType: 'tokens',
        period: project.limitPeriod || 'daily',
      }),
      };
    }

    // Calculate usage percentages for rule engine
    const usagePercent = {
      requests: limits.requestLimit ? (nextRequests / limits.requestLimit) * 100 : 0,
      tokens: limits.tokenLimit ? (nextTokens / limits.tokenLimit) * 100 : 0,
    };

    // Update counters
    usage.requestsUsed = nextRequests;
    usage.tokensUsed = nextTokens;
    await this.usageRepository.save(usage);

    return {
      allowed: true,
      usageCounter: usage,
      usagePercent,
    };
  }

  // Get limits with model-aware hierarchy
  // Priority: tier.modelLimits[model] > project.modelLimits[model] > tier general > project general
  private getLimitsForTier(
    project: Project,
    tier?: string,
    model?: string,
  ): { requestLimit?: number; tokenLimit?: number; customResponse?: any } {
    let limits: { requestLimit?: number; tokenLimit?: number; customResponse?: any } = {};

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
        limits.requestLimit = modelConfig.requestLimit;
      }
      if (modelConfig.tokenLimit !== undefined) {
        limits.tokenLimit = modelConfig.tokenLimit;
      }
    }

    // Override with tier model-specific limits (highest priority)
    if (tier && model && project.tiers && project.tiers[tier]?.modelLimits && project.tiers[tier].modelLimits[model]) {
      const tierModelConfig = project.tiers[tier].modelLimits[model];
      if (tierModelConfig.requestLimit !== undefined) {
        limits.requestLimit = tierModelConfig.requestLimit;
      }
      if (tierModelConfig.tokenLimit !== undefined) {
        limits.tokenLimit = tierModelConfig.tokenLimit;
      }
    }

    return limits;
  }

  async finalizeUsage(params: FinalizeParams): Promise<void> {
    const { project, identity, model = '', periodStart, actualTokensUsed } = params;

    const usage = await this.usageRepository.findOne({
      where: {
        projectId: project.id,
        identity,
        model,
        periodStart,
      },
    });

    if (usage) {
      usage.tokensUsed += actualTokensUsed;
      await this.usageRepository.save(usage);
    }
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
  ): Promise<{ totalRequests: number; totalTokens: number }> {
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

    return { totalRequests, totalTokens };
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

