<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
  layout: 'default',
})

const route = useRoute()
const router = useRouter()
const { features } = useFeatures()
const sponsorship = useSponsorship()
const { copy } = useClipboard()

// =====================================================
// TABS
// =====================================================
const activeTab = ref<'sponsor' | 'received' | 'pools'>('sponsor')

// Set initial tab from URL query
onMounted(() => {
  const tab = route.query.tab as string
  if (tab === 'received' || tab === 'pools') {
    activeTab.value = tab
  }
})

// Update URL when tab changes
watch(activeTab, (newTab) => {
  router.replace({ query: { ...route.query, tab: newTab === 'sponsor' ? undefined : newTab } })
})

// =====================================================
// SPONSOR TAB STATE
// =====================================================
const showCreateKeyModal = ref(false)
const showCreateSponsorshipModal = ref(false)
const showTokenModal = ref(false)
const showDeleteKeyConfirm = ref(false)
const keyToDelete = ref<{ id: string; name: string } | null>(null)
const newToken = ref('')

const newKey = ref({
  name: '',
  provider: 'openai' as 'openai' | 'anthropic' | 'google' | 'xai',
  apiKey: '',
})

const newSponsorship = ref({
  sponsorKeyId: '',
  name: '',
  description: '',
  spendCapUsd: 50,
  billingPeriod: 'one_time' as 'one_time' | 'monthly',
  allowedModels: [] as string[],
  maxTokensPerRequest: null as number | null,
  expiresAt: '',
})

// =====================================================
// RECEIVED TAB STATE
// =====================================================
const selectedReceivedId = ref<string | null>(null)
const receivedUsageSummary = ref<any>(null)
const loadingReceivedUsage = ref(false)

// =====================================================
// POOLS TAB STATE
// =====================================================
const showCreatePoolModal = ref(false)
const showPoolDetailsModal = ref(false)
const showAddMemberModal = ref(false)
const showGeneratePoolTokenModal = ref(false)
const showDeletePoolConfirm = ref(false)

const newPool = ref({
  name: '',
  description: '',
  routingStrategy: 'proportional' as string,
})

const addMemberForm = ref({
  sponsorshipId: '',
  token: '',
  priority: 0,
  weight: 1,
})
const addMemberMode = ref<'select' | 'token'>('select')

const selectedPool = ref<any>(null)
const selectedPoolTokens = ref<any[]>([])
const generatedPoolToken = ref('')
const poolToDelete = ref<string | null>(null)

// =====================================================
// LOAD DATA
// =====================================================
onMounted(async () => {
  await Promise.all([
    sponsorship.fetchSponsorKeys(),
    sponsorship.fetchSponsorships(),
    sponsorship.fetchReceivedSponsorships(),
    sponsorship.fetchPools(),
  ])
})

// =====================================================
// SPONSOR TAB METHODS
// =====================================================
const handleCreateKey = async () => {
  try {
    await sponsorship.createSponsorKey({
      name: newKey.value.name,
      provider: newKey.value.provider,
      apiKey: newKey.value.apiKey,
    })
    showCreateKeyModal.value = false
    newKey.value = { name: '', provider: 'openai', apiKey: '' }
  } catch (error) {}
}

const handleCreateSponsorship = async () => {
  try {
    const result = await sponsorship.createSponsorship({
      sponsorKeyId: newSponsorship.value.sponsorKeyId,
      name: newSponsorship.value.name,
      description: newSponsorship.value.description || undefined,
      spendCapUsd: newSponsorship.value.spendCapUsd,
      billingPeriod: newSponsorship.value.billingPeriod,
      allowedModels: newSponsorship.value.allowedModels.length > 0 
        ? newSponsorship.value.allowedModels 
        : undefined,
      maxTokensPerRequest: newSponsorship.value.maxTokensPerRequest || undefined,
      expiresAt: newSponsorship.value.expiresAt || undefined,
    })
    
    newToken.value = result.token
    showTokenModal.value = true
    showCreateSponsorshipModal.value = false
    
    newSponsorship.value = {
      sponsorKeyId: '',
      name: '',
      description: '',
      spendCapUsd: 50,
      billingPeriod: 'one_time',
      allowedModels: [],
      maxTokensPerRequest: null,
      expiresAt: '',
    }
  } catch (error) {}
}

const copyToken = (token: string) => {
  copy(token)
  useToast().success('Token copied to clipboard')
}

const handleRevoke = async (id: string) => {
  if (confirm('Are you sure you want to revoke this sponsorship? This cannot be undone.')) {
    await sponsorship.revokeSponsorship(id)
  }
}

const handleRegenerate = async (id: string) => {
  if (confirm('This will invalidate the current token. Continue?')) {
    const result = await sponsorship.regenerateToken(id)
    newToken.value = result.token
    showTokenModal.value = true
  }
}

const handleDeleteKey = (key: { id: string; name: string }) => {
  keyToDelete.value = key
  showDeleteKeyConfirm.value = true
}

const confirmDeleteKey = async () => {
  if (keyToDelete.value) {
    await sponsorship.deleteSponsorKey(keyToDelete.value.id)
  }
  showDeleteKeyConfirm.value = false
  keyToDelete.value = null
}

