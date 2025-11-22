<template>
  <NuxtLayout>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <!-- Breadcrumbs -->
      <Breadcrumbs :items="breadcrumbs" v-if="!loading && !error" />

      <!-- Loading State -->
      <div v-if="loading">
        <div class="animate-pulse space-y-6">
          <div class="h-8 bg-gray-500/10 border border-gray-500/10 rounded w-1/4"></div>
          <div class="bg-gray-500/10 border border-gray-500/10 p-6 rounded-lg">
            <div class="h-6 bg-gray-500/10 border border-gray-500/10 rounded w-1/3 mb-4"></div>
            <div class="space-y-3">
              <div class="h-4 bg-gray-500/10 border border-gray-500/10 rounded w-full"></div>
              <div class="h-4 bg-gray-500/10 border border-gray-500/10 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-400/10 text-red-400 p-4 rounded-lg border border-red-400/20">
        <div class="flex items-center space-x-2">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          <span>{{ error }}</span>
        </div>
      </div>

      <div v-else class="space-y-6">
        <!-- Project Header -->
        <div class="p-1 px-0">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h2 class="text-2xl font-bold text-white">{{ project.name }}</h2>
              <div class="flex items-center space-x-2 mt-2">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-300/10 text-green-300">
                  <span class="w-1.5 h-1.5 rounded-full bg-green-300 mr-1.5"></span>
                  Active
                </span>
                <span class="text-xs text-gray-500">• OpenAI</span>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <!-- Project Key -->
              <div class="">
                <!-- <label class="block text-sm font-medium text-gray-400 mb-2">Project Key</label> -->
                <div class="flex items-center bg-gray-500/10 border border-gray-500/10 rounded-lg overflow-hidden">
                  <code class="flex-1 px-3 py-2 font-mono text-xs">
                    {{ showProjectKey ? project.projectKey : maskedProjectKey }}
                  </code>
                  <button
                    @click="toggleProjectKeyVisibility"
                    class="px-3 py-2 bg-transparent border border-transparent text-gray-400 rounded-none hover:bg-gray-500/10 text-sm transition-colors inline-flex items-center space-x-2"
                    :title="showProjectKey ? 'Hide key' : 'Show key'"
                  >
                    <svg v-if="showProjectKey" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button
                    @click="copyProjectKey"
                    class="px-3 py-2 bg-transparent border-l border-r-0 border-b-0 border-t-0 border-gray-500/10 text-white rounded-none hover:bg-gray-500/10 text-sm transition-colors inline-flex items-center space-x-2"
                    title="Copy key"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <!-- <span>Copy</span> -->
                  </button>
                </div>
              </div>
              <button
                @click="handleDeleteRequest"
                class="px-3 py-2 bg-gray-500/10 text-gray-400 border border-gray-500/10 rounded-lg hover:bg-gray-500/15 hover:text-white text-sm transition-colors inline-flex items-center space-x-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <!-- <span>Delete</span> -->
              </button>
            </div>
          </div>

         

          <!-- Masked API Key -->
          <!-- <div class="mb-4">
            <label class="block text-sm font-medium text-gray-400 mb-2">OpenAI API Key</label>
            <code class="block px-4 py-2 bg-gray-500/10 border border-gray-500/10 rounded-lg font-mono text-sm">
              {{ project.openaiApiKey }}
            </code>
          </div> -->
        </div>

        <!-- Usage Summary -->
        <div class="bg-gray-500/10 border border-gray-500/10 p-6 rounded-lg shadow-md">
          <h3 class="text-lg font-semibold text-white mb-4">Today's Usage</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              v-if="project.limitType !== 'tokens'"
              label="Requests"
              :value="usage.requestsUsed || 0"
              :max="project.dailyRequestLimit"
            />

            <StatCard
              v-if="project.limitType !== 'requests'"
              label="Tokens"
              :value="usage.tokensUsed || 0"
              :max="project.dailyTokenLimit"
            />

            <div class="p-4 rounded-lg bg-gray-500/10 border border-gray-500/10">
              <div class="text-sm text-white mb-2">Status</div>
              <div class="flex items-center space-x-2">
                <span
                  :class="[
                    'w-2 h-2 rounded-full',
                    usage.withinLimits ? 'bg-green-300 animate-pulse' : 'bg-red-400 animate-pulse'
                  ]"
                ></span>
                <span class="text-lg font-bold" :class="usage.withinLimits ? 'text-green-300' : 'text-red-400'">
                  {{ usage.withinLimits ? 'Within Limits' : 'Limit Exceeded' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Edit Configuration -->
        <div class="bg-gray-500/10 border border-gray-500/10 p-6 rounded-lg shadow-md">
          <h3 class="text-lg font-semibold text-white mb-4">Configuration</h3>
          
          <!-- Tabs -->
          <div class="mb-6 border-b border-gray-500/10">
            <nav class="-mb-px flex space-x-8">
              <button
                @click="activeTab = 'basic'"
                :class="activeTab === 'basic' ? 'border-blue-300 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-400 hover:border-gray-300'"
                class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
              >
                Basic Limits
              </button>
              <button
                @click="activeTab = 'tiers'"
                :class="activeTab === 'tiers' ? 'border-blue-300 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-400 hover:border-gray-300'"
                class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
              >
                Plan Tiers
              </button>
              <button
                @click="activeTab = 'rules'"
                :class="activeTab === 'rules' ? 'border-blue-300 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-400 hover:border-gray-300'"
                class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
              >
                Visual Rules
              </button>
            </nav>
          </div>

          <!-- Basic Limits Tab -->
          <form v-show="activeTab === 'basic'" @submit.prevent="handleUpdate">
            <div class="mb-4">
              <label class="block text-sm font-medium text-white mb-2">Project Name</label>
              <input
                v-model="editForm.name"
                type="text"
                class="w-full px-4 py-2 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-blue-300/50 focus:border-transparent"
              />
            </div>

            <!-- Phase 1: Limit Type -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-white mb-2">Limit Type</label>
              <div class="relative">
                <select
                  v-model="editForm.limitType"
                  class="w-full px-4 py-2.5 text-white bg-gray-500/10 border border-gray-500/20 rounded-lg focus:ring-2 focus:ring-blue-300/50 focus:border-transparent appearance-none cursor-pointer pr-10 transition-all hover:bg-gray-500/20"
                >
                  <option value="both">Both Requests & Tokens</option>
                  <option value="requests">Requests Only (Image Gen)</option>
                  <option value="tokens">Tokens Only (Chat)</option>
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <p class="text-xs text-gray-400 mt-1">
                Choose how to track usage: requests for image generation, tokens for chat, or both
              </p>
            </div>

            <div v-if="editForm.limitType !== 'tokens'" class="mb-4">
              <label class="block text-sm font-medium text-white mb-2">Daily Request Limit</label>
              <input
                v-model.number="editForm.dailyRequestLimit"
                type="number"
                min="0"
                class="w-full px-4 py-2 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-blue-300/50 focus:border-transparent"
              />
              <p class="text-xs text-gray-500 mt-1">Leave empty for unlimited</p>
            </div>

            <div v-if="editForm.limitType !== 'requests'" class="mb-4">
              <label class="block text-sm font-medium text-white mb-2">Daily Token Limit</label>
              <input
                v-model.number="editForm.dailyTokenLimit"
                type="number"
                min="0"
                class="w-full px-4 py-2 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-blue-300/50 focus:border-transparent"
              />
              <p class="text-xs text-gray-500 mt-1">Leave empty for unlimited</p>
            </div>

            <div class="mb-6">
              <label class="block text-sm font-medium text-white mb-2">
                Limit Exceeded Message
              </label>
              <textarea
                v-model="editForm.limitMessage"
                rows="3"
                placeholder='{"error": "limit_exceeded", "message": "Upgrade to Pro!", "deepLink": "myapp://upgrade"}'
                class="w-full px-4 py-2 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-blue-300/50 focus:border-transparent"
              />
              <p class="text-xs text-gray-500 mt-1">
                Custom JSON response sent when limits are exceeded
              </p>
            </div>

            <div v-if="updateError" class="mb-4 p-3 bg-red-400/10 text-red-400 rounded-lg text-sm">
              {{ updateError }}
            </div>

            <div v-if="updateSuccess" class="mb-4 p-3 bg-green-300/10 text-green-300 rounded-lg text-sm">
              Configuration updated successfully!
            </div>

            <button
              type="submit"
              :disabled="updating"
              class="px-6 py-2 bg-blue-300 text-black text-sm font-medium rounded-lg hover:bg-blue-300/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ updating ? 'Saving...' : 'Save Changes' }}
            </button>
          </form>

          <!-- Tiers Tab (Phase 2) -->
          <div v-show="activeTab === 'tiers'" class="space-y-4">
            <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-4 mb-4">
              <p class="text-sm text-white">
                This allows you to define different limits for free, pro, enterprise, etc.
                Your app passes a <code class="bg-gray-500/10 text-white px-1 rounded">tier</code> parameter in API calls.
              </p>
            </div>

            <div v-for="(tier, tierName) in editForm.tiers" :key="tierName" class="border border-gray-500/10 rounded-lg p-4">
              <div class="flex justify-between items-center mb-3">
                <h4 class="font-semibold text-white capitalize">{{ tierName }} Tier</h4>
                <button
                  @click="deleteTier(tierName)"
                  class="text-red-400 hover:text-red-400/80 text-sm"
                >
                  Remove
                </button>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-white mb-1">Request Limit</label>
                  <input
                    v-model.number="tier.requestLimit"
                    type="number"
                    min="0"
                    class="w-full px-3 py-2 text-sm bg-gray-500/10 border border-gray-500/10 rounded-lg"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-white mb-1">Token Limit</label>
                  <input
                    v-model.number="tier.tokenLimit"
                    type="number"
                    min="0"
                    class="w-full px-3 py-2 text-sm bg-gray-500/10 border border-gray-500/10 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div class="flex items-center space-x-2">
              <input
                v-model="newTierName"
                type="text"
                placeholder="e.g., free, pro, enterprise"
                class="flex-1 px-4 py-2 bg-gray-500/10 border border-gray-500/10 rounded-lg text-sm"
              />
              <button
                @click="addTier"
                class="px-4 py-2 bg-gray-500/10 border border-gray-500/10 text-white text-sm font-medium rounded-lg hover:bg-gray-500/15 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Add Tier
              </button>
            </div>

            <button
              @click="handleUpdate"
              :disabled="updating"
              class="mt-4 px-6 py-2 bg-blue-300 text-black text-sm font-medium rounded-lg hover:bg-blue-300/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ updating ? 'Saving...' : 'Save Tiers' }}
            </button>
          </div>

          <!-- Rules Tab (Phase 3) -->
          <div v-show="activeTab === 'rules'">
            <RuleBuilder v-model="editForm.rules" />
            <button
              @click="handleUpdate"
              :disabled="updating"
              class="mt-4 px-6 py-2 bg-blue-300 text-black text-sm font-medium rounded-lg hover:bg-blue-300/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ updating ? 'Saving...' : 'Save Rules' }}
            </button>
          </div>
        </div>

        <!-- Usage by Identity -->
        <div class="bg-gray-500/10 border border-gray-500/10 p-6 rounded-lg shadow-md">
          <h3 class="text-lg font-semibold text-white mb-4">Usage by Identity (Today)</h3>
          <div v-if="identities.length === 0" class="text-center py-12">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-500/10 mb-4">
              <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p class="text-gray-400 text-sm mb-1">No usage data yet</p>
            <p class="text-gray-500 text-xs">Make your first API request to see usage by identity</p>
          </div>
          <div v-else class="overflow-x-auto">
            <table class="min-w-full">
              <thead class="bg-gray-500/10 border border-gray-500/10">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Identity
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Requests
                  </th>
                  <th class="px-6 py-3 text-left text-gray-400 uppercase tracking-wider">
                    Tokens
                  </th>
                </tr>
              </thead> 
              <tbody class="bg-gray-500/10 border border-gray-500/10">
                <tr v-for="identity in identities" :key="identity.identity">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-white">
                    {{ identity.identity }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {{ identity.requestsUsed }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {{ identity.tokensUsed }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
      v-if="project"
      :is-open="showDeleteConfirm"
      title="Delete Project"
      :message="`Are you sure you want to delete '${project.name}'? This action cannot be undone and all associated data will be permanently removed.`"
      confirm-text="Delete Project"
      cancel-text="Cancel"
      variant="danger"
      @confirm="confirmDelete"
      @cancel="showDeleteConfirm = false"
    />
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const api = useApi()

const projectId = route.params.id as string

const project = ref<any>(null)
const usage = ref<any>({})
const identities = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const showDeleteConfirm = ref(false)

// Dynamic page title based on project name
const pageTitle = computed(() => {
  if (project.value?.name) {
    return `${project.value.name} - Projects - AI Rate Limiting`
  }
  return 'Project Details - AI Rate Limiting'
})

useHead({
  title: pageTitle
})

const activeTab = ref('basic')
const newTierName = ref('')
const showProjectKey = ref(false)

const maskedProjectKey = computed(() => {
  if (!project.value?.projectKey) return 'pk_xxxxxxxxxxxxxxx'
  // Show first 3 chars (pk_) and mask the rest
  return 'pk_' + 'x'.repeat(project.value.projectKey.length - 3)
})

const toggleProjectKeyVisibility = () => {
  showProjectKey.value = !showProjectKey.value
}

const editForm = ref({
  name: '',
  limitType: 'both' as 'requests' | 'tokens' | 'both',
  dailyRequestLimit: null as number | null,
  dailyTokenLimit: null as number | null,
  limitMessage: '',
  tiers: {} as Record<string, { requestLimit?: number; tokenLimit?: number }>,
  rules: [] as any[],
})

const updating = ref(false)
const updateError = ref('')
const updateSuccess = ref(false)

const loadProject = async () => {
  try {
    project.value = await api(`/projects/${projectId}`)
    
    // Load usage data
    const [usageData, identitiesData] = await Promise.all([
      api(`/projects/${projectId}/usage/summary`),
      api(`/projects/${projectId}/usage/by-identity`),
    ])
    
    usage.value = usageData
    identities.value = identitiesData

    // Populate edit form
    editForm.value.name = project.value.name
    editForm.value.limitType = project.value.limitType || 'both'
    editForm.value.dailyRequestLimit = project.value.dailyRequestLimit
    editForm.value.dailyTokenLimit = project.value.dailyTokenLimit
    editForm.value.tiers = project.value.tiers || {}
    editForm.value.rules = project.value.rules || []
    
    // Extract limit message from JSON
    if (project.value.limitExceededResponse) {
      try {
        const parsed = typeof project.value.limitExceededResponse === 'string'
          ? JSON.parse(project.value.limitExceededResponse)
          : project.value.limitExceededResponse
        editForm.value.limitMessage = JSON.stringify(parsed, null, 2)
      } catch {
        editForm.value.limitMessage = ''
      }
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load project'
  } finally {
    loading.value = false
  }
}

const { copy } = useClipboard()
const { success: showSuccess } = useToast()

const copyProjectKey = () => {
  copy(project.value.projectKey, 'Project key copied!')
}

const addTier = () => {
  if (newTierName.value && !editForm.value.tiers[newTierName.value]) {
    editForm.value.tiers[newTierName.value] = {
      requestLimit: 0,
      tokenLimit: 0,
    }
    newTierName.value = ''
  }
}

const deleteTier = (tierName: string) => {
  if (confirm(`Delete tier "${tierName}"?`)) {
    delete editForm.value.tiers[tierName]
  }
}

const handleUpdate = async () => {
  updating.value = true
  updateError.value = ''
  updateSuccess.value = false

  try {
    const payload: any = {
      name: editForm.value.name,
      limitType: editForm.value.limitType,
    }

    // Basic limits
    if (editForm.value.dailyRequestLimit !== null) {
      payload.dailyRequestLimit = editForm.value.dailyRequestLimit
    }
    if (editForm.value.dailyTokenLimit !== null) {
      payload.dailyTokenLimit = editForm.value.dailyTokenLimit
    }
    
    // Parse limit message as JSON
    if (editForm.value.limitMessage) {
      try {
        payload.limitExceededResponse = JSON.parse(editForm.value.limitMessage)
      } catch {
        payload.limitExceededResponse = {
          error: 'limit_exceeded',
          message: editForm.value.limitMessage,
        }
      }
    }

    // Tiers
    payload.tiers = editForm.value.tiers

    // Rules
    payload.rules = editForm.value.rules

    await api(`/projects/${projectId}`, {
      method: 'PATCH',
      body: payload,
    })

    updateSuccess.value = true
    await loadProject()

    setTimeout(() => {
      updateSuccess.value = false
    }, 3000)
  } catch (err: any) {
    updateError.value = err.message || 'Failed to update project'
  } finally {
    updating.value = false
  }
}

const breadcrumbs = computed(() => [
  { label: 'Projects', to: '/projects' },
  { label: project.value?.name || 'Loading...' }
])

const handleDeleteRequest = () => {
  showDeleteConfirm.value = true
}

const confirmDelete = async () => {
  showDeleteConfirm.value = false
  const { success, error: showError } = useToast()
  
  try {
    await api(`/projects/${projectId}`, {
      method: 'DELETE',
    })
    success('Project deleted successfully')
    navigateTo('/projects')
  } catch (err: any) {
    showError(err.message || 'Failed to delete project')
  }
}

onMounted(() => {
  loadProject()
})

// Reload project when route changes (including when navigating to this page)
watch(() => route.params.id, (newId) => {
  if (newId) {
    loadProject()
  }
}, { immediate: false })
</script>

