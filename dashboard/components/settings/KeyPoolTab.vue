<template>
  <div class="px-6 py-4 space-y-6">
    <!-- Header -->
    <div>
      <h3 class="text-base font-medium text-white mb-1">Key Pool Contribution Links</h3>
      <p class="text-sm text-gray-400">
        Generate shareable links that allow others to contribute their API keys to your project.
        Contributed keys are load-balanced with your own.
      </p>
    </div>

    <!-- Enable Key Pool Toggle -->
    <div class="bg-gray-500/5 border border-gray-500/10 rounded-xl p-4">
      <div class="flex items-center justify-between">
        <div>
          <h4 class="text-sm font-medium text-white">Enable Key Pool</h4>
          <p class="text-xs text-gray-400 mt-0.5">
            Allow contributed keys to be used for requests
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button
            v-if="hasChanges"
            @click="saveSettings"
            :disabled="saving"
            class="px-3 py-1.5 text-sm font-medium text-black bg-blue-300 hover:bg-blue-400 disabled:opacity-50 rounded-lg transition-colors"
          >
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
          <button
            @click="toggleKeyPool"
            :class="[
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
              keyPoolEnabled ? 'bg-blue-300' : 'bg-gray-600'
            ]"
          >
            <span
              :class="[
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                keyPoolEnabled ? 'translate-x-5' : 'translate-x-0'
              ]"
            />
          </button>
        </div>
      </div>
    </div>

    <!-- Generate New Link -->
    <div class="flex items-center justify-between">
      <h4 class="text-sm font-medium text-white">Contribution Links</h4>
      <button
        @click="showCreateModal = true"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-black bg-blue-300 hover:bg-blue-400 rounded-lg transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Generate Link
      </button>
    </div>

    <!-- Invites List -->
    <div v-if="loading" class="text-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-300 mx-auto"></div>
      <p class="text-sm text-gray-400 mt-2">Loading invites...</p>
    </div>

    <div v-else-if="invites.length === 0" class="text-center py-12 bg-gray-500/5 border border-gray-500/10 border-dashed rounded-xl">
      <svg class="w-12 h-12 text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
      <h4 class="text-white font-medium mb-1">No contribution links yet</h4>
      <p class="text-sm text-gray-400 max-w-sm mx-auto">
        Generate a link to share with contributors. They can use it to add their API keys to your project.
      </p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="invite in invites"
        :key="invite.id"
        class="bg-gray-500/5 border border-gray-500/10 rounded-xl p-4"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-white font-medium">{{ invite.name || 'Unnamed Link' }}</span>
              <span
                :class="[
                  'text-xs px-2 py-0.5 rounded-full',
                  invite.active ? 'bg-green-300/10 text-green-300' : 'bg-gray-500/10 text-gray-400'
                ]"
              >
                {{ invite.active ? 'Active' : 'Revoked' }}
              </span>
            </div>
            <div class="flex items-center gap-4 mt-2 text-xs text-gray-400">
              <span>{{ invite.contributionCount }} contributions</span>
              <span v-if="invite.maxContributions">/ {{ invite.maxContributions }} max</span>
              <span v-if="invite.expiresAt">
                Expires: {{ formatDate(invite.expiresAt) }}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2 ml-4">
            <button
              v-if="invite.active"
              @click="copyInviteLink(invite)"
              class="p-2 text-gray-400 hover:text-white hover:bg-gray-500/10 rounded-lg transition-colors"
              title="Copy link"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              v-if="invite.active"
              @click="revokeInvite(invite)"
              class="p-2 text-gray-400 hover:text-amber-300 hover:bg-amber-300/10 rounded-lg transition-colors"
              title="Revoke"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </button>
            <button
              @click="deleteInvite(invite)"
              class="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
              title="Delete"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Link Preview -->
        <div v-if="invite.active" class="mt-3 pt-3 border-t border-gray-500/10">
          <div class="flex items-center bg-gray-500/10 rounded-lg overflow-hidden">
            <code class="flex-1 px-3 py-2 font-mono text-xs text-gray-300 truncate">
              {{ getInviteUrl(invite) }}
            </code>
          </div>
        </div>
      </div>
    </div>

    <!-- Contributed Keys Section -->
    <div v-if="poolEntries.length > 0" class="space-y-4 pt-6 border-t border-gray-500/10">
      <h4 class="text-sm font-medium text-white">Contributions ({{ poolEntries.length }})</h4>
      <div class="space-y-2">
        <div
          v-for="entry in poolEntries"
          :key="entry.id"
          class="flex items-center justify-between py-2 px-3 bg-gray-500/5 border border-gray-500/10 rounded-lg"
        >
          <div class="flex items-center gap-3">
            <span class="text-xs px-2 py-0.5 rounded bg-gray-500/10 text-gray-400 uppercase font-mono">
              {{ entry.provider }}
            </span>
            <span class="text-sm text-white">{{ entry.name || `${entry.provider} Key` }}</span>
          </div>
          <div class="flex items-center gap-4 text-xs text-gray-400">
            <span>
              {{ formatNumber(entry.currentPeriodTokens || 0) }} / {{ entry.monthlyTokenLimit ? formatNumber(entry.monthlyTokenLimit) : '∞' }} tokens
            </span>
            <span :class="entry.active ? 'text-green-300' : 'text-gray-500'">
              {{ entry.active ? 'Active' : 'Paused' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Invite Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" @click="showCreateModal = false"></div>
        <div class="relative bg-black border border-gray-500/20 rounded-xl w-full max-w-md shadow-xl">
          <div class="p-6 space-y-4">
            <h3 class="text-lg font-medium text-white">Generate Contribution Link</h3>
            
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1.5">Name (optional)</label>
              <input
                v-model="createForm.name"
                type="text"
                placeholder="e.g., Community Contributors"
                class="w-full px-3 py-2 bg-gray-500/10 border border-gray-500/10 rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1.5">Max Contributions (optional)</label>
              <input
                v-model.number="createForm.maxContributions"
                type="number"
                min="1"
                placeholder="Unlimited"
                class="w-full px-3 py-2 bg-gray-500/10 border border-gray-500/10 rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <p class="text-xs text-gray-500 mt-1.5">
                How many API keys can be contributed via this link before it expires.
              </p>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <button
                @click="showCreateModal = false"
                class="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white bg-gray-500/10 hover:bg-gray-500/15 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                @click="createInvite"
                :disabled="creating"
                class="px-4 py-2 text-sm font-medium text-black bg-blue-300 hover:bg-blue-400 disabled:opacity-50 rounded-lg transition-colors"
              >
                {{ creating ? 'Creating...' : 'Generate Link' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
      :is-open="showDeleteConfirm"
      title="Delete Contribution Link"
      :message="`Are you sure you want to delete the '${inviteToDelete?.name || 'Unnamed'}' contribution link? This cannot be undone.`"
      confirm-text="Delete"
      cancel-text="Cancel"
      variant="danger"
      @confirm="confirmDeleteInvite"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useApi } from '~/composables/useApi'
import { useToast } from '~/composables/useToast'

interface KeyPoolInvite {
  id: string
  projectId: string
  token: string
  name: string | null
  active: boolean
  expiresAt: string | null
  maxContributions: number | null
  contributionCount: number
  createdAt: string
}

interface KeyPoolEntry {
  id: string
  provider: string
  name: string | null
  active: boolean
  totalTokens: number
  currentPeriodTokens: number
  monthlyTokenLimit: number
}

const props = defineProps<{
  projectId: string
  keyPoolEnabled: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-key-pool', value: boolean): void
  (e: 'save'): void
}>()

const api = useApi()
const toast = useToast()

const loading = ref(true)
const creating = ref(false)
const saving = ref(false)
const invites = ref<KeyPoolInvite[]>([])
const poolEntries = ref<KeyPoolEntry[]>([])
const showCreateModal = ref(false)
const showDeleteConfirm = ref(false)
const inviteToDelete = ref<KeyPoolInvite | null>(null)
const keyPoolEnabled = ref(props.keyPoolEnabled)

// Store the original value to compare against (not the reactive prop)
const originalKeyPoolEnabled = ref(props.keyPoolEnabled)

// Track if toggle state has changed from the original
const hasChanges = computed(() => keyPoolEnabled.value !== originalKeyPoolEnabled.value)

const createForm = ref({
  name: '',
  maxContributions: null as number | null,
})

onMounted(async () => {
  await loadInvites()
  await loadPoolEntries()
})

async function loadInvites() {
  try {
    const data = await api(`/sponsorships/invites/project/${props.projectId}`)
    invites.value = data
  } catch (err) {
    console.error('Failed to load invites:', err)
  } finally {
    loading.value = false
  }
}

async function loadPoolEntries() {
  try {
    const data = await api(`/sponsorships/keys/project/${props.projectId}`)
    poolEntries.value = data
  } catch (err) {
    console.error('Failed to load pool entries:', err)
  }
}

async function createInvite() {
  creating.value = true
  try {
    const data = await api('/sponsorships/invites', {
      method: 'POST',
      body: {
        projectId: props.projectId,
        name: createForm.value.name || undefined,
        maxContributions: createForm.value.maxContributions || undefined,
      },
    })
    invites.value.unshift(data)
    showCreateModal.value = false
    createForm.value = { name: '', maxContributions: null }
    toast.success('Contribution link created')
    
    // Copy to clipboard
    await copyInviteLink(data)
  } catch (err: any) {
    toast.error(err.message || 'Failed to create invite')
  } finally {
    creating.value = false
  }
}

async function revokeInvite(invite: KeyPoolInvite) {
  try {
    await api(`/sponsorships/invites/${invite.id}/revoke`, { method: 'PUT' })
    invite.active = false
    toast.success('Link revoked')
  } catch (err: any) {
    toast.error(err.message || 'Failed to revoke invite')
  }
}

function deleteInvite(invite: KeyPoolInvite) {
  inviteToDelete.value = invite
  showDeleteConfirm.value = true
}

async function confirmDeleteInvite() {
  if (!inviteToDelete.value) return
  
  const invite = inviteToDelete.value
  showDeleteConfirm.value = false
  
  try {
    await api(`/sponsorships/invites/${invite.id}`, { method: 'DELETE' })
    invites.value = invites.value.filter(i => i.id !== invite.id)
    toast.success('Link deleted')
  } catch (err: any) {
    toast.error(err.message || 'Failed to delete invite')
  } finally {
    inviteToDelete.value = null
  }
}

function getInviteUrl(invite: KeyPoolInvite) {
  const base = window.location.origin
  return `${base}/contribute/${invite.token}`
}

async function copyInviteLink(invite: KeyPoolInvite) {
  const url = getInviteUrl(invite)
  await navigator.clipboard.writeText(url)
  toast.success('Link copied to clipboard')
}

function toggleKeyPool() {
  keyPoolEnabled.value = !keyPoolEnabled.value
  emit('toggle-key-pool', keyPoolEnabled.value)
}

async function saveSettings() {
  saving.value = true
  try {
    await api(`/projects/${props.projectId}`, {
      method: 'PUT',
      body: {
        keyPoolEnabled: keyPoolEnabled.value,
      },
    })
    toast.success('Key pool settings saved')
    // Update the original value so hasChanges becomes false
    originalKeyPoolEnabled.value = keyPoolEnabled.value
    // Emit the change so the parent can update
    emit('toggle-key-pool', keyPoolEnabled.value)
  } catch (err: any) {
    toast.error(err.message || 'Failed to save settings')
  } finally {
    saving.value = false
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString()
}

function formatNumber(num: number) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}
</script>

