import { ref, computed } from 'vue'

export interface OrganizationInfo {
  id: string
  name: string
  plan: 'trial' | 'basic' | 'pro' | 'enterprise'
  userCount: number
  createdAt: string
}

export const PLAN_OPTIONS = [
  { value: 'trial', label: 'Trial', color: 'gray' },
  { value: 'basic', label: 'Basic', color: 'blue' },
  { value: 'pro', label: 'Pro', color: 'purple' },
  { value: 'enterprise', label: 'Enterprise', color: 'amber' },
] as const

export function useAdmin() {
  const api = useApi()
  const { user } = useAuth()
  const config = useRuntimeConfig()

  const organizations = ref<OrganizationInfo[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Check if current user is a dashboard admin
   */
  const isAdmin = computed(() => {
    if (!user.value?.email) return false
    const adminEmails = (config.public.adminEmails || '').split(',').map((e: string) => e.trim().toLowerCase())
    // Debug log - remove after testing
    console.log('[Admin Check]', { 
      userEmail: user.value.email, 
      adminEmails, 
      configValue: config.public.adminEmails 
    })
    return adminEmails.includes(user.value.email.toLowerCase())
  })

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
   * Update an organization's plan
   */
  const updateOrganizationPlan = async (orgId: string, plan: string) => {
    try {
      await api(`/admin/organizations/${orgId}/plan`, {
        method: 'PATCH',
        body: { plan },
      })

      // Update local state
      const org = organizations.value.find((o) => o.id === orgId)
      if (org) {
        org.plan = plan as OrganizationInfo['plan']
      }

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

    // Actions
    loadOrganizations,
    updateOrganizationPlan,
  }
}

