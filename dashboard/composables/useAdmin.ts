import { ref, computed } from 'vue'

export interface OrganizationInfo {
  id: string
  name: string
  plan: 'trial' | 'basic' | 'pro' | 'enterprise'
  status: 'active' | 'trial' | 'expired'
  daysRemaining: number | null
  expiresAt: string | null
  userCount: number
  createdAt: string
}

export const PLAN_OPTIONS = [
  { value: 'trial', label: 'Trial', color: 'gray' },
  { value: 'basic', label: 'Basic', color: 'blue' },
  { value: 'pro', label: 'Pro', color: 'purple' },
  { value: 'enterprise', label: 'Enterprise', color: 'amber' },
] as const

export const DURATION_OPTIONS = [
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 180, label: '6 months' },
  { value: 365, label: '1 year' },
  { value: null, label: 'No expiry' },
] as const

// Shared state for admin status (loaded once, shared across components)
const adminStatus = ref<boolean | null>(null)
const adminStatusLoading = ref(false)

export function useAdmin() {
  const api = useApi()
  const { user } = useAuth()

  const organizations = ref<OrganizationInfo[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Load admin status from backend
   */
  const loadAdminStatus = async () => {
    if (adminStatus.value !== null || adminStatusLoading.value) return
    if (!user.value) return

    adminStatusLoading.value = true
    try {
      const data = await api('/auth/me')
      adminStatus.value = data.isAdmin === true
    } catch (err) {
      console.error('Failed to check admin status:', err)
      adminStatus.value = false
    } finally {
      adminStatusLoading.value = false
    }
  }

  /**
   * Check if current user is a dashboard admin (loaded from backend)
   */
  const isAdmin = computed(() => adminStatus.value === true)

  /**
   * Load all organizations (admin only)
   */
  const loadOrganizations = async () => {
    loading.value = true
    error.value = null

    try {
      const data = await api('/admin/organizations')
      organizations.value = data.organizations || []
    } catch (err: any) {
      error.value = err.message
      console.error('Failed to load organizations:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Update an organization's plan with optional duration
   */
  const updateOrganizationPlan = async (
    orgId: string,
    plan: string,
    durationDays?: number | null,
  ) => {
    try {
      await api(`/admin/organizations/${orgId}/plan`, {
        method: 'PATCH',
        body: { plan, durationDays },
      })

      // Reload to get updated expiry info
      await loadOrganizations()

      return { success: true }
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  return {
    // State
    organizations,
    loading,
    error,
    isAdmin,
    adminStatusLoading: computed(() => adminStatusLoading.value),

    // Actions
    loadAdminStatus,
    loadOrganizations,
    updateOrganizationPlan,
  }
}
