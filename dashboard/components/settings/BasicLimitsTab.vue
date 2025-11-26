<template>
  <div class="space-y-4">
    <!-- Transparent Proxy Mode Info -->
    <div class="mx-6 mt-4 bg-blue-300/10 border border-blue-300/20 rounded-lg p-4">
      <div class="flex">
        <svg class="w-5 h-5 text-blue-300 mt-0.5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <div>
          <p class="font-medium text-blue-200 mb-1">Proxy</p>
          <p class="text-sm text-blue-300/80">
            Your API key is passed per-request, we never store it. Just point your OpenAI SDK to our proxy with your project key.
          </p>
          <div class="mt-3 p-3 bg-black/30 rounded-lg font-mono text-xs text-gray-300">
            <div class="text-gray-500 mb-1">// Use with any OpenAI-compatible SDK:</div>
            <div><span class="text-blue-300">baseURL:</span> "https://api.airatelimit.com/v1"</div>
            <div><span class="text-blue-300">headers:</span> {{ '{' }} "x-project-key": "{{ project.projectKey || 'pk_...' }}", "x-identity": "user-123" {{ '}' }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Basic Limits Form -->
    <form @submit.prevent="$emit('update')" class="space-y-4 px-6">
      <div>
        <label class="block text-sm font-medium text-white mb-2">Project Name</label>
        <input
          v-model="editForm.name"
          type="text"
          class="w-full px-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-blue-300/50 focus:border-transparent"
        />
      </div>

      <!-- Limit Period -->
      <div>
        <label class="block text-sm font-medium text-white mb-2">Limit Period</label>
        <div class="relative">
          <select
            v-model="editForm.limitPeriod"
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
        <p class="text-xs text-gray-400 mt-1">Reset limits daily, weekly, or monthly</p>
      </div>

      <!-- Limit Type -->
      <div>
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

      <div v-if="editForm.limitType !== 'tokens'">
        <label class="block text-sm font-medium text-white mb-2">Request Limit</label>
        <input
          v-model.number="editForm.dailyRequestLimit"
          type="number"
          min="0"
          class="w-full px-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-blue-300/50 focus:border-transparent"
        />
        <p class="text-xs text-gray-500 mt-1">Leave empty for unlimited</p>
      </div>

      <div v-if="editForm.limitType !== 'requests'">
        <label class="block text-sm font-medium text-white mb-2">Token Limit</label>
        <input
          v-model.number="editForm.dailyTokenLimit"
          type="number"
          min="0"
          class="w-full px-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-blue-300/50 focus:border-transparent"
        />
        <p class="text-xs text-gray-500 mt-1">Leave empty for unlimited</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-white mb-2">Limit Exceeded Message</label>
        <textarea
          v-model="editForm.limitMessage"
          rows="3"
          placeholder='{"error": "limit_exceeded", "message": "Upgrade to Pro!", "deepLink": "myapp://upgrade"}'
          class="w-full px-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-blue-300/50 focus:border-transparent"
        />
        <p class="text-xs text-gray-500 mt-1">Custom JSON response sent when limits are exceeded</p>
      </div>

      <div v-if="updateError" class="p-3 bg-red-400/10 text-red-400 rounded-lg text-sm">
        {{ updateError }}
      </div>

      <div v-if="updateSuccess" class="p-3 bg-green-300/10 text-green-300 rounded-lg text-sm">
        Configuration updated successfully!
      </div>

      <button
        type="submit"
        :disabled="updating"
        class="w-full px-6 py-2 bg-blue-300 text-black text-sm font-medium rounded-lg hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ updating ? 'Saving...' : 'Save Changes' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  project: any
  editForm: any
  updating: boolean
  updateError: string
  updateSuccess: boolean
}>()

defineEmits<{
  (e: 'update'): void
}>()
</script>

