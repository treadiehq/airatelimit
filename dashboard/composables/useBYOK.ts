/**
 * BYOK Composable
 * 
 * Manages BYOK (Bring Your Own Key) state and API calls.
 */

export interface ByokConfig {
  id: string
  organizationId: string
  enabled: boolean
  allowedProviders: string[]
  validateKeysOnSave: boolean
  trackUsage: boolean
  createdAt: string
  updatedAt: string
}

export interface UserKey {
  id: string
  organizationId: string
  identity: string
  provider: string
  keyHint: string
  baseUrl?: string
  isActive: boolean
  lastUsedAt: string | null
  requestCount: number
  totalTokens: number
  createdAt: string
  updatedAt: string
}

export interface ByokStats {
  totalUsers: number
  totalKeys: number
  totalRequests: number
  providerBreakdown: Record<string, { keys: number; requests: number }>
}

export function useBYOK() {
  const api = useApi()

  const config = ref<ByokConfig | null>(null)
  const keys = ref<UserKey[]>([])
  const stats = ref<ByokStats | null>(null)
  const totalKeys = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const available = ref<boolean | null>(null)

  /**
   * Check if BYOK is available for the organization
   */
  const checkAvailability = async (): Promise<boolean> => {
    try {
      const result = await api('/byok/available')
      available.value = result.available
      return result.available
    } catch (e: any) {
      console.error('Failed to check BYOK availability:', e)
      available.value = false
      return false
    }
  }

  /**
   * Load BYOK config
   */
  const loadConfig = async (): Promise<ByokConfig | null> => {
    loading.value = true
    error.value = null
    try {
      const result = await api('/byok/config')
      config.value = result
      return result
    } catch (e: any) {
      error.value = e.message || 'Failed to load BYOK config'
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Update BYOK config
   */
  const updateConfig = async (updates: Partial<Pick<ByokConfig, 'enabled' | 'allowedProviders' | 'validateKeysOnSave' | 'trackUsage'>>): Promise<ByokConfig | null> => {
    loading.value = true
    error.value = null
    try {
      const result = await api('/byok/config', {
        method: 'PATCH',
        body: updates,
      })
      config.value = result
      return result
    } catch (e: any) {
      error.value = e.message || 'Failed to update BYOK config'
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Load user keys
   */
  const loadKeys = async (options?: { limit?: number; offset?: number; search?: string }): Promise<void> => {
    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams()
      if (options?.limit) params.set('limit', String(options.limit))
      if (options?.offset) params.set('offset', String(options.offset))
      if (options?.search) params.set('search', options.search)

      const result = await api(`/byok/keys?${params.toString()}`)
      keys.value = result.keys
      totalKeys.value = result.total
    } catch (e: any) {
      error.value = e.message || 'Failed to load user keys'
    } finally {
      loading.value = false
    }
  }

  /**
   * Revoke a user key
   */
  const revokeKey = async (keyId: string): Promise<boolean> => {
    try {
      await api(`/byok/keys/${keyId}/revoke`, { method: 'PATCH' })
      const index = keys.value.findIndex(k => k.id === keyId)
      if (index !== -1) {
        keys.value[index].isActive = false
      }
      return true
    } catch (e: any) {
      error.value = e.message || 'Failed to revoke key'
      return false
    }
  }

  /**
   * Delete a user key
   */
  const deleteKey = async (keyId: string): Promise<boolean> => {
    try {
      await api(`/byok/keys/${keyId}`, { method: 'DELETE' })
      keys.value = keys.value.filter(k => k.id !== keyId)
      totalKeys.value -= 1
      return true
    } catch (e: any) {
      error.value = e.message || 'Failed to delete key'
      return false
    }
  }

  /**
   * Load BYOK stats
   */
  const loadStats = async (): Promise<ByokStats | null> => {
    try {
      const result = await api('/byok/stats')
      stats.value = result
      return result
    } catch (e: any) {
      error.value = e.message || 'Failed to load stats'
      return null
    }
  }

  return {
    config: readonly(config),
    keys: readonly(keys),
    stats: readonly(stats),
    totalKeys: readonly(totalKeys),
    loading: readonly(loading),
    error: readonly(error),
    available: readonly(available),
    checkAvailability,
    loadConfig,
    updateConfig,
    loadKeys,
    revokeKey,
    deleteKey,
    loadStats,
  }
}
