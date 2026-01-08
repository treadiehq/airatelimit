import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { getPlanLimits, PlanLimits, FEATURE_NAMES, FEATURE_MIN_PLAN } from '../../config/plans';
import { getDeploymentMode } from '../../config/features';

export const REQUIRED_FEATURE_KEY = 'requiredPlanFeature';

/**
 * Features that require an enterprise license (not available in self-hosted)
 */
const ENTERPRISE_ONLY_FEATURES: (keyof PlanLimits)[] = [
  'selfHosting',
  'dedicatedSupport',
  'auditLogs',
  'sso',
];

/**
 * Decorator to require a specific plan feature for an endpoint
 * 
 * @example
 * @RequirePlanFeature('flowDesigner')
 * @Get('flow')
 * getFlow() { ... }
 */
export const RequirePlanFeature = (feature: keyof PlanLimits) =>
  SetMetadata(REQUIRED_FEATURE_KEY, feature);

/**
 * Guard that checks if the user's plan has access to the required feature
 * 
 * Deployment mode affects access:
 * - self-hosted: Gets all Pro features, but NOT enterprise features
 * - enterprise: Gets all features (with valid license)
 * - cloud: Uses actual subscription plan from Stripe
 */
@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredFeature = this.reflector.getAllAndOverride<keyof PlanLimits>(
      REQUIRED_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No feature requirement = allow access
    if (!requiredFeature) {
      return true;
    }

    const deploymentMode = getDeploymentMode();

    // Enterprise mode: all features available (license validated separately)
    if (deploymentMode === 'enterprise') {
      return true;
    }

    // Self-hosted mode: Pro features available, but NOT enterprise-only features
    if (deploymentMode === 'self-hosted') {
      if (ENTERPRISE_ONLY_FEATURES.includes(requiredFeature)) {
        const featureName = FEATURE_NAMES[requiredFeature];
        throw new ForbiddenException(
          `${featureName} requires an Enterprise license. Contact enterprise@airatelimit.com to upgrade.`,
        );
      }
      // Allow all non-enterprise features for self-hosted
      return true;
    }

    // Cloud mode: check actual subscription plan
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Check for test override first (development only)
    const testPlan = this.configService.get<string>('TEST_PLAN_OVERRIDE');
    const plan = testPlan || user.organization?.plan || 'trial';
    const limits = getPlanLimits(plan);

    // Check if the plan has the required feature
    const hasAccess = !!limits[requiredFeature];

    if (!hasAccess) {
      const featureName = FEATURE_NAMES[requiredFeature];
      const minPlan = FEATURE_MIN_PLAN[requiredFeature];
      throw new ForbiddenException(
        `${featureName} requires a ${minPlan.charAt(0).toUpperCase() + minPlan.slice(1)} plan or higher. Please upgrade to access this feature.`,
      );
    }

    return true;
  }
}

