/**
 * Sponsorship Composable
 * 
 * Manages sponsor keys and sponsorships for the Sponsored Usage feature.
 */

interface SponsorKey {
  id: string
  name: string
  provider: 'openai' | 'anthropic' | 'google' | 'xai'
  keyHint: string
  baseUrl?: string
  createdAt: string
}

interface Sponsorship {
  id: string
  name: string
  description?: string
  status: 'active' | 'paused' | 'revoked' | 'exhausted' | 'expired'
  
  // Budget
  spendCapUsd?: number
  spendCapTokens?: number
  spentUsd: number
  spentTokens: number
  remainingBudgetUsd?: number
  remainingBudgetTokens?: number
  budgetUsedPercent: number
  
  // Recipient's own spend (only returned for recipient views)
  mySpentUsd?: number
  mySpentTokens?: number
  
  // Billing period
  billingPeriod: 'one_time' | 'monthly'
  currentPeriodStart?: string
  
  // Constraints
  allowedModels?: string[]
  maxTokensPerRequest?: number
  maxRequestsPerMinute?: number
  maxRequestsPerDay?: number
  expiresAt?: string
  
  // Provider
  provider?: string
  
  // Recipient info
  recipientOrgId?: string
  recipientOrgName?: string
  recipientEmail?: string
  targetGitHubUsername?: string
  
  // Sponsor info (for recipient view)
  sponsorName?: string
  
  // Timestamps
  createdAt: string
  updatedAt?: string
  revokedAt?: string
  revokedReason?: string
}

interface UsageSummary {
  totalCost: number
  totalTokens: number
  totalRequests: number
  byModel: Record<string, { cost: number; tokens: number; requests: number }>
}

interface UsageRecord {
  id: string
  model: string
  provider?: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  costUsd: number
  timestamp: string
}

// =====================================================
// POOL INTERFACES (Phase 2)
// =====================================================

interface Pool {
  id: string
  name: string
  description?: string
  routingStrategy: 'proportional' | 'round_robin' | 'priority' | 'cheapest_first' | 'random'
  allowedProviders?: string[]
  isActive: boolean
  memberCount?: number
  activeMemberCount?: number
  totalBudgetUsd?: number
  totalSpentUsd?: number
  remainingBudgetUsd?: number
  members?: PoolMember[]
  stats?: PoolStats
  createdAt: string
  updatedAt?: string
}

interface PoolMember {
  id: string
  sponsorshipId: string
  priority: number
  weight: number
  isActive: boolean
  joinedAt: string
  sponsorship?: {
    id: string
    name: string
    status: string
    provider?: string
    sponsorName?: string
    spendCapUsd?: number
    spentUsd?: number
    remainingUsd?: number
    allowedModels?: string[]
    expiresAt?: string
  }
}

interface PoolToken {
  id: string
  tokenHint: string
  isActive: boolean
  usageCount: number
  lastUsedAt?: string
  createdAt: string
  revokedAt?: string
}

interface PoolStats {
  totalBudgetUsd: number
  totalSpentUsd: number
  remainingBudgetUsd: number
  activeSponsors: number
  totalSponsors: number
  byProvider: Record<string, { count: number; budgetUsd: number; spentUsd: number }>
}

