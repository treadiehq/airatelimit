/**
 * Feature Flags Composable
 * 
 * Controls which UI features are visible based on deployment mode.
 * Keeps billing/enterprise features hidden for self-hosted users.
 */

export type DeploymentMode = 'cloud' | 'enterprise' | 'self-hosted'

export interface DashboardFeatures {
  // === Billing UI (cloud only) ===
  showBilling: boolean
  showUpgradePrompts: boolean
  showPricingPage: boolean
  showSubscriptionManagement: boolean
  showUsageBasedPricing: boolean

  // === Enterprise Features (cloud + enterprise) ===
  showSSO: boolean
  // showSAML: boolean
  showAuditLogs: boolean
  showTeamManagement: boolean
  // showAdvancedAnalytics: boolean
  showCustomBranding: boolean
  showWebhooks: boolean
  showDataExport: boolean

  // === Marketing/Upsell ===
  showEnterpriseUpsell: boolean  // Show upgrade CTA for self-hosted
  showCloudUpsell: boolean       // Show "try cloud" for self-hosted

  // === Branding ===
  showPoweredBy: boolean         // "Powered by AI Ratelimit" badge
  allowCustomBranding: boolean   // Can hide branding
}

export const useFeatures = () => {
  const config = useRuntimeConfig()
  
  const mode = computed<DeploymentMode>(() => {
    const envMode = config.public.deploymentMode as string
    if (envMode === 'cloud' || envMode === 'enterprise' || envMode === 'self-hosted') {
      return envMode
    }
    return 'self-hosted'
  })

  const isCloud = computed(() => mode.value === 'cloud')
  const isEnterprise = computed(() => mode.value === 'enterprise')
  const isSelfHosted = computed(() => mode.value === 'self-hosted')

  const features = computed<DashboardFeatures>(() => {
    const m = mode.value

    return {
      // === Billing UI ===
      // Only show billing-related UI in cloud mode
      showBilling: m === 'cloud',
      showUpgradePrompts: m === 'cloud',
      showPricingPage: m === 'cloud',
      showSubscriptionManagement: m === 'cloud',
      showUsageBasedPricing: m === 'cloud',

      // === Enterprise Features ===
      // Available in cloud and enterprise modes
      showSSO: m !== 'self-hosted',
      showSAML: m !== 'self-hosted',
      showAuditLogs: m !== 'self-hosted',
      showTeamManagement: m !== 'self-hosted',
      showAdvancedAnalytics: m !== 'self-hosted',
      showCustomBranding: m !== 'self-hosted',
      showWebhooks: m !== 'self-hosted',
      showDataExport: m !== 'self-hosted',

      // === Marketing/Upsell ===
      // Show upgrade prompts only to self-hosted users
      showEnterpriseUpsell: m === 'self-hosted',
      showCloudUpsell: m === 'self-hosted',

      // === Branding ===
      showPoweredBy: m === 'self-hosted',
      allowCustomBranding: m !== 'self-hosted',
    }
  })

  /**
   * Check if a specific feature is enabled
   */
  const hasFeature = (feature: keyof DashboardFeatures): boolean => {
    return features.value[feature]
  }

  /**
   * Get upgrade URL for enterprise features (configurable via env)
   */
  const enterpriseUpgradeUrl = computed(() => {
    return config.public.enterpriseUrl as string || 'https://airatelimit.com/enterprise'
  })

  /**
   * Get cloud signup URL (configurable via env)
   */
  const cloudSignupUrl = computed(() => {
    return config.public.cloudSignupUrl as string || 'https://airatelimit.com/signup'
  })

  return {
    mode,
    isCloud,
    isEnterprise,
    isSelfHosted,
    features,
    hasFeature,
    enterpriseUpgradeUrl,
    cloudSignupUrl,
  }
}

