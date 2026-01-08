<template>
  <div class="min-h-screen bg-black flex items-center justify-center p-4">
    <!-- Loading State -->
    <div v-if="loading" class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-300 mx-auto"></div>
      <p class="text-gray-400 mt-4">Loading your contribution...</p>
    </div>

    <!-- Error State (Invalid Link) -->
    <div v-else-if="error" class="text-center max-w-md">
      <div class="w-16 h-16 bg-red-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h1 class="text-2xl font-bold text-white mb-2">Invalid Management Link</h1>
      <p class="text-gray-400">
        This management link is not valid. It may have been revoked or never existed.
      </p>
      <NuxtLink to="/" class="inline-block mt-6 px-6 py-2 bg-gray-500/10 text-gray-300 border border-gray-500/10 hover:bg-gray-500/15 rounded-lg transition-colors">
        Go to Homepage
      </NuxtLink>
    </div>

    <!-- Revoked State -->
    <div v-else-if="revoked" class="text-center max-w-md">
      <div class="w-16 h-16 bg-green-300/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg class="w-8 h-8 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 class="text-2xl font-bold text-white mb-2">Contribution Revoked</h1>
      <p class="text-gray-400">
        Your API key has been removed and will no longer be used by this project.
      </p>
      <NuxtLink to="/" class="inline-block mt-6 px-6 py-2 bg-gray-500/10 text-gray-300 border border-gray-500/10 hover:bg-gray-500/15 rounded-lg transition-colors">
        Go to Homepage
      </NuxtLink>
    </div>

    <!-- Management Panel -->
    <div v-else class="w-full max-w-lg">
      <div class="bg-gray-500/10 border border-gray-500/10 rounded-2xl p-8">
        <!-- Header -->
        <div class="text-center mb-8">
          <div class="w-14 h-14 rounded-lg flex items-center justify-center mx-auto mb-4">
            <img src="/logo.png" alt="AI Ratelimit Logo" class="w-14 h-14">
          </div>
          <h1 class="text-2xl font-bold text-white mb-2">Manage Your Contribution</h1>
          <p class="text-gray-400">
            <span class="text-white font-medium">{{ entry?.name || 'Your API Key' }}</span>
            contributing to
            <span class="text-white font-medium">{{ entry?.project?.name || 'Project' }}</span>
          </p>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-3 gap-4 text-center bg-gray-500/10 rounded-lg p-4 mb-6">
          <div>
            <div class="text-xl font-bold text-white">{{ formatNumber(entry?.currentPeriodTokens || 0) }}</div>
            <div class="text-xs text-gray-400">Tokens This Month</div>
          </div>
          <div>
            <div class="text-xl font-bold text-white">{{ entry?.currentPeriodRequests || 0 }}</div>
            <div class="text-xs text-gray-400">Requests</div>
          </div>
          <div>
            <div class="text-xl font-bold text-white">${{ ((entry?.currentPeriodCostCents || 0) / 100).toFixed(2) }}</div>
            <div class="text-xs text-gray-400">Cost</div>
          </div>
        </div>

        <!-- Status & Controls -->
        <div class="space-y-4">
          <!-- Active Status -->
          <div class="flex items-center justify-between p-4 bg-gray-500/10 rounded-lg">
            <div>
              <div class="text-sm font-medium text-white">Status</div>
              <div :class="entry?.active ? 'text-green-300' : 'text-gray-500'" class="text-xs">
                {{ entry?.active ? 'Active - Key is being used' : 'Paused - Key is not being used' }}
              </div>
            </div>
            <button
              @click="toggleActive"
              :disabled="updating"
              :class="entry?.active 
                ? 'bg-amber-300/10 text-amber-300 hover:bg-amber-300/15' 
                : 'bg-green-300/10 text-green-300 hover:bg-green-300/15'"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {{ entry?.active ? 'Pause' : 'Resume' }}
            </button>
          </div>

          <!-- Monthly Limit -->
          <div class="p-4 bg-gray-500/10 rounded-lg">
            <div class="text-sm font-medium text-white mb-2">Monthly Token Limit</div>
            <div class="flex items-center gap-3">
              <input
                v-model.number="newLimit"
                type="number"
                min="0"
                :placeholder="entry?.monthlyTokenLimit ? String(entry.monthlyTokenLimit) : 'No limit'"
                class="flex-1 px-3 py-2 bg-gray-500/10 border border-gray-500/10 rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button
                @click="updateLimit"
                :disabled="updating || newLimit === entry?.monthlyTokenLimit"
                class="px-4 py-2 bg-blue-300/10 text-blue-300 hover:bg-blue-300/15 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                Update
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-2">
              Current: {{ entry?.monthlyTokenLimit ? formatNumber(entry.monthlyTokenLimit) + ' tokens' : 'Unlimited' }}
            </p>
          </div>

          <!-- Provider Info -->
          <div class="p-4 bg-gray-500/10 rounded-lg">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm font-medium text-white">Provider</div>
                <div class="text-xs text-gray-400 uppercase">{{ entry?.provider }}</div>
              </div>
              <div class="text-right">
                <div class="text-sm font-medium text-white">Contributed</div>
                <div class="text-xs text-gray-400">{{ formatDate(entry?.createdAt) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Revoke Button -->
        <div class="mt-6 pt-6 border-t border-gray-500/10">
          <button
            @click="showRevokeConfirm = true"
            class="w-full py-3 px-4 bg-red-400/10 hover:bg-red-400/15 text-red-400 border border-red-400/10 font-medium rounded-lg transition-colors"
          >
            Revoke Contribution
          </button>
          <p class="text-xs text-gray-500 text-center mt-2">
            This will permanently remove your API key from this project.
          </p>
        </div>
      </div>
    </div>

    <!-- Revoke Confirmation Dialog -->
    <ConfirmDialog
      :is-open="showRevokeConfirm"
      title="Revoke Contribution"
      message="Are you sure you want to revoke your contribution? Your API key will be permanently removed and will no longer be used by this project."
      confirm-text="Revoke"
      cancel-text="Cancel"
      variant="danger"
      @confirm="revokeContribution"
      @cancel="showRevokeConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false, // No nav/footer for this public page
})

