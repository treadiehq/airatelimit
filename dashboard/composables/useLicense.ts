/**
 * License Management Composable
 * 
 * For enterprise deployments - checks license validity
 * and handles expiration.
 */

export interface LicenseInfo {
  valid: boolean
  org: string
  seats: number
  expiresAt: string
  daysRemaining: number
  isExpired: boolean
  features: string[]
  error?: string
}

export const useLicense = () => {
  const api = useApi()
  const { isEnterprise } = useFeatures()

  const license = ref<LicenseInfo | null>(null)
  const loaded = ref(false)
  const loading = ref(false)

  const loadLicense = async () => {
    // Only relevant in enterprise mode
    if (!isEnterprise.value) {
      loaded.value = true
      return
    }

    loading.value = true
    try {
      const data = await api.get<any>('/health/license')
      if (data.valid !== undefined) {
        license.value = data as LicenseInfo
      }
    } catch (error) {
      console.error('Failed to load license:', error)
    } finally {
      loading.value = false
      loaded.value = true
    }
  }

  const isValid = computed(() => license.value?.valid ?? true)
  const isExpired = computed(() => license.value?.isExpired ?? false)
  const daysRemaining = computed(() => license.value?.daysRemaining ?? 999)
  const expiresAt = computed(() => license.value?.expiresAt ?? '')
  const orgName = computed(() => license.value?.org ?? '')

  const isExpiringSoon = computed(() => {
    return daysRemaining.value <= 30 && daysRemaining.value > 0
  })

  const expirationWarning = computed(() => {
    if (!license.value) return null
    if (isExpired.value) {
      return {
        type: 'error' as const,
        message: `Your enterprise license expired on ${expiresAt.value}. Please renew to continue using the software.`,
      }
    }
    if (daysRemaining.value <= 7) {
      return {
        type: 'error' as const,
        message: `Your license expires in ${daysRemaining.value} day${daysRemaining.value === 1 ? '' : 's'}. Renew now to avoid service interruption.`,
      }
    }
    if (daysRemaining.value <= 30) {
      return {
        type: 'warning' as const,
        message: `Your license expires in ${daysRemaining.value} days. Consider renewing soon.`,
      }
    }
    return null
  })

  return {
    license,
    loaded,
    loading,
    loadLicense,
    isValid,
    isExpired,
    isExpiringSoon,
    daysRemaining,
    expiresAt,
    orgName,
    expirationWarning,
  }
}

