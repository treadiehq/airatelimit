/**
 * Feature Flags Configuration
 * 
 * Controls which features are available based on deployment mode:
 * - cloud: Full SaaS with billing, all features enabled
 * - enterprise: Self-hosted with license, premium features enabled
 * - self-hosted: Free OSS version, core features only
 */

export type DeploymentMode = 'cloud' | 'enterprise' | 'self-hosted';

export interface FeatureFlags {
  // === Billing & Monetization (cloud only) ===
  billing: boolean;
  subscriptionPlans: boolean;
  usageBasedPricing: boolean;
  stripeIntegration: boolean;

  // === Enterprise Features (cloud + enterprise) ===
  sso: boolean;
  // saml: boolean;
  auditLogs: boolean;
  teamManagement: boolean;
  sponsorship: boolean;  // Token donations and key pooling
  // advancedAnalytics: boolean;
  customBranding: boolean;
  apiRateLimitOverrides: boolean;
  webhooks: boolean;
  dataExport: boolean;
  prioritySupport: boolean;

  // === Core Features (always available) ===
  rateLimiting: boolean;
  costTracking: boolean;
  multiProvider: boolean;
  identityLimits: boolean;
  promptStorage: boolean;
  flowConfig: boolean;
}

export function getDeploymentMode(): DeploymentMode {
  const mode = process.env.DEPLOYMENT_MODE?.toLowerCase();
  if (mode === 'cloud' || mode === 'enterprise' || mode === 'self-hosted') {
    return mode;
  }
  return 'self-hosted';
}

export function getFeatureFlags(): FeatureFlags {
  const mode = getDeploymentMode();

  // Core features - always enabled
  const coreFeatures = {
    rateLimiting: true,
    costTracking: true,
    multiProvider: true,
    identityLimits: true,
    promptStorage: true,
    flowConfig: true,
  };

  switch (mode) {
    case 'cloud':
      return {
        ...coreFeatures,
        // Billing - cloud only
        billing: true,
        subscriptionPlans: true,
        usageBasedPricing: true,
        stripeIntegration: true,
        // Enterprise features - enabled
        sso: true,
        // saml: true,
        auditLogs: true,
        teamManagement: true,
        sponsorship: true,  // Enabled but requires Pro/Enterprise plan
        // advancedAnalytics: true,
        customBranding: true,
        apiRateLimitOverrides: true,
        webhooks: true,
        dataExport: true,
        prioritySupport: true,
      };

    case 'enterprise':
      return {
        ...coreFeatures,
        // Billing - disabled (they pay via invoice)
        billing: false,
        subscriptionPlans: false,
        usageBasedPricing: false,
        stripeIntegration: false,
        // Enterprise features - enabled
        sso: true,
        // saml: true,
        auditLogs: true,
        teamManagement: true,
        sponsorship: true,  // Always enabled for enterprise
        // advancedAnalytics: true,
        customBranding: true,
        apiRateLimitOverrides: true,
        webhooks: true,
        dataExport: true,
        prioritySupport: true,
      };

    case 'self-hosted':
    default:
      return {
        ...coreFeatures,
        // Billing - disabled
        billing: false,
        subscriptionPlans: false,
        usageBasedPricing: false,
        stripeIntegration: false,
        // Enterprise features - disabled
        sso: false,
        // saml: false,
        auditLogs: false,
        teamManagement: false,
        sponsorship: false,  // Not available in self-hosted
        // advancedAnalytics: false,
        customBranding: false,
        apiRateLimitOverrides: false,
        webhooks: false,
        dataExport: false,
        prioritySupport: false,
      };
  }
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return getFeatureFlags()[feature];
}

/**
 * Check if running in cloud mode
 */
export function isCloudMode(): boolean {
  return getDeploymentMode() === 'cloud';
}

/**
 * Check if running in enterprise mode
 */
export function isEnterpriseMode(): boolean {
  return getDeploymentMode() === 'enterprise';
}

/**
 * Check if running in self-hosted mode
 */
export function isSelfHostedMode(): boolean {
  return getDeploymentMode() === 'self-hosted';
}

