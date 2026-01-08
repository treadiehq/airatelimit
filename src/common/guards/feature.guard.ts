import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  getFeatureFlags,
  getDeploymentMode,
  FeatureFlags,
} from '../../config/features';

/**
 * Metadata key for required feature
 */
export const REQUIRED_FEATURE_KEY = 'required_feature';

/**
 * Decorator to mark an endpoint as requiring a specific feature
 * 
 * @example
 * ```typescript
 * @Get('logs')
 * @RequireFeature('auditLogs')
 * async getAuditLogs() { ... }
 * ```
 */
export const RequireFeature = (feature: keyof FeatureFlags) =>
  SetMetadata(REQUIRED_FEATURE_KEY, feature);

/**
 * Guard that checks if a feature is enabled for the current deployment mode
 * 
 * Use with @RequireFeature() decorator on controller methods or classes.
 * Returns a 403 Forbidden with upgrade URL if feature is not available.
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required feature from method or class decorator
    const requiredFeature = this.reflector.getAllAndOverride<keyof FeatureFlags>(
      REQUIRED_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No feature requirement = allow access
    if (!requiredFeature) {
      return true;
    }

    const features = getFeatureFlags();
    const isEnabled = features[requiredFeature];

    if (!isEnabled) {
      const mode = getDeploymentMode();
      
      throw new ForbiddenException({
        error: 'feature_not_available',
        message: this.getErrorMessage(requiredFeature, mode),
        feature: requiredFeature,
        deployment_mode: mode,
        upgrade_url: this.getUpgradeUrl(requiredFeature, mode),
      });
    }

    return true;
  }

  private getErrorMessage(feature: keyof FeatureFlags, mode: string): string {
    const featureNames: Record<keyof FeatureFlags, string> = {
      billing: 'Billing',
      subscriptionPlans: 'Subscription Plans',
      usageBasedPricing: 'Usage-Based Pricing',
      stripeIntegration: 'Stripe Integration',
      sso: 'Single Sign-On (SSO)',
      // saml: 'SAML Authentication',
      auditLogs: 'Audit Logs',
      teamManagement: 'Team Management',
      sponsorship: 'Sponsorship & Key Pooling',
      // advancedAnalytics: 'Advanced Analytics',
      customBranding: 'Custom Branding',
      apiRateLimitOverrides: 'API Rate Limit Overrides',
      webhooks: 'Webhooks',
      dataExport: 'Data Export',
      prioritySupport: 'Priority Support',
      rateLimiting: 'Rate Limiting',
      costTracking: 'Cost Tracking',
      multiProvider: 'Multi-Provider Support',
      identityLimits: 'Identity Limits',
      promptStorage: 'Prompt Storage',
      flowConfig: 'Flow Configuration',
    };

    const name = featureNames[feature] || feature;

    if (mode === 'self-hosted') {
      return `${name} requires an Enterprise license. Upgrade to access this feature.`;
    }

    return `${name} is not available in your current plan.`;
  }

  private getUpgradeUrl(feature: keyof FeatureFlags, mode: string): string {
    // Billing features are cloud-only
    const billingFeatures: (keyof FeatureFlags)[] = [
      'billing',
      'subscriptionPlans',
      'usageBasedPricing',
      'stripeIntegration',
    ];

    if (billingFeatures.includes(feature)) {
      return 'https://airatelimit.com/cloud';
    }

    // Enterprise features
    return 'https://airatelimit.com/enterprise';
  }
}

