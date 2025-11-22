<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 overflow-y-auto"
        @click.self="close"
      >
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/70 transition-opacity" @click="close"></div>

        <!-- Modal -->
        <div class="flex min-h-full items-center justify-center p-4">
          <div
            class="relative bg-black border border-gray-500/20 rounded-lg shadow-xl w-full max-w-2xl"
            @click.stop
          >
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-500/20">
              <h3 class="text-xl font-medium text-white">Create New Project</h3>
              <button
                @click="close"
                class="text-gray-400 hover:text-white transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="px-6 py-6">
              <form @submit.prevent="handleSubmit">
                <div class="space-y-4">
                  <!-- Project Name -->
                  <div>
                    <label class="block text-sm font-medium text-white mb-2">
                      Project Name
                    </label>
                    <input
                      ref="nameInput"
                      v-model="form.name"
                      type="text"
                      required
                      class="w-full px-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-blue-300/50 focus:border-transparent transition-all"
                      placeholder="My App"
                    />
                  </div>

                  <!-- Provider Selection -->
                  <div>
                    <label class="block text-sm font-medium text-white mb-2">
                      AI Provider
                    </label>
                    <div class="relative">
                      <select
                        v-model="form.provider"
                        class="w-full px-4 py-2.5 text-white bg-gray-500/10 border border-gray-500/20 rounded-lg focus:ring-2 focus:ring-blue-300/50 focus:border-transparent appearance-none cursor-pointer pr-10 transition-all hover:bg-gray-500/20"
                      >
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                        <option value="google">Google</option>
                        <option value="xai">xAI</option>
                        <option value="other">Other (OpenAI-compatible)</option>
                      </select>
                      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <!-- Base URL (only for Other provider) -->
                  <div v-if="form.provider === 'other'">
                    <label class="block text-sm font-medium text-white mb-2">
                      API Base URL
                    </label>
                    <input
                      v-model="form.baseUrl"
                      type="text"
                      required
                      class="w-full px-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-amber-300/50 focus:border-transparent font-mono text-sm"
                      placeholder="https://api.your-provider.com/v1/chat/completions"
                    />
                    <p class="mt-1 text-xs text-gray-400">Full API endpoint URL for your provider</p>
                  </div>

                  <!-- API Key -->
                  <div>
                    <label class="block text-sm font-medium text-white mb-2">
                      {{ providerLabels[form.provider] }} API Key
                    </label>
                    <input
                      v-model="form.openaiApiKey"
                      type="text"
                      required
                      class="w-full px-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-amber-300/50 focus:border-transparent font-mono text-sm"
                      :placeholder="providerPlaceholders[form.provider]"
                    />
                    <p class="mt-1 text-xs text-gray-400">{{ providerHints[form.provider] }}</p>
                  </div>

                  <!-- Limit Period -->
                  <div>
                    <label class="block text-sm font-medium text-white mb-2">
                      Limit Period
                    </label>
                    <div class="relative">
                      <select
                        v-model="form.limitPeriod"
                        class="w-full px-4 py-2.5 text-white bg-gray-500/10 border border-gray-500/20 rounded-lg focus:ring-2 focus:ring-blue-300/50 focus:border-transparent appearance-none cursor-pointer pr-10 transition-all hover:bg-gray-500/20"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    <p class="mt-1 text-xs text-gray-400">
                      Reset limits daily, weekly, or monthly
                    </p>
                  </div>

                  <!-- Limit Type -->
                  <div>
                    <label class="block text-sm font-medium text-white mb-2">
                      Limit Type
                    </label>
                    <div class="relative">
                      <select
                        v-model="form.limitType"
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
                    <p class="mt-1 text-xs text-gray-400">
                      Choose how to track usage: requests for image generation, tokens for chat, or both
                    </p>
                  </div>

                  <!-- Request Limit -->
                  <div v-if="form.limitType !== 'tokens'">
                    <label class="block text-sm font-medium text-white mb-2">
                      Request Limit
                    </label>
                    <input
                      v-model.number="form.dailyRequestLimit"
                      type="number"
                      min="0"
                      class="w-full px-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-amber-300/50 focus:border-transparent"
                      placeholder="100"
                    />
                    <p class="mt-1 text-xs text-gray-400">Leave empty for unlimited</p>
                  </div>

                  <!-- Token Limit -->
                  <div v-if="form.limitType !== 'requests'">
                    <label class="block text-sm font-medium text-white mb-2">
                      Token Limit
                    </label>
                    <input
                      v-model.number="form.dailyTokenLimit"
                      type="number"
                      min="0"
                      class="w-full px-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-amber-300/50 focus:border-transparent"
                      placeholder="50000"
                    />
                    <p class="mt-1 text-xs text-gray-400">Leave empty for unlimited</p>
                  </div>

                  <!-- Limit Exceeded Message -->
                  <div>
                    <label class="block text-sm font-medium text-white mb-2">
                      Limit Exceeded Message (Optional)
                    </label>
                    <textarea
                      v-model="form.limitMessage"
                      rows="3"
                      class="w-full px-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-amber-300/50 focus:border-transparent"
                      placeholder="Daily limit reached. Please upgrade to continue."
                    />
                    <p class="mt-1 text-xs text-gray-400">Custom message shown when limits are exceeded</p>
                  </div>

                  <!-- Error Message -->
                  <div v-if="error" class="bg-red-400/10 text-red-400 p-4 rounded-lg">
                    {{ error }}
                  </div>

                  <!-- Success Message -->
                  <div v-if="success" class="bg-green-300/10 text-green-300 p-4 rounded-lg">
                    Project created successfully!
                  </div>
                </div>

                <!-- Footer -->
                <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-500/20">
                  <button
                    type="button"
                    @click="close"
                    class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    :disabled="loading"
                    class="px-4 py-2 bg-blue-300 text-sm font-medium text-black rounded-lg hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center space-x-2"
                  >
                    <svg
                      v-if="loading"
                      class="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{{ loading ? 'Creating...' : 'Create Project' }}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
  created: []
}>()

