<template>
  <div>
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
              
              <!-- Fallback if no project key (legacy) -->
              <div v-else class="flex items-center bg-gray-500/10 border border-gray-500/20 rounded-lg px-4 py-2">
                <span class="text-sm text-gray-400">Project key unavailable</span>
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
                    class="absolute right-0 mt-2 w-50 rounded-lg shadow-lg bg-black border border-gray-500/20 ring-1 ring-black ring-opacity-5 z-50"
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
                        @click.stop="openFlowDesigner"
                        class="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-500/10 hover:text-white transition-colors flex items-center space-x-2"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <rect x="3" y="3" width="7" height="7" rx="1" stroke-width="2"/>
                          <rect x="14" y="3" width="7" height="7" rx="1" stroke-width="2"/>
                          <rect x="8" y="14" width="8" height="7" rx="1" stroke-width="2"/>
                          <line x1="6.5" y1="10" x2="6.5" y2="14" stroke-width="2"/>
                          <line x1="17.5" y1="10" x2="17.5" y2="14" stroke-width="2"/>
                        </svg>
                        <span>Flow Designer <span class="text-[10px] text-gray-300 p-1 px-2 rounded-full bg-gray-500/30">Beta</span></span>
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

        <!-- Tab Navigation -->
        <div class="flex items-center gap-1 border-b border-gray-500/10">
          <button
            @click="activeTab = 'usage'"
            :class="[
              'px-4 py-2 text-sm font-medium transition-colors relative',
              activeTab === 'usage' 
                ? 'text-white' 
                : 'text-gray-500 hover:text-gray-300'
            ]"
          >
            Usage
            <span 
              v-if="activeTab === 'usage'"
              class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-300"
            ></span>
          </button>
          <button
            @click="activeTab = 'costs'"
            :class="[
              'px-4 py-2 text-sm font-medium transition-colors relative',
              activeTab === 'costs' 
                ? 'text-white' 
                : 'text-gray-500 hover:text-gray-300'
            ]"
          >
            Cost Analytics
            <span 
              v-if="activeTab === 'costs'"
              class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-300"
            ></span>
          </button>
        </div>

        <!-- Cost Analytics Tab -->
        <div v-if="activeTab === 'costs'" class="pt-2">
          <CostDashboard :project-id="projectId" />
        </div>

        <!-- Usage Tab Content -->
        <div v-if="activeTab === 'usage'" class="space-y-6">
        <!-- Plan Usage (Cloud mode only) -->
        <div v-if="features.showBilling && planUsage.requests" class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-2">
                <span class="text-xs text-gray-400 uppercase tracking-wider">Plan Usage</span>
                <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-500/10 text-gray-400">
                  {{ currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1) }}
                </span>
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm text-white font-medium">
                {{ formatNumber(planUsage.requests.current) }} / {{ planUsage.requests.limit === Infinity ? '∞' : formatNumber(planUsage.requests.limit) }}
              </div>
              <div class="text-xs text-gray-500">requests this month</div>
            </div>
          </div>
          <div v-if="planUsage.requests.limit !== Infinity" class="mt-3">
            <div class="w-full bg-gray-500/10 rounded-full h-1.5 overflow-hidden">
              <div
                :class="[
                  'h-full transition-all duration-500 ease-out rounded-full',
                  planUsage.requests.current / planUsage.requests.limit >= 0.9 ? 'bg-red-400' :
                  planUsage.requests.current / planUsage.requests.limit >= 0.7 ? 'bg-yellow-300' : 'bg-green-300'
                ]"
                :style="{ width: `${Math.min((planUsage.requests.current / planUsage.requests.limit) * 100, 100)}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Usage Summary -->
        <div class="space-y-4">
          <h3 class="text-xs font-medium text-gray-400 uppercase tracking-wider">Today's Usage</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard
              v-if="project.limitType !== 'tokens'"
              label="Requests"
              :value="usage.requestsUsed || 0"
              :max="project.dailyRequestLimit"
              :history="requestHistory"
            />

            <StatCard
              v-if="project.limitType !== 'requests'"
              label="Tokens"
              :value="usage.tokensUsed || 0"
              :max="project.dailyTokenLimit"
              :history="tokenHistory"
            />
          </div>
        </div>
        
        <!-- Usage Chart -->
        <div v-if="usageHistory.length > 1" class="space-y-4">
          <UsageChart
            title="Request History"
            :data="usageHistory"
          />
        </div>

        <!-- Usage by Identity -->
        <div class="space-y-4">
          <h3 class="text-xs font-medium text-gray-400 uppercase tracking-wider">Usage by Identity (Today)</h3>
          <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg">
            <!-- Guided Empty State -->
            <div v-if="identities.length === 0" class="space-y-6 py-6">
              <div class="text-center">
                <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-300/10 mb-3">
                  <svg class="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 class="text-white font-medium mb-1">Make your first request</h4>
                <p class="text-gray-400 text-sm">Try this curl command to test your setup:</p>
              </div>

              <!-- Mode Toggle -->
              <div class="flex justify-center">
                <div class="inline-flex gap-1 bg-gray-500/10 p-1 rounded-lg">
                  <button
                    @click="curlMode = 'stored'"
                    :class="[
                      'px-3 py-1.5 text-xs font-medium rounded transition-colors',
                      curlMode === 'stored' ? 'bg-blue-300/10 text-blue-300' : 'text-gray-400 hover:text-white'
                    ]"
                  >
                    Stored Keys
                  </button>
                  <button
                    @click="curlMode = 'passthrough'"
                    :class="[
                      'px-3 py-1.5 text-xs font-medium rounded transition-colors',
                      curlMode === 'passthrough' ? 'bg-blue-300/10 text-blue-300' : 'text-gray-400 hover:text-white'
                    ]"
                  >
                    Pass-through
                  </button>
                </div>
              </div>

              <!-- Curl Command - Stored Keys Mode -->
              <div v-if="curlMode === 'stored'" class="relative max-w-lg mx-auto">
                <pre class="bg-black border border-gray-500/20 rounded-lg p-4 overflow-x-auto text-xs"><code class="text-gray-300"><span class="text-gray-500"># No API key needed in request!</span>
