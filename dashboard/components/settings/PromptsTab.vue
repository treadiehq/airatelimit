<template>
  <div class="space-y-4 px-6">
    <!-- Info Box -->
    <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-4">
      <h3 class="font-semibold text-white mb-2">System Prompts</h3>
      <p class="text-sm text-gray-400 mb-2">
        Store system prompts <strong class="text-white">server-side</strong> so they're not visible in your mobile app code.
        Reference by name in requests, and we inject the actual content.
      </p>
      <div class="mt-3 p-3 bg-gray-500/5 border border-gray-500/10 rounded-lg font-mono text-xs text-gray-300">
        <div class="text-gray-500 mb-1">// In your app request:</div>
        <div>{ "systemPrompt": "<span class="text-blue-300">assistant-v1</span>", "messages": [...] }</div>
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
          placeholder="Search prompts..."
          class="w-full pl-10 pr-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg text-sm focus:ring-2 focus:ring-blue-300/50"
        />
      </div>
      <button @click="showAddModal = true" class="px-4 py-2 bg-blue-300 text-black text-sm font-medium rounded-lg hover:bg-blue-400 whitespace-nowrap">
        + Add Prompt
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-300"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredPrompts.length === 0 && !searchQuery" class="text-center py-12 bg-gray-500/10 border border-gray-500/20 rounded-lg">
      <div class="flex justify-center mb-4">
        <svg class="w-16 h-16 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-white mb-2">No System Prompts</h3>
      <p class="text-sm text-gray-400 mb-4 max-w-md mx-auto">
        Create a prompt to inject into your AI requests server-side.
      </p>
    </div>

    <!-- Prompt Cards -->
    <div v-else class="space-y-2">
      <div
        v-for="prompt in filteredPrompts"
        :key="prompt.name"
        class="border border-gray-500/10 rounded-lg p-4 hover:border-gray-500/20 transition-colors"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-mono text-white text-sm">{{ prompt.name }}</span>
              <span
                :class="prompt.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'"
                class="px-2 py-0.5 text-xs rounded-full"
              >
                {{ prompt.enabled ? 'active' : 'disabled' }}
              </span>
              <span class="px-2 py-0.5 text-xs rounded-full bg-gray-500/20 text-gray-400">
                v{{ prompt.version }}
              </span>
            </div>
            <div v-if="prompt.description" class="text-sm text-gray-400 mt-1">
              {{ prompt.description }}
            </div>
            <div class="mt-2 p-2 bg-gray-500/5 rounded text-xs text-gray-400 font-mono max-h-20 overflow-hidden">
              {{ prompt.content.substring(0, 200) }}{{ prompt.content.length > 200 ? '...' : '' }}
            </div>
          </div>
          <div class="flex items-center gap-1 ml-4">
            <button
              @click="editPrompt(prompt)"
              class="p-2 text-gray-400 hover:text-white hover:bg-gray-500/10 rounded-lg transition-colors"
              title="Edit"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              @click="toggleEnabled(prompt)"
              class="p-2 text-gray-400 hover:text-white hover:bg-gray-500/10 rounded-lg transition-colors"
              :title="prompt.enabled ? 'Disable' : 'Enable'"
            >
              <svg v-if="prompt.enabled" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button
              @click="deletePrompt(prompt)"
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

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <div v-if="showAddModal || editingPrompt" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" @click="closeModal"></div>
        <div class="relative w-full max-w-lg bg-black border border-gray-500/20 rounded-xl shadow-xl">
          <div class="flex items-center justify-between p-4 border-b border-gray-500/20">
            <h3 class="text-lg font-semibold text-white">
              {{ editingPrompt ? 'Edit Prompt' : 'Add Prompt' }}
            </h3>
            <button @click="closeModal" class="text-gray-400 hover:text-white">✕</button>
          </div>

          <form @submit.prevent="savePrompt" class="p-4 space-y-4">
            <div>
              <label class="block text-sm font-medium text-white mb-1">Name</label>
              <input
                v-model="form.name"
                type="text"
                :disabled="!!editingPrompt"
                placeholder="e.g., assistant-v1"
                class="w-full px-3 py-2 text-white bg-gray-500/10 border border-gray-500/20 rounded-lg text-sm font-mono disabled:opacity-50"
                required
              />
              <p class="text-xs text-gray-500 mt-1">Use this name in your requests</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-white mb-1">Description (optional)</label>
              <input
                v-model="form.description"
                type="text"
                placeholder="What this prompt does..."
                class="w-full px-3 py-2 text-white bg-gray-500/10 border border-gray-500/20 rounded-lg text-sm"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-white mb-1">Content</label>
              <textarea
                v-model="form.content"
                rows="8"
                placeholder="You are a helpful assistant that..."
                class="w-full px-3 py-2 text-white bg-gray-500/10 border border-gray-500/20 rounded-lg text-sm font-mono"
                required
              />
            </div>

            <div v-if="saveError" class="p-3 bg-red-500/10 text-red-400 rounded-lg text-sm">
              {{ saveError }}
            </div>

            <div class="flex gap-2 pt-2">
              <button type="button" @click="closeModal" class="flex-1 px-4 py-2 bg-gray-500/10 text-white text-sm rounded-lg hover:bg-gray-500/20">
                Cancel
              </button>
              <button type="submit" :disabled="saving" class="flex-1 px-4 py-2 bg-blue-300 text-black text-sm font-medium rounded-lg hover:bg-blue-400 disabled:opacity-50">
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
const props = defineProps<{ projectKey: string }>()
const api = useApi()

