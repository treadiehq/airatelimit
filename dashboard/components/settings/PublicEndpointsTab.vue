<template>
  <div class="px-6 space-y-6">
    <!-- Public Endpoints Header -->
    <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-4">
      <div class="flex items-start gap-3">
        <!-- <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg> -->
        <div>
          <h3 class="font-semibold text-white mb-2">Public Endpoints</h3>
          <p class="text-sm text-gray-400">
            Call the AI API directly from your frontend without exposing API keys. 
            Requests are validated against your allowed origins for security.
          </p>
        </div>
      </div>
    </div>

    <!-- Enable Public Mode -->
    <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-6">
      <div class="flex items-center justify-between">
        <div>
          <h4 class="text-sm font-semibold text-white mb-1">Enable Public Mode</h4>
          <p class="text-xs text-gray-400">Allow frontend requests using only the project key (no Authorization header required).</p>
        </div>
        <button
          type="button"
          @click="editForm.publicModeEnabled = !editForm.publicModeEnabled"
          :class="editForm.publicModeEnabled ? 'bg-blue-300' : 'bg-gray-500/20'"
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
        >
          <span
            :class="editForm.publicModeEnabled ? 'translate-x-6' : 'translate-x-1'"
            class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
          />
        </button>
      </div>

      <!-- Requirements Warning -->
      <div v-if="editForm.publicModeEnabled && !hasStoredProviderKeys" class="mt-4 p-3 bg-orange-300/10 border border-orange-300/10 rounded-lg">
        <div class="flex items-start gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-orange-300 flex-shrink-0 mt-0.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <p class="text-sm text-orange-300 font-medium">Provider keys required</p>
            <p class="text-xs text-orange-300/70 mt-1">
              Public mode requires stored provider keys. Go to the <span class="font-medium">Provider Keys</span> tab to add your API keys.
            </p>
          </div>
        </div>
      </div>

      <!-- Allowed Origins -->
      <div v-if="editForm.publicModeEnabled" class="mt-6 pt-6 border-t border-gray-500/10">
        <label class="block text-sm font-semibold text-white mb-2">Allowed Origins</label>
        <p class="text-xs text-gray-400 mb-4">
          Only requests from these origins will be allowed. Use wildcards for subdomains (e.g., <code class="bg-gray-500/20 px-1 rounded">*.example.com</code>).
        </p>

        <!-- Origins List -->
        <div class="space-y-2 mb-4">
          <div
            v-for="(origin, index) in editForm.allowedOrigins"
            :key="index"
            class="flex items-center gap-2"
          >
            <div class="flex-1 relative">
              <input
                v-model="editForm.allowedOrigins[index]"
                type="text"
                placeholder="https://myapp.com"
                class="w-full px-3 py-2 bg-gray-500/10 border border-gray-500/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-300/10 focus:border-blue-300/10"
              />
            </div>
            <button
              @click="removeOrigin(index)"
              class="p-2 text-gray-400 hover:text-red-400 transition-colors"
              title="Remove origin"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Add Origin Button -->
        <button
          @click="addOrigin"
          class="flex items-center gap-2 px-3 py-2 text-sm text-blue-300 hover:text-blue-300 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Origin
        </button>

        <!-- Common Origins Suggestions -->
        <div v-if="editForm.allowedOrigins.length === 0" class="mt-4 p-3 bg-gray-500/10 border border-gray-500/10 rounded-lg">
          <p class="text-xs text-gray-400 mb-2">Quick add common patterns:</p>
          <div class="flex flex-wrap gap-2">
            <button
              @click="addSuggestedOrigin('http://localhost:3000')"
              class="px-2 py-1 text-xs bg-gray-500/20 text-gray-300 rounded hover:bg-gray-500/30 transition-colors"
            >
              localhost:3000
            </button>
            <button
              @click="addSuggestedOrigin('http://localhost:5173')"
              class="px-2 py-1 text-xs bg-gray-500/20 text-gray-300 rounded hover:bg-gray-500/30 transition-colors"
            >
              localhost:5173
            </button>
            <button
              @click="addSuggestedOrigin('https://*.vercel.app')"
              class="px-2 py-1 text-xs bg-gray-500/20 text-gray-300 rounded hover:bg-gray-500/30 transition-colors"
            >
              *.vercel.app
            </button>
            <button
              @click="addSuggestedOrigin('https://*.netlify.app')"
              class="px-2 py-1 text-xs bg-gray-500/20 text-gray-300 rounded hover:bg-gray-500/30 transition-colors"
            >
              *.netlify.app
            </button>
          </div>
        </div>
      </div>

      <!-- How It Works -->
      <!-- <div v-if="editForm.publicModeEnabled" class="mt-6 pt-6 border-t border-gray-500/20">
        <h4 class="text-sm font-semibold text-white mb-3">How It Works</h4>
        <div class="space-y-3">
          <div class="flex items-start gap-3">
            <div class="w-6 h-6 rounded-full bg-emerald-400/20 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
            <div>
              <p class="text-sm text-white">Store your API keys in Provider Keys tab</p>
              <p class="text-xs text-gray-400">Keys are encrypted and never exposed to clients</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-6 h-6 rounded-full bg-emerald-400/20 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
            <div>
              <p class="text-sm text-white">Add your allowed origins above</p>
              <p class="text-xs text-gray-400">Only requests from these domains are accepted</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-6 h-6 rounded-full bg-emerald-400/20 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
            <div>
              <p class="text-sm text-white">Call the API from your frontend</p>
              <p class="text-xs text-gray-400">Use the project key header - no secrets needed!</p>
            </div>
          </div>
        </div>
      </div> -->

      <!-- Code Example -->
      <!-- <div v-if="editForm.publicModeEnabled" class="mt-6 pt-6 border-t border-gray-500/20">
        <h4 class="text-sm font-semibold text-white mb-3">Frontend Code Example</h4>
        <div class="bg-black/30 rounded-lg p-4 overflow-x-auto">
          <pre class="text-xs text-gray-300 font-mono"><code>// No API key needed! Just the project key