curl https://api.airatelimit.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-project-key: <span class="text-blue-300">{{ project.projectKey }}</span>" \
  -H "x-identity: test-user" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'</code></pre>
                <button
                  @click="copyCurlCommand"
                  class="absolute top-2 right-2 px-2 py-1 bg-gray-500/15 hover:bg-gray-500/20 text-xs text-white rounded transition-colors"
                >
                  {{ curlCopied ? '✓ Copied' : 'Copy' }}
                </button>
              </div>

              <!-- Curl Command - Pass-through Mode -->
              <div v-else class="relative max-w-lg mx-auto">
                <pre class="bg-black border border-gray-500/20 rounded-lg p-4 overflow-x-auto text-xs"><code class="text-gray-300">curl https://api.airatelimit.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-your-openai-key" \
  -H "x-project-key: <span class="text-blue-300">{{ project.projectKey }}</span>" \
  -H "x-identity: test-user" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'</code></pre>
                <button
                  @click="copyCurlCommand"
                  class="absolute top-2 right-2 px-2 py-1 bg-gray-500/15 hover:bg-gray-500/20 text-xs text-white rounded transition-colors"
                >
                  {{ curlCopied ? '✓ Copied' : 'Copy' }}
                </button>
              </div>

              <p v-if="curlMode === 'stored'" class="text-center text-gray-500 text-xs">
                First, add your API key in <span class="text-blue-300">Settings → Provider Keys</span>
              </p>
              <p v-else class="text-center text-gray-500 text-xs">
                Replace <code class="bg-gray-500/20 px-1 py-0.5 rounded text-white">sk-your-openai-key</code> with your actual API key
              </p>
            </div>
            <div v-else class="overflow-x-auto">
              <table class="min-w-full">
                <thead class="border-b border-gray-500/10">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Identity
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Requests
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Tokens
                    </th>
                  </tr>
                </thead> 
                <tbody class="divide-y divide-gray-500/10">
                  <tr v-for="identity in paginatedIdentities" :key="identity.identity">
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
              
              <!-- Pagination Controls -->
              <div v-if="identities.length > identitiesPerPage" class="flex items-center justify-between px-6 py-3 border-t border-gray-500/10">
                <p class="text-sm text-gray-400">
                  Showing {{ (identitiesPage - 1) * identitiesPerPage + 1 }}-{{ Math.min(identitiesPage * identitiesPerPage, identities.length) }} of {{ identities.length }}
                </p>
                <div class="flex gap-2">
                  <button
                    @click="identitiesPage--"
                    :disabled="identitiesPage === 1"
                    class="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    :class="identitiesPage === 1 ? 'text-gray-500' : 'text-white bg-gray-500/10 hover:bg-gray-500/20'"
                  >
                    Previous
                  </button>
                  <button
                    @click="identitiesPage++"
                    :disabled="identitiesPage >= totalIdentitiesPages"
                    class="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    :class="identitiesPage >= totalIdentitiesPages ? 'text-gray-500' : 'text-white bg-gray-500/10 hover:bg-gray-500/20'"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div><!-- End Usage Tab Content -->
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
      @update-provider-keys="handleProviderKeysUpdate"
      @routing-saved="loadProject"
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
    
    <!-- Quick Actions FAB -->
    <!-- <QuickActions
      v-if="project"
      :actions="quickActions"
      @action="handleQuickAction"
    /> -->
    </div>
    
    <!-- Confetti celebration -->
    <Confetti ref="confettiRef" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'trial']
})

