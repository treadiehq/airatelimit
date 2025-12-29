import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { getPlanLimits, PlanLimits, FEATURE_NAMES, FEATURE_MIN_PLAN } from '../../config/plans';
import { getDeploymentMode } from '../../config/features';

/**
 * Mapping of project DTO fields to required plan features
 * 
 * When a user tries to update any of these fields, we check if their plan
 * has access to the corresponding feature.
 */
const FIELD_TO_FEATURE: Record<string, keyof PlanLimits> = {
  // Flow Designer (Pro)
  flowConfig: 'flowDesigner',
  
  // Security Configuration (Pro)
  securityEnabled: 'securityConfig',
  securityMode: 'securityConfig',
  securityCategories: 'securityConfig',
  securityHeuristicsEnabled: 'securityConfig',
  
  // Privacy / Anonymization Configuration (Pro)
  anonymizationEnabled: 'privacyConfig',
  anonymizationConfig: 'privacyConfig',
  
  // Smart Routing (Pro)
  routingEnabled: 'smartRouting',
  routingConfig: 'smartRouting',
  
  // Public Endpoints (Pro)
  publicModeEnabled: 'publicEndpoints',
  allowedOrigins: 'publicEndpoints',
};

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
 * Guard that checks if the user's plan allows updating specific project fields
 * 
 * This guard inspects the request body and validates that the user's plan
 * has access to each feature they're trying to configure.
 * 
 * Deployment mode affects access:
 * - self-hosted: Gets all Pro features, but NOT enterprise features
 * - enterprise: Gets all features (with valid license)
 * - cloud: Uses actual subscription plan from Stripe
 */
@Injectable()
export class ProjectFieldsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const body = request.body;
    
    if (!body || typeof body !== 'object') {
      return true;
    }

    const deploymentMode = getDeploymentMode();

    // Enterprise mode: all features available (license validated separately)
    if (deploymentMode === 'enterprise') {
      return true;
    }

    // Collect all features required by the fields in the request body
    const requiredFeatures = new Set<keyof PlanLimits>();
    
    for (const field of Object.keys(body)) {
      const feature = FIELD_TO_FEATURE[field];
      if (feature) {
        requiredFeatures.add(feature);
      }
    }

    // No restricted fields in the request = allow
    if (requiredFeatures.size === 0) {
      return true;
    }

    // Self-hosted mode: Pro features available, but NOT enterprise-only features
    if (deploymentMode === 'self-hosted') {
      for (const feature of requiredFeatures) {
        if (ENTERPRISE_ONLY_FEATURES.includes(feature)) {
          const featureName = FEATURE_NAMES[feature];
          throw new ForbiddenException(
            `${featureName} requires an Enterprise license. Contact enterprise@airatelimit.com to upgrade.`,
          );
        }
      }
      // Allow all non-enterprise features for self-hosted
      return true;
    }

    // Cloud mode: check actual subscription plan
    const user = request.user;
    
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Get user's organization plan
    const plan = user.organization?.plan || 'trial';
    const limits = getPlanLimits(plan);

    // Check each required feature
    for (const feature of requiredFeatures) {
      const hasAccess = !!limits[feature];

      if (!hasAccess) {
        const featureName = FEATURE_NAMES[feature];
        const minPlan = FEATURE_MIN_PLAN[feature];
        throw new ForbiddenException(
          `${featureName} requires a ${minPlan.charAt(0).toUpperCase() + minPlan.slice(1)} plan or higher. Please upgrade to access this feature.`,
        );
      }
    }

    return true;
  }
}

