export interface Sponsorship {
  id: string
  projectId: string
  project?: { id: string; name: string }
  sponsorId: string
  sponsor?: { id: string; email: string }
  recipientIdentity: string
  recipientName?: string
  budgetType: 'tokens' | 'requests'
  renewalType: 'monthly' | 'one-time'
  budget: number
  currentPeriodUsage: number
  totalUsage: number
  active: boolean
  expiresAt?: string
  message?: string
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

export interface KeyPoolEntry {
  id: string
  projectId: string
  project?: { id: string; name: string }
  contributorId: string
  contributor?: { id: string; email: string }
  provider: 'openai' | 'anthropic' | 'google' | 'xai' | 'other'
  name?: string
  monthlyTokenLimit: number
  monthlyCostLimitCents: number
  currentPeriodTokens: number
  currentPeriodCostCents: number
  currentPeriodRequests: number
  totalTokens: number
  totalCostCents: number
  totalRequests: number
  weight: number
  priority: number
  active: boolean
  rateLimited: boolean
  createdAt: string
}

export interface BudgetBreakdown {
  budget: number
  used: number
  count: number
}

export interface SponsorStats {
  totalSponsorships: number
  activeSponsorships: number
  recipients: number
  tokens: {
    monthly: BudgetBreakdown
    oneTime: BudgetBreakdown
  }
  requests: {
    monthly: BudgetBreakdown
    oneTime: BudgetBreakdown
  }
}

export interface KeyPoolStats {
  totalKeys: number
  activeKeys: number
  totalTokensServed: number
  totalCostServed: number
  projects: number
}

export interface PoolStats {
  totalKeys: number
  activeKeys: number
  byProvider: Record<string, { count: number; totalTokens: number; totalCost: number }>
  contributors: number
}

export const useSponsorship = () => {
  const api = useApi()
  const toast = useToast()

  // State
  const mySponsorships = ref<Sponsorship[]>([])
  const receivedSponsorships = ref<Sponsorship[]>([])
  const myKeys = ref<KeyPoolEntry[]>([])
  const sponsorStats = ref<SponsorStats | null>(null)
  const keyStats = ref<KeyPoolStats | null>(null)
  const loading = ref(false)

  // ====================================
  // SPONSORSHIPS (Token Donations)
  // ====================================

  const loadMySponsorships = async () => {
    loading.value = true
    try {
      mySponsorships.value = await api('/sponsorships/given')
    } catch (err: any) {
      toast.error(err.message || 'Failed to load sponsorships')
    } finally {
      loading.value = false
    }
  }

  const loadReceivedSponsorships = async (identity?: string, projectId?: string) => {
    loading.value = true
    try {
      const params = new URLSearchParams()
      if (identity) params.set('identity', identity)
      if (projectId) params.set('projectId', projectId)
      const query = params.toString() ? `?${params.toString()}` : ''
      receivedSponsorships.value = await api(`/sponsorships/received${query}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load received sponsorships')
    } finally {
      loading.value = false
    }
  }

  const loadSponsorStats = async () => {
    try {
      sponsorStats.value = await api('/sponsorships/given/stats')
    } catch (err: any) {
      console.error('Failed to load sponsor stats:', err)
    }
  }

  const createSponsorship = async (data: {
    projectId: string
    recipientIdentity: string
    recipientName?: string
    budgetType: 'tokens' | 'requests'
    renewalType: 'monthly' | 'one-time'
    budget: number
    expiresAt?: string
    message?: string
    isPublic?: boolean
  }) => {
    try {
      const sponsorship = await api('/sponsorships', {
        method: 'POST',
        body: data,
      })
      mySponsorships.value = [sponsorship, ...mySponsorships.value]
      toast.success('Sponsorship created!')
      return sponsorship
    } catch (err: any) {
      toast.error(err.message || 'Failed to create sponsorship')
      throw err
    }
  }

  const updateSponsorship = async (id: string, data: {
    recipientName?: string
    budget?: number
    renewalType?: 'monthly' | 'one-time'
    active?: boolean
    expiresAt?: string | null
    message?: string
    isPublic?: boolean
  }) => {
    try {
      const updated = await api(`/sponsorships/${id}`, {
        method: 'PUT',
        body: data,
      })
      const idx = mySponsorships.value.findIndex(s => s.id === id)
      if (idx !== -1) {
        mySponsorships.value[idx] = updated
      }
      toast.success('Sponsorship updated')
      return updated
    } catch (err: any) {
      toast.error(err.message || 'Failed to update sponsorship')
      throw err
    }
  }

  const deleteSponsorship = async (id: string) => {
    try {
      await api(`/sponsorships/${id}`, { method: 'DELETE' })
      mySponsorships.value = mySponsorships.value.filter(s => s.id !== id)
      toast.success('Sponsorship deleted')
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete sponsorship')
      throw err
    }
  }

  // ====================================
  // KEY POOL (Contributed API Keys)
  // ====================================

  const loadMyKeys = async () => {
    loading.value = true
    try {
      myKeys.value = await api('/sponsorships/keys/mine')
    } catch (err: any) {
      toast.error(err.message || 'Failed to load contributed keys')
    } finally {
      loading.value = false
    }
  }

  const loadKeyStats = async () => {
    try {
      keyStats.value = await api('/sponsorships/keys/mine/stats')
    } catch (err: any) {
      console.error('Failed to load key stats:', err)
    }
  }

  const loadProjectPoolStats = async (projectId: string): Promise<PoolStats | null> => {
    try {
      return await api(`/sponsorships/keys/project/${projectId}/stats`)
    } catch (err: any) {
      console.error('Failed to load pool stats:', err)
      return null
    }
  }

  const contributeKey = async (data: {
    projectId: string
    provider: 'openai' | 'anthropic' | 'google' | 'xai' | 'other'
    apiKey: string
    baseUrl?: string
    name?: string
    monthlyTokenLimit?: number
    monthlyCostLimitCents?: number
    weight?: number
    priority?: number
    allowedModels?: string[]
    allowedIdentities?: string[]
  }) => {
    try {
      const entry = await api('/sponsorships/keys', {
        method: 'POST',
        body: data,
      })
      myKeys.value = [entry, ...myKeys.value]
      toast.success('API key contributed to pool!')
      return entry
    } catch (err: any) {
      toast.error(err.message || 'Failed to contribute key')
      throw err
    }
  }

  const updateKey = async (id: string, data: {
    apiKey?: string
    baseUrl?: string
    name?: string
    monthlyTokenLimit?: number
    monthlyCostLimitCents?: number
    weight?: number
    priority?: number
    active?: boolean
    allowedModels?: string[]
    allowedIdentities?: string[]
  }) => {
    try {
      const updated = await api(`/sponsorships/keys/${id}`, {
        method: 'PUT',
        body: data,
      })
      const idx = myKeys.value.findIndex(k => k.id === id)
      if (idx !== -1) {
        myKeys.value[idx] = updated
      }
      toast.success('Key updated')
      return updated
    } catch (err: any) {
      toast.error(err.message || 'Failed to update key')
      throw err
    }
  }

  const removeKey = async (id: string) => {
    try {
      await api(`/sponsorships/keys/${id}`, { method: 'DELETE' })
      myKeys.value = myKeys.value.filter(k => k.id !== id)
      toast.success('Key removed from pool')
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove key')
      throw err
    }
  }

  // ====================================
  // HELPERS
  // ====================================

  const formatBudget = (budget: number, type: 'tokens' | 'requests') => {
    if (type === 'tokens') {
      if (budget >= 1000000) return `${(budget / 1000000).toFixed(1)}M tokens`
      if (budget >= 1000) return `${(budget / 1000).toFixed(0)}K tokens`
      return `${budget} tokens`
    } else {
      if (budget >= 1000) return `${(budget / 1000).toFixed(0)}K requests`
      return `${budget} requests`
    }
  }

  const getUsagePercent = (sponsorship: Sponsorship) => {
    if (sponsorship.budget === 0) return 0
    return Math.round((sponsorship.currentPeriodUsage / sponsorship.budget) * 100)
  }

  const providerColors: Record<string, { bg: string; text: string; border: string }> = {
    openai: { bg: 'bg-emerald-300/10', text: 'text-emerald-300', border: 'border-emerald-300/20' },
    anthropic: { bg: 'bg-orange-300/10', text: 'text-orange-300', border: 'border-orange-300/20' },
    google: { bg: 'bg-blue-300/10', text: 'text-blue-300', border: 'border-blue-300/20' },
    xai: { bg: 'bg-purple-300/10', text: 'text-purple-300', border: 'border-purple-300/20' },
    other: { bg: 'bg-gray-300/10', text: 'text-gray-300', border: 'border-gray-300/20' },
  }

  return {
    // State
    mySponsorships,
    receivedSponsorships,
    myKeys,
    sponsorStats,
    keyStats,
    loading,

    // Sponsorship actions
    loadMySponsorships,
    loadReceivedSponsorships,
    loadSponsorStats,
    createSponsorship,
    updateSponsorship,
    deleteSponsorship,

    // Key pool actions
    loadMyKeys,
    loadKeyStats,
    loadProjectPoolStats,
    contributeKey,
    updateKey,
    removeKey,

    // Helpers
    formatBudget,
    getUsagePercent,
    providerColors,
  }
}

