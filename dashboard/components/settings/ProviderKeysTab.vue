<template>
  <div class="px-6 space-y-6">
    <!-- Info Box -->
    <div class="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
      <div class="flex items-start gap-3">
        <div>
          <h3 class="font-semibold text-white mb-1">Stored Keys</h3>
          <p class="text-sm text-gray-400">
            Store your AI provider API keys here and we'll use them automatically. 
            Your client code only needs the project key, 
            no AI provider keys exposed.
          </p>
        </div>
      </div>
    </div>

    <!-- Provider Cards -->
    <div class="space-y-2">
      <div v-for="provider in providers" :key="provider.id" class="border border-gray-500/20 rounded-lg overflow-hidden">
        <!-- Provider Header -->
        <div class="flex items-center justify-between px-4 py-3 bg-gray-500/5">
          <div class="flex items-center gap-3">
            <div :class="[
              'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold',
              isConfigured(provider.id) ? 'bg-green-300/10 text-green-300' : 'bg-gray-500/20 text-gray-500'
            ]">
              {{ provider.icon }}
            </div>
            <div>
              <h4 class="text-white font-medium">{{ provider.name }}</h4>
              <p class="text-xs text-gray-500">{{ provider.models }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span v-if="isConfigured(provider.id)" class="text-xs text-green-300 bg-green-300/10 px-2 py-1 rounded">
              Configured
            </span>
            <button
              @click="openEditModal(provider)"
              class="p-2 text-gray-400 hover:text-white hover:bg-gray-500/10 rounded-lg transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Provider Details (when configured) -->
        <div v-if="isConfigured(provider.id)" class="px-4 py-3 border-t border-gray-500/10 bg-black">
          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-xs text-gray-500">API Key:</span>
                <code class="text-xs text-gray-400 font-mono">
                  {{ maskKey(getProviderKeys(provider.id)?.apiKey) }}
                </code>
              </div>
              <div v-if="isConfigured(provider.id) && getProviderKeys(provider.id)?.baseUrl" class="flex items-center gap-2">
                <span class="text-xs text-gray-500">Base URL:</span>
                <code class="text-xs text-gray-400 font-mono">{{ getProviderKeys(provider.id)?.baseUrl }}</code>
              </div>
            </div>
            <button
              @click="removeProvider(provider.id)"
              class="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-400/10 rounded transition-colors"
              title="Remove"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Usage Example -->
    <div class="pt-4 border-t border-gray-500/10">
      <label class="block text-sm font-medium text-white mb-3">How it works</label>
      <div class="bg-black border border-gray-500/20 rounded-lg p-4 space-y-4">
        <div class="space-y-2">
          <p class="text-xs text-gray-500 uppercase tracking-wider">Your app only needs:</p>
          <pre class="text-xs overflow-x-auto"><code class="text-gray-300">curl https://api.airatelimit.com/v1/chat/completions \
  -H "x-project-key: <span class="text-blue-300">{{ projectKey }}</span>" \
  -H "x-identity: user-123" \
  -d '{"model": "gpt-4o", "messages": [...]}'</code></pre>
        </div>
        <div class="flex items-center gap-2 text-xs text-gray-500">
          <svg class="w-4 h-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>No <code class="bg-gray-500/20 px-1 rounded">Authorization</code> header needed, we use your stored key</span>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <Teleport to="body">
      <div
        v-if="editingProvider"
        class="fixed inset-0 z-[60] flex items-center justify-center p-4"
        @click.self="closeModal"
      >
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" @click="closeModal"></div>
        <div class="relative w-full max-w-md bg-black border border-gray-500/20 rounded-xl shadow-xl" @click.stop>
          <div class="flex items-center justify-between p-4 border-b border-gray-500/20">
            <h3 class="text-lg font-semibold text-white">
              Configure {{ editingProvider.name }}
            </h3>
            <button @click="closeModal" class="text-gray-400 hover:text-white">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="saveProvider" class="p-4 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">API Key</label>
              <input
                v-model="editForm.apiKey"
                type="password"
                :placeholder="isConfigured(editingProvider.id) ? 'Enter new key to update' : editingProvider.keyPlaceholder"
                class="w-full px-3 py-2 bg-gray-500/10 border border-gray-500/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-300/10"
                required
              />
              <p class="mt-1 text-xs text-gray-500">
                <span v-if="isConfigured(editingProvider.id)" class="text-yellow-300">For security, enter your full API key to update. </span>
                Get your key from <a :href="editingProvider.keyUrl" target="_blank" class="text-blue-300 hover:underline">{{ editingProvider.keyUrlLabel }}</a>
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">
                Base URL <span class="text-gray-600">(optional)</span>
              </label>
              <input
                v-model="editForm.baseUrl"
                type="url"
                :placeholder="editingProvider.defaultUrl"
                class="w-full px-3 py-2 bg-gray-500/10 border border-gray-500/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
              />
              <p class="mt-1 text-xs text-gray-500">
                Leave empty to use default: {{ editingProvider.defaultUrl }}
              </p>
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <button
                type="button"
                @click="closeModal"
                class="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="px-4 py-2 bg-blue-300 hover:bg-blue-400 text-black font-medium rounded-lg disabled:opacity-50 transition-colors"
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
interface Provider {
  id: string
  name: string
  icon: string
  models: string
  keyPlaceholder: string
  keyUrl: string
  keyUrlLabel: string
  defaultUrl: string
}

const props = defineProps<{
  projectId: string
  projectKey: string
  providerKeys: Record<string, { apiKey: string; baseUrl?: string }> | null
}>()

const emit = defineEmits<{
  (e: 'update', providerKeys: Record<string, { apiKey: string; baseUrl?: string }>): void
}>()

const toast = useToast()

const providers: Provider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    icon: 'O',
    models: 'GPT-4o, GPT-4, GPT-3.5, o1, etc.',
    keyPlaceholder: 'sk-...',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyUrlLabel: 'OpenAI Dashboard',
    defaultUrl: 'https://api.openai.com/v1/chat/completions'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: 'A',
    models: 'Claude 3.5, Claude 3, etc.',
    keyPlaceholder: 'sk-ant-...',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keyUrlLabel: 'Anthropic Console',
    defaultUrl: 'https://api.anthropic.com/v1/messages'
  },
  {
    id: 'google',
    name: 'Google AI',
    icon: 'G',
    models: 'Gemini 2.0, Gemini 1.5, etc.',
    keyPlaceholder: 'AIza...',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyUrlLabel: 'Google AI Studio',
    defaultUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
  },
  {
    id: 'xai',
    name: 'xAI',
    icon: 'X',
    models: 'Grok',
    keyPlaceholder: 'xai-...',
    keyUrl: 'https://console.x.ai/',
    keyUrlLabel: 'xAI Console',
    defaultUrl: 'https://api.x.ai/v1/chat/completions'
  }
]

