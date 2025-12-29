/**
 * Plan Limits Composable
 * 
 * Provides access to plan limits and feature checks.
 */

export interface PlanLimits {
  maxProjects: number;
  maxRequestsPerMonth: number;
  costTracking: boolean;
  usageAnalytics: boolean;
  emailSupport: boolean;
  flowDesigner: boolean;
  promptsConfig: boolean;
  privacyConfig: boolean;
  smartRouting: boolean;
  securityConfig: boolean;
  publicEndpoints: boolean;
  selfHosting: boolean;
  dedicatedSupport: boolean;
  auditLogs: boolean;
  sso: boolean;
}

export interface PlanUsage {
  plan: string;
  limits: PlanLimits;
  usage: {
    projects: { current: number; limit: number };
    requests: { current: number; limit: number; periodStart: string | null; periodEnd: string };
  };
}

// Default limits for trial/basic plan
const DEFAULT_LIMITS: PlanLimits = {
  maxProjects: 3,
  maxRequestsPerMonth: 100_000,
  costTracking: true,
  usageAnalytics: true,
  emailSupport: true,
  flowDesigner: false,
  promptsConfig: false,
  privacyConfig: false,
  smartRouting: false,
  securityConfig: false,
  publicEndpoints: false,
  selfHosting: false,
  dedicatedSupport: false,
  auditLogs: false,
  sso: false,
};

// Feature display names
export const FEATURE_NAMES: Record<keyof PlanLimits, string> = {
  maxProjects: 'Projects',
  maxRequestsPerMonth: 'Requests/month',
  costTracking: 'Cost Tracking',
  usageAnalytics: 'Usage Analytics',
  emailSupport: 'Email Support',
  flowDesigner: 'Flow Designer',
  promptsConfig: 'Prompts Configuration',
  privacyConfig: 'Privacy Configuration',
  smartRouting: 'Smart Routing',
  securityConfig: 'Security Configuration',
  publicEndpoints: 'Public Endpoints',
  selfHosting: 'Self-Hosting License',
  dedicatedSupport: 'Dedicated Support',
  auditLogs: 'Audit Logs',
  sso: 'SSO / SAML',
};

// Minimum plan for each feature
export const FEATURE_MIN_PLAN: Record<keyof PlanLimits, string> = {
  maxProjects: 'trial',
  maxRequestsPerMonth: 'trial',
  costTracking: 'trial',
  usageAnalytics: 'trial',
  emailSupport: 'trial',
  flowDesigner: 'pro',
  promptsConfig: 'pro',
  privacyConfig: 'pro',
  smartRouting: 'pro',
  securityConfig: 'pro',
  publicEndpoints: 'pro',
  selfHosting: 'enterprise',
  dedicatedSupport: 'enterprise',
  auditLogs: 'enterprise',
  sso: 'enterprise',
};

export function usePlan() {
  const api = useApi();
  const { features } = useFeatures();
  
  const plan = ref<string>('trial');
  const limits = ref<PlanLimits>(DEFAULT_LIMITS);
  const usage = ref<{ 
    projects: { current: number; limit: number };
    requests: { current: number; limit: number; periodStart: string | null; periodEnd: string };
  }>({
    projects: { current: 0, limit: 3 },
    requests: { current: 0, limit: 100_000, periodStart: null, periodEnd: '' },
  });
  const loaded = ref(false);

  const loadPlan = async () => {
    const { mode } = useFeatures();
    
    // Enterprise mode: all features unlocked (with valid license)
    if (mode.value === 'enterprise') {
      limits.value = {
        ...DEFAULT_LIMITS,
        maxProjects: Infinity,
        maxRequestsPerMonth: Infinity,
        flowDesigner: true,
        promptsConfig: true,
        privacyConfig: true,
        smartRouting: true,
        securityConfig: true,
        publicEndpoints: true,
        selfHosting: true,
        dedicatedSupport: true,
        auditLogs: true,
        sso: true,
      };
      plan.value = 'enterprise';
      loaded.value = true;
      return;
    }

    // Self-hosted mode: Pro features unlocked (but NOT enterprise features)
    if (mode.value === 'self-hosted') {
      limits.value = {
        ...DEFAULT_LIMITS,
        maxProjects: Infinity,
        maxRequestsPerMonth: Infinity,
        // Pro features - available
        flowDesigner: true,
        promptsConfig: true,
        privacyConfig: true,
        smartRouting: true,
        securityConfig: true,
        publicEndpoints: true,
        // Enterprise features - NOT available (require license)
        selfHosting: false,
        dedicatedSupport: false,
        auditLogs: false,
        sso: false,
      };
      plan.value = 'pro';
      loaded.value = true;
      return;
    }

    // Cloud mode: fetch actual plan from billing API
    if (!features.value.showBilling) {
      loaded.value = true;
      return;
    }

    try {
      const data = await api('/billing/plan');
      if (data) {
        plan.value = data.plan || 'trial';
        limits.value = data.limits || DEFAULT_LIMITS;
        usage.value = data.usage || { 
          projects: { current: 0, limit: 3 },
          requests: { current: 0, limit: 100_000, periodStart: null, periodEnd: '' },
        };
      }
    } catch (err) {
      console.warn('Failed to load plan limits:', err);
    }
    loaded.value = true;
  };

  const hasFeature = (feature: keyof PlanLimits): boolean => {
    return !!limits.value[feature];
  };

  const canCreateProject = computed(() => {
    const limit = usage.value.projects.limit;
    // null means unlimited (Infinity serialized as null in JSON)
    if (limit === null || limit === Infinity) return true;
    return usage.value.projects.current < limit;
  });

  const projectsRemaining = computed(() => {
    const limit = usage.value.projects.limit;
    // null means unlimited (Infinity serialized as null in JSON)
    if (limit === null || limit === Infinity) return 'Unlimited';
    return Math.max(0, limit - usage.value.projects.current);
  });

  const getMinPlanForFeature = (feature: keyof PlanLimits): string => {
    return FEATURE_MIN_PLAN[feature] || 'pro';
  };

  const getFeatureName = (feature: keyof PlanLimits): string => {
    return FEATURE_NAMES[feature] || feature;
  };

  // Load on mount
  onMounted(loadPlan);

  return {
    plan: readonly(plan),
    limits: readonly(limits),
    usage: readonly(usage),
    loaded: readonly(loaded),
    hasFeature,
    canCreateProject,
    projectsRemaining,
    getMinPlanForFeature,
    getFeatureName,
    loadPlan,
  };
}