const cancelDeleteKey = () => {
  showDeleteKeyConfirm.value = false
  keyToDelete.value = null
}

// =====================================================
// RECEIVED TAB METHODS
// =====================================================
const loadReceivedUsage = async (id: string) => {
  selectedReceivedId.value = id
  loadingReceivedUsage.value = true
  try {
    receivedUsageSummary.value = await sponsorship.getReceivedUsageSummary(id)
  } catch (error) {
    console.error('Failed to load usage:', error)
  } finally {
    loadingReceivedUsage.value = false
  }
}

const getBudgetColor = (percent: number) => {
  if (percent >= 90) return 'bg-red-400'
  if (percent >= 70) return 'bg-yellow-400'
  return 'bg-green-400'
}

// =====================================================
// POOLS TAB METHODS
// =====================================================
const createPool = async () => {
  if (!newPool.value.name.trim()) return
  
  try {
    await sponsorship.createPool({
      name: newPool.value.name,
      description: newPool.value.description || undefined,
      routingStrategy: newPool.value.routingStrategy,
    })
    showCreatePoolModal.value = false
    newPool.value = { name: '', description: '', routingStrategy: 'proportional' }
  } catch (error) {}
}

const viewPool = async (poolId: string) => {
  try {
    selectedPool.value = await sponsorship.getPool(poolId)
    selectedPoolTokens.value = await sponsorship.listPoolTokens(poolId)
    showPoolDetailsModal.value = true
  } catch (error) {}
}

const addPoolMember = async () => {
  if (!selectedPool.value) return
  
  if (addMemberMode.value === 'select' && !addMemberForm.value.sponsorshipId) return
  if (addMemberMode.value === 'token' && !addMemberForm.value.token.trim()) return
  
  try {
    if (addMemberMode.value === 'token') {
      await sponsorship.addPoolMemberByToken(selectedPool.value.id, {
        token: addMemberForm.value.token.trim(),
        priority: addMemberForm.value.priority,
        weight: addMemberForm.value.weight,
      })
    } else {
      await sponsorship.addPoolMember(selectedPool.value.id, {
        sponsorshipId: addMemberForm.value.sponsorshipId,
        priority: addMemberForm.value.priority,
        weight: addMemberForm.value.weight,
      })
    }
    selectedPool.value = await sponsorship.getPool(selectedPool.value.id)
    showAddMemberModal.value = false
    addMemberForm.value = { sponsorshipId: '', token: '', priority: 0, weight: 1 }
    addMemberMode.value = 'select'
  } catch (error) {}
}

const removePoolMember = async (memberId: string) => {
  if (!selectedPool.value) return
  try {
    await sponsorship.removePoolMember(selectedPool.value.id, memberId)
    selectedPool.value = await sponsorship.getPool(selectedPool.value.id)
  } catch (error) {}
}

const generatePoolToken = async () => {
  if (!selectedPool.value) return
  try {
    generatedPoolToken.value = await sponsorship.generatePoolToken(selectedPool.value.id)
    selectedPoolTokens.value = await sponsorship.listPoolTokens(selectedPool.value.id)
    showGeneratePoolTokenModal.value = true
  } catch (error) {}
}

const revokePoolToken = async (tokenId: string) => {
  if (!selectedPool.value) return
  try {
    await sponsorship.revokePoolToken(selectedPool.value.id, tokenId)
    selectedPoolTokens.value = await sponsorship.listPoolTokens(selectedPool.value.id)
  } catch (error) {}
}

const confirmDeletePool = (poolId: string) => {
  poolToDelete.value = poolId
  showDeletePoolConfirm.value = true
}

const deletePool = async () => {
  if (!poolToDelete.value) return
  try {
    await sponsorship.deletePool(poolToDelete.value)
    showDeletePoolConfirm.value = false
    poolToDelete.value = null
  } catch (error) {}
}

const getStrategyLabel = (strategy: string) => {
  const labels: Record<string, string> = {
    proportional: 'Proportional',
    round_robin: 'Round Robin',
    priority: 'Priority',
    cheapest_first: 'Cheapest First',
    random: 'Random',
  }
  return labels[strategy] || strategy
}

const availableSponsorships = computed(() => {
  if (!selectedPool.value) return sponsorship.activeSponsorships.value
  const memberIds = new Set(selectedPool.value.members?.map((m: any) => m.sponsorshipId) || [])
  return sponsorship.activeSponsorships.value.filter(s => !memberIds.has(s.id))
})

// =====================================================
// SHARED HELPERS
// =====================================================
const formatCost = (cost: number) => {
  if (cost === 0) return '$0.00'
  if (cost >= 1) return `$${cost.toFixed(2)}`
  if (cost >= 0.01) return `$${cost.toFixed(4)}`
  if (cost >= 0.0001) return `$${cost.toFixed(6)}`
  return `$${cost.toFixed(8)}`
}