export const useSponsorship = () => {
  const api = useApi()
  const toast = useToast()

  // =====================================================
  // SPONSOR KEYS
  // =====================================================

  const sponsorKeys = ref<SponsorKey[]>([])
  const loadingKeys = ref(false)

  const fetchSponsorKeys = async () => {
    loadingKeys.value = true
    try {
      const data = await api('/sponsorships/keys')
      sponsorKeys.value = data || []
    } catch (error: any) {
      toast.error('Failed to load sponsor keys')
      sponsorKeys.value = []
    } finally {
      loadingKeys.value = false
    }
  }

  const createSponsorKey = async (payload: {
    name: string
    provider: string
    apiKey: string
    baseUrl?: string
  }) => {
    try {
      const data = await api('/sponsorships/keys', {
        method: 'POST',
        body: payload,
      })
      sponsorKeys.value.unshift(data)
      toast.success('Sponsor key registered')
      return data
    } catch (error: any) {
      toast.error(error.message || 'Failed to create sponsor key')
      throw error
    }
  }

  const deleteSponsorKey = async (id: string) => {
    try {
      await api(`/sponsorships/keys/${id}`, { method: 'DELETE' })
      sponsorKeys.value = sponsorKeys.value.filter(k => k.id !== id)
      toast.success('Sponsor key deleted')
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete sponsor key')
      throw error
    }
  }

  // =====================================================
  // SPONSORSHIPS (as sponsor)
  // =====================================================

  const sponsorships = ref<Sponsorship[]>([])
  const loadingSponsorships = ref(false)

  const fetchSponsorships = async () => {
    loadingSponsorships.value = true
    try {
      const data = await api('/sponsorships')
      sponsorships.value = data || []
    } catch (error: any) {
      toast.error('Failed to load sponsorships')
      sponsorships.value = []
    } finally {
      loadingSponsorships.value = false
    }
  }

  const createSponsorship = async (payload: {
    sponsorKeyId: string
    name: string
    description?: string
    spendCapUsd?: number
    spendCapTokens?: number
    billingPeriod?: 'one_time' | 'monthly'
    recipientEmail?: string
    targetGitHubUsername?: string
    allowedModels?: string[]
    maxTokensPerRequest?: number
    maxRequestsPerMinute?: number
    maxRequestsPerDay?: number
    expiresAt?: string
  }) => {
    try {
      const data = await api('/sponsorships', {
        method: 'POST',
        body: payload,
      })
      sponsorships.value.unshift(data.sponsorship)
      toast.success('Sponsorship created')
      return data
    } catch (error: any) {
      toast.error(error.message || 'Failed to create sponsorship')
      throw error
    }
  }

  const updateSponsorship = async (id: string, payload: Partial<Sponsorship>) => {
    try {
      const data = await api(`/sponsorships/${id}`, {
        method: 'PATCH',
        body: payload,
      })
      const index = sponsorships.value.findIndex(s => s.id === id)
      if (index !== -1) {
        sponsorships.value[index] = data
      }
      toast.success('Sponsorship updated')
      return data
    } catch (error: any) {
      toast.error(error.message || 'Failed to update sponsorship')
      throw error
    }
  }

  const pauseSponsorship = async (id: string) => {
    try {
      const data = await api(`/sponsorships/${id}/pause`, { method: 'POST' })
      const index = sponsorships.value.findIndex(s => s.id === id)
      if (index !== -1) {
        sponsorships.value[index] = data
      }
      toast.success('Sponsorship paused')
      return data
    } catch (error: any) {
      toast.error(error.message || 'Failed to pause sponsorship')
      throw error
    }
  }

  const resumeSponsorship = async (id: string) => {
    try {
      const data = await api(`/sponsorships/${id}/resume`, { method: 'POST' })
      const index = sponsorships.value.findIndex(s => s.id === id)
      if (index !== -1) {
        sponsorships.value[index] = data
      }
      toast.success('Sponsorship resumed')
      return data
    } catch (error: any) {
      toast.error(error.message || 'Failed to resume sponsorship')
      throw error
    }
  }

  const revokeSponsorship = async (id: string, reason?: string) => {
    try {
      const data = await api(`/sponsorships/${id}/revoke`, {
        method: 'POST',
        body: { reason },
      })
      const index = sponsorships.value.findIndex(s => s.id === id)
      if (index !== -1) {
        sponsorships.value[index] = data
      }
      toast.success('Sponsorship revoked')
      return data
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke sponsorship')
      throw error
    }
  }

  const regenerateToken = async (id: string) => {
    try {
      const data = await api(`/sponsorships/${id}/regenerate-token`, { method: 'POST' })
      toast.success('Token regenerated')
      return data
    } catch (error: any) {
      toast.error(error.message || 'Failed to regenerate token')
      throw error
    }
  }

  const getUsageSummary = async (id: string): Promise<UsageSummary> => {
    return api(`/sponsorships/${id}/usage`)
  }

  const getUsageHistory = async (id: string, days = 30): Promise<UsageRecord[]> => {
    return api(`/sponsorships/${id}/usage/history?days=${days}`)
  }

  // =====================================================
  // SPONSORSHIPS (as recipient)
  // =====================================================

  const receivedSponsorships = ref<Sponsorship[]>([])
  const loadingReceived = ref(false)

  const fetchReceivedSponsorships = async () => {
    loadingReceived.value = true
    try {
      const data = await api('/sponsored')
      receivedSponsorships.value = data || []
    } catch (error: any) {
      toast.error('Failed to load received sponsorships')
      receivedSponsorships.value = []
    } finally {
      loadingReceived.value = false
    }
  }

  const getReceivedSponsorship = async (id: string): Promise<Sponsorship> => {
    return api(`/sponsored/${id}`)
  }

  const getReceivedUsageSummary = async (id: string): Promise<UsageSummary> => {
    return api(`/sponsored/${id}/usage`)
  }

  const getReceivedUsageHistory = async (id: string): Promise<UsageRecord[]> => {
    return api(`/sponsored/${id}/usage/history`)
  }

  // =====================================================
  // PENDING SPONSORSHIPS & CLAIMING
  // =====================================================

  interface PendingSponsorship {
    id: string
    name: string
    description?: string
    provider?: string
    spendCapUsd?: number
    spendCapTokens?: number
    sponsorName?: string
    targetGitHubUsername?: string
    recipientEmail?: string
    expiresAt?: string
    createdAt: string
    canClaimDirectly: boolean
  }

  interface PendingSponsorshipsResponse {
    githubLinked: boolean
    githubUsername: string | null
    email: string
    pending: PendingSponsorship[]
  }

  interface GitHubLinkStatus {
    linked: boolean
    githubUsername: string | null
    linkedAt: string | null
  }

  const githubLinkStatus = ref<GitHubLinkStatus | null>(null)
  const pendingSponsorships = ref<PendingSponsorshipsResponse | null>(null)
  const loadingPending = ref(false)

  // Keep for backwards compatibility
  const pendingGitHubSponsorships = computed(() => {
    if (!pendingSponsorships.value) return null
    return {
      linked: pendingSponsorships.value.githubLinked,
      githubUsername: pendingSponsorships.value.githubUsername,
      pending: pendingSponsorships.value.pending,
    }
  })

  const fetchGitHubLinkStatus = async () => {
    try {
      const data = await api('/auth/github/linked')
      githubLinkStatus.value = data
      return data
    } catch (error: any) {
      // If not configured, that's OK
      githubLinkStatus.value = { linked: false, githubUsername: null, linkedAt: null }
      return githubLinkStatus.value
    }
  }

  const fetchPendingSponsorships = async () => {
    loadingPending.value = true
    try {
      const data = await api('/sponsored/pending')
      pendingSponsorships.value = data
      return data
    } catch (error: any) {
      pendingSponsorships.value = { githubLinked: false, githubUsername: null, email: '', pending: [] }
      return pendingSponsorships.value
    } finally {
      loadingPending.value = false
    }
  }

  // Backwards compatible alias
  const fetchPendingGitHubSponsorships = fetchPendingSponsorships

  const claimSponsorship = async (sponsorshipId: string, options?: { silent?: boolean }) => {
    try {
      const data = await api(`/sponsored/claim/${sponsorshipId}`, { method: 'POST' })
      if (data.success) {
        if (!options?.silent) {
          toast.success(`Claimed sponsorship: ${data.sponsorship.name}`)
        }
        // Refresh data (skip if silent - batch mode handles refresh)
        if (!options?.silent) {
          await fetchReceivedSponsorships()
          await fetchPendingSponsorships()
        }
      } else if (data.requiresGitHub) {
        toast.error('Please link your GitHub account first')
      }
      return data
    } catch (error: any) {
      if (!options?.silent) {
        toast.error(error.message || 'Failed to claim sponsorship')
      }
      throw error
    }
  }

  const claimAllPendingSponsorships = async () => {
    const pending = pendingSponsorships.value?.pending || []
    let claimedCount = 0
    
    for (const s of pending) {
      try {
        // Use silent mode to avoid individual toasts
        const result = await claimSponsorship(s.id, { silent: true })
        if (result.success) claimedCount++
      } catch {
        // Continue with others
      }
    }
    
    // Show single summary toast and refresh data once
    if (claimedCount > 0) {
      toast.success(`Claimed ${claimedCount} sponsorship(s)!`)
      await fetchReceivedSponsorships()
      await fetchPendingSponsorships()
    }
    
    return claimedCount
  }

  // Keep for backwards compatibility
  const claimGitHubSponsorships = claimAllPendingSponsorships

  const checkGitHubConfigured = async (): Promise<boolean> => {
    try {
      const data = await api('/auth/github/status')
      return data.configured
    } catch {
      return false
    }
  }

  const initiateGitHubConnect = () => {
    // Redirect to backend OAuth endpoint
    // apiBaseUrl includes /api, so we need the base URL without /api
    const apiBaseUrl = useRuntimeConfig().public.apiBaseUrl as string
    const backendUrl = apiBaseUrl.replace(/\/api$/, '')
    
    // Include the JWT token in the URL since browser redirect doesn't include Authorization header
    const token = localStorage.getItem('accessToken')
    if (!token) {
      toast.error('Please log in first')
      return
    }
    
    window.location.href = `${backendUrl}/api/auth/github/connect?token=${encodeURIComponent(token)}`
  }

  const unlinkGitHub = async () => {
    try {
      await api('/auth/github/unlink')
      githubLinkStatus.value = { linked: false, githubUsername: null, linkedAt: null }
      toast.success('GitHub account unlinked')
    } catch (error: any) {
      toast.error(error.message || 'Failed to unlink GitHub')
      throw error
    }
  }

  // =====================================================
  // POOLS (Phase 2)
  // =====================================================

  const pools = ref<Pool[]>([])
  const loadingPools = ref(false)

  const fetchPools = async () => {
    loadingPools.value = true
    try {
      const data = await api('/pools')
      pools.value = data || []
    } catch (error: any) {
      toast.error('Failed to load pools')
      pools.value = []
    } finally {
      loadingPools.value = false
    }
  }

  const getPool = async (id: string): Promise<Pool> => {
    return api(`/pools/${id}`)
  }

  const createPool = async (payload: {
    name: string
    description?: string
    routingStrategy?: string
    allowedProviders?: string[]
  }) => {
    try {
      const data = await api('/pools', {
        method: 'POST',
        body: payload,
      })
      pools.value.unshift(data)
      toast.success('Pool created')
      return data
    } catch (error: any) {
      toast.error(error.message || 'Failed to create pool')
      throw error
    }
  }

  const updatePool = async (id: string, payload: Partial<Pool>) => {
    try {
      const data = await api(`/pools/${id}`, {
        method: 'PATCH',
        body: payload,
      })
      const index = pools.value.findIndex(p => p.id === id)
      if (index !== -1) {
        pools.value[index] = data
      }
      toast.success('Pool updated')
      return data
    } catch (error: any) {
      toast.error(error.message || 'Failed to update pool')
      throw error
    }
  }

  const deletePool = async (id: string) => {
    try {
      await api(`/pools/${id}`, { method: 'DELETE' })
      pools.value = pools.value.filter(p => p.id !== id)
      toast.success('Pool deleted')
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete pool')
      throw error
    }
  }

  const deactivatePool = async (id: string) => {
    try {
      const data = await api(`/pools/${id}/deactivate`, { method: 'POST' })
      const index = pools.value.findIndex(p => p.id === id)
      if (index !== -1) {
        pools.value[index] = data
      }
      toast.success('Pool deactivated')
      return data
    } catch (error: any) {
      toast.error(error.message || 'Failed to deactivate pool')
      throw error
    }
  }

  // Pool members
  const addPoolMember = async (poolId: string, payload: {
    sponsorshipId: string
    priority?: number
    weight?: number
  }) => {
    try {
      const data = await api(`/pools/${poolId}/members`, {
        method: 'POST',
        body: payload,
      })
      toast.success('Sponsorship added to pool')
      return data
    } catch (error: any) {
      toast.error(error.message || 'Failed to add sponsorship to pool')
      throw error
    }
  }

  const addPoolMemberByToken = async (poolId: string, payload: {
    token: string
    priority?: number
    weight?: number
  }) => {
    try {
      const data = await api(`/pools/${poolId}/members/by-token`, {
        method: 'POST',
        body: payload,
      })
      toast.success('Sponsorship added to pool via token')
      return data
    } catch (error: any) {
      toast.error(error.message || 'Failed to add sponsorship')
      throw error
    }
  }

  const updatePoolMember = async (poolId: string, memberId: string, payload: {
    priority?: number
    weight?: number
    isActive?: boolean
  }) => {
    try {
      const data = await api(`/pools/${poolId}/members/${memberId}`, {
        method: 'PATCH',
        body: payload,
      })
      toast.success('Pool member updated')
      return data
    } catch (error: any) {
      toast.error(error.message || 'Failed to update pool member')
      throw error
    }
  }

  const removePoolMember = async (poolId: string, memberId: string) => {
    try {
      await api(`/pools/${poolId}/members/${memberId}`, { method: 'DELETE' })
      toast.success('Sponsorship removed from pool')
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove sponsorship from pool')
      throw error
    }
  }

  // Pool tokens
  const generatePoolToken = async (poolId: string): Promise<string> => {
    try {
      const data = await api(`/pools/${poolId}/tokens`, { method: 'POST' })
      toast.success('Pool token generated')
      return data.token
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate pool token')
      throw error
    }
  }

  const listPoolTokens = async (poolId: string): Promise<PoolToken[]> => {
    return api(`/pools/${poolId}/tokens`)
  }

  const revokePoolToken = async (poolId: string, tokenId: string) => {
    try {
      await api(`/pools/${poolId}/tokens/${tokenId}`, { method: 'DELETE' })
      toast.success('Pool token revoked')
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke pool token')
      throw error
    }
  }

  const getPoolStats = async (poolId: string): Promise<PoolStats> => {
    return api(`/pools/${poolId}/stats`)
  }

  // =====================================================
  // COMPUTED
  // =====================================================

  const activeSponsorships = computed(() =>
    sponsorships.value.filter(s => s.status === 'active')
  )

  const totalSpentUsd = computed(() =>
    sponsorships.value.reduce((sum, s) => sum + (s.spentUsd || 0), 0)
  )

  const totalBudgetUsd = computed(() =>
    sponsorships.value.reduce((sum, s) => sum + (s.spendCapUsd || 0), 0)
  )

  const activeReceivedSponsorships = computed(() =>
    receivedSponsorships.value.filter(s => s.status === 'active')
  )

  const totalReceivedBudgetUsd = computed(() =>
    receivedSponsorships.value.reduce((sum, s) => sum + (s.remainingBudgetUsd || 0), 0)
  )

  const activePools = computed(() =>
    pools.value.filter(p => p.isActive)
  )

  return {
    // Sponsor Keys
    sponsorKeys,
    loadingKeys,
    fetchSponsorKeys,
    createSponsorKey,
    deleteSponsorKey,

    // Sponsorships (as sponsor)
    sponsorships,
    loadingSponsorships,
    fetchSponsorships,
    createSponsorship,
    updateSponsorship,
    pauseSponsorship,
    resumeSponsorship,
    revokeSponsorship,
    regenerateToken,
    getUsageSummary,
    getUsageHistory,

    // Sponsorships (as recipient)
    receivedSponsorships,
    loadingReceived,
    fetchReceivedSponsorships,
    getReceivedSponsorship,
    getReceivedUsageSummary,
    getReceivedUsageHistory,

    // Computed
    activeSponsorships,
    totalSpentUsd,
    totalBudgetUsd,
    activeReceivedSponsorships,
    totalReceivedBudgetUsd,
    activePools,

    // Pools (Phase 2)
    pools,
    loadingPools,
    fetchPools,
    getPool,
    createPool,
    updatePool,
    deletePool,
    deactivatePool,
    addPoolMember,
    addPoolMemberByToken,
    updatePoolMember,
    removePoolMember,
    generatePoolToken,
    listPoolTokens,
    revokePoolToken,
    getPoolStats,

    // Pending sponsorships & claiming
    githubLinkStatus,
    pendingSponsorships,
    pendingGitHubSponsorships, // backwards compat
    loadingPending,
    fetchGitHubLinkStatus,
    fetchPendingSponsorships,
    fetchPendingGitHubSponsorships, // backwards compat
    claimSponsorship,
    claimAllPendingSponsorships,
    claimGitHubSponsorships, // backwards compat
    checkGitHubConfigured,
    initiateGitHubConnect,
    unlinkGitHub,
  }
}