const response = await fetch('{{ apiBaseUrl }}/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-project-key': '{{ projectKey }}',
    'x-identity': 'user_123', // Your user ID for rate limiting
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Hello!' }]
  })
});</code></pre>
        </div>
        <button
          @click="copyCode"
          class="mt-2 flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
          </svg>
          {{ copied ? 'Copied!' : 'Copy code' }}
        </button>
      </div> -->

      <!-- Save Button -->
      <button
        @click="$emit('update')"
        :disabled="updating"
        class="mt-6 w-full px-4 py-2 bg-blue-300 text-black text-sm font-medium rounded-lg hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ updating ? 'Saving...' : 'Save' }}
      </button>
    </div>

    <!-- Security Notice -->
    <!-- <div class="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
      <div class="flex items-start gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
        <div>
          <h4 class="text-sm font-medium text-white mb-1">Security Notes</h4>
          <ul class="text-xs text-gray-400 space-y-1">
            <li>• Origin validation uses the <code class="bg-gray-700 px-1 rounded">Origin</code> header, which browsers set automatically</li>
            <li>• Your actual API keys are never exposed to the client</li>
            <li>• Rate limits and identity tracking still apply</li>
            <li>• Non-browser clients (curl, Postman) cannot spoof origins in the same way</li>
          </ul>
        </div>
      </div>
    </div> -->
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  projectId: string
  projectKey: string
  editForm: any
  updating: boolean
  hasStoredProviderKeys: boolean
}>()

defineEmits<{
  (e: 'update'): void
}>()

const config = useRuntimeConfig()
const apiBaseUrl = config.public.apiBaseUrl || 'https://api.airatelimit.com'

const copied = ref(false)

// Initialize allowedOrigins if not set
if (!props.editForm.allowedOrigins) {
  props.editForm.allowedOrigins = []
}

const addOrigin = () => {
  props.editForm.allowedOrigins.push('')
}

const removeOrigin = (index: number) => {
  props.editForm.allowedOrigins.splice(index, 1)
}

const addSuggestedOrigin = (origin: string) => {
  if (!props.editForm.allowedOrigins.includes(origin)) {
    props.editForm.allowedOrigins.push(origin)
  }
}

const copyCode = async () => {
  const code = `// No API key needed! Just the project key
const response = await fetch('${apiBaseUrl}/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-project-key': '${props.projectKey}',
    'x-identity': 'user_123', // Your user ID for rate limiting
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Hello!' }]
  })
});`

  try {
    await navigator.clipboard.writeText(code)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}
</script>