const api = useApi()
const nameInput = ref<HTMLInputElement | null>(null)

const form = ref({
  name: '',
  provider: 'openai' as 'openai' | 'anthropic' | 'google' | 'xai' | 'other',
  openaiApiKey: '',
  baseUrl: '',
  limitPeriod: 'daily' as 'daily' | 'weekly' | 'monthly',
  limitType: 'both' as 'requests' | 'tokens' | 'both',
  dailyRequestLimit: null as number | null,
  dailyTokenLimit: null as number | null,
  limitMessage: '',
})

const providerLabels = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  xai: 'xAI',
  other: 'Provider',
}

const providerPlaceholders = {
  openai: 'sk-...',
  anthropic: 'sk-ant-...',
  google: 'AIza...',
  xai: 'xai-...',
  other: 'your-api-key-...',
}

const providerHints = {
  openai: 'Your OpenAI API key will be encrypted',
  anthropic: 'Your Anthropic API key will be encrypted',
  google: 'Your Google API key will be encrypted',
  xai: 'Your xAI API key will be encrypted',
  other: 'Your API key will be encrypted',
}

const loading = ref(false)
const error = ref('')
const success = ref(false)

const handleSubmit = async () => {
  loading.value = true
  error.value = ''
  success.value = false

  try {
    const payload: any = {
      name: form.value.name,
      provider: form.value.provider,
      openaiApiKey: form.value.openaiApiKey,
      limitPeriod: form.value.limitPeriod,
      limitType: form.value.limitType,
    }

    if (form.value.provider === 'other' && form.value.baseUrl) {
      payload.baseUrl = form.value.baseUrl
    }
    if (form.value.dailyRequestLimit) {
      payload.dailyRequestLimit = form.value.dailyRequestLimit
    }
    if (form.value.dailyTokenLimit) {
      payload.dailyTokenLimit = form.value.dailyTokenLimit
    }
    if (form.value.limitMessage) {
      payload.limitExceededResponse = {
        error: 'limit_exceeded',
        message: form.value.limitMessage,
      }
    }

    await api('/projects', {
      method: 'POST',
      body: payload,
    })

    success.value = true
    
    // Reset form
    form.value = {
      name: '',
      provider: 'openai',
      openaiApiKey: '',
      baseUrl: '',
      limitPeriod: 'daily',
      limitType: 'both',
      dailyRequestLimit: null,
      dailyTokenLimit: null,
      limitMessage: '',
    }

    // Close modal after a brief delay to show success message
    setTimeout(() => {
      emit('created')
      emit('close')
      success.value = false
    }, 500)
  } catch (err: any) {
    error.value = err.message || 'Failed to create project'
  } finally {
    loading.value = false
  }
}

const close = () => {
  if (!loading.value) {
    emit('close')
    // Reset form and messages
    setTimeout(() => {
      form.value = {
        name: '',
        provider: 'openai',
        openaiApiKey: '',
        baseUrl: '',
        limitPeriod: 'daily',
        limitType: 'both',
        dailyRequestLimit: null,
        dailyTokenLimit: null,
        limitMessage: '',
      }
      error.value = ''
      success.value = false
    }, 300)
  }
}

// Close modal on Escape key
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    close()
  }
}

onMounted(() => {
  if (process.client) {
    document.addEventListener('keydown', handleKeydown)
  }
})

onUnmounted(() => {
  if (process.client) {
    document.removeEventListener('keydown', handleKeydown)
  }
})

// Auto-focus first input when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      nameInput.value?.focus()
    })
  }
})
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>

