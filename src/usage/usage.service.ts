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
  tier?: string; // Phase 2: User's tier/plan
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
    const { project, identity, tier, periodStart, requestedTokens = 0, requestedRequests = 0 } = params;

    // Load or create usage counter
    let usage = await this.usageRepository.findOne({
      where: {
        projectId: project.id,
        identity,
        periodStart,
      },
    });

    if (!usage) {
      usage = this.usageRepository.create({
        projectId: project.id,
        identity,
        periodStart,
        requestsUsed: 0,
        tokensUsed: 0,
      });
    }

    // Calculate next usage values
    const nextRequests = usage.requestsUsed + requestedRequests;
    const nextTokens = usage.tokensUsed + requestedTokens;

    // Phase 2: Get tier-specific limits or fall back to project defaults
    const limits = this.getLimitsForTier(project, tier);

    // Phase 1: Check limits based on limit type
    const shouldCheckRequests = project.limitType === 'requests' || project.limitType === 'both';
    const shouldCheckTokens = project.limitType === 'tokens' || project.limitType === 'both';

    // Check request limit
    if (shouldCheckRequests && limits.requestLimit && nextRequests > limits.requestLimit) {
      return {
        allowed: false,
        limitResponse: limits.customResponse || this.getLimitResponse(project),
      };
    }

    // Check token limit
    if (shouldCheckTokens && limits.tokenLimit && nextTokens > limits.tokenLimit) {
      return {
        allowed: false,
        limitResponse: limits.customResponse || this.getLimitResponse(project),
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

  // Phase 2: Get tier-specific limits or project defaults
  private getLimitsForTier(
    project: Project,
    tier?: string,
  ): { requestLimit?: number; tokenLimit?: number; customResponse?: any } {
    // If tier is specified and tiers are configured
    if (tier && project.tiers && project.tiers[tier]) {
      return project.tiers[tier];
    }

    // Fall back to project-level limits
    return {
      requestLimit: project.dailyRequestLimit,
      tokenLimit: project.dailyTokenLimit,
    };
  }

  async finalizeUsage(params: FinalizeParams): Promise<void> {
    const { project, identity, periodStart, actualTokensUsed } = params;

    const usage = await this.usageRepository.findOne({
      where: {
        projectId: project.id,
        identity,
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
    periodStart: Date;
  }): Promise<UsageCounter | null> {
    return this.usageRepository.findOne({
      where: {
        projectId: params.projectId,
        identity: params.identity,
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
    Array<{ identity: string; requestsUsed: number; tokensUsed: number }>
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
      requestsUsed: c.requestsUsed,
      tokensUsed: c.tokensUsed,
    }));
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
}

