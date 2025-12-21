import { Injectable, Inject, forwardRef, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsageCounter } from './usage.entity';
import { Project } from '../projects/projects.entity';
import { IdentityLimitsService } from '../identity-limits/identity-limits.service';

const DEFAULT_LIMIT_RESPONSE = {
  error: 'limit_exceeded',
  message: 'Free tier limit reached. Please upgrade to continue.',
};

// ====================================
// SECURITY: Database cardinality limits
// Prevents row explosion attacks
// ====================================
const MAX_IDENTITIES_PER_PROJECT_PER_PERIOD = 50000; // Max unique identities
const MAX_SESSIONS_PER_IDENTITY_PER_PERIOD = 1000;   // Max sessions per identity

interface CheckAndUpdateParams {
  project: Project;
  identity: string;
  tier?: string; // User's tier/plan
  model?: string; // Model being used (e.g., "gpt-4o", "claude-3-5-sonnet")
  session?: string; // Session ID for session-based limits
  periodStart: Date;
  requestedTokens?: number;
  requestedRequests?: number;
}

interface CheckAndUpdateResult {
  allowed: boolean;
  limitResponse?: any;
  usageCounter?: UsageCounter;
  usagePercent?: { requests?: number; tokens?: number }; // For rule engine
  promoActive?: boolean; // User has active promotional override
  giftedCreditsUsed?: boolean; // Gifted credits were consumed
}

interface FinalizeParams {
  project: Project;
  identity: string;
  model?: string; // Model being used
  session?: string; // Session ID
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
    const {
      project,
      identity,
      tier,
      model = '',
      session = '',
      periodStart,
      requestedTokens = 0,
      requestedRequests = 0,
    } = params;

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

    // Check for active promotional override (unlimited access)
    if (identityLimit?.unlimitedUntil && identityLimit.unlimitedUntil > new Date()) {
      // Promo is active - allow request but still track usage
      const periodStartStr = periodStart.toISOString().split('T')[0];
      await this.usageRepository.query(
        `INSERT INTO usage_counters (id, "projectId", identity, model, "session", "periodStart", "requestsUsed", "tokensUsed", "inputTokens", "outputTokens", "costUsd", "blockedRequests", "savedUsd", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 0, 0, 0, 0, 0, NOW(), NOW())
         ON CONFLICT ("projectId", identity, "periodStart", model, "session") 
         DO UPDATE SET "requestsUsed" = usage_counters."requestsUsed" + $6, "tokensUsed" = usage_counters."tokensUsed" + $7, "updatedAt" = NOW()`,
        [project.id, identity, model, session, periodStartStr, requestedRequests, requestedTokens],
      );
      return { allowed: true, promoActive: true };
    }

    // Get limits with identity-aware hierarchy (identity > tier > model > project)
    const limits = this.getLimitsForIdentity(
      project,
      tier,
      model,
      identityLimit,
    );

    // Determine which limits to check
    // SMART DETECTION: If tier/identity has a limit set, check it regardless of project.limitType
    // This allows tier limits to work independently without requiring Basic Limits configuration
    const hasTierRequestLimit = limits.requestLimit !== null && limits.requestLimit !== undefined && limits.requestLimit > 0;
    const hasTierTokenLimit = limits.tokenLimit !== null && limits.tokenLimit !== undefined && limits.tokenLimit > 0;
    
    // Check request limits if: tier has it set, OR project limitType includes requests
    const shouldCheckRequests = hasTierRequestLimit || 
      project.limitType === 'requests' || project.limitType === 'both';
    // Check token limits if: tier has it set, OR project limitType includes tokens  
    const shouldCheckTokens = hasTierTokenLimit ||
      project.limitType === 'tokens' || project.limitType === 'both';