interface Prompt {
  name: string
  content: string
  description?: string
  enabled: boolean
  version: number
}

const prompts = ref<Prompt[]>([])
const loading = ref(false)
const searchQuery = ref('')
const showAddModal = ref(false)
const editingPrompt = ref<Prompt | null>(null)
const saving = ref(false)
const saveError = ref('')

const form = ref({ name: '', content: '', description: '' })

const filteredPrompts = computed(() => {
  if (!searchQuery.value) return prompts.value
  const q = searchQuery.value.toLowerCase()
  return prompts.value.filter(p => p.name.toLowerCase().includes(q) || p.content.toLowerCase().includes(q))
})

const loadPrompts = async () => {
  if (!props.projectKey) return
  loading.value = true
  try {
    const result = await api(`/projects/${props.projectKey}/prompts`)
    prompts.value = result.items
  } catch (e) {
    console.error('Failed to load prompts:', e)
  } finally {
    loading.value = false
  }
}

const editPrompt = (prompt: Prompt) => {
  editingPrompt.value = prompt
  form.value = { name: prompt.name, content: prompt.content, description: prompt.description || '' }
}

const closeModal = () => {
  showAddModal.value = false
  editingPrompt.value = null
  saveError.value = ''
  form.value = { name: '', content: '', description: '' }
}

const savePrompt = async () => {
  saveError.value = ''
  saving.value = true
  try {
    await api(`/projects/${props.projectKey}/prompts`, {
      method: 'POST',
      body: { name: form.value.name, content: form.value.content, description: form.value.description || undefined },
    })
    await loadPrompts()
    closeModal()
  } catch (e: any) {
    saveError.value = e.message || 'Failed to save'
  } finally {
    saving.value = false
  }
}

const toggleEnabled = async (prompt: Prompt) => {
  try {
    await api(`/projects/${props.projectKey}/prompts/${encodeURIComponent(prompt.name)}`, {
      method: 'PUT',
      body: { enabled: !prompt.enabled },
    })
    prompt.enabled = !prompt.enabled
  } catch (e) {
    console.error('Failed to toggle prompt:', e)
  }
}

const deletePrompt = async (prompt: Prompt) => {
  if (!confirm(`Delete prompt "${prompt.name}"?`)) return
  try {
    await api(`/projects/${props.projectKey}/prompts/${encodeURIComponent(prompt.name)}`, { method: 'DELETE' })
    prompts.value = prompts.value.filter(p => p.name !== prompt.name)
  } catch (e) {
    console.error('Failed to delete prompt:', e)
  }
}

watch(() => props.projectKey, (key) => { if (key) loadPrompts() }, { immediate: true })
</script>

