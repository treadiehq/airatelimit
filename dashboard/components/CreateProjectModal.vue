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
            class="relative bg-black border border-gray-500/20 rounded-lg shadow-xl w-full max-w-md"
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
                      class="w-full px-4 py-3 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-blue-300/50 focus:border-transparent transition-all"
                      placeholder="My AI App"
                      autofocus
                    />
                    <p class="mt-2 text-xs text-gray-400">
                      You'll configure limits, tiers, and model settings after creation
                    </p>
                  </div>

                  <!-- Info Box -->
                  <div class="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
                    <div class="flex">
                      <svg class="w-5 h-5 text-blue-300 mt-0.5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div class="text-sm">
                        <p class="font-medium text-white mb-2">How it works</p>
                        <p class="text-gray-400">
                          Point your OpenAI/Anthropic SDK to our proxy. Your API key is passed per-request — we never store it.
                        </p>
                        <p class="mt-2 text-xs text-gray-500">
                          Configure rate limits, tiers, and model limits after creation.
                        </p>
                      </div>
                    </div>
                  </div>

                  <!-- Error Message -->
                  <div v-if="error" class="bg-red-400/10 text-red-400 p-4 rounded-lg text-sm">
                    {{ error }}
                  </div>

                  <!-- Success Message -->
                  <div v-if="success" class="bg-green-300/10 text-green-300 p-4 rounded-lg text-sm">
                    <div class="flex items-center">
                      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Project created! Redirecting...
                    </div>
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
                    class="px-6 py-2 bg-blue-300 text-sm font-medium text-black rounded-lg hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center space-x-2"
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
  (e: 'close'): void
  (e: 'created', projectId: string): void
}>()

const api = useApi()
const nameInput = ref<HTMLInputElement | null>(null)

const form = ref({
  name: '',
})

const loading = ref(false)
const error = ref('')
const success = ref(false)

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      nameInput.value?.focus()
    })
    // Reset form
    form.value = {
      name: '',
    }
    error.value = ''
    success.value = false
  }
})

const handleSubmit = async () => {
  loading.value = true
  error.value = ''

  try {
    const project = await api('/projects', {
      method: 'POST',
      body: {
        name: form.value.name,
      },
    })

    success.value = true
    
    // Redirect to project settings page after a short delay
    setTimeout(() => {
      emit('created', project.id)
      close()
    }, 1000)
  } catch (err: any) {
    error.value = err.message || 'Failed to create project'
  } finally {
    loading.value = false
  }
}

const close = () => {
  emit('close')
}
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
</style>
