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
              <h2 class="text-xl font-bold text-white">{{ project.name }}</h2>
              <div class="flex items-center space-x-1 mt-2">
                <span :class="['inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', statusBadge.class]">
                  <span :class="['w-1.5 h-1.5 rounded-full mr-1.5', statusBadge.dotClass]"></span>
                  {{ statusBadge.text }}
                </span>
                <template v-if="project.provider">
                  <span class="text-xs text-gray-500">•</span>
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
                    {{ providerLabel }}
                  </span>
                </template>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <!-- Project Key (if configured) -->
              <div v-if="project.projectKey" class="">
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
                  </button>
                </div>
              </div>
              
              <!-- Not configured message -->
              <div v-else class="flex items-center bg-amber-300/10 border border-amber-300/20 rounded-lg px-4 py-2">
                <svg class="w-4 h-4 text-amber-300 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span class="text-sm text-amber-200">API key will be generated after configuration -></span>
              </div>
              <!-- Settings Dropdown -->
              <div class="relative" ref="settingsDropdownRef">
                <button
                  @click="toggleSettingsDropdown"
                  class="px-3 py-2 bg-gray-500/10 text-gray-400 border border-gray-500/10 rounded-lg hover:bg-gray-500/15 hover:text-white text-sm transition-colors inline-flex items-center space-x-2"
                  title="Project Settings"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                
                <!-- Dropdown Menu -->
                <Transition
                  enter-active-class="transition ease-out duration-100"
                  enter-from-class="transform opacity-0 scale-95"
                  enter-to-class="transform opacity-100 scale-100"
                  leave-active-class="transition ease-in duration-75"
                  leave-from-class="transform opacity-100 scale-100"
                  leave-to-class="transform opacity-0 scale-95"
                >
                  <div
                    v-if="showSettingsDropdown"
                    class="absolute right-0 mt-2 w-40 rounded-lg shadow-lg bg-black border border-gray-500/20 ring-1 ring-black ring-opacity-5 z-50"
                  >
                    <div class="py-1">
                      <button
                        @click="openConfigurations"
                        class="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-500/10 hover:text-white transition-colors flex items-center space-x-2"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                        <span>Configurations</span>
                      </button>
                      <button
                        @click="openDelete"
                        class="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-400/10 hover:text-red-300 transition-colors flex items-center space-x-2"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </Transition>
              </div>
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
        <div class="space-y-4">
          <h3 class="text-xs font-medium text-gray-400 uppercase tracking-wider">Today's Usage</h3>
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

        <!-- Usage by Identity -->
        <div class="space-y-4">
          <h3 class="text-xs font-medium text-gray-400 uppercase tracking-wider">Usage by Identity (Today)</h3>
          <div class="bg-gray-500/10 border border-gray-500/10 p-6 rounded-lg">
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
    </div>

    <!-- Settings Modal -->
    <ProjectSettingsModal
      v-if="project"
      :is-open="showSettingsModal"
      :project="project"
      :edit-form="editForm"
      :updating="updating"
      :update-error="updateError"
      :update-success="updateSuccess"
      @close="showSettingsModal = false"
      @update="handleUpdate"
    />

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
const showSettingsModal = ref(false)
const showSettingsDropdown = ref(false)
const settingsDropdownRef = ref(null)

// Dynamic page title based on project name
const pageTitle = computed(() => {
  if (project.value?.name) {
    return `${project.value.name} - Projects - AI Ratelimit`
  }
  return 'Project Details - AI Ratelimit'
})

useHead({
  title: pageTitle
})

const showProjectKey = ref(false)

// Close dropdown when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  if (settingsDropdownRef.value && !(settingsDropdownRef.value as HTMLElement).contains(event.target as Node)) {
    showSettingsDropdown.value = false
  }
}

const maskedProjectKey = computed(() => {
  if (!project.value?.projectKey) return 'pk_xxxxxxxxxxxxxxx'
  // Show first 3 chars (pk_) and mask the rest
  return 'pk_' + 'x'.repeat(project.value.projectKey.length - 3)
})

const providerLabel = computed(() => {
  if (!project.value?.provider) return 'Not configured'
  const labels = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google',
    xai: 'xAI',
    other: 'OpenAI-compatible'
  }
  return labels[project.value.provider as keyof typeof labels] || project.value.provider
})

// Calculate status badge (same logic as ProjectCard)
const statusBadge = computed(() => {
  if (!project.value) {
    return {
      text: 'Loading',
      class: 'bg-gray-500/10 text-gray-400',
      dotClass: 'bg-gray-400'
    }
  }

  const hasLimits = project.value.dailyRequestLimit || project.value.dailyTokenLimit
  if (!hasLimits) {
    return {
      text: 'No Limits',
      class: 'bg-blue-300/10 text-blue-300',
      dotClass: 'bg-blue-300'
    }
  }

  const requestExceeded = project.value.dailyRequestLimit && 
    (usage.value?.requestsUsed || 0) >= project.value.dailyRequestLimit
  const tokenExceeded = project.value.dailyTokenLimit && 
    (usage.value?.tokensUsed || 0) >= project.value.dailyTokenLimit

  if (requestExceeded || tokenExceeded) {
    return {
      text: 'Exceeded',
      class: 'bg-red-400/10 text-red-400',
      dotClass: 'bg-red-400 animate-pulse'
    }
  }

  const requestWarning = project.value.dailyRequestLimit && 
    (usage.value?.requestsUsed || 0) / project.value.dailyRequestLimit > 0.7
  const tokenWarning = project.value.dailyTokenLimit && 
    (usage.value?.tokensUsed || 0) / project.value.dailyTokenLimit > 0.7

  if (requestWarning || tokenWarning) {
    return {
      text: 'Near Limit',
      class: 'bg-yellow-300/10 text-yellow-300',
      dotClass: 'bg-yellow-300'
    }
  }

  return {
    text: 'Within Limits',
    class: 'bg-green-300/10 text-green-300',
    dotClass: 'bg-green-300'
  }
})

