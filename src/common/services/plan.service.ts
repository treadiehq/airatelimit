import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Organization } from '../../organizations/organization.entity';
import { Project } from '../../projects/projects.entity';
import { getPlanLimits, PlanLimits, FEATURE_NAMES, FEATURE_MIN_PLAN, PlanType } from '../../config/plans';
import { getDeploymentMode } from '../../config/features';

/**
 * Service for checking plan limits and feature access
 * 
 * Plan resolution by deployment mode:
 * - self-hosted: Always uses 'pro' plan (all Pro features, no billing needed)
 * - enterprise: Always uses 'enterprise' plan (all features with valid license)
 * - cloud: Uses actual subscription plan from Stripe
 */
@Injectable()
export class PlanService {
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    private configService: ConfigService,
  ) {}

  /**
   * Get the effective plan based on deployment mode and org subscription
   * 
   * - self-hosted: Returns 'pro' (all Pro features available)
   * - enterprise: Returns 'enterprise' (all features available)
   * - cloud: Returns actual subscription plan from Stripe
   */
  private getEffectivePlan(orgPlan: string | null | undefined): string {
    const deploymentMode = getDeploymentMode();

    // Self-hosted gets Pro plan features (no billing, but not enterprise features)
    if (deploymentMode === 'self-hosted') {
      return 'pro';
    }

    // Enterprise mode gets all features (license validated separately)
    if (deploymentMode === 'enterprise') {
      return 'enterprise';
    }

    // Cloud mode: check for test override first
    const testOverride = this.configService.get<string>('TEST_PLAN_OVERRIDE');
    if (testOverride) {
      const plan = testOverride.toLowerCase();
      // Map test values to actual plans
      if (['basic', 'pro', 'enterprise'].includes(plan)) {
        return plan;
      }
      if (plan === 'trial' || plan === 'none' || plan.startsWith('trial_')) {
        return 'trial';
      }
      if (plan === 'expired') {
        return 'trial'; // Expired still shows trial limits
      }
    }

    // Cloud mode: use actual org subscription plan
    return orgPlan || 'trial';
  }

  /**
   * Get the plan limits for an organization
   */
  async getOrganizationLimits(organizationId: string): Promise<PlanLimits> {
    const org = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    const effectivePlan = this.getEffectivePlan(org?.plan);
    return getPlanLimits(effectivePlan);
  }

  /**
   * Check if an organization can create more projects
   */
  async canCreateProject(organizationId: string): Promise<{ allowed: boolean; reason?: string; limit: number; current: number }> {
    const org = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    
    const effectivePlan = this.getEffectivePlan(org?.plan);
    const limits = getPlanLimits(effectivePlan);
    const projectCount = await this.projectRepository.count({
      where: { organization: { id: organizationId } },
    });

    if (projectCount >= limits.maxProjects) {
      return {
        allowed: false,
        reason: `You've reached the maximum of ${limits.maxProjects} projects on the ${effectivePlan.charAt(0).toUpperCase() + effectivePlan.slice(1)} plan. Upgrade to create more projects.`,
        limit: limits.maxProjects,
        current: projectCount,
      };
    }

    return {
      allowed: true,
      limit: limits.maxProjects,
      current: projectCount,
    };
  }

  /**
   * Enforce project creation limit (throws if not allowed)
   */
  async enforceProjectLimit(organizationId: string): Promise<void> {
    const result = await this.canCreateProject(organizationId);
    if (!result.allowed) {
      throw new ForbiddenException(result.reason);
    }
  }

  /**
   * Check if an organization has access to a feature
   */
  async hasFeature(organizationId: string, feature: keyof PlanLimits): Promise<boolean> {
    const limits = await this.getOrganizationLimits(organizationId);
    return !!limits[feature];
  }

  /**
   * Enforce feature access (throws if not allowed)
   */
  async enforceFeature(organizationId: string, feature: keyof PlanLimits): Promise<void> {
    const hasAccess = await this.hasFeature(organizationId, feature);
    if (!hasAccess) {
      const featureName = FEATURE_NAMES[feature];
      const minPlan = FEATURE_MIN_PLAN[feature];
      throw new ForbiddenException(
        `${featureName} requires a ${minPlan.charAt(0).toUpperCase() + minPlan.slice(1)} plan or higher.`,
      );
    }
  }

  /**
   * Get usage summary for an organization
   */
  async getUsageSummary(organizationId: string): Promise<{
    plan: string;
    limits: PlanLimits;
    usage: {
      projects: { current: number; limit: number };
      // requests would be tracked separately via usage module
    };
  }> {
    const org = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    
    const plan = this.getEffectivePlan(org?.plan);
    const limits = getPlanLimits(plan);
    
    const projectCount = await this.projectRepository.count({
      where: { organization: { id: organizationId } },
    });

    return {
      plan,
      limits,
      usage: {
        projects: {
          current: projectCount,
          limit: limits.maxProjects,
        },
      },
    };
  }
}