interface KeyPoolEntry {
  id: string
  projectId: string
  provider: string
  name: string | null
  active: boolean
  monthlyTokenLimit: number
  currentPeriodTokens: number
  currentPeriodRequests: number
  currentPeriodCostCents: number
  createdAt: string
  project?: {
    id: string
    name: string
  }
}

const route = useRoute()
const managementToken = route.params.token as string

const loading = ref(true)
const error = ref(false)
const revoked = ref(false)
const updating = ref(false)
const showRevokeConfirm = ref(false)

const entry = ref<KeyPoolEntry | null>(null)
const newLimit = ref<number | null>(null)

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`
  return String(num)
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString()
}

// Fetch contribution details on mount
onMounted(async () => {
  try {
    const config = useRuntimeConfig()
    const response = await fetch(`${config.public.apiBaseUrl}/contribute/manage/${managementToken}`)
    
    if (!response.ok) {
      error.value = true
      return
    }
    
    entry.value = await response.json()
    newLimit.value = entry.value?.monthlyTokenLimit || null
  } catch (err) {
    console.error('Failed to load contribution:', err)
    error.value = true
  } finally {
    loading.value = false
  }
})

async function toggleActive() {
  if (!entry.value) return
  updating.value = true
  
  try {
    const config = useRuntimeConfig()
    const response = await fetch(`${config.public.apiBaseUrl}/contribute/manage/${managementToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !entry.value.active }),
    })
    
    if (response.ok) {
      entry.value = await response.json()
    }
  } catch (err) {
    console.error('Failed to update:', err)
  } finally {
    updating.value = false
  }
}

async function updateLimit() {
  if (!entry.value || newLimit.value === entry.value.monthlyTokenLimit) return
  updating.value = true
  
  try {
    const config = useRuntimeConfig()
    const response = await fetch(`${config.public.apiBaseUrl}/contribute/manage/${managementToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthlyTokenLimit: newLimit.value || 0 }),
    })
    
    if (response.ok) {
      entry.value = await response.json()
    }
  } catch (err) {
    console.error('Failed to update limit:', err)
  } finally {
    updating.value = false
  }
}

async function revokeContribution() {
  showRevokeConfirm.value = false
  updating.value = true
  
  try {
    const config = useRuntimeConfig()
    const response = await fetch(`${config.public.apiBaseUrl}/contribute/manage/${managementToken}/revoke`, {
      method: 'POST',
    })
    
    if (response.ok) {
      revoked.value = true
    }
  } catch (err) {
    console.error('Failed to revoke:', err)
  } finally {
    updating.value = false
  }
}
</script>

