<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
  layout: 'default',
})

const route = useRoute()
const router = useRouter()
const { features } = useFeatures()
const { hasFeature } = usePlan()
const byok = useBYOK()
const { copy } = useClipboard()
const team = useTeam()
const api = useApi()

useHead({
  title: 'BYOK - AI Ratelimit',
})

// Redirect if BYOK not available
onMounted(async () => {
  const isAvailable = await byok.checkAvailability()
  if (!isAvailable) {
    router.push('/projects')
  }
})

// Tabs
const activeTab = ref<'overview' | 'keys' | 'settings'>('overview')

onMounted(async () => {
  await team.loadMembers()
  
  const tab = route.query.tab as string
  if (tab === 'keys') {
    activeTab.value = 'keys'
  } else if (tab === 'settings') {
    activeTab.value = 'settings'
  } else {
    activeTab.value = 'overview'
  }
  
  await Promise.all([
    byok.loadConfig(),
    byok.loadStats(),
    byok.loadKeys({ limit: 10 }),
  ])
})

watch(activeTab, (newTab) => {
  router.replace({ query: { ...route.query, tab: newTab === 'overview' ? undefined : newTab } })
})

// Organization API key for programmatic access
const orgApiKey = ref({
  key: '' as string,
  hasKey: false,
  showKey: false,
  loading: false,
  justGenerated: false,
})

onMounted(async () => {
  try {
    const orgData = await api('/organizations/me')
    orgApiKey.value.hasKey = orgData.hasApiKey
  } catch (e) {
    // Ignore
  }
})

const generateOrgApiKey = async () => {
  if (orgApiKey.value.hasKey) {
    if (!confirm('Are you sure? This will invalidate the current API key. Any services using it will stop working.')) {
      return
    }
  }
  
  orgApiKey.value.loading = true
  try {
    const result = await api('/organizations/me/api-key', { method: 'POST' })
    orgApiKey.value.key = result.apiKey
    orgApiKey.value.hasKey = true
    orgApiKey.value.showKey = true
    orgApiKey.value.justGenerated = true
  } catch (e) {
    console.error('Failed to generate API key:', e)
  } finally {
    orgApiKey.value.loading = false
  }
}

const copyOrgApiKey = async () => {
  if (orgApiKey.value.key) {
    await copy(orgApiKey.value.key, 'API key copied!')
  }
}

// Keys pagination
const keysSearch = ref('')
const keysPage = ref(0)
const keysPerPage = 20

const searchKeys = async () => {
  keysPage.value = 0
  await byok.loadKeys({ limit: keysPerPage, offset: 0, search: keysSearch.value })
}

const loadMoreKeys = async () => {
  keysPage.value++
  await byok.loadKeys({ 
    limit: keysPerPage, 
    offset: keysPage.value * keysPerPage, 
    search: keysSearch.value 
  })
}

// Revoke/Delete key
const keyToManage = ref<{ id: string; identity: string; action: 'revoke' | 'delete' } | null>(null)

const confirmKeyAction = async () => {
  if (!keyToManage.value) return
  
  if (keyToManage.value.action === 'revoke') {
    await byok.revokeKey(keyToManage.value.id)
  } else {
    await byok.deleteKey(keyToManage.value.id)
  }
  keyToManage.value = null
}

// Settings
const savingSettings = ref(false)
const settingsForm = ref({
  enabled: true,
  allowedProviders: ['openai', 'anthropic', 'google', 'xai'] as string[],
  validateKeysOnSave: true,
  trackUsage: true,
})

watch(() => byok.config.value, (config) => {
  if (config) {
    settingsForm.value = {
      enabled: config.enabled,
      allowedProviders: [...config.allowedProviders],
      validateKeysOnSave: config.validateKeysOnSave,
      trackUsage: config.trackUsage,
    }
  }
}, { immediate: true })

