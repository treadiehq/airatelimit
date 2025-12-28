import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../../organizations/organization.entity';
import { getPlanLimits } from '../../config/plans';

export interface UsageCheckResult {
  allowed: boolean;
  currentUsage: number;
  limit: number;
  remaining: number;
  resetAt: Date;
  reason?: string;
}

/**
 * Usage Limit Service
 * 
 * Tracks and enforces organization-level usage limits based on plan.
 */
@Injectable()
export class UsageLimitService {
  private readonly logger = new Logger(UsageLimitService.name);

  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
  ) {}

  /**
   * Check if organization can make more requests
   */
  async checkRequestLimit(organizationId: string): Promise<UsageCheckResult> {
    const org = await this.getOrganizationWithUsageReset(organizationId);
    
    if (!org) {
      return {
        allowed: true, // Allow if org not found (shouldn't happen)
        currentUsage: 0,
        limit: Infinity,
        remaining: Infinity,
        resetAt: this.getNextResetDate(),
      };
    }

    const limits = getPlanLimits(org.plan);
    const limit = limits.maxRequestsPerMonth;
    const currentUsage = org.monthlyRequestCount || 0;
    const remaining = Math.max(0, limit - currentUsage);

    if (currentUsage >= limit && limit !== Infinity) {
      return {
        allowed: false,
        currentUsage,
        limit,
        remaining: 0,
        resetAt: this.getNextResetDate(org.usagePeriodStart),
        reason: `Monthly request limit of ${this.formatNumber(limit)} exceeded. Upgrade your plan for more requests.`,
      };
    }

    return {
      allowed: true,
      currentUsage,
      limit,
      remaining,
      resetAt: this.getNextResetDate(org.usagePeriodStart),
    };
  }

  /**
   * Increment usage counters for an organization
   */
  async incrementUsage(
    organizationId: string,
    requests: number = 1,
    tokens: number = 0,
  ): Promise<void> {
    // First ensure the period is current
    await this.resetUsageIfNeeded(organizationId);

    // Increment counters atomically
    await this.organizationRepository
      .createQueryBuilder()
      .update(Organization)
      .set({
        monthlyRequestCount: () => `"monthlyRequestCount" + ${requests}`,
        monthlyTokenCount: () => `"monthlyTokenCount" + ${tokens}`,
      })
      .where('id = :id', { id: organizationId })
      .execute();
  }

  /**
   * Get current usage stats for an organization
   */
  async getUsageStats(organizationId: string): Promise<{
    requests: { current: number; limit: number; percentage: number };
    tokens: { current: number };
    periodStart: Date;
    periodEnd: Date;
  }> {
    const org = await this.getOrganizationWithUsageReset(organizationId);
    
    if (!org) {
      return {
        requests: { current: 0, limit: Infinity, percentage: 0 },
        tokens: { current: 0 },
        periodStart: this.getCurrentPeriodStart(),
        periodEnd: this.getNextResetDate(),
      };
    }

    const limits = getPlanLimits(org.plan);
    const requestLimit = limits.maxRequestsPerMonth;
    const currentRequests = org.monthlyRequestCount || 0;
    const percentage = requestLimit === Infinity 
      ? 0 
      : Math.min(100, Math.round((currentRequests / requestLimit) * 100));

    return {
      requests: {
        current: currentRequests,
        limit: requestLimit,
        percentage,
      },
      tokens: {
        current: Number(org.monthlyTokenCount) || 0,
      },
      periodStart: org.usagePeriodStart || this.getCurrentPeriodStart(),
      periodEnd: this.getNextResetDate(org.usagePeriodStart),
    };
  }

  /**
   * Get organization and reset usage if billing period has passed
   */
  private async getOrganizationWithUsageReset(organizationId: string): Promise<Organization | null> {
    const org = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!org) return null;

    // Check if we need to reset the usage period
    if (this.shouldResetUsage(org.usagePeriodStart)) {
      await this.resetUsage(organizationId);
      org.monthlyRequestCount = 0;
      org.monthlyTokenCount = BigInt(0) as any;
      org.usagePeriodStart = this.getCurrentPeriodStart();
    }

    return org;
  }

  /**
   * Reset usage if the billing period has passed
   */
  private async resetUsageIfNeeded(organizationId: string): Promise<void> {
    const org = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (org && this.shouldResetUsage(org.usagePeriodStart)) {
      await this.resetUsage(organizationId);
    }
  }

  /**
   * Check if usage should be reset (new billing period)
   */
  private shouldResetUsage(periodStart: Date | null): boolean {
    if (!periodStart) return true;
    
    const now = new Date();
    const currentPeriodStart = this.getCurrentPeriodStart();
    
    return periodStart < currentPeriodStart;
  }

  /**
   * Reset usage counters for new billing period
   */
  private async resetUsage(organizationId: string): Promise<void> {
    await this.organizationRepository.update(organizationId, {
      monthlyRequestCount: 0,
      monthlyTokenCount: BigInt(0) as any,
      usagePeriodStart: this.getCurrentPeriodStart(),
    });
    
    this.logger.log(`Reset usage for organization ${organizationId}`);
  }

  /**
   * Get the start of the current billing period (first of month)
   */
  private getCurrentPeriodStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  /**
   * Get when usage resets (first of next month)
   */
  private getNextResetDate(periodStart?: Date | null): Date {
    const base = periodStart || this.getCurrentPeriodStart();
    const next = new Date(base);
    next.setMonth(next.getMonth() + 1);
    return next;
  }

  /**
   * Format large numbers for display
   */
  private formatNumber(num: number): string {
    if (num === Infinity) return 'Unlimited';
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(0)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
    return num.toString();
  }
}