const route = useRoute()
const api = useApi()
const { features } = useFeatures()
const { usage: planUsage, limits: planLimits, plan: currentPlan, loadPlan } = usePlan()

const projectId = route.params.id as string

const project = ref<any>(null)
const usage = ref<any>({})
const usageHistory = ref<Array<{ label: string; value: number }>>([])
const identities = ref<any[]>([])
const identitiesPage = ref(1)
const identitiesPerPage = 20
const loading = ref(true)
const error = ref('')
const showDeleteConfirm = ref(false)
const showSettingsModal = ref(false)
const showSettingsDropdown = ref(false)
const activeTab = ref<'usage' | 'costs'>('usage')
const settingsDropdownRef = ref(null)
const confettiRef = ref<any>(null)
const previousRequestCount = ref<number | null>(null)

// Dynamic page title based on project name
const pageTitle = computed(() => {
  if (project.value?.name) {
    return `${project.value.name} - AI Ratelimit`
  }
  return 'Project Details - AI Ratelimit'
})

// Pagination for identities table
const paginatedIdentities = computed(() => {
  const start = (identitiesPage.value - 1) * identitiesPerPage
  const end = start + identitiesPerPage
  return identities.value.slice(start, end)
})

const totalIdentitiesPages = computed(() => {
  return Math.ceil(identities.value.length / identitiesPerPage)
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

// Check if project has any limits configured
const hasLimits = computed(() => {
  return project.value?.dailyRequestLimit || project.value?.dailyTokenLimit
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

  if (!hasLimits.value) {
    return {
      text: 'No Project Limits',
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
  limitPeriod: 'daily' as 'hourly' | 'daily' | 'weekly' | 'monthly',
  limitType: 'both' as 'requests' | 'tokens' | 'both',
  dailyRequestLimit: null as number | null,
  dailyTokenLimit: null as number | null,
  limitMessage: '',
  upgradeUrl: '', // Auto-injected into limit responses
  tiers: {} as Record<string, { 
    requestLimit?: number; 
    tokenLimit?: number; 
    customMessage?: string;
    modelLimits?: Record<string, { requestLimit?: number; tokenLimit?: number }>;
  }>,
  securityEnabled: false,
  securityMode: 'block' as 'block' | 'log',
  securityCategories: ['systemPromptExtraction', 'roleManipulation', 'instructionOverride', 'boundaryBreaking', 'obfuscation', 'directLeakage'] as string[],
  securityHeuristicsEnabled: false,
  // Privacy settings
  anonymizationEnabled: false,
  anonymizationConfig: {
    detectEmail: true,
    detectPhone: true,
    detectSSN: true,
    detectCreditCard: true,
    detectIpAddress: true,
    maskingStyle: 'placeholder' as 'redact' | 'hash' | 'placeholder',
  },
  // Session limits
  sessionLimitsEnabled: false,
  sessionRequestLimit: null as number | null,
  sessionTokenLimit: null as number | null,
  // Provider keys for stored key mode
  providerKeys: null as Record<string, { apiKey: string; baseUrl?: string }> | null,
  // Public endpoints configuration
  publicModeEnabled: false,
  allowedOrigins: [] as string[],
})

const updating = ref(false)
const updateError = ref('')
const updateSuccess = ref(false)

const loadProject = async () => {
  try {
    project.value = await api(`/projects/${projectId}`)
    
    // Load usage data
    const [usageData, identitiesData, historyData] = await Promise.all([
      api(`/projects/${projectId}/usage/summary`),
      api(`/projects/${projectId}/usage/by-identity`),
      api(`/projects/${projectId}/usage/history?days=30`).catch(() => []),
    ])
    
    // Check for first request celebration
    const oldCount = previousRequestCount.value
    const newCount = usageData.requestsUsed || 0
    if (oldCount === 0 && newCount > 0 && confettiRef.value) {
      confettiRef.value.fire()
    }
    previousRequestCount.value = newCount
    
    usage.value = usageData
    identities.value = identitiesData
    usageHistory.value = historyData

    // Populate edit form
    editForm.value.name = project.value.name
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
    
    // Load security settings
    editForm.value.securityEnabled = project.value.securityEnabled || false
    editForm.value.securityMode = project.value.securityMode || 'block'
    editForm.value.securityCategories = project.value.securityCategories || ['systemPromptExtraction', 'roleManipulation', 'instructionOverride', 'boundaryBreaking', 'obfuscation', 'directLeakage']
    editForm.value.securityHeuristicsEnabled = project.value.securityHeuristicsEnabled || false
    
    // Load privacy settings
    editForm.value.anonymizationEnabled = project.value.anonymizationEnabled || false
    editForm.value.anonymizationConfig = project.value.anonymizationConfig || {
      detectEmail: true,
      detectPhone: true,
      detectSSN: true,
      detectCreditCard: true,
      detectIpAddress: true,
      maskingStyle: 'placeholder',
    }
    
    // Load session limits
    editForm.value.sessionLimitsEnabled = project.value.sessionLimitsEnabled || false
    editForm.value.sessionRequestLimit = project.value.sessionRequestLimit || null
    editForm.value.sessionTokenLimit = project.value.sessionTokenLimit || null
    
    // Load provider keys
    editForm.value.providerKeys = project.value.providerKeys || null
    
    // Load upgrade URL
    editForm.value.upgradeUrl = project.value.upgradeUrl || ''
    
    // Load public endpoints configuration
    editForm.value.publicModeEnabled = project.value.publicModeEnabled || false
    editForm.value.allowedOrigins = project.value.allowedOrigins || []
    
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

const curlCopied = ref(false)
const curlMode = ref<'stored' | 'passthrough'>('stored')

// Format large numbers for display
const formatNumber = (num: number | null | undefined) => {
  if (num == null) return '0'
  if (num === Infinity) return '∞'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toLocaleString()
}

const copyCurlCommand = () => {
  const command = curlMode.value === 'stored'
    ? `curl https://api.airatelimit.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "x-project-key: ${project.value.projectKey}" \\
  -H "x-identity: test-user" \\
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`
    : `curl https://api.airatelimit.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk-your-openai-key" \\
  -H "x-project-key: ${project.value.projectKey}" \\
  -H "x-identity: test-user" \\
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`
  copy(command, 'Command copied!')
  curlCopied.value = true
  setTimeout(() => { curlCopied.value = false }, 2000)
}

const toggleSettingsDropdown = () => {
  showSettingsDropdown.value = !showSettingsDropdown.value
}

const openConfigurations = () => {
  showSettingsDropdown.value = false
  showSettingsModal.value = true
}

const openFlowDesigner = async () => {
  showSettingsDropdown.value = false
  await navigateTo(`/projects/${projectId}/flow`)
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

    // Helper to convert empty/NaN to null for unlimited
    const cleanLimit = (val: any) => (val === '' || val === null || Number.isNaN(val)) ? null : Number(val)
    
    // Basic limits - always send, convert empty/NaN to null for unlimited
    payload.dailyRequestLimit = cleanLimit(editForm.value.dailyRequestLimit)
    payload.dailyTokenLimit = cleanLimit(editForm.value.dailyTokenLimit)
    
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

    // Tiers - transform customMessage into customResponse
    payload.tiers = {}
    for (const [tierName, tier] of Object.entries(editForm.value.tiers)) {
      payload.tiers[tierName] = {
        requestLimit: cleanLimit((tier as any).requestLimit),
        tokenLimit: cleanLimit((tier as any).tokenLimit),
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

    // Security settings
    payload.securityEnabled = editForm.value.securityEnabled
    payload.securityMode = editForm.value.securityMode
    payload.securityCategories = editForm.value.securityCategories
    payload.securityHeuristicsEnabled = editForm.value.securityHeuristicsEnabled

    // Privacy settings
    payload.anonymizationEnabled = editForm.value.anonymizationEnabled
    payload.anonymizationConfig = editForm.value.anonymizationConfig

    // Session limits
    payload.sessionLimitsEnabled = editForm.value.sessionLimitsEnabled
    payload.sessionRequestLimit = cleanLimit(editForm.value.sessionRequestLimit)
    payload.sessionTokenLimit = cleanLimit(editForm.value.sessionTokenLimit)

    // Upgrade URL for deep links
    payload.upgradeUrl = editForm.value.upgradeUrl || null

    // Provider Keys (for stored keys mode)
    if (editForm.value.providerKeys) {
      payload.providerKeys = editForm.value.providerKeys
    }

    // Public endpoints configuration
    payload.publicModeEnabled = editForm.value.publicModeEnabled
    payload.allowedOrigins = editForm.value.allowedOrigins?.filter((o: string) => o.trim()) || []

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

// Separate handler for provider keys - doesn't close modal
const handleProviderKeysUpdate = async () => {
  updating.value = true
  updateError.value = ''

  try {
    await api(`/projects/${projectId}`, {
      method: 'PATCH',
      body: {
        providerKeys: editForm.value.providerKeys
      },
    })

    await loadProject()
    // Don't close modal - user may want to configure more providers
  } catch (err: any) {
    updateError.value = err.message || 'Failed to save provider keys'
  } finally {
    updating.value = false
  }
}

const breadcrumbs = computed(() => [
  { label: 'Projects', to: '/projects' },
  { label: project.value?.name || 'Loading...' }
])

// Extract request and token history from usage history
const requestHistory = computed(() => {
  return usageHistory.value.map(h => (h as any).requests || h.value || 0)
})

const tokenHistory = computed(() => {
  return usageHistory.value.map(h => (h as any).tokens || 0)
})

// Quick actions for FAB
const quickActions = computed(() => [
  {
    id: 'settings',
    label: 'Settings',
    description: 'Configure limits and tiers',
    icon: h('svg', { class: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }),
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' }),
    ]),
  },
  {
    id: 'copy-key',
    label: 'Copy API Key',
    description: 'Copy project key to clipboard',
    icon: h('svg', { class: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z' }),
    ]),
  },
  {
    id: 'refresh',
    label: 'Refresh Data',
    description: 'Reload usage statistics',
    icon: h('svg', { class: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' }),
    ]),
  },
])

const handleQuickAction = (id: string) => {
  switch (id) {
    case 'settings':
      showSettingsModal.value = true
      break
    case 'copy-key':
      copyProjectKey()
      break
    case 'refresh':
      loadProject()
      showSuccess('Data refreshed!')
      break
  }
}

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
  loadPlan() // Load plan usage
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

