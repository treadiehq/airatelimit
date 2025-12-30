/**
 * Plan Limits Configuration
 * 
 * Defines the features and limits for each subscription plan.
 */

export type PlanType = 'trial' | 'basic' | 'pro' | 'enterprise';

export interface PlanLimits {
  // Resource limits
  maxProjects: number;
  maxRequestsPerMonth: number;
  maxTeamMembers: number;  // Team size limit (Infinity for unlimited)
  
  // Features
  costTracking: boolean;
  usageAnalytics: boolean;
  emailSupport: boolean;
  flowDesigner: boolean;
  promptsConfig: boolean;
  privacyConfig: boolean;
  smartRouting: boolean;
  securityConfig: boolean;
  publicEndpoints: boolean;  // Frontend-safe public API endpoints with origin restriction
  teamManagement: boolean;   // Invite and manage team members
  selfHosting: boolean;
  dedicatedSupport: boolean;
  auditLogs: boolean;
  sso: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  // Trial gets Basic features
  trial: {
    maxProjects: 3,
    maxRequestsPerMonth: 100_000,
    maxTeamMembers: 1,  // No team management
    costTracking: true,
    usageAnalytics: true,
    emailSupport: true,
    flowDesigner: false,
    promptsConfig: false,
    privacyConfig: false,
    smartRouting: false,
    securityConfig: false,
    publicEndpoints: false,
    teamManagement: false,
    selfHosting: false,
    dedicatedSupport: false,
    auditLogs: false,
    sso: false,
  },
  
  basic: {
    maxProjects: 3,
    maxRequestsPerMonth: 100_000,
    maxTeamMembers: 1,  // No team management
    costTracking: true,
    usageAnalytics: true,
    emailSupport: true,
    flowDesigner: false,
    promptsConfig: false,
    privacyConfig: false,
    smartRouting: false,
    securityConfig: false,
    publicEndpoints: false,
    teamManagement: false,
    selfHosting: false,
    dedicatedSupport: false,
    auditLogs: false,
    sso: false,
  },
  
  pro: {
    maxProjects: 50,
    maxRequestsPerMonth: 1_000_000,
    maxTeamMembers: 5,  // Up to 5 team members
    costTracking: true,
    usageAnalytics: true,
    emailSupport: true,
    flowDesigner: true,
    promptsConfig: true,
    privacyConfig: true,
    smartRouting: true,
    securityConfig: true,
    publicEndpoints: true,
    teamManagement: true,
    selfHosting: false,
    dedicatedSupport: false,
    auditLogs: false,
    sso: false,
  },
  
  enterprise: {
    maxProjects: Infinity,
    maxRequestsPerMonth: Infinity,
    maxTeamMembers: Infinity,  // Unlimited team members
    costTracking: true,
    usageAnalytics: true,
    emailSupport: true,
    flowDesigner: true,
    promptsConfig: true,
    privacyConfig: true,
    smartRouting: true,
    securityConfig: true,
    publicEndpoints: true,
    teamManagement: true,
    selfHosting: true,
    dedicatedSupport: true,
    auditLogs: true,
    sso: true,
  },
};

/**
 * Get plan limits for a given plan
 */
export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  const planType = (plan?.toLowerCase() || 'trial') as PlanType;
  return PLAN_LIMITS[planType] || PLAN_LIMITS.trial;
}

/**
 * Check if a plan has access to a specific feature
 */
export function hasFeature(plan: string | null | undefined, feature: keyof PlanLimits): boolean {
  const limits = getPlanLimits(plan);
  return !!limits[feature];
}

/**
 * Get the display name for a plan
 */
export function getPlanDisplayName(plan: string | null | undefined): string {
  const names: Record<string, string> = {
    trial: 'Trial',
    basic: 'Basic',
    pro: 'Pro',
    enterprise: 'Enterprise',
  };
  return names[plan?.toLowerCase() || 'trial'] || 'Trial';
}

/**
 * Feature names for display
 */
export const FEATURE_NAMES: Record<keyof PlanLimits, string> = {
  maxProjects: 'Projects',
  maxRequestsPerMonth: 'Requests/month',
  maxTeamMembers: 'Team Members',
  costTracking: 'Cost Tracking',
  usageAnalytics: 'Usage Analytics',
  emailSupport: 'Email Support',
  flowDesigner: 'Flow Designer',
  promptsConfig: 'Prompts Configuration',
  privacyConfig: 'Privacy Configuration',
  smartRouting: 'Smart Routing',
  securityConfig: 'Security Configuration',
  publicEndpoints: 'Public Endpoints',
  teamManagement: 'Team Management',
  selfHosting: 'Self-Hosting License',
  dedicatedSupport: 'Dedicated Support',
  auditLogs: 'Audit Logs',
  sso: 'SSO / SAML',
};

/**
 * Minimum plan required for each feature
 */
export const FEATURE_MIN_PLAN: Record<keyof PlanLimits, PlanType> = {
  maxProjects: 'trial',
  maxRequestsPerMonth: 'trial',
  maxTeamMembers: 'pro',
  costTracking: 'trial',
  usageAnalytics: 'trial',
  emailSupport: 'trial',
  flowDesigner: 'pro',
  promptsConfig: 'pro',
  privacyConfig: 'pro',
  smartRouting: 'pro',
  securityConfig: 'pro',
  publicEndpoints: 'pro',
  teamManagement: 'pro',
  selfHosting: 'enterprise',
  dedicatedSupport: 'enterprise',
  auditLogs: 'enterprise',
  sso: 'enterprise',
};