    // Effective limits (null = unlimited)
    const effectiveRequestLimit =
      shouldCheckRequests && limits.requestLimit !== null && limits.requestLimit
      ? limits.requestLimit 
      : null;
    const effectiveTokenLimit =
      shouldCheckTokens && limits.tokenLimit !== null && limits.tokenLimit
      ? limits.tokenLimit 
      : null;

    // DEBUG: Log limit check details
    console.log('Limit check:', {
      projectId: project.id,
      identity,
      tier,
      limits,
      hasTierRequestLimit,
      hasTierTokenLimit,
      shouldCheckRequests,
      shouldCheckTokens,
      effectiveRequestLimit,
      effectiveTokenLimit,
      requestedTokens,
      requestedRequests,
    });

    // Format periodStart as date string for PostgreSQL
    const periodStartStr = periodStart.toISOString().split('T')[0];

    // ====================================
    // SECURITY: Check cardinality limits
    // Prevents database row explosion attacks
    // ====================================
    await this.checkCardinalityLimits(project.id, identity, session, periodStartStr);

    // Step 1: Ensure the row exists (atomic upsert)
    await this.usageRepository.query(
      `INSERT INTO usage_counters (id, "projectId", identity, model, "session", "periodStart", "requestsUsed", "tokensUsed", "inputTokens", "outputTokens", "costUsd", "blockedRequests", "savedUsd", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 0, 0, 0, 0, 0, 0, 0, NOW(), NOW())
       ON CONFLICT ("projectId", identity, "periodStart", model, "session") DO NOTHING`,
      [project.id, identity, model, session, periodStartStr],
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
         AND "session" = $6
         AND "periodStart" = $7
         AND ($8::int IS NULL OR "requestsUsed" + $1 <= $8)
         AND ($9::int IS NULL OR "tokensUsed" + $2 <= $9)
       RETURNING *`,
      [
        requestedRequests,
        requestedTokens,
        project.id,
        identity,
        model,
        session,
        periodStartStr,
        effectiveRequestLimit,
        effectiveTokenLimit,
      ],
    );

    // DEBUG: Log UPDATE result
    console.log('Limit UPDATE result:', {
      rowsReturned: updateResult.length,
      allowed: updateResult.length > 0,
      currentUsage: updateResult.length > 0 ? {
        requestsUsed: updateResult[0].requestsUsed,
        tokensUsed: updateResult[0].tokensUsed,
      } : 'no rows returned - limit exceeded',
    });

    // If UPDATE returned a row, the request was allowed
    if (updateResult.length > 0) {
      const usage = updateResult[0] as UsageCounter;
      
      // Calculate usage percentages for rule engine
      const usagePercent = {
        requests: effectiveRequestLimit
          ? (usage.requestsUsed / effectiveRequestLimit) * 100
          : 0,
        tokens: effectiveTokenLimit
          ? (usage.tokensUsed / effectiveTokenLimit) * 100
          : 0,
      };

      return {
        allowed: true,
        usageCounter: usage,
        usagePercent,
      };
    }

    // Step 3: UPDATE failed - limit was exceeded
    // Check if gifted credits can cover this request
    const giftResult = await this.identityLimitsService.consumeGiftedCredits(
      project.id,
      identity,
      requestedTokens,
      requestedRequests,
    );

    if (giftResult.consumed) {
      // Gifted credits covered the request - track usage but allow
      await this.usageRepository.query(
        `UPDATE usage_counters SET "requestsUsed" = "requestsUsed" + $1, "tokensUsed" = "tokensUsed" + $2, "updatedAt" = NOW()
         WHERE "projectId" = $3 AND identity = $4 AND model = $5 AND "session" = $6 AND "periodStart" = $7`,
        [requestedRequests, requestedTokens, project.id, identity, model, session, periodStartStr],
      );
      return { allowed: true, giftedCreditsUsed: true };
    }

    // Fetch current usage to include in the error message
    const currentUsage = await this.usageRepository.findOne({
      where: {
        projectId: project.id,
        identity,
        model,
        session,
        periodStart,
      },
    });

    const currentRequests = currentUsage?.requestsUsed || 0;
    const currentTokens = currentUsage?.tokensUsed || 0;

    // Determine which limit was exceeded
    const requestsExceeded =
      effectiveRequestLimit &&
      currentRequests + requestedRequests > effectiveRequestLimit;
    const tokensExceeded =
      effectiveTokenLimit &&
      currentTokens + requestedTokens > effectiveTokenLimit;

    const response = limits.customResponse || this.getLimitResponse(project);
    
    // Return appropriate error based on which limit was hit
    if (requestsExceeded) {
      return {
        allowed: false,
        limitResponse: this.buildLimitResponse(project, response, {
          tier,
          identity,
          limit: effectiveRequestLimit,
          usage: currentRequests,
          limitType: 'requests',
          period: project.limitPeriod || 'daily',
        }),
      };
    }

    return {
      allowed: false,
      limitResponse: this.buildLimitResponse(project, response, {
        tier,
        identity,
        limit: effectiveTokenLimit,
        usage: currentTokens,
        limitType: 'tokens',
        period: project.limitPeriod || 'daily',
      }),
    };
  }

  /**
   * Check session-specific limits (separate from identity limits)
   * Sessions allow per-conversation limits like "5 messages per chat session"
   */
  async checkSessionLimits(params: {
    project: Project;
    identity: string;
    session: string;
    tier?: string;
    model?: string;
    periodStart: Date;
    requestedTokens?: number;
    requestedRequests?: number;
  }): Promise<CheckAndUpdateResult> {
    const {
      project,
      identity,
      session,
      tier,
      model = '',
      periodStart,
      requestedTokens = 0,
      requestedRequests = 0,
    } = params;

    if (!session || !project.sessionLimitsEnabled) {
      return { allowed: true };
    }

    // Get session limits (can be tier-specific or project-level)
    let sessionRequestLimit = project.sessionRequestLimit;
    let sessionTokenLimit = project.sessionTokenLimit;

    // Check for tier-specific session limits
    if (tier && project.tiers?.[tier]?.sessionLimits) {
      const tierSessionLimits = (project.tiers[tier] as any).sessionLimits;
      if (tierSessionLimits?.requestLimit !== undefined) {
        sessionRequestLimit = tierSessionLimits.requestLimit;
      }
      if (tierSessionLimits?.tokenLimit !== undefined) {
        sessionTokenLimit = tierSessionLimits.tokenLimit;
      }
    }

    // If no session limits configured, allow
    if (!sessionRequestLimit && !sessionTokenLimit) {
      return { allowed: true };
    }

    const periodStartStr = periodStart.toISOString().split('T')[0];

    // Get current session usage (aggregate across all models for this session)
    const sessionUsage = await this.usageRepository.query(
      `SELECT 
         COALESCE(SUM("requestsUsed"), 0) as total_requests,
         COALESCE(SUM("tokensUsed"), 0) as total_tokens
       FROM usage_counters
       WHERE "projectId" = $1 
         AND identity = $2 
         AND "session" = $3
         AND "periodStart" = $4`,
      [project.id, identity, session, periodStartStr],
    );

    const currentRequests = parseInt(
      sessionUsage[0]?.total_requests || '0',
      10,
    );
    const currentTokens = parseInt(sessionUsage[0]?.total_tokens || '0', 10);

    // Check limits
    const requestsExceeded =
      sessionRequestLimit &&
      currentRequests + requestedRequests > sessionRequestLimit;
    const tokensExceeded =
      sessionTokenLimit && currentTokens + requestedTokens > sessionTokenLimit;

    if (requestsExceeded || tokensExceeded) {
      const limitType = requestsExceeded ? 'requests' : 'tokens';
      const limit = requestsExceeded ? sessionRequestLimit : sessionTokenLimit;
      const usage = requestsExceeded ? currentRequests : currentTokens;

      return {
        allowed: false,
        limitResponse: this.buildLimitResponse(
          project,
          {
            error: 'session_limit_exceeded',
            message:
              'Session {{limitType}} limit ({{limit}}) reached. Start a new session to continue.',
          },
          { tier, identity, limit, usage, limitType, period: 'session' },
        ),
      };
    }

    return { allowed: true };
  }

  // Get limits with identity-aware hierarchy
  // Priority: identity limits > tier.modelLimits[model] > project.modelLimits[model] > tier general > project general
  // Note: -1 or null = explicitly unlimited (no fallback), undefined = fallback to next level
  private getLimitsForIdentity(
    project: Project,
    tier?: string,
    model?: string,
    identityLimit?: {
      requestLimit?: number | null;
      tokenLimit?: number | null;
      customResponse?: any;
    } | null,
  ): {
    requestLimit?: number | null;
    tokenLimit?: number | null;
    customResponse?: any;
  } {
    let limits: {
      requestLimit?: number | null;
      tokenLimit?: number | null;
      customResponse?: any;
    } = {};

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
        limits.requestLimit =
          modelConfig.requestLimit === -1 || modelConfig.requestLimit === null
            ? null
            : modelConfig.requestLimit;
      }
      if (modelConfig.tokenLimit !== undefined) {
        limits.tokenLimit =
          modelConfig.tokenLimit === -1 || modelConfig.tokenLimit === null
            ? null
            : modelConfig.tokenLimit;
      }
    }

    // Override with tier model-specific limits
    if (
      tier &&
      model &&
      project.tiers &&
      project.tiers[tier]?.modelLimits &&
      project.tiers[tier].modelLimits[model]
    ) {
      const tierModelConfig = project.tiers[tier].modelLimits[model];
      if (tierModelConfig.requestLimit !== undefined) {
        // -1 or null means explicitly unlimited
        limits.requestLimit =
          tierModelConfig.requestLimit === -1 ||
          tierModelConfig.requestLimit === null
            ? null
            : tierModelConfig.requestLimit;
      }
      if (tierModelConfig.tokenLimit !== undefined) {
        limits.tokenLimit =
          tierModelConfig.tokenLimit === -1 ||
          tierModelConfig.tokenLimit === null
            ? null
            : tierModelConfig.tokenLimit;
      }
    }

    // Override with identity-specific limits (HIGHEST PRIORITY)
    if (identityLimit) {
      if (
        identityLimit.requestLimit !== undefined &&
        identityLimit.requestLimit !== null
      ) {
        // -1 means explicitly unlimited
        limits.requestLimit =
          identityLimit.requestLimit === -1 ? null : identityLimit.requestLimit;
      }
      if (
        identityLimit.tokenLimit !== undefined &&
        identityLimit.tokenLimit !== null
      ) {
        limits.tokenLimit =
          identityLimit.tokenLimit === -1 ? null : identityLimit.tokenLimit;
      }
      if (identityLimit.customResponse !== undefined) {
        limits.customResponse = identityLimit.customResponse;
      }
    }

    return limits;
  }

  async finalizeUsage(params: FinalizeParams): Promise<void> {
    const {
      project,
      identity,
      model = '',
      session = '',
      periodStart,
      actualTokensUsed,
    } = params;
    const periodStartStr = periodStart.toISOString().split('T')[0];

    // Atomic increment - no race condition
    await this.usageRepository.query(
      `UPDATE usage_counters
       SET "tokensUsed" = "tokensUsed" + $1, "updatedAt" = NOW()
       WHERE "projectId" = $2 AND identity = $3 AND model = $4 AND "session" = $5 AND "periodStart" = $6`,
      [actualTokensUsed, project.id, identity, model, session, periodStartStr],
    );
  }

  async finalizeUsageWithCost(params: {
    project: Project;
    identity: string;
    model?: string;
    session?: string;
    periodStart: Date;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }): Promise<void> {
    const {
      project,
      identity,
      model = '',
      session = '',
      periodStart,
      inputTokens,
      outputTokens,
      cost,
    } = params;
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
       WHERE "projectId" = $5 AND identity = $6 AND model = $7 AND "session" = $8 AND "periodStart" = $9`,
      [
        inputTokens + outputTokens,
        inputTokens,
        outputTokens,
        cost,
        project.id,
        identity,
        model,
        session,
        periodStartStr,
      ],
    );
  }

  async trackBlockedRequest(params: {
    project: Project;
    identity: string;
    model?: string;
    session?: string;
    periodStart: Date;
    estimatedSavings: number;
  }): Promise<void> {
    const {
      project,
      identity,
      model = '',
      session = '',
      periodStart,
      estimatedSavings,
    } = params;
    const periodStartStr = periodStart.toISOString().split('T')[0];

    // Atomic upsert + increment - no race condition
    await this.usageRepository.query(
      `INSERT INTO usage_counters (id, "projectId", identity, model, "session", "periodStart", "requestsUsed", "tokensUsed", "inputTokens", "outputTokens", "costUsd", "blockedRequests", "savedUsd", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 0, 0, 0, 0, 0, 1, $6, NOW(), NOW())
       ON CONFLICT ("projectId", identity, "periodStart", model, "session") 
       DO UPDATE SET 
         "blockedRequests" = usage_counters."blockedRequests" + 1,
         "savedUsd" = usage_counters."savedUsd" + $6,
         "updatedAt" = NOW()`,
      [project.id, identity, model, session, periodStartStr, estimatedSavings],
    );
  }

  async getUsage(params: {
    projectId: string;
    identity: string;
    model?: string;
    session?: string;
    periodStart: Date;
  }): Promise<UsageCounter | null> {
    return this.usageRepository.findOne({
      where: {
        projectId: params.projectId,
        identity: params.identity,
        model: params.model || '',
        session: params.session || '',
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
    // Convert to date string for PostgreSQL DATE column comparison
    const periodStartStr = periodStart.toISOString().split('T')[0];
    
    const counters = await this.usageRepository.query(
      `SELECT * FROM usage_counters WHERE "projectId" = $1 AND "periodStart" = $2`,
      [projectId, periodStartStr],
    );

    const totalRequests = counters.reduce((sum, c) => sum + c.requestsUsed, 0);
    const totalTokens = counters.reduce((sum, c) => sum + c.tokensUsed, 0);
    const totalCost = counters.reduce(
      (sum, c) => sum + Number(c.costUsd || 0),
      0,
    );
    const totalSaved = counters.reduce(
      (sum, c) => sum + Number(c.savedUsd || 0),
      0,
    );
    const blockedRequests = counters.reduce(
      (sum, c) => sum + (c.blockedRequests || 0),
      0,
    );

    return {
      totalRequests,
      totalTokens,
      totalCost,
      totalSaved,
      blockedRequests,
    };
  }

  async getCostSummaryForProject(projectId: string): Promise<{
    today: { spent: number; saved: number; requests: number; blocked: number };
    thisWeek: {
      spent: number;
      saved: number;
      requests: number;
      blocked: number;
    };
    thisMonth: {
      spent: number;
      saved: number;
      requests: number;
      blocked: number;
    };
    allTime: {
      spent: number;
      saved: number;
      requests: number;
      blocked: number;
    };
  }> {
    const now = new Date();
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    
    // Week start (Monday)
    const dayOfWeek = now.getUTCDay();
    const daysToMonday = (dayOfWeek + 6) % 7;
    const weekStart = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - daysToMonday,
      ),
    );
    
    // Month start
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );

    // Get all usage for this project
    const allUsage = await this.usageRepository.find({
      where: { projectId },
    });

    const calculatePeriod = (usage: UsageCounter[], startDate: Date) => {
      const filtered = usage.filter(
        (u) => new Date(u.periodStart) >= startDate,
      );
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
    Array<{
      identity: string;
      model: string;
      requestsUsed: number;
      tokensUsed: number;
    }>
  > {
    // Convert to date string for PostgreSQL DATE column comparison
    const periodStartStr = periodStart.toISOString().split('T')[0];
    
    const counters = await this.usageRepository.query(
      `SELECT * FROM usage_counters WHERE "projectId" = $1 AND "periodStart" = $2 ORDER BY "requestsUsed" DESC`,
      [projectId, periodStartStr],
    );

    return counters.map((c: any) => ({
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
    // Convert to date string for PostgreSQL DATE column comparison
    const periodStartStr = periodStart.toISOString().split('T')[0];
    
    const counters = await this.usageRepository.query(
      `SELECT * FROM usage_counters WHERE "projectId" = $1 AND "periodStart" = $2`,
      [projectId, periodStartStr],
    );

    // Aggregate by model
    const byModel = (counters as any[]).reduce(
      (acc, c) => {
      if (!acc[c.model]) {
        acc[c.model] = { model: c.model, requestsUsed: 0, tokensUsed: 0 };
      }
      acc[c.model].requestsUsed += c.requestsUsed;
      acc[c.model].tokensUsed += c.tokensUsed;
      return acc;
      },
      {} as Record<
        string,
        { model: string; requestsUsed: number; tokensUsed: number }
      >,
    );

    const result = Object.values(byModel) as Array<{ model: string; requestsUsed: number; tokensUsed: number }>;
    return result.sort((a, b) => b.requestsUsed - a.requestsUsed);
  }

  async getUsageHistory(
    projectId: string,
    days: number = 7,
  ): Promise<
    Array<{ label: string; value: number; requests: number; tokens: number }>
  > {
    const history: Array<{
      label: string;
      value: number;
      requests: number;
      tokens: number;
    }> = [];
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
   * Supports: {{tier}}, {{limit}}, {{usage}}, {{limitType}}, {{period}}, {{identity}}
   */
  private interpolateVariables(
    response: any,
    variables: {
      tier?: string;
      limit?: number;
      usage?: number;
      limitType?: string;
      period?: string;
      identity?: string;
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
          interpolated[key] = this.replaceTemplateVars(
            interpolated[key],
            variables,
          );
        } else if (typeof interpolated[key] === 'object') {
          interpolated[key] = this.interpolateVariables(
            interpolated[key],
            variables,
          );
        }
      }
      return interpolated;
    }

    return response;
  }

  /**
   * Build the final limit response with upgrade URL injection
   * Auto-injects upgradeUrl if configured on the project
   */
  private buildLimitResponse(
    project: Project,
    baseResponse: any,
    variables: {
      tier?: string;
      limit?: number;
      usage?: number;
      limitType?: string;
      period?: string;
      identity?: string;
    },
  ): any {
    // Start with interpolated base response
    let response = this.interpolateVariables(baseResponse, variables);

    // Ensure response is an object (wrap string messages)
    if (typeof response === 'string') {
      response = {
        error: 'limit_exceeded',
        message: response,
      };
    }

    // Auto-inject upgradeUrl if configured
    if (project.upgradeUrl) {
      const interpolatedUrl = this.replaceTemplateVars(
        project.upgradeUrl,
        variables,
      );
      response.upgradeUrl = interpolatedUrl;

      // Also create a deep link version with URL-encoded params
      const params = new URLSearchParams();
      if (variables.tier) params.set('tier', variables.tier);
      if (variables.identity) params.set('identity', variables.identity);
      if (variables.limitType) params.set('limitType', variables.limitType);

      const separator = interpolatedUrl.includes('?') ? '&' : '?';
      response.upgradeDeepLink = `${interpolatedUrl}${separator}${params.toString()}`;
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

  // ====================================
  // COST INTELLIGENCE ANALYTICS
  // ====================================

  /**
   * Get detailed cost breakdown by model
   */
  async getCostByModel(
    projectId: string,
    days: number = 30,
  ): Promise<
    Array<{
      model: string;
      requests: number;
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      cost: number;
      percentOfTotal: number;
    }>
  > {
    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - days);
    startDate.setUTCHours(0, 0, 0, 0);

    const usage = await this.usageRepository.find({
      where: { projectId },
    });

    const filtered = usage.filter(
      (u) => new Date(u.periodStart) >= startDate,
    );

    // Aggregate by model
    const byModel: Record<
      string,
      {
        model: string;
        requests: number;
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        cost: number;
      }
    > = {};

    let totalCost = 0;

    for (const u of filtered) {
      const model = u.model || 'unknown';
      if (!byModel[model]) {
        byModel[model] = {
          model,
          requests: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          cost: 0,
        };
      }
      byModel[model].requests += u.requestsUsed;
      byModel[model].inputTokens += u.inputTokens || 0;
      byModel[model].outputTokens += u.outputTokens || 0;
      byModel[model].totalTokens += u.tokensUsed;
      byModel[model].cost += Number(u.costUsd || 0);
      totalCost += Number(u.costUsd || 0);
    }

    return Object.values(byModel)
      .map((m) => ({
        ...m,
        percentOfTotal: totalCost > 0 ? (m.cost / totalCost) * 100 : 0,
      }))
      .sort((a, b) => b.cost - a.cost);
  }

  /**
   * Get top users/identities by cost
   */
  async getTopUsersByCost(
    projectId: string,
    days: number = 30,
    limit: number = 20,
  ): Promise<
    Array<{
      identity: string;
      requests: number;
      tokens: number;
      cost: number;
      avgCostPerRequest: number;
    }>
  > {
    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - days);
    startDate.setUTCHours(0, 0, 0, 0);

    const usage = await this.usageRepository.find({
      where: { projectId },
    });

    const filtered = usage.filter(
      (u) => new Date(u.periodStart) >= startDate,
    );

    // Aggregate by identity
    const byIdentity: Record<
      string,
      { identity: string; requests: number; tokens: number; cost: number }
    > = {};

    for (const u of filtered) {
      if (!byIdentity[u.identity]) {
        byIdentity[u.identity] = {
          identity: u.identity,
          requests: 0,
          tokens: 0,
          cost: 0,
        };
      }
      byIdentity[u.identity].requests += u.requestsUsed;
      byIdentity[u.identity].tokens += u.tokensUsed;
      byIdentity[u.identity].cost += Number(u.costUsd || 0);
    }

    return Object.values(byIdentity)
      .map((u) => ({
        ...u,
        avgCostPerRequest: u.requests > 0 ? u.cost / u.requests : 0,
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, limit);
  }

  /**
   * Get cost history over time (daily breakdown)
   */
  async getCostHistory(
    projectId: string,
    days: number = 30,
  ): Promise<
    Array<{
      date: string;
      cost: number;
      requests: number;
      tokens: number;
      saved: number;
    }>
  > {
    const history: Array<{
      date: string;
      cost: number;
      requests: number;
      tokens: number;
      saved: number;
    }> = [];

    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setUTCDate(date.getUTCDate() - i);
      const periodStart = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
      );

      const dayUsage = await this.usageRepository.find({
        where: {
          projectId,
          periodStart,
        },
      });

      const cost = dayUsage.reduce((sum, u) => sum + Number(u.costUsd || 0), 0);
      const requests = dayUsage.reduce((sum, u) => sum + u.requestsUsed, 0);
      const tokens = dayUsage.reduce((sum, u) => sum + u.tokensUsed, 0);
      const saved = dayUsage.reduce((sum, u) => sum + Number(u.savedUsd || 0), 0);

      history.push({
        date: periodStart.toISOString().split('T')[0],
        cost,
        requests,
        tokens,
        saved,
      });
    }

    return history;
  }

  /**
   * Get projected monthly cost based on current usage
   */
  async getProjectedCost(projectId: string): Promise<{
    currentMonthSpend: number;
    projectedMonthSpend: number;
    daysElapsed: number;
    daysRemaining: number;
    avgDailyCost: number;
  }> {
    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const monthEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
    );

    const daysInMonth = monthEnd.getUTCDate();
    const daysElapsed = now.getUTCDate();
    const daysRemaining = daysInMonth - daysElapsed;

    const usage = await this.usageRepository.find({
      where: { projectId },
    });

    const monthUsage = usage.filter(
      (u) => new Date(u.periodStart) >= monthStart,
    );

    const currentMonthSpend = monthUsage.reduce(
      (sum, u) => sum + Number(u.costUsd || 0),
      0,
    );

    const avgDailyCost = daysElapsed > 0 ? currentMonthSpend / daysElapsed : 0;
    const projectedMonthSpend = avgDailyCost * daysInMonth;

    return {
      currentMonthSpend,
      projectedMonthSpend,
      daysElapsed,
      daysRemaining,
      avgDailyCost,
    };
  }

  // ====================================
  // SECURITY: Cardinality limit checking
  // ====================================

  /**
   * Check if creating a new usage row would exceed cardinality limits
   * Prevents database row explosion attacks
   */
  private async checkCardinalityLimits(
    projectId: string,
    identity: string,
    session: string,
    periodStartStr: string,
  ): Promise<void> {
    // Check if this identity already has a row for this period
    // If so, we're just updating, not creating - skip cardinality check
    const existingRow = await this.usageRepository.query(
      `SELECT 1 FROM usage_counters 
       WHERE "projectId" = $1 AND identity = $2 AND "periodStart" = $3 
       LIMIT 1`,
      [projectId, identity, periodStartStr],
    );

    if (existingRow.length > 0) {
      // This identity exists, check session limit if session is provided
      if (session) {
        const existingSession = await this.usageRepository.query(
          `SELECT 1 FROM usage_counters 
           WHERE "projectId" = $1 AND identity = $2 AND "session" = $3 AND "periodStart" = $4 
           LIMIT 1`,
          [projectId, identity, session, periodStartStr],
        );

        if (existingSession.length === 0) {
          // New session - check session cardinality
          const sessionCount = await this.usageRepository.query(
            `SELECT COUNT(DISTINCT "session") as count FROM usage_counters 
             WHERE "projectId" = $1 AND identity = $2 AND "periodStart" = $3`,
            [projectId, identity, periodStartStr],
          );

          const currentSessions = parseInt(sessionCount[0]?.count || '0', 10);
          if (currentSessions >= MAX_SESSIONS_PER_IDENTITY_PER_PERIOD) {
            throw new HttpException(
              {
                error: 'cardinality_limit_exceeded',
                message: `Too many sessions for this identity (max ${MAX_SESSIONS_PER_IDENTITY_PER_PERIOD} per period)`,
              },
              HttpStatus.TOO_MANY_REQUESTS,
            );
          }
        }
      }
      return; // Identity exists, allow
    }

    // New identity - check project cardinality
    const identityCount = await this.usageRepository.query(
      `SELECT COUNT(DISTINCT identity) as count FROM usage_counters 
       WHERE "projectId" = $1 AND "periodStart" = $2`,
      [projectId, periodStartStr],
    );

    const currentIdentities = parseInt(identityCount[0]?.count || '0', 10);
    if (currentIdentities >= MAX_IDENTITIES_PER_PROJECT_PER_PERIOD) {
      throw new HttpException(
        {
          error: 'cardinality_limit_exceeded',
          message: `Too many unique identities for this project (max ${MAX_IDENTITIES_PER_PROJECT_PER_PERIOD} per period)`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