const editingProvider = ref<Provider | null>(null)
const editForm = ref({ apiKey: '', baseUrl: '' })
const saving = ref(false)

const getProviderKeys = (providerId: string) => {
  return props.providerKeys?.[providerId]
}

// Always mask keys in the UI - never show full keys
const maskKey = (key: string | undefined): string => {
  if (!key) return '••••••••'
  // If already masked (contains bullets), return as-is
  if (key.includes('••')) return key
  // Mask: show first 4 and last 4 chars
  if (key.length > 12) {
    return key.substring(0, 4) + '••••••••' + key.slice(-4)
  }
  return '••••••••'
}

const isConfigured = (providerId: string) => {
  const config = props.providerKeys?.[providerId] as any
  return config?.configured || (config?.apiKey && !config.apiKey.includes('••'))
}

const openEditModal = (provider: Provider) => {
  editingProvider.value = provider
  const existing = getProviderKeys(provider.id)
  // Don't pre-fill API key (it's masked), only baseUrl
  editForm.value = {
    apiKey: '', // Always require re-entry for security
    baseUrl: existing?.baseUrl || ''
  }
}

const closeModal = () => {
  editingProvider.value = null
  editForm.value = { apiKey: '', baseUrl: '' }
}

const saveProvider = async () => {
  if (!editingProvider.value || !editForm.value.apiKey) return

  saving.value = true
  try {
    const updatedKeys = {
      ...(props.providerKeys || {}),
      [editingProvider.value.id]: {
        apiKey: editForm.value.apiKey,
        ...(editForm.value.baseUrl && { baseUrl: editForm.value.baseUrl })
      }
    }
    emit('update', updatedKeys)
    toast.success(`${editingProvider.value.name} API key saved`)
    closeModal()
  } catch (e) {
    toast.error('Failed to save provider key')
  } finally {
    saving.value = false
  }
}

const removeProvider = async (providerId: string) => {
  const provider = providers.find(p => p.id === providerId)
  if (!confirm(`Remove ${provider?.name} API key? Requests using ${provider?.name} models will require an Authorization header.`)) {
    return
  }

  const updatedKeys = { ...(props.providerKeys || {}) }
  delete updatedKeys[providerId]
  emit('update', updatedKeys)
  toast.success(`${provider?.name} API key removed`)
}
</script>