const toggleProvider = (provider: string) => {
  const idx = settingsForm.value.allowedProviders.indexOf(provider)
  if (idx >= 0) {
    settingsForm.value.allowedProviders.splice(idx, 1)
  } else {
    settingsForm.value.allowedProviders.push(provider)
  }
}

const saveSettings = async () => {
  savingSettings.value = true
  try {
    await byok.updateConfig(settingsForm.value)
  } finally {
    savingSettings.value = false
  }
}

// Format date
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

const providerColors: Record<string, string> = {
  openai: 'bg-emerald-500/20 text-emerald-400',
  anthropic: 'bg-orange-500/20 text-orange-400',
  google: 'bg-blue-500/20 text-blue-400',
  xai: 'bg-purple-500/20 text-purple-400',
  openrouter: 'bg-pink-500/20 text-pink-400',
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-xl font-bold text-white">BYOK</h2>
        <p class="text-sm text-gray-400 mt-1">
          Bring Your Own Key - Let your users store their own API keys and use them directly with AI providers.
        </p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-8 mb-6 border-b border-gray-500/20">
      <button
        @click="activeTab = 'overview'"
        :class="[
          'pb-3 text-sm font-medium transition-colors relative',
          activeTab === 'overview'
            ? 'text-white'
            : 'text-gray-500 hover:text-gray-300'
        ]"
      >
        Overview
        <div v-if="activeTab === 'overview'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-300"></div>
      </button>
      <button
        @click="activeTab = 'keys'"
        :class="[
          'pb-3 text-sm font-medium transition-colors relative flex items-center gap-2',
          activeTab === 'keys'
            ? 'text-white'
            : 'text-gray-500 hover:text-gray-300'
        ]"
      >
        User Keys
        <span v-if="byok.totalKeys.value > 0" class="text-xs bg-gray-500/40 text-white rounded-full px-1.5">
          {{ byok.totalKeys.value }}
        </span>
        <div v-if="activeTab === 'keys'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-300"></div>
      </button>
      <button
        @click="activeTab = 'settings'"
        :class="[
          'pb-3 text-sm font-medium transition-colors relative',
          activeTab === 'settings'
            ? 'text-white'
            : 'text-gray-500 hover:text-gray-300'
        ]"
      >
        Settings
        <div v-if="activeTab === 'settings'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-300"></div>
      </button>
    </div>

    <!-- Overview Tab -->
    <div v-if="activeTab === 'overview'">
      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
          <div class="text-gray-400 text-xs mb-1">Active Users</div>
          <div class="text-lg font-semibold text-white">{{ byok.stats.value?.totalUsers || 0 }}</div>
        </div>
        <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
          <div class="text-gray-400 text-xs mb-1">Total Keys</div>
          <div class="text-lg font-semibold text-white">{{ byok.stats.value?.totalKeys || 0 }}</div>
        </div>
        <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
          <div class="text-gray-400 text-xs mb-1">Total Requests</div>
          <div class="text-lg font-semibold text-white">{{ byok.stats.value?.totalRequests?.toLocaleString() || 0 }}</div>
        </div>
        <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
          <div class="text-gray-400 text-xs mb-1">Total Tokens</div>
          <div class="text-lg font-semibold text-white">{{ byok.stats.value?.totalTokens?.toLocaleString() || 0 }}</div>
        </div>
      </div>

      <!-- Provider Breakdown -->
      <div v-if="byok.stats.value?.providerBreakdown && Object.keys(byok.stats.value.providerBreakdown).length > 0" class="mb-8 bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
        <h3 class="text-sm font-semibold text-white mb-4">Provider Breakdown</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div v-for="(data, provider) in byok.stats.value.providerBreakdown" :key="provider" class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-3">
            <div class="flex items-center gap-2 mb-2">
              <span :class="['text-xs px-2 py-0.5 rounded capitalize', providerColors[provider] || 'bg-gray-500/20 text-gray-400']">
                {{ provider }}
              </span>
            </div>
            <div class="text-sm text-white font-medium">{{ data.keys }} keys</div>
            <div class="text-xs text-gray-400">{{ data.requests.toLocaleString() }} requests</div>
          </div>
        </div>
      </div>

      <!-- API Credentials -->
      <div class="mb-8 bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-sm font-semibold text-white mb-1">Programmatic API Access</h3>
            <p class="text-xs text-gray-400">
              Use your organization API key to store and manage user API keys programmatically.
            </p>
          </div>
          <div class="flex items-center gap-3">
            <div v-if="orgApiKey.hasKey" class="flex items-center gap-2">
              <code class="px-3 py-1.5 bg-black rounded text-sm text-gray-300 font-mono">
                {{ orgApiKey.showKey && orgApiKey.key ? orgApiKey.key : 'org_sk_••••••••' }}
              </code>
              <button
                @click="orgApiKey.showKey = !orgApiKey.showKey"
                v-if="orgApiKey.key"
                class="p-1.5 text-gray-400 hover:text-white transition-colors"
                :title="orgApiKey.showKey ? 'Hide' : 'Show'"
              >
                <svg v-if="orgApiKey.showKey" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
              <button
                v-if="orgApiKey.key"
                @click="copyOrgApiKey"
                class="p-1.5 text-gray-400 hover:text-white transition-colors"
                title="Copy API key"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            <button
              @click="generateOrgApiKey"
              :disabled="orgApiKey.loading"
              class="px-3 py-1.5 bg-blue-300 text-black rounded-lg text-sm font-medium hover:bg-blue-400 transition-colors disabled:opacity-50"
            >
              {{ orgApiKey.loading ? 'Generating...' : (orgApiKey.hasKey ? 'Regenerate' : 'Generate API Key') }}
            </button>
          </div>
        </div>
        <div v-if="orgApiKey.key && orgApiKey.justGenerated" class="mt-3 p-3 bg-yellow-400/10 border border-yellow-400/20 rounded-lg">
          <p class="text-xs text-yellow-300">
            <strong>Save this key!</strong> It will only be shown once. Use it as: <code class="bg-black/30 px-1.5 py-0.5 rounded">Authorization: Bearer {{ orgApiKey.key }}</code>
          </p>
        </div>
        <div class="mt-3 flex items-center justify-between">
          <div class="text-xs text-gray-500">
            Base URL: <code class="bg-black/30 px-1.5 py-0.5 rounded text-gray-400">{{ $config.public.apiUrl || 'https://api.airatelimit.com' }}/v1/byok</code>
          </div>
        </div>
      </div>

      <!-- Quick Start -->
      <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
        <h3 class="text-sm font-semibold text-white mb-4">Quick Start</h3>
        <div class="bg-black border border-gray-500/10 rounded-lg p-4 font-mono text-xs leading-relaxed overflow-x-auto">
          <div class="text-gray-500 mb-1">// Store a user's API key</div>
          <div class="mb-1">
            <span class="text-blue-300">POST</span>
            <span class="text-white"> /v1/byok/keys</span>
          </div>
          <div class="mb-1">
            <span class="text-white">Authorization: Bearer </span>
            <span class="text-yellow-300">org_sk_xxx</span>
          </div>
          <div class="mb-3 text-white">Content-Type: application/json</div>
          <div class="text-white mb-4">{
  "identity": <span class="text-yellow-300">"user-123"</span>,
  "provider": <span class="text-yellow-300">"openai"</span>,
  "apiKey": <span class="text-yellow-300">"sk-..."</span>
}</div>
          <div class="text-gray-500 mb-1">// Make AI requests using the stored key</div>
          <div class="mb-1">
            <span class="text-blue-300">POST</span>
            <span class="text-white"> /v1/openai/chat/completions</span>
          </div>
          <div class="mb-1">
            <span class="text-white">X-Project-Key: </span>
            <span class="text-yellow-300">pk_xxx</span>
          </div>
          <div class="mb-3">
            <span class="text-white">X-Identity: </span>
            <span class="text-yellow-300">user-123</span>
          </div>
          <div class="text-white">{
  "model": <span class="text-yellow-300">"gpt-4o"</span>,
  "messages": [...]
}</div>
        </div>
      </div>
    </div>

    <!-- User Keys Tab -->
    <div v-else-if="activeTab === 'keys'">
      <!-- Search -->
      <div class="flex gap-2 mb-4">
        <input
          v-model="keysSearch"
          @keyup.enter="searchKeys"
          type="text"
          placeholder="Search by identity..."
          class="flex-1 bg-gray-500/10 border border-gray-500/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-400"
        />
        <button
          @click="searchKeys"
          class="px-4 py-2 bg-gray-500/10 border border-gray-500/10 hover:bg-gray-500/20 text-white text-sm rounded-lg transition-colors"
        >
          Search
        </button>
      </div>

      <!-- Keys count -->
      <div class="text-sm text-gray-400 mb-4">
        {{ byok.totalKeys.value }} user{{ byok.totalKeys.value === 1 ? '' : 's' }} have registered keys
      </div>

      <!-- Empty state -->
      <div v-if="byok.keys.value.length === 0 && !byok.loading.value" class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-6 text-center">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-500/10 mb-4">
          <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <p class="text-sm text-gray-400">No user keys found. Keys will appear here when your users store their API keys.</p>
      </div>

      <!-- Keys table -->
      <div v-else class="bg-gray-500/5 border border-gray-500/10 rounded-lg overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-500/10">
              <th class="text-left text-xs font-medium text-gray-400 px-4 py-3">Identity</th>
              <th class="text-left text-xs font-medium text-gray-400 px-4 py-3">Provider</th>
              <th class="text-left text-xs font-medium text-gray-400 px-4 py-3">Last Used</th>
              <th class="text-left text-xs font-medium text-gray-400 px-4 py-3">Requests</th>
              <th class="text-left text-xs font-medium text-gray-400 px-4 py-3">Status</th>
              <th class="text-right text-xs font-medium text-gray-400 px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="key in byok.keys.value" :key="key.id" class="border-b border-gray-500/10 last:border-0 hover:bg-gray-500/5 transition-colors">
              <td class="px-4 py-3">
                <span class="text-sm text-white font-mono">{{ key.identity }}</span>
              </td>
              <td class="px-4 py-3">
                <span :class="['text-[10px] px-1.5 py-0.5 rounded uppercase', providerColors[key.provider] || 'bg-gray-500/20 text-gray-400']">
                  {{ key.provider }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-400">
                {{ formatDate(key.lastUsedAt) }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-400">
                {{ key.requestCount.toLocaleString() }}
              </td>
              <td class="px-4 py-3">
                <span :class="[
                  'text-[10px] px-1.5 py-0.5 rounded',
                  key.isActive ? 'bg-green-400/10 text-green-300' : 'bg-red-400/10 text-red-300'
                ]">
                  {{ key.isActive ? 'Active' : 'Revoked' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <button
                  v-if="key.isActive"
                  @click="keyToManage = { id: key.id, identity: key.identity, action: 'revoke' }"
                  class="text-xs text-amber-400 hover:text-amber-300 mr-3"
                >
                  Revoke
                </button>
                <button
                  @click="keyToManage = { id: key.id, identity: key.identity, action: 'delete' }"
                  class="text-xs text-red-400 hover:text-red-300"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Load more -->
      <button
        v-if="byok.keys.value.length < byok.totalKeys.value"
        @click="loadMoreKeys"
        :disabled="byok.loading.value"
        class="w-full py-3 mt-4 text-sm text-gray-400 hover:text-white transition-colors bg-gray-500/5 border border-gray-500/10 rounded-lg"
      >
        {{ byok.loading.value ? 'Loading...' : 'Load more' }}
      </button>
    </div>

    <!-- Settings Tab -->
    <div v-else-if="activeTab === 'settings'">
      <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4 space-y-6">
        <!-- Enable/Disable -->
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-white">Enable BYOK</div>
            <div class="text-xs text-gray-400">Allow users to store their own API keys</div>
          </div>
          <button
            @click="settingsForm.enabled = !settingsForm.enabled"
            :class="[
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              settingsForm.enabled ? 'bg-green-500' : 'bg-gray-600'
            ]"
          >
            <span
              :class="[
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                settingsForm.enabled ? 'translate-x-6' : 'translate-x-1'
              ]"
            />
          </button>
        </div>

        <!-- Allowed Providers -->
        <div>
          <div class="text-sm font-medium text-white mb-2">Allowed Providers</div>
          <div class="text-xs text-gray-400 mb-3">Select which AI providers your users can register keys for</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="provider in ['openai', 'anthropic', 'google', 'xai']"
              :key="provider"
              @click="toggleProvider(provider)"
              :class="[
                'text-xs px-3 py-1.5 rounded-lg border transition-colors capitalize',
                settingsForm.allowedProviders.includes(provider)
                  ? 'border-blue-300/50 bg-blue-300/10 text-blue-300'
                  : 'border-gray-500/20 bg-gray-500/10 text-gray-400 hover:border-gray-500/40'
              ]"
            >
              {{ provider }}
            </button>
          </div>
        </div>

        <!-- Validate Keys -->
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-white">Validate Keys on Save</div>
            <div class="text-xs text-gray-400">Test API keys work before storing them</div>
          </div>
          <button
            @click="settingsForm.validateKeysOnSave = !settingsForm.validateKeysOnSave"
            :class="[
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              settingsForm.validateKeysOnSave ? 'bg-green-500' : 'bg-gray-600'
            ]"
          >
            <span
              :class="[
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                settingsForm.validateKeysOnSave ? 'translate-x-6' : 'translate-x-1'
              ]"
            />
          </button>
        </div>

        <!-- Track Usage -->
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium text-white">Track Usage</div>
            <div class="text-xs text-gray-400">Record request counts and tokens per user</div>
          </div>
          <button
            @click="settingsForm.trackUsage = !settingsForm.trackUsage"
            :class="[
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              settingsForm.trackUsage ? 'bg-green-500' : 'bg-gray-600'
            ]"
          >
            <span
              :class="[
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                settingsForm.trackUsage ? 'translate-x-6' : 'translate-x-1'
              ]"
            />
          </button>
        </div>

        <!-- Save Button -->
        <div class="pt-4 border-t border-gray-500/10">
          <button
            @click="saveSettings"
            :disabled="savingSettings"
            class="px-4 py-2 bg-blue-300 text-black text-sm font-medium rounded-lg hover:bg-blue-400 transition-colors disabled:opacity-50"
          >
            {{ savingSettings ? 'Saving...' : 'Save Settings' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm Modal -->
    <Teleport to="body">
      <div
        v-if="keyToManage"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        @click.self="keyToManage = null"
      >
        <div class="bg-black rounded-xl p-6 w-full max-w-md border border-gray-500/20">
          <h3 class="text-sm font-semibold text-white mb-4">
            {{ keyToManage.action === 'revoke' ? 'Revoke Key' : 'Delete Key' }}
          </h3>
          <p class="text-sm text-gray-400 mb-6">
            Are you sure you want to {{ keyToManage.action }} the key for 
            <code class="bg-gray-500/20 px-1.5 py-0.5 rounded text-white">{{ keyToManage.identity }}</code>?
            <span v-if="keyToManage.action === 'delete'" class="block mt-2 text-red-400">
              This action cannot be undone.
            </span>
          </p>
          <div class="flex gap-3 justify-end">
            <button
              @click="keyToManage = null"
              class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              @click="confirmKeyAction"
              :class="[
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                keyToManage.action === 'delete'
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-amber-500 text-black hover:bg-amber-600'
              ]"
            >
              {{ keyToManage.action === 'revoke' ? 'Revoke' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