const getStatusClasses = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-400/10 text-green-400 border-green-400/20'
    case 'paused': return 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20'
    case 'revoked': return 'bg-red-400/10 text-red-400 border-red-400/20'
    case 'exhausted': return 'bg-orange-400/10 text-orange-400 border-orange-400/20'
    case 'expired': return 'bg-gray-400/10 text-gray-400 border-gray-400/20'
    default: return 'bg-gray-400/10 text-gray-400 border-gray-400/20'
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-xl font-bold text-white">Sponsorship</h2>
        <p class="text-sm text-gray-400 mt-1">
          Share API credits, receive sponsorships, or create pools for multiple sponsors.
        </p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-8 mb-6 border-b border-gray-500/20">
      <button
        @click="activeTab = 'sponsor'"
        :class="[
          'pb-3 text-sm font-medium transition-colors relative',
          activeTab === 'sponsor' 
            ? 'text-white' 
            : 'text-gray-500 hover:text-gray-300'
        ]"
      >
        My Sponsorships
        <div v-if="activeTab === 'sponsor'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-300"></div>
      </button>
      <button
        @click="activeTab = 'received'"
        :class="[
          'pb-3 text-sm font-medium transition-colors relative flex items-center gap-2',
          activeTab === 'received' 
            ? 'text-white' 
            : 'text-gray-500 hover:text-gray-300'
        ]"
      >
        Received
        <span v-if="sponsorship.activeReceivedSponsorships.value.length > 0" class="text-xs bg-gray-500/40 text-white rounded-full px-1.5">
          {{ sponsorship.activeReceivedSponsorships.value.length }}
        </span>
        <div v-if="activeTab === 'received'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-300"></div>
      </button>
      <button
        @click="activeTab = 'pools'"
        :class="[
          'pb-3 text-sm font-medium transition-colors relative flex items-center gap-2',
          activeTab === 'pools' 
            ? 'text-white' 
            : 'text-gray-500 hover:text-gray-300'
        ]"
      >
        Pools
        <span v-if="sponsorship.activePools.value.length > 0" class="text-xs bg-gray-500/40 text-white rounded-full px-1.5">
          {{ sponsorship.activePools.value.length }}
        </span>
        <div v-if="activeTab === 'pools'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-300"></div>
      </button>
    </div>

    <!-- =====================================================
         SPONSOR TAB
         ===================================================== -->
    <div v-if="activeTab === 'sponsor'">
      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
          <div class="text-gray-400 text-xs mb-1">Registered Keys</div>
          <div class="text-lg font-semibold text-white">{{ sponsorship.sponsorKeys.value.length }}</div>
        </div>
        <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
          <div class="text-gray-400 text-xs mb-1">Active Sponsorships</div>
          <div class="text-lg font-semibold text-green-300">{{ sponsorship.activeSponsorships.value.length }}</div>
        </div>
        <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
          <div class="text-gray-400 text-xs mb-1">Total Budget</div>
          <div class="text-lg font-semibold text-white">${{ sponsorship.totalBudgetUsd.value.toFixed(2) }}</div>
        </div>
        <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
          <div class="text-gray-400 text-xs mb-1">Total Spent</div>
          <div class="text-lg font-semibold text-white">{{ formatCost(sponsorship.totalSpentUsd.value) }}</div>
        </div>
      </div>

      <!-- Provider Keys Section -->
      <div class="mb-8">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-white">Provider Keys</h3>
          <button
            @click="showCreateKeyModal = true"
            class="flex items-center gap-2 px-3 py-1.5 bg-gray-500/10 border border-gray-500/10 hover:bg-gray-500/20 text-white rounded-lg text-sm transition-colors"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Key
          </button>
        </div>

        <div v-if="sponsorship.sponsorKeys.value.length === 0" class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-6 text-center">
          <p class="text-sm text-gray-400">No provider keys registered. Add a key to start creating sponsorships.</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            v-for="key in sponsorship.sponsorKeys.value"
            :key="key.id"
            class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-3"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-[10px] text-gray-500 uppercase bg-gray-500/10 px-1.5 py-0.5 rounded">{{ key.provider }}</span>
                <span class="text-sm text-white font-medium">{{ key.name }}</span>
              </div>
              <button
                @click="handleDeleteKey(key)"
                class="text-gray-500 hover:text-red-400 transition-colors"
                title="Delete key"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <code class="text-xs text-gray-500 mt-1 block">...{{ key.keyHint }}</code>
          </div>
        </div>
      </div>

      <!-- Sponsorships Section -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-white">Sponsorships</h3>
          <button
            @click="showCreateSponsorshipModal = true"
            :disabled="sponsorship.sponsorKeys.value.length === 0"
            class="flex items-center gap-2 px-3 py-1.5 bg-white text-black hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Create
          </button>
        </div>

        <div v-if="sponsorship.sponsorships.value.length === 0" class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-8 text-center">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-500/10 mb-3">
            <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p class="text-sm text-gray-400 mb-1">No sponsorships yet</p>
          <p class="text-xs text-gray-500">Create a sponsorship to share your API credits with others.</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="s in sponsorship.sponsorships.value"
            :key="s.id"
            class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4"
          >
            <div class="flex items-start justify-between mb-3">
              <div>
                <div class="flex items-center gap-2">
                  <h4 class="text-sm font-medium text-white">{{ s.name }}</h4>
                  <span :class="['text-[10px] px-1.5 py-0.5 rounded border', getStatusClasses(s.status)]">
                    {{ s.status }}
                  </span>
                  <span class="text-[10px] text-gray-500 bg-gray-500/10 px-1.5 py-0.5 rounded">{{ s.provider }}</span>
                  <span class="text-[10px] text-gray-500 bg-gray-500/10 px-1.5 py-0.5 rounded">{{ s.billingPeriod === 'monthly' ? 'Monthly' : 'One-time' }}</span>
                </div>
                <p v-if="s.description" class="text-xs text-gray-400 mt-1">{{ s.description }}</p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  v-if="s.status === 'active'"
                  @click="handleRegenerate(s.id)"
                  class="text-xs text-gray-400 hover:text-white transition-colors"
                  title="Regenerate token"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button
                  v-if="s.status === 'active'"
                  @click="handleRevoke(s.id)"
                  class="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Revoke
                </button>
              </div>
            </div>

            <!-- Budget Progress -->
            <div class="mb-3">
              <div class="flex justify-between text-xs mb-1">
                <span class="text-gray-400">Budget: ${{ s.spendCapUsd?.toFixed(2) || '∞' }}</span>
                <span class="text-white">{{ formatCost(s.spentUsd || 0) }} spent</span>
              </div>
              <div class="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  class="h-full bg-blue-500 transition-all"
                  :style="{ width: `${Math.min(s.budgetUsedPercent || 0, 100)}%` }"
                ></div>
              </div>
            </div>

            <!-- Recipient Info -->
            <div class="text-xs text-gray-500">
              <span v-if="s.recipientOrgName">Recipient: {{ s.recipientOrgName }}</span>
              <span v-else-if="s.recipientEmail">For: {{ s.recipientEmail }}</span>
              <span v-else>Not yet claimed</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- =====================================================
         RECEIVED TAB
         ===================================================== -->
    <div v-if="activeTab === 'received'">
      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
          <div class="text-gray-400 text-xs mb-1">Active Sponsorships</div>
          <div class="text-lg font-semibold text-white">{{ sponsorship.activeReceivedSponsorships.value.length }}</div>
        </div>
        <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
          <div class="text-gray-400 text-xs mb-1">Total Available Budget</div>
          <div class="text-lg font-semibold text-green-300">${{ sponsorship.totalReceivedBudgetUsd.value.toFixed(2) }}</div>
        </div>
        <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
          <div class="text-gray-400 text-xs mb-1">Total Sponsorships</div>
          <div class="text-lg font-semibold text-white">{{ sponsorship.receivedSponsorships.value.length }}</div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="sponsorship.loadingReceived.value" class="text-center py-12">
        <div class="text-gray-400 text-sm">Loading sponsorships...</div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="sponsorship.receivedSponsorships.value.length === 0"
        class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-12 text-center"
      >
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-500/10 mb-4">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
        </div>
        <h3 class="text-sm font-medium text-white mb-2">No sponsorships received yet</h3>
        <p class="text-xs text-gray-400 max-w-md mx-auto">
          When someone creates a sponsorship for you, it will appear here.
          You can use the sponsored token as your API key.
        </p>
      </div>

      <!-- Sponsorships Grid -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          v-for="s in sponsorship.receivedSponsorships.value"
          :key="s.id"
          class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4 hover:border-gray-500/20 transition-colors cursor-pointer"
          @click="loadReceivedUsage(s.id)"
        >
          <div class="flex items-start justify-between mb-3">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 class="text-sm font-medium text-white">{{ s.name }}</h3>
              </div>
              <p v-if="s.description" class="text-xs text-gray-400 mt-1">{{ s.description }}</p>
              <p class="text-xs text-gray-500 mt-2">
                Sponsored by <span class="text-blue-300">{{ s.sponsorName || 'Anonymous' }}</span>
              </p>
            </div>
            <span class="text-[10px] text-gray-500 uppercase bg-gray-500/10 px-1.5 py-0.5 rounded">{{ s.provider || 'unknown' }}</span>
          </div>

          <!-- Budget Display -->
          <div class="mb-3">
            <div class="flex items-center justify-between text-xs mb-1">
              <span class="text-gray-400">Remaining Budget</span>
              <span class="text-white font-medium">${{ s.remainingBudgetUsd?.toFixed(2) || '∞' }}</span>
            </div>
            <div class="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                :class="['h-full transition-all', getBudgetColor(s.budgetUsedPercent)]"
                :style="{ width: `${100 - Math.min(s.budgetUsedPercent, 100)}%` }"
              ></div>
            </div>
            <div class="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>{{ (100 - s.budgetUsedPercent).toFixed(1) }}% remaining</span>
              <span>My spend: {{ formatCost(s.mySpentUsd || 0) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- =====================================================
         POOLS TAB
         ===================================================== -->
    <div v-if="activeTab === 'pools'">
      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
          <div class="text-gray-400 text-xs mb-1">Active Pools</div>
          <div class="text-lg font-semibold text-white">{{ sponsorship.activePools.value.length }}</div>
        </div>
        <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
          <div class="text-gray-400 text-xs mb-1">Total Pools</div>
          <div class="text-lg font-semibold text-white">{{ sponsorship.pools.value.length }}</div>
        </div>
        <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
          <div class="text-gray-400 text-xs mb-1">Available Sponsorships</div>
          <div class="text-lg font-semibold text-blue-300">{{ sponsorship.activeSponsorships.value.length }}</div>
        </div>
      </div>

      <!-- Action Button -->
      <div class="flex justify-end mb-4">
        <button
          @click="showCreatePoolModal = true"
          class="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Create Pool
        </button>
      </div>

      <!-- Empty State -->
      <div
        v-if="sponsorship.pools.value.length === 0"
        class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-12 text-center"
      >
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-500/10 mb-4">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 class="text-sm font-medium text-white mb-2">No pools yet</h3>
        <p class="text-xs text-gray-400 max-w-md mx-auto">
          Create a pool to combine multiple sponsorships into a single token with intelligent routing.
        </p>
      </div>

      <!-- Pools Grid -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          v-for="pool in sponsorship.pools.value"
          :key="pool.id"
          class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4 hover:border-gray-500/20 transition-colors"
        >
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 class="text-sm font-medium text-white">{{ pool.name }}</h3>
                <span 
                  :class="[
                    'text-[10px] px-1.5 py-0.5 rounded uppercase',
                    pool.isActive ? 'bg-green-400/10 text-green-300' : 'bg-gray-500/10 text-gray-400'
                  ]"
                >
                  {{ pool.isActive ? 'Active' : 'Inactive' }}
                </span>
              </div>
              <p v-if="pool.description" class="text-xs text-gray-400 mt-1">{{ pool.description }}</p>
            </div>
          </div>

          <!-- Pool Stats -->
          <div class="grid grid-cols-3 gap-2 mb-3 text-xs">
            <div class="bg-gray-500/10 rounded p-2">
              <div class="text-gray-500">Sponsors</div>
              <div class="text-white font-medium">{{ pool.activeMemberCount || 0 }} / {{ pool.memberCount || 0 }}</div>
            </div>
            <div class="bg-gray-500/10 rounded p-2">
              <div class="text-gray-500">Budget</div>
              <div class="text-white font-medium">${{ (pool.totalBudgetUsd || 0).toFixed(2) }}</div>
            </div>
            <div class="bg-gray-500/10 rounded p-2">
              <div class="text-gray-500">Remaining</div>
              <div class="text-green-300 font-medium">${{ (pool.remainingBudgetUsd || 0).toFixed(2) }}</div>
            </div>
          </div>

          <!-- Routing Strategy Badge -->
          <div class="flex items-center justify-between">
            <span class="text-[10px] px-2 py-1 bg-blue-400/10 text-blue-300 rounded">
              {{ getStrategyLabel(pool.routingStrategy) }} Routing
            </span>
            <div class="flex items-center gap-2">
              <button
                @click="viewPool(pool.id)"
                class="text-xs text-gray-400 hover:text-white transition-colors"
              >
                View Details
              </button>
              <button
                @click="confirmDeletePool(pool.id)"
                class="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- =====================================================
         MODALS
         ===================================================== -->
    
    <!-- Create Key Modal -->
    <Teleport to="body">
      <div v-if="showCreateKeyModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="showCreateKeyModal = false">
        <div class="bg-black rounded-xl p-6 w-full max-w-md border border-gray-500/20">
          <h3 class="text-sm font-semibold text-white mb-4">Register Provider Key</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-xs text-gray-400 mb-1">Name</label>
              <input
                v-model="newKey.name"
                type="text"
                placeholder="My OpenAI Key"
                class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-400"
              />
            </div>
            
            <div>
              <label class="block text-xs text-gray-400 mb-1">Provider</label>
              <div class="relative">
                <select
                  v-model="newKey.provider"
                  class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-400 appearance-none cursor-pointer"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google</option>
                  <option value="xai">xAI</option>
                </select>
                <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            <div>
              <label class="block text-xs text-gray-400 mb-1">API Key</label>
              <input
                v-model="newKey.apiKey"
                type="password"
                placeholder="sk-..."
                class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-400 font-mono"
              />
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <button @click="showCreateKeyModal = false" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button
              @click="handleCreateKey"
              :disabled="!newKey.name || !newKey.apiKey"
              class="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Register Key
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Create Sponsorship Modal -->
    <Teleport to="body">
      <div v-if="showCreateSponsorshipModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="showCreateSponsorshipModal = false">
        <div class="bg-black rounded-xl p-6 w-full max-w-md border border-gray-500/20 max-h-[85vh] overflow-y-auto">
          <h3 class="text-sm font-semibold text-white mb-4">Create Sponsorship</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-xs text-gray-400 mb-1">Provider Key</label>
              <div class="relative">
                <select
                  v-model="newSponsorship.sponsorKeyId"
                  class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-400 appearance-none cursor-pointer"
                >
                  <option value="">Select a key...</option>
                  <option v-for="key in sponsorship.sponsorKeys.value" :key="key.id" :value="key.id">
                    {{ key.name }} ({{ key.provider }})
                  </option>
                </select>
                <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            <div>
              <label class="block text-xs text-gray-400 mb-1">Name</label>
              <input
                v-model="newSponsorship.name"
                type="text"
                placeholder="OSS Developer Grant"
                class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-400"
              />
            </div>
            
            <!-- <div>
              <label class="block text-xs text-gray-400 mb-1">Description (optional)</label>
              <textarea
                v-model="newSponsorship.description"
                rows="2"
                placeholder="For open source development..."
                class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-400 resize-none"
              ></textarea>
            </div> -->
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-gray-400 mb-1">Budget (USD)</label>
                <input
                  v-model.number="newSponsorship.spendCapUsd"
                  type="number"
                  min="1"
                  step="1"
                  class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">Type</label>
                <div class="relative">
                  <select
                    v-model="newSponsorship.billingPeriod"
                    class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-400 appearance-none cursor-pointer"
                  >
                    <option value="one_time">One-time</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            
            <!-- <div>
              <label class="block text-xs text-gray-400 mb-1">Max Tokens per Request (optional)</label>
              <input
                v-model.number="newSponsorship.maxTokensPerRequest"
                type="number"
                min="1"
                placeholder="e.g., 4000"
                class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-400"
              />
            </div> -->
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <button @click="showCreateSponsorshipModal = false" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button
              @click="handleCreateSponsorship"
              :disabled="!newSponsorship.sponsorKeyId || !newSponsorship.name"
              class="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Token Modal -->
    <Teleport to="body">
      <div v-if="showTokenModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="showTokenModal = false">
        <div class="bg-black rounded-xl p-6 w-full max-w-lg border border-gray-500/20">
          <div class="flex items-center gap-2 mb-4">
            <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="text-sm font-semibold text-white">Sponsored Token</h3>
          </div>
          
          <div class="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4 mb-4">
            <div class="flex items-center justify-between">
              <code class="text-sm text-green-300 break-all">{{ newToken }}</code>
              <button @click="copyToken(newToken)" class="ml-3 text-gray-400 hover:text-white flex-shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          <div class="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3 mb-4">
            <div class="flex items-start gap-2">
              <svg class="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div class="text-xs text-yellow-300">
                <strong>Save this token now!</strong> It won't be shown again.
              </div>
            </div>
          </div>

          <button @click="showTokenModal = false" class="w-full px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
            Done
          </button>
        </div>
      </div>
    </Teleport>

    <!-- Delete Key Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showDeleteKeyConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="cancelDeleteKey">
        <div class="bg-black rounded-xl p-6 w-full max-w-md border border-gray-500/20">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 class="text-sm font-semibold text-white">Delete Provider Key</h3>
              <p class="text-xs text-gray-400">This action cannot be undone.</p>
            </div>
          </div>
          
          <p class="text-sm text-gray-300 mb-6">
            Are you sure you want to delete <strong class="text-white">{{ keyToDelete?.name }}</strong>? 
            Any sponsorships using this key will stop working.
          </p>

          <div class="flex justify-end gap-3">
            <button @click="cancelDeleteKey" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button @click="confirmDeleteKey" class="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">
              Delete Key
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Received Usage Details Modal -->
    <Teleport to="body">
      <div v-if="selectedReceivedId" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="selectedReceivedId = null">
        <div class="bg-black rounded-xl p-6 w-full max-w-2xl border border-gray-500/20 max-h-[80vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-sm font-semibold text-white">My Usage Details</h3>
            <button @click="selectedReceivedId = null" class="text-gray-400 hover:text-white">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div v-if="loadingReceivedUsage" class="text-center py-8 text-gray-400 text-sm">Loading usage data...</div>

          <div v-else-if="receivedUsageSummary" class="space-y-6">
            <div class="grid grid-cols-3 gap-4">
              <div class="bg-gray-500/10 rounded-lg p-4 text-center">
                <div class="text-lg font-semibold text-white">{{ formatCost(receivedUsageSummary.totalCost) }}</div>
                <div class="text-xs text-gray-400">Total Cost</div>
              </div>
              <div class="bg-gray-500/10 rounded-lg p-4 text-center">
                <div class="text-lg font-semibold text-white">{{ receivedUsageSummary.totalTokens.toLocaleString() }}</div>
                <div class="text-xs text-gray-400">Total Tokens</div>
              </div>
              <div class="bg-gray-500/10 rounded-lg p-4 text-center">
                <div class="text-lg font-semibold text-white">{{ receivedUsageSummary.totalRequests }}</div>
                <div class="text-xs text-gray-400">Requests</div>
              </div>
            </div>

            <div v-if="Object.keys(receivedUsageSummary.byModel).length > 0">
              <h4 class="text-xs font-medium text-gray-400 mb-3">Usage by Model</h4>
              <div class="space-y-2">
                <div v-for="(data, model) in receivedUsageSummary.byModel" :key="model" class="flex items-center justify-between bg-gray-500/10 rounded-lg p-3">
                  <code class="text-xs text-blue-300">{{ model }}</code>
                  <div class="flex items-center gap-4 text-xs">
                    <span class="text-gray-400">{{ data.requests }} requests</span>
                    <span class="text-gray-400">{{ data.tokens.toLocaleString() }} tokens</span>
                    <span class="text-white font-medium">{{ formatCost(data.cost) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="text-center py-8 text-gray-400 text-sm">No usage recorded yet</div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Create Pool Modal -->
    <Teleport to="body">
      <div v-if="showCreatePoolModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="showCreatePoolModal = false">
        <div class="bg-black rounded-xl p-6 w-full max-w-md border border-gray-500/20">
          <h3 class="text-sm font-semibold text-white mb-4">Create Sponsorship Pool</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-xs text-gray-400 mb-1">Pool Name</label>
              <input
                v-model="newPool.name"
                type="text"
                placeholder="e.g., OSS Project Fund"
                class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-400"
              />
            </div>
            
            <!-- <div>
              <label class="block text-xs text-gray-400 mb-1">Description (optional)</label>
              <textarea
                v-model="newPool.description"
                placeholder="Describe what this pool is for..."
                rows="2"
                class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-400 resize-none"
              ></textarea>
            </div> -->
            
            <div>
              <label class="block text-xs text-gray-400 mb-1">Routing Strategy</label>
              <div class="relative">
                <select
                  v-model="newPool.routingStrategy"
                  class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-400 appearance-none cursor-pointer"
                >
                  <option value="proportional">Proportional (by remaining budget)</option>
                  <option value="priority">Priority (highest priority first)</option>
                  <option value="round_robin">Round Robin (rotate evenly)</option>
                  <option value="cheapest_first">Cheapest First (most budget first)</option>
                  <option value="random">Random</option>
                </select>
                <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <button @click="showCreatePoolModal = false" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button
              @click="createPool"
              :disabled="!newPool.name.trim()"
              class="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Pool
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Pool Details Modal -->
    <Teleport to="body">
      <div v-if="showPoolDetailsModal && selectedPool" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="showPoolDetailsModal = false">
        <div class="bg-black rounded-xl p-6 w-full max-w-3xl border border-gray-500/20 max-h-[85vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h3 class="text-sm font-semibold text-white">{{ selectedPool.name }}</h3>
              <p class="text-xs text-gray-400 mt-1">{{ selectedPool.description || 'No description' }}</p>
            </div>
            <button @click="showPoolDetailsModal = false" class="text-gray-400 hover:text-white">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Pool Stats -->
          <div class="grid grid-cols-4 gap-4 mb-6">
            <div class="bg-gray-500/10 rounded-lg p-3 text-center">
              <div class="text-lg font-semibold text-white">{{ selectedPool.stats?.activeSponsors || 0 }}</div>
              <div class="text-xs text-gray-400">Active Sponsors</div>
            </div>
            <div class="bg-gray-500/10 rounded-lg p-3 text-center">
              <div class="text-lg font-semibold text-white">${{ (selectedPool.stats?.totalBudgetUsd || 0).toFixed(2) }}</div>
              <div class="text-xs text-gray-400">Total Budget</div>
            </div>
            <div class="bg-gray-500/10 rounded-lg p-3 text-center">
              <div class="text-lg font-semibold text-white">${{ (selectedPool.stats?.totalSpentUsd || 0).toFixed(2) }}</div>
              <div class="text-xs text-gray-400">Total Spent</div>
            </div>
            <div class="bg-gray-500/10 rounded-lg p-3 text-center">
              <div class="text-lg font-semibold text-green-300">${{ (selectedPool.stats?.remainingBudgetUsd || 0).toFixed(2) }}</div>
              <div class="text-xs text-gray-400">Remaining</div>
            </div>
          </div>

          <!-- Pool Tokens -->
          <div class="mb-6">
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-xs font-medium text-gray-400 uppercase">Pool Tokens</h4>
              <button @click="generatePoolToken" class="text-xs text-blue-400 hover:text-blue-300 transition-colors">Generate Token</button>
            </div>
            <div v-if="selectedPoolTokens.length === 0" class="bg-gray-500/10 rounded-lg p-4 text-center text-xs text-gray-400">No tokens generated yet</div>
            <div v-else class="space-y-2">
              <div v-for="token in selectedPoolTokens" :key="token.id" class="flex items-center justify-between bg-gray-500/10 rounded-lg p-3">
                <div>
                  <code class="text-xs text-blue-300">{{ token.tokenHint }}</code>
                  <span :class="['ml-2 text-[10px] px-1.5 py-0.5 rounded', token.isActive ? 'bg-green-400/10 text-green-300' : 'bg-red-400/10 text-red-300']">
                    {{ token.isActive ? 'Active' : 'Revoked' }}
                  </span>
                </div>
                <div class="flex items-center gap-3 text-xs text-gray-400">
                  <span>{{ token.usageCount }} uses</span>
                  <button v-if="token.isActive" @click="revokePoolToken(token.id)" class="text-red-400 hover:text-red-300">Revoke</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Pool Members -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-xs font-medium text-gray-400 uppercase">Pool Members (Sponsorships)</h4>
              <button @click="showAddMemberModal = true" class="text-xs text-blue-400 hover:text-blue-300 transition-colors">Add Sponsorship</button>
            </div>
            <div v-if="!selectedPool.members?.length" class="bg-gray-500/10 rounded-lg p-4 text-center text-xs text-gray-400">
              No sponsorships added yet. Add sponsorships to enable the pool.
            </div>
            <div v-else class="space-y-2">
              <div v-for="member in selectedPool.members" :key="member.id" class="flex items-center justify-between bg-gray-500/10 rounded-lg p-3">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-white font-medium">{{ member.sponsorship?.name || 'Unknown' }}</span>
                    <span class="text-[10px] px-1.5 py-0.5 bg-gray-500/20 rounded text-gray-400">{{ member.sponsorship?.provider || 'unknown' }}</span>
                    <span :class="['text-[10px] px-1.5 py-0.5 rounded', member.isActive && member.sponsorship?.status === 'active' ? 'bg-green-400/10 text-green-300' : 'bg-gray-500/10 text-gray-400']">
                      {{ member.isActive && member.sponsorship?.status === 'active' ? 'Active' : 'Inactive' }}
                    </span>
                  </div>
                  <div class="text-xs text-gray-400 mt-1">
                    Sponsor: {{ member.sponsorship?.sponsorName || 'Unknown' }} | 
                    Budget: ${{ (member.sponsorship?.spendCapUsd || 0).toFixed(2) }} | 
                    Remaining: ${{ (member.sponsorship?.remainingUsd || 0).toFixed(2) }}
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <div class="text-xs text-gray-400">P:{{ member.priority }} W:{{ member.weight }}</div>
                  <button @click="removePoolMember(member.id)" class="text-xs text-red-400 hover:text-red-300">Remove</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Add Pool Member Modal -->
    <Teleport to="body">
      <div v-if="showAddMemberModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="showAddMemberModal = false">
        <div class="bg-black rounded-xl p-6 w-full max-w-md border border-gray-500/20">
          <h3 class="text-sm font-semibold text-white mb-4">Add Sponsorship to Pool</h3>
          
          <!-- Mode Toggle -->
          <div class="flex mb-4 bg-gray-500/10 rounded-lg p-1">
            <button
              @click="addMemberMode = 'select'"
              :class="['flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors', addMemberMode === 'select' ? 'bg-white text-black' : 'text-gray-400 hover:text-white']"
            >
              Select Existing
            </button>
            <button
              @click="addMemberMode = 'token'"
              :class="['flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors', addMemberMode === 'token' ? 'bg-white text-black' : 'text-gray-400 hover:text-white']"
            >
              Enter Token
            </button>
          </div>
          
          <div class="space-y-4">
            <div v-if="addMemberMode === 'select'">
              <label class="block text-xs text-gray-400 mb-1">Select Sponsorship</label>
              <div class="relative">
                <select v-model="addMemberForm.sponsorshipId" class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-400 appearance-none cursor-pointer">
                  <option value="">Select a sponsorship...</option>
                  <option v-for="s in availableSponsorships" :key="s.id" :value="s.id">
                    {{ s.name }} ({{ s.provider }}) - ${{ s.remainingBudgetUsd?.toFixed(2) }} remaining
                  </option>
                </select>
                <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <p v-if="availableSponsorships.length === 0" class="text-xs text-gray-500 mt-1">No available sponsorships. Use "Enter Token" to add by sponsored token.</p>
            </div>
            
            <div v-if="addMemberMode === 'token'">
              <label class="block text-xs text-gray-400 mb-1">Sponsored Token</label>
              <input
                v-model="addMemberForm.token"
                type="text"
                placeholder="spt_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-400 font-mono"
              />
              <p class="text-xs text-gray-500 mt-1">Enter the sponsored token you received. It will be validated and linked to your organization.</p>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-gray-400 mb-1">Priority</label>
                <input v-model.number="addMemberForm.priority" type="number" min="0" class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-400" />
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">Weight</label>
                <input v-model.number="addMemberForm.weight" type="number" min="0" step="0.1" class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-400" />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <button @click="showAddMemberModal = false" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button
              @click="addPoolMember"
              :disabled="(addMemberMode === 'select' && !addMemberForm.sponsorshipId) || (addMemberMode === 'token' && !addMemberForm.token.trim())"
              class="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add to Pool
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Generated Pool Token Modal -->
    <Teleport to="body">
      <div v-if="showGeneratePoolTokenModal && generatedPoolToken" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="showGeneratePoolTokenModal = false">
        <div class="bg-black rounded-xl p-6 w-full max-w-lg border border-gray-500/20">
          <div class="flex items-center gap-2 mb-4">
            <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="text-sm font-semibold text-white">Pool Token Generated</h3>
          </div>
          
          <div class="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4 mb-4">
            <div class="flex items-center justify-between">
              <code class="text-sm text-green-300 break-all">{{ generatedPoolToken }}</code>
              <button @click="copyToken(generatedPoolToken)" class="ml-3 text-gray-400 hover:text-white flex-shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          <div class="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3 mb-4">
            <div class="flex items-start gap-2">
              <svg class="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div class="text-xs text-yellow-300"><strong>Save this token now!</strong> It won't be shown again.</div>
            </div>
          </div>

          <button @click="showGeneratePoolTokenModal = false" class="w-full px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">Done</button>
        </div>
      </div>
    </Teleport>

    <!-- Delete Pool Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showDeletePoolConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="showDeletePoolConfirm = false">
        <div class="bg-black rounded-xl p-6 w-full max-w-md border border-gray-500/20">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 class="text-sm font-semibold text-white">Delete Pool</h3>
              <p class="text-xs text-gray-400">This action cannot be undone.</p>
            </div>
          </div>
          
          <p class="text-sm text-gray-300 mb-6">Are you sure you want to delete this pool? All pool tokens will be invalidated immediately.</p>

          <div class="flex justify-end gap-3">
            <button @click="showDeletePoolConfirm = false" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button @click="deletePool" class="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">Delete Pool</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
