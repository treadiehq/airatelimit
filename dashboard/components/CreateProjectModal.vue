<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 overflow-y-auto"
        @click.self="!createdProject && close()"
      >
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/70 transition-opacity" @click="!createdProject && close()"></div>

        <!-- Modal -->
        <div class="flex min-h-full items-center justify-center p-4">
          <div
            :class="[
              'relative bg-black border border-gray-500/20 rounded-lg shadow-xl w-full transition-all duration-300',
              createdProject ? 'max-w-2xl' : 'max-w-md'
            ]"
            @click.stop
          >
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-500/20">
              <h3 class="text-xl font-medium text-white">
                {{ createdProject ? '🎉 Project Created!' : 'Create New Project' }}
              </h3>
              <button
                @click="createdProject ? goToProject() : close()"
                class="text-gray-400 hover:text-white transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Success State: Show Integration Code -->
            <div v-if="createdProject" class="px-6 py-6 space-y-6">
              <!-- Project Key -->
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-2">Your Project Key</label>
                <div class="flex items-center bg-gray-500/10 border border-gray-500/20 rounded-lg overflow-hidden">
                  <code class="flex-1 px-4 py-3 font-mono text-sm text-white">{{ createdProject.projectKey }}</code>
                  <button
                    @click="copyToClipboard(createdProject.projectKey)"
                    class="px-4 py-3 bg-gray-500/10 hover:bg-gray-500/20 text-white transition-colors"
                    title="Copy"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Integration Code -->
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-2">Add to your app</label>
                <div class="relative">
                  <pre class="bg-gray-900 border border-gray-500/20 rounded-lg p-4 overflow-x-auto text-sm"><code class="text-gray-300"><span class="text-blue-300">import</span> OpenAI <span class="text-blue-300">from</span> <span class="text-green-300">'openai'</span>;

<span class="text-blue-300">const</span> openai = <span class="text-blue-300">new</span> <span class="text-yellow-300">OpenAI</span>({
  <span class="text-white">apiKey</span>: <span class="text-green-300">'sk-your-openai-key'</span>,
  <span class="text-white">baseURL</span>: <span class="text-green-300">'https://api.airatelimit.com/v1'</span>,
  <span class="text-white">defaultHeaders</span>: {
    <span class="text-green-300">'x-project-key'</span>: <span class="text-green-300">'{{ createdProject.projectKey }}'</span>,
    <span class="text-green-300">'x-identity'</span>: userId,
  },
});</code></pre>
                  <button
                    @click="copyIntegrationCode"
                    class="absolute top-2 right-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-xs text-white rounded transition-colors"
                  >
                    {{ copied ? '✓ Copied' : 'Copy' }}
                  </button>
                </div>
              </div>

              <!-- Quick Tips -->
              <div class="bg-blue-300/5 border border-blue-300/20 rounded-lg p-4">
                <p class="text-sm text-blue-200">
                  <strong>That's it!</strong> Your requests now go through the proxy. 
                  Configure limits in settings when you're ready.
                </p>
              </div>

              <!-- Actions -->
              <div class="flex gap-3">
                <button
                  @click="goToProject"
                  class="flex-1 px-6 py-3 bg-blue-300 text-black text-sm font-medium rounded-lg hover:bg-blue-400 transition-colors"
                >
                  Go to Project →
                </button>
              </div>
            </div>

            <!-- Create Form -->
            <div v-else class="px-6 py-6">
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
                  </div>

                  <!-- Error Message -->
                  <div v-if="error" class="bg-red-400/10 text-red-400 p-4 rounded-lg text-sm">
                    {{ error }}
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
const { copy } = useClipboard()
const nameInput = ref<HTMLInputElement | null>(null)

const form = ref({
  name: '',
})

const loading = ref(false)
const error = ref('')
const createdProject = ref<{ id: string; projectKey: string } | null>(null)
const copied = ref(false)

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
    createdProject.value = null
    copied.value = false
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

    // Show success state with integration code
    createdProject.value = {
      id: project.id,
      projectKey: project.projectKey,
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to create project'
  } finally {
    loading.value = false
  }
}

const copyToClipboard = async (text: string) => {
  await copy(text)
}

const copyIntegrationCode = async () => {
  const code = `import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'sk-your-openai-key',
  baseURL: 'https://api.airatelimit.com/v1',
  defaultHeaders: {
    'x-project-key': '${createdProject.value?.projectKey}',
    'x-identity': userId,
  },
});`
  await copy(code)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

const goToProject = () => {
  if (createdProject.value) {
    emit('created', createdProject.value.id)
    close()
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
