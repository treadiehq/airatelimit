<template>
  <NuxtLayout>
    <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h2 class="text-2xl font-bold text-white mb-6">Create New Project</h2>

      <div class="bg-gray-500/10 border border-gray-500/20 p-8 rounded-lg">
        <form @submit.prevent="handleSubmit">
          <div class="mb-4">
            <label class="block text-sm font-medium text-white mb-2">
              Project Name
            </label>
            <input
              v-model="form.name"
              type="text"
              required
              class="w-full px-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-gray-500/10 focus:border-transparent"
              placeholder="My App"
            />
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-white mb-2">
              OpenAI API Key
            </label>
            <input
              v-model="form.openaiApiKey"
              type="text"
              required
              class="w-full px-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-gray-500/10 focus:border-transparent font-mono text-sm"
              placeholder="sk-..."
            />
            <p class="text-xs text-gray-500 mt-1">Your OpenAI API key will be encrypted</p>
          </div>

          <div class="mb-4">
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
            <p class="text-xs text-gray-500 mt-1">
              Choose how to track usage: requests for image generation, tokens for chat, or both
            </p>
          </div>

          <div v-if="form.limitType !== 'tokens'" class="mb-4">
            <label class="block text-sm font-medium text-white mb-2">
              Daily Request Limit
            </label>
            <input
              v-model.number="form.dailyRequestLimit"
              type="number"
              min="0"
              class="w-full px-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-gray-500/10 focus:border-transparent"
              placeholder="100"
            />
            <p class="text-xs text-gray-500 mt-1">Leave empty for unlimited</p>
          </div>

          <div v-if="form.limitType !== 'requests'" class="mb-4">
            <label class="block text-sm font-medium text-white mb-2">
              Daily Token Limit
            </label>
            <input
              v-model.number="form.dailyTokenLimit"
              type="number"
              min="0"
              class="w-full px-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-gray-500/10 focus:border-transparent"
              placeholder="50000"
            />
            <p class="text-xs text-gray-500 mt-1">Leave empty for unlimited</p>
          </div>

          <div class="mb-6">
            <label class="block text-sm font-medium text-white mb-2">
              Limit Exceeded Message (Optional)
            </label>
            <textarea
              v-model="form.limitMessage"
              rows="3"
              class="w-full px-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-gray-500/10 focus:border-transparent"
              placeholder="Daily limit reached. Please upgrade to continue."
            />
            <p class="text-xs text-gray-500 mt-1">Custom message shown when limits are exceeded</p>
          </div>

          <div v-if="error" class="mb-4 p-3 bg-red-400/10 text-red-400 rounded-lg text-sm">
            {{ error }}
          </div>

          <div class="flex space-x-4">
            <button
              type="submit"
              :disabled="loading"
              class="flex-1 px-4 py-2 bg-blue-300 text-black rounded-lg hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ loading ? 'Creating...' : 'Create Project' }}
            </button>
            <NuxtLink
              to="/projects"
              class="px-4 py-2 bg-gray-500/10 border border-gray-500/20 text-white rounded-lg hover:bg-gray-500/20"
            >
              Cancel
            </NuxtLink>
          </div>
        </form>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

useHead({
  title: 'Create Project - AI Rate Limiting'
})

const api = useApi()

const form = ref({
  name: '',
  openaiApiKey: '',
  limitType: 'both' as 'requests' | 'tokens' | 'both',
  dailyRequestLimit: null as number | null,
  dailyTokenLimit: null as number | null,
  limitMessage: '',
})

const loading = ref(false)
const error = ref('')

const handleSubmit = async () => {
  loading.value = true
  error.value = ''

  try {
    const payload: any = {
      name: form.value.name,
      openaiApiKey: form.value.openaiApiKey,
      limitType: form.value.limitType,
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

    const project = await api('/projects', {
      method: 'POST',
      body: payload,
    })

    navigateTo(`/projects/${project.id}`)
  } catch (err: any) {
    error.value = err.message || 'Failed to create project'
  } finally {
    loading.value = false
  }
}
</script>

