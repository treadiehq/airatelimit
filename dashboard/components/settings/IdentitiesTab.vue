<template>
  <div class="space-y-4 px-6">
    <!-- Info Box -->
    <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-4">
      <h3 class="font-semibold text-white mb-2">Per-Identity Limits</h3>
      <p class="text-sm text-gray-400 mb-2">
        Override limits for <strong class="text-white">specific users</strong> or <strong class="text-white">identities</strong>.
        These take priority over tier and project-level limits.
      </p>
      <div class="mt-3 p-3 bg-gray-500/5 border border-gray-500/10 rounded-lg font-mono text-xs text-gray-300">
        <div class="text-gray-500 mb-1">// API Usage:</div>
        <div><span class="text-emerald-400">POST</span> /projects/<span class="text-blue-300">{{ projectKey || 'pk_xxx' }}</span>/identities</div>
        <div class="text-gray-500 mt-1">{ "identity": "user-123", "requestLimit": 1000 }</div>
      </div>
    </div>

    <!-- Search & Add -->
    <div class="flex items-center gap-2">
      <div class="relative flex-1">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search identities..."
          class="w-full pl-10 pr-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg text-sm focus:ring-2 focus:ring-blue-300/50 focus:border-transparent"
        />
      </div>
      <button
        @click="showAddModal = true"
        class="px-4 py-2 bg-blue-300 text-black text-sm font-medium rounded-lg hover:bg-blue-400 whitespace-nowrap"
      >
        + Add
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-300"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredIdentities.length === 0 && !searchQuery" class="text-center py-12 bg-gray-500/10 border border-gray-500/20 rounded-lg">
      <div class="flex justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" class="w-20 h-20 text-gray-500">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-white mb-2">No Identity Overrides</h3>
      <p class="text-sm text-gray-400 mb-4 max-w-md mx-auto">
        All identities use project/tier defaults. Add an override to set custom limits for specific users.
      </p>
    </div>

    <!-- No Search Results -->
    <div v-else-if="filteredIdentities.length === 0 && searchQuery" class="text-center py-8 text-gray-400">
      No identities matching "{{ searchQuery }}"
    </div>

    <!-- Identity Cards -->
    <div v-else class="space-y-2">
      <div
        v-for="identity in filteredIdentities"
        :key="identity.identity"
        class="border border-gray-500/10 rounded-lg p-4 hover:border-gray-500/20 transition-colors"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-mono text-white text-sm truncate">{{ identity.identity }}</span>
              <span
                :class="identity.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'"
                class="px-2 py-0.5 text-xs rounded-full"
              >
                {{ identity.enabled ? 'enabled' : 'disabled' }}
              </span>
            </div>
            <div class="flex items-center gap-4 mt-2 text-sm text-gray-400">
              <span v-if="identity.requestLimit !== null">
                <span class="text-white">{{ identity.requestLimit?.toLocaleString() }}</span> requests
              </span>
              <span v-if="identity.tokenLimit !== null">
                <span class="text-white">{{ identity.tokenLimit?.toLocaleString() }}</span> tokens
              </span>
              <span v-if="identity.giftedTokens" class="text-emerald-400 flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>
                {{ identity.giftedTokens.toLocaleString() }} gifted
              </span>
              <span v-if="identity.unlimitedUntil && new Date(identity.unlimitedUntil) > new Date()" class="text-amber-400 flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                Unlimited until {{ new Date(identity.unlimitedUntil).toLocaleDateString() }}
              </span>
              <span v-if="identity.requestLimit === null && identity.tokenLimit === null && !identity.giftedTokens && !identity.unlimitedUntil" class="text-gray-500">
                No limit overrides
              </span>
            </div>
            <div v-if="identity.metadata && Object.keys(identity.metadata).length > 0" class="mt-2">
              <span class="text-xs text-gray-500">metadata: </span>
              <span class="text-xs text-gray-400 font-mono">{{ JSON.stringify(identity.metadata) }}</span>
            </div>
          </div>
          <div class="flex items-center gap-1 ml-4">
            <button
              @click="openGiftModal(identity)"
              class="p-2 text-gray-400 hover:text-white hover:bg-gray-500/10 rounded-lg transition-colors"
              title="Gift tokens"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>
            </button>
            <button
              @click="openPromoModal(identity)"
              class="p-2 text-gray-400 hover:text-white hover:bg-gray-500/10 rounded-lg transition-colors"
              title="Set promo"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </button>
            <button
              @click="editIdentity(identity)"
              class="p-2 text-gray-400 hover:text-white hover:bg-gray-500/10 rounded-lg transition-colors"
              title="Edit"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              @click="toggleEnabled(identity)"
              class="p-2 text-gray-400 hover:text-white hover:bg-gray-500/10 rounded-lg transition-colors"
              :title="identity.enabled ? 'Disable' : 'Enable'"
            >
              <svg v-if="identity.enabled" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button
              @click="deleteIdentity(identity)"
              class="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Delete"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="total > 100" class="flex items-center justify-between text-sm text-gray-400">
      <span>Showing {{ identities.length }} of {{ total }} identities</span>
      <button
        v-if="identities.length < total"
        @click="loadMore"
        class="text-blue-300 hover:text-blue-200"
      >
        Load more
      </button>
    </div>

    <!-- Gift Modal -->
    <Teleport to="body">
      <div v-if="giftingIdentity" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" @click="giftingIdentity = null"></div>
        <div class="relative w-full max-w-sm bg-black border border-gray-500/20 rounded-xl shadow-xl">
          <div class="flex items-center justify-between p-4 border-b border-gray-500/20">
            <h3 class="text-lg font-semibold text-white">Gift Credits</h3>
            <button @click="giftingIdentity = null" class="text-gray-400 hover:text-white">✕</button>
          </div>
          <form @submit.prevent="giftCredits" class="p-4 space-y-4">
            <p class="text-sm text-gray-400">Gift tokens to <span class="text-white font-mono">{{ giftingIdentity?.identity }}</span></p>
            <div>
              <label class="block text-sm font-medium text-white mb-1">Tokens to Gift</label>
              <input v-model.number="giftForm.tokens" type="number" min="0" placeholder="e.g., 10000" class="w-full px-3 py-2 text-white bg-gray-500/10 border border-gray-500/20 rounded-lg text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-white mb-1">Reason (optional)</label>
              <input v-model="giftForm.reason" type="text" placeholder="e.g., support ticket #123" class="w-full px-3 py-2 text-white bg-gray-500/10 border border-gray-500/20 rounded-lg text-sm" />
            </div>
            <div class="flex gap-2 pt-2">
              <button type="button" @click="giftingIdentity = null" class="flex-1 px-4 py-2 bg-gray-500/10 text-white text-sm rounded-lg hover:bg-gray-500/20">Cancel</button>
              <button type="submit" :disabled="!giftForm.tokens || giftingSaving" class="flex-1 px-4 py-2 bg-blue-300 text-black text-sm rounded-lg hover:bg-emerald-400 disabled:opacity-50">
                {{ giftingSaving ? 'Gifting...' : 'Gift' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Promo Modal -->
    <Teleport to="body">
      <div v-if="promoIdentity" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" @click="promoIdentity = null"></div>
        <div class="relative w-full max-w-sm bg-black border border-gray-500/20 rounded-xl shadow-xl">
          <div class="flex items-center justify-between p-4 border-b border-gray-500/20">
            <h3 class="text-lg font-semibold text-white">Promotional Override</h3>
            <button @click="promoIdentity = null" class="text-gray-400 hover:text-white">✕</button>
          </div>
          <form @submit.prevent="setPromo" class="p-4 space-y-4">
            <p class="text-sm text-gray-400">Set unlimited access for <span class="text-white font-mono">{{ promoIdentity?.identity }}</span></p>
            <div>
              <label class="block text-sm font-medium text-white mb-1">Unlimited Until</label>
              <input v-model="promoForm.unlimitedUntil" type="date" :min="minDate" class="w-full px-3 py-2 text-white bg-gray-500/10 border border-gray-500/20 rounded-lg text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-white mb-1">Reason (optional)</label>
              <input v-model="promoForm.reason" type="text" placeholder="e.g., National Writers Month" class="w-full px-3 py-2 text-white bg-gray-500/10 border border-gray-500/20 rounded-lg text-sm" />
            </div>
            <div class="flex gap-2 pt-2">
              <button type="button" @click="removePromo" class="px-4 py-2 bg-red-400/10 text-red-400 text-sm rounded-lg hover:bg-red-500/10">Remove</button>
              <button type="button" @click="promoIdentity = null" class="flex-1 px-4 py-2 bg-gray-500/10 text-white text-sm rounded-lg hover:bg-gray-500/20">Cancel</button>
              <button type="submit" :disabled="!promoForm.unlimitedUntil || promoSaving" class="flex-1 px-4 py-2 bg-blue-300 text-black text-sm rounded-lg hover:bg-blue-400 disabled:opacity-50">
                {{ promoSaving ? 'Saving...' : 'Set' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <div
        v-if="showAddModal || editingIdentity"
        class="fixed inset-0 z-[60] flex items-center justify-center p-4"
        @click.self="closeModal"
      >
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" @click="closeModal"></div>
        <div class="relative w-full max-w-md bg-black border border-gray-500/20 rounded-xl shadow-xl" @click.stop>
          <div class="flex items-center justify-between p-4 border-b border-gray-500/20">
            <h3 class="text-lg font-semibold text-white">
              {{ editingIdentity ? 'Edit Identity Limits' : 'Add Identity Limits' }}
            </h3>
            <button @click="closeModal" class="text-gray-400 hover:text-white">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="saveIdentity" class="p-4 space-y-4">
            <div>
              <label class="block text-sm font-medium text-white mb-1">Identity</label>
              <input
                v-model="form.identity"
                type="text"
                :disabled="!!editingIdentity"
                placeholder="e.g., user-123, minecraft-server-abc"
                class="w-full px-3 py-2 text-white bg-gray-500/10 border border-gray-500/20 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                required
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-white mb-1">Request Limit</label>
                <input
                  v-model.number="form.requestLimit"
                  type="number"
                  min="0"
                  placeholder="Unlimited"
                  class="w-full px-3 py-2 text-white bg-gray-500/10 border border-gray-500/20 rounded-lg text-sm"
                />
                <p class="text-xs text-gray-500 mt-1">Leave empty for default</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-white mb-1">Token Limit</label>
                <input
                  v-model.number="form.tokenLimit"
                  type="number"
                  min="0"
                  placeholder="Unlimited"
                  class="w-full px-3 py-2 text-white bg-gray-500/10 border border-gray-500/20 rounded-lg text-sm"
                />
                <p class="text-xs text-gray-500 mt-1">Leave empty for default</p>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-white mb-1">Metadata (Optional)</label>
              <textarea
                v-model="form.metadataJson"
                rows="2"
                placeholder='{"plan": "premium", "serverName": "CoolCraft"}'
                class="w-full px-3 py-2 text-white bg-gray-500/10 border border-gray-500/20 rounded-lg text-sm font-mono"
              />
              <p class="text-xs text-gray-500 mt-1">JSON object for your reference</p>
            </div>

            <label class="flex items-center gap-3 cursor-pointer group">
              <div class="relative flex items-center justify-center">
                <input
                  v-model="form.enabled"
                  type="checkbox"
                  class="sr-only"
                />
                <div 
                  :class="form.enabled ? 'bg-blue-300 border-blue-300' : 'border-gray-500 bg-transparent group-hover:border-gray-400'"
                  class="w-4 h-4 rounded border-2 transition-all flex items-center justify-center"
                >
                  <svg 
                    v-if="form.enabled"
                    class="w-2.5 h-2.5 text-black" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <span class="text-sm text-white">Enabled</span>
            </label>

            <div v-if="saveError" class="p-3 bg-red-500/10 text-red-400 rounded-lg text-sm">
              {{ saveError }}
            </div>

            <div class="flex gap-2 pt-2">
              <button
                type="button"
                @click="closeModal"
                class="flex-1 px-4 py-2 bg-gray-500/10 text-white text-sm font-medium rounded-lg hover:bg-gray-500/20"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="flex-1 px-4 py-2 bg-blue-300 text-black text-sm font-medium rounded-lg hover:bg-blue-400 disabled:opacity-50"
              >
                {{ saving ? 'Saving...' : 'Save' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  projectKey: string
}>()

const api = useApi()

interface IdentityLimit {
  identity: string
  requestLimit: number | null
  tokenLimit: number | null
  giftedTokens?: number
  giftedRequests?: number
  unlimitedUntil?: string | null
  customResponse: any
  metadata: Record<string, any>
  enabled: boolean
  createdAt: string
  updatedAt: string
}

const identities = ref<IdentityLimit[]>([])
const total = ref(0)
const loading = ref(false)
const searchQuery = ref('')
const showAddModal = ref(false)
const editingIdentity = ref<IdentityLimit | null>(null)
const saving = ref(false)
const saveError = ref('')

const form = ref({
  identity: '',
  requestLimit: null as number | null,
  tokenLimit: null as number | null,
  metadataJson: '',
  enabled: true,
})

// Gift modal state
const giftingIdentity = ref<IdentityLimit | null>(null)
const giftingSaving = ref(false)
const giftForm = ref({ tokens: 0, reason: '' })

// Promo modal state
const promoIdentity = ref<IdentityLimit | null>(null)
const promoSaving = ref(false)
const promoForm = ref({ unlimitedUntil: '', reason: '' })
const minDate = computed(() => new Date().toISOString().split('T')[0])

const filteredIdentities = computed(() => {
  if (!searchQuery.value) return identities.value
  const query = searchQuery.value.toLowerCase()
  return identities.value.filter(i => 
    i.identity.toLowerCase().includes(query) ||
    JSON.stringify(i.metadata || {}).toLowerCase().includes(query)
  )
})

const loadIdentities = async () => {
  if (!props.projectKey) return
  
  loading.value = true
  try {
    const result = await api(`/projects/${props.projectKey}/identities`)
    identities.value = result.items
    total.value = result.total
  } catch (e) {
    console.error('Failed to load identities:', e)
  } finally {
    loading.value = false
  }
}

const loadMore = async () => {
  if (!props.projectKey) return
  
  try {
    const result = await api(`/projects/${props.projectKey}/identities?offset=${identities.value.length}`)
    identities.value.push(...result.items)
  } catch (e) {
    console.error('Failed to load more identities:', e)
  }
}

const editIdentity = (identity: IdentityLimit) => {
  editingIdentity.value = identity
  form.value = {
    identity: identity.identity,
    requestLimit: identity.requestLimit,
    tokenLimit: identity.tokenLimit,
    metadataJson: identity.metadata ? JSON.stringify(identity.metadata, null, 2) : '',
    enabled: identity.enabled,
  }
}

const closeModal = () => {
  showAddModal.value = false
  editingIdentity.value = null
  saveError.value = ''
  form.value = {
    identity: '',
    requestLimit: null,
    tokenLimit: null,
    metadataJson: '',
    enabled: true,
  }
}

const saveIdentity = async () => {
  saveError.value = ''
  saving.value = true

  try {
    let metadata = null
    if (form.value.metadataJson.trim()) {
      try {
        metadata = JSON.parse(form.value.metadataJson)
      } catch {
        saveError.value = 'Invalid JSON in metadata field'
        saving.value = false
        return
      }
    }

    await api(`/projects/${props.projectKey}/identities`, {
      method: 'POST',
      body: {
        identity: form.value.identity,
        requestLimit: form.value.requestLimit || null,
        tokenLimit: form.value.tokenLimit || null,
        metadata,
        enabled: form.value.enabled,
      },
    })

    await loadIdentities()
    closeModal()
  } catch (e: any) {
    saveError.value = e.message || 'Failed to save'
  } finally {
    saving.value = false
  }
}

const toggleEnabled = async (identity: IdentityLimit) => {
  try {
    await api(`/projects/${props.projectKey}/identities/${encodeURIComponent(identity.identity)}`, {
      method: 'PUT',
      body: {
        enabled: !identity.enabled,
      },
    })
    identity.enabled = !identity.enabled
  } catch (e) {
    console.error('Failed to toggle identity:', e)
  }
}

const deleteIdentity = async (identity: IdentityLimit) => {
  if (!confirm(`Delete limits for "${identity.identity}"? They will revert to project/tier defaults.`)) {
    return
  }

  try {
    await api(`/projects/${props.projectKey}/identities/${encodeURIComponent(identity.identity)}`, {
      method: 'DELETE',
    })
    identities.value = identities.value.filter(i => i.identity !== identity.identity)
    total.value--
  } catch (e) {
    console.error('Failed to delete identity:', e)
  }
}

// Gift functions
const openGiftModal = (identity: IdentityLimit) => {
  giftingIdentity.value = identity
  giftForm.value = { tokens: 0, reason: '' }
}

const giftCredits = async () => {
  if (!giftingIdentity.value || !giftForm.value.tokens) return
  giftingSaving.value = true
  try {
    await api(`/projects/${props.projectKey}/identities/${encodeURIComponent(giftingIdentity.value.identity)}/gift`, {
      method: 'POST',
      body: { tokens: giftForm.value.tokens, reason: giftForm.value.reason },
    })
    await loadIdentities()
    giftingIdentity.value = null
  } catch (e) {
    console.error('Failed to gift credits:', e)
  } finally {
    giftingSaving.value = false
  }
}

// Promo functions
const openPromoModal = (identity: IdentityLimit) => {
  promoIdentity.value = identity
  promoForm.value = {
    unlimitedUntil: identity.unlimitedUntil ? identity.unlimitedUntil.split('T')[0] : '',
    reason: '',
  }
}

const setPromo = async () => {
  if (!promoIdentity.value || !promoForm.value.unlimitedUntil) return
  promoSaving.value = true
  try {
    await api(`/projects/${props.projectKey}/identities/${encodeURIComponent(promoIdentity.value.identity)}/promo`, {
      method: 'POST',
      body: { unlimitedUntil: promoForm.value.unlimitedUntil, reason: promoForm.value.reason },
    })
    await loadIdentities()
    promoIdentity.value = null
  } catch (e) {
    console.error('Failed to set promo:', e)
  } finally {
    promoSaving.value = false
  }
}

const removePromo = async () => {
  if (!promoIdentity.value) return
  promoSaving.value = true
  try {
    await api(`/projects/${props.projectKey}/identities/${encodeURIComponent(promoIdentity.value.identity)}/promo`, {
      method: 'POST',
      body: { unlimitedUntil: null },
    })
    await loadIdentities()
    promoIdentity.value = null
  } catch (e) {
    console.error('Failed to remove promo:', e)
  } finally {
    promoSaving.value = false
  }
}

// Load when project key is available
watch(() => props.projectKey, (key) => {
  if (key) loadIdentities()
}, { immediate: true })

// Expose load function for parent to call
defineExpose({ loadIdentities })
</script>