const toggleProjectKeyVisibility = () => {
  showProjectKey.value = !showProjectKey.value
}

const editForm = ref({
  name: '',
  provider: null as 'openai' | 'anthropic' | 'google' | 'xai' | 'other' | null,
  baseUrl: '',
  openaiApiKey: '',
  limitPeriod: 'daily' as 'daily' | 'weekly' | 'monthly',
  limitType: 'both' as 'requests' | 'tokens' | 'both',
  dailyRequestLimit: null as number | null,
  dailyTokenLimit: null as number | null,
  limitMessage: '',
  modelLimits: {} as Record<string, { requestLimit?: number; tokenLimit?: number }>,
  tiers: {} as Record<string, { 
    requestLimit?: number; 
    tokenLimit?: number; 
    customMessage?: string;
    modelLimits?: Record<string, { requestLimit?: number; tokenLimit?: number }>;
  }>,
  rules: [] as any[],
  securityEnabled: false,
  securityMode: 'block' as 'block' | 'log',
  securityCategories: ['systemPromptExtraction', 'roleManipulation', 'instructionOverride', 'boundaryBreaking', 'obfuscation', 'directLeakage'] as string[],
  securityHeuristicsEnabled: false,
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
    editForm.value.provider = project.value.provider || null
    editForm.value.baseUrl = project.value.baseUrl || ''
    editForm.value.openaiApiKey = '' // Don't load existing key for security
    editForm.value.limitPeriod = project.value.limitPeriod || 'daily'
    editForm.value.limitType = project.value.limitType || 'both'
    editForm.value.dailyRequestLimit = project.value.dailyRequestLimit
    editForm.value.dailyTokenLimit = project.value.dailyTokenLimit
    
    // Load tiers and extract customMessage from customResponse
    editForm.value.tiers = {}
    if (project.value.tiers) {
      for (const [tierName, tier] of Object.entries(project.value.tiers)) {
        editForm.value.tiers[tierName] = {
          requestLimit: (tier as any).requestLimit,
          tokenLimit: (tier as any).tokenLimit,
          modelLimits: (tier as any).modelLimits || {},
          customMessage: (tier as any).customResponse ? 
            (typeof (tier as any).customResponse === 'string' ? (tier as any).customResponse : (tier as any).customResponse.message || '') : 
            '',
        }
      }
    }
    
    // Load model limits
    editForm.value.modelLimits = project.value.modelLimits || {}
    
    editForm.value.rules = project.value.rules || []
    
    // Load security settings
    editForm.value.securityEnabled = project.value.securityEnabled || false
    editForm.value.securityMode = project.value.securityMode || 'block'
    editForm.value.securityCategories = project.value.securityCategories || ['systemPromptExtraction', 'roleManipulation', 'instructionOverride', 'boundaryBreaking', 'obfuscation', 'directLeakage']
    editForm.value.securityHeuristicsEnabled = project.value.securityHeuristicsEnabled || false
    
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

const toggleSettingsDropdown = () => {
  showSettingsDropdown.value = !showSettingsDropdown.value
}

const openConfigurations = () => {
  showSettingsDropdown.value = false
  showSettingsModal.value = true
}

const openDelete = () => {
  showSettingsDropdown.value = false
  handleDeleteRequest()
}

const handleUpdate = async () => {
  updating.value = true
  updateError.value = ''
  updateSuccess.value = false

  try {
    const payload: any = {
      name: editForm.value.name,
      limitPeriod: editForm.value.limitPeriod,
      limitType: editForm.value.limitType,
    }

    // Provider settings (only if API key not already set)
    if (!project.value.openaiApiKey) {
      payload.provider = editForm.value.provider
      if (editForm.value.baseUrl) {
        payload.baseUrl = editForm.value.baseUrl
      }
    }

    // API key (only if changed)
    if (editForm.value.openaiApiKey) {
      payload.openaiApiKey = editForm.value.openaiApiKey
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

    // Model limits
    payload.modelLimits = editForm.value.modelLimits

    // Tiers - transform customMessage into customResponse
    payload.tiers = {}
    for (const [tierName, tier] of Object.entries(editForm.value.tiers)) {
      payload.tiers[tierName] = {
        requestLimit: (tier as any).requestLimit,
        tokenLimit: (tier as any).tokenLimit,
        modelLimits: (tier as any).modelLimits || {},
      }
      
      // If customMessage is provided, convert to customResponse
      if ((tier as any).customMessage) {
        try {
          // Try to parse as JSON first
          payload.tiers[tierName].customResponse = JSON.parse((tier as any).customMessage)
        } catch {
          // If not JSON, treat as plain message with optional markdown
          payload.tiers[tierName].customResponse = {
            error: 'limit_exceeded',
            message: (tier as any).customMessage,
          }
        }
      }
    }

    // Rules
    payload.rules = editForm.value.rules

    // Security settings
    payload.securityEnabled = editForm.value.securityEnabled
    payload.securityMode = editForm.value.securityMode
    payload.securityCategories = editForm.value.securityCategories
    payload.securityHeuristicsEnabled = editForm.value.securityHeuristicsEnabled

    await api(`/projects/${projectId}`, {
      method: 'PATCH',
      body: payload,
    })

    updateSuccess.value = true
    await loadProject()

    setTimeout(() => {
      updateSuccess.value = false
      showSettingsModal.value = false
    }, 1500)
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
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Reload project when route changes (including when navigating to this page)
watch(() => route.params.id, (newId) => {
  if (newId) {
    loadProject()
  }
}, { immediate: false })
</script>

