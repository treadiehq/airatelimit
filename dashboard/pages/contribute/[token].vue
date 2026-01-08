<template>
  <div class="min-h-screen bg-black flex items-center justify-center p-4">
    <!-- Loading State -->
    <div v-if="loading" class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-300 mx-auto"></div>
      <p class="text-gray-400 mt-4">Loading contribution page...</p>
    </div>

    <!-- Error State (Invalid/Expired Link) -->
    <div v-else-if="error" class="text-center max-w-md">
      <div class="w-16 h-16 bg-red-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h1 class="text-2xl font-bold text-white mb-2">Invalid or Expired Link</h1>
      <p class="text-gray-400">
        This contribution link is no longer valid. It may have expired, been revoked, or reached its contribution limit.
      </p>
      <NuxtLink to="/" class="inline-block mt-6 px-6 py-2 bg-gray-500/10 text-gray-300 border border-gray-500/10 hover:bg-gray-500/15 rounded-lg transition-colors">
        Go to Homepage
      </NuxtLink>
    </div>

    <!-- Success State -->
    <div v-else-if="success" class="text-center max-w-md">
      <div class="w-16 h-16 bg-green-300/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg class="w-8 h-8 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 class="text-2xl font-bold text-white mb-2">Contribution Successful!</h1>
      <p class="text-gray-400">
        Your API key has been added to <span class="text-white font-medium">{{ projectName }}</span>.
        It will now be used to serve requests for this project.
      </p>
      
      <!-- For authenticated users: Link to Sponsor page -->
      <div v-if="isAuthenticated" class="mt-6">
        <NuxtLink
          to="/sponsor?tab=keys"
          class="inline-flex items-center text-sm gap-2 px-6 py-3 bg-blue-300 hover:bg-blue-400 text-black font-semibold rounded-lg transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          View Your Contributions
        </NuxtLink>
        <p class="text-sm text-gray-500 mt-3">
          You can manage all your contributed keys from the Sponsor page.
        </p>
      </div>
      
      <!-- For anonymous contributors: Management Link -->
      <div v-else-if="managementToken" class="mt-6 p-4 bg-amber-300/10 border border-amber-300/10 rounded-xl text-left">
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 text-amber-300 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div class="flex-1">
            <h4 class="text-sm font-semibold text-amber-300 mb-1">Important: Save This Link!</h4>
            <p class="text-xs text-gray-400 mb-3">
              This is your only way to manage or revoke your contribution. Bookmark it now!
            </p>
            <div class="flex items-center gap-2">
              <input
                :value="managementUrl"
                readonly
                class="flex-1 px-3 py-2 bg-gray-500/10 border border-gray-500/10 rounded-lg text-xs text-gray-300 font-mono"
              />
              <button
                @click="copyManagementLink"
                class="px-3 py-2 bg-amber-400/20 hover:bg-amber-400/30 text-amber-400 rounded-lg transition-colors"
              >
                <svg v-if="!copied" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <p class="text-sm text-gray-500 mt-4">
        Note: The project owner can view your contribution but cannot see your actual API key.
      </p>
    </div>

    <!-- Contribution Form -->
    <div v-else class="w-full max-w-lg">
      <div class="bg-gray-500/10 border border-gray-500/10 rounded-2xl p-8">
        <!-- Header -->
        <div class="text-center mb-8">
          <div class="w-14 h-14 rounded-lg flex items-center justify-center mx-auto mb-4">
            <img src="/logo.png" alt="AI Ratelimit Logo" class="w-14 h-14">
            <!-- <svg class="w-7 h-7 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg> -->
          </div>
          <h1 class="text-2xl font-bold text-white mb-2">Contribute Your API Key</h1>
          <p class="text-gray-400">
            You've been invited to contribute to
            <span class="text-white font-medium">{{ projectName }}</span>
          </p>
        </div>

        <!-- Form -->
        <form @submit.prevent="submitContribution" class="space-y-5">
          <!-- Provider Selection -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">Provider</label>
            <div class="relative">
              <select
                v-model="form.provider"
                required
                class="w-full px-4 py-2.5 bg-gray-500/10 border border-gray-500/10 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300/50 focus:border-blue-300/30 appearance-none cursor-pointer hover:bg-gray-500/15 transition-colors"
              >
                <option v-for="provider in providers" :key="provider.value" :value="provider.value">
                  {{ provider.label }}
                </option>
              </select>
              <!-- Custom dropdown arrow -->
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <!-- API Key -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">API Key</label>
            <div class="relative">
              <input
                v-model="form.apiKey"
                :type="showApiKey ? 'text' : 'password'"
                required
                placeholder="sk-..."
                class="w-full px-3 py-2.5 pr-10 bg-gray-500/10 border border-gray-500/10 rounded-lg text-gray-300 placeholder-gray-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button
                type="button"
                @click="showApiKey = !showApiKey"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <svg v-if="showApiKey" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-1.5">
              Your key is encrypted at rest and never shared with others.
            </p>
          </div>

          <!-- Display Name (Optional) -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">Display Name (optional)</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="My Personal Key"
              class="w-full px-3 py-2.5 bg-gray-500/10 border border-gray-500/10 rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <!-- Monthly Limit (Optional) -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">Monthly Token Limit (optional)</label>
            <input
              v-model.number="form.monthlyTokenLimit"
              type="number"
              min="0"
              placeholder="No limit"
              class="w-full px-3 py-2.5 bg-gray-500/10 border border-gray-500/10 rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <p class="text-xs text-gray-500 mt-1.5">
              Set a cap on how many tokens can be used from your key each month.
            </p>
          </div>

          <!-- Email (Optional, for anonymous contributors) -->
          <div v-if="!isAuthenticated">
            <label class="block text-sm font-medium text-gray-300 mb-1.5">Email (optional)</label>
            <input
              v-model="form.contributorEmail"
              type="email"
              placeholder="your@email.com"
              class="w-full px-3 py-2.5 bg-gray-500/10 border border-gray-500/10 rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <p class="text-xs text-gray-500 mt-1.5">
              We'll send you a management link so you can track usage or revoke your key later.
            </p>
          </div>

          <!-- Warning for anonymous contributors -->
          <div v-if="!isAuthenticated" class="p-3 bg-amber-400/10 border border-amber-400/20 rounded-lg">
            <div class="flex items-start gap-2">
              <svg class="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p class="text-xs text-amber-300">
                <span class="font-semibold">Contributing without an account?</span>
                You'll receive a secret link to manage your contribution. Without this link or an email, you won't be able to track usage or revoke your key.
              </p>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="submitError" class="p-3 bg-red-400/10 border border-red-400/20 rounded-lg text-red-400 text-sm">
            {{ submitError }}
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="submitting || !form.apiKey"
            class="w-full py-3 px-4 bg-blue-300 hover:bg-blue-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-colors"
          >
            <span v-if="submitting">Contributing...</span>
            <span v-else>Contribute</span>
          </button>
        </form>

        <!-- Security Note -->
        <div class="mt-6 pt-6 border-t border-gray-500/10">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-green-300 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <h4 class="text-sm font-medium text-gray-300">Your key is secure</h4>
              <p class="text-xs text-gray-500 mt-0.5">
                Keys are encrypted using AES-256-GCM before storage. No one, can view your actual API key, only usage statistics.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false, // No nav/footer for this public page
})

const route = useRoute()
const token = route.params.token as string

const loading = ref(true)
const error = ref(false)
const success = ref(false)
const submitting = ref(false)
const submitError = ref('')
const showApiKey = ref(false)
const copied = ref(false)

const projectName = ref('')
const projectId = ref('')
const managementToken = ref<string | null>(null)
const isAuthenticated = ref(false)

const providers = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'xai', label: 'xAI' },
  { value: 'other', label: 'Other' },
] as const

const form = ref({
  provider: 'openai' as 'openai' | 'anthropic' | 'google' | 'xai' | 'other',
  apiKey: '',
  name: '',
  monthlyTokenLimit: null as number | null,
  contributorEmail: '',
})

const managementUrl = computed(() => {
  if (!managementToken.value) return ''
  return `${window.location.origin}/contribute/manage/${managementToken.value}`
})

function copyManagementLink() {
  if (!managementUrl.value) return
  navigator.clipboard.writeText(managementUrl.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

// Fetch invite details on mount
onMounted(async () => {
  // Check if user is authenticated
  const authToken = process.client ? localStorage.getItem('accessToken') : null
  isAuthenticated.value = !!authToken
  
  try {
    const config = useRuntimeConfig()
    const response = await fetch(`${config.public.apiBaseUrl}/contribute/${token}`)
    
    if (!response.ok) {
      error.value = true
      return
    }
    
    const data = await response.json()
    projectName.value = data.projectName || data.project?.name
    projectId.value = data.projectId || data.project?.id
  } catch (err) {
    console.error('Failed to load invite:', err)
    error.value = true
  } finally {
    loading.value = false
  }
})

async function submitContribution() {
  submitting.value = true
  submitError.value = ''
  
  try {
    const config = useRuntimeConfig()
    const authToken = process.client ? localStorage.getItem('accessToken') : null
    
    const payload = {
      projectId: projectId.value,
      provider: form.value.provider,
      apiKey: form.value.apiKey,
      name: form.value.name || undefined,
      monthlyTokenLimit: form.value.monthlyTokenLimit || undefined,
      contributorEmail: form.value.contributorEmail || undefined,
    }
    
    let response: Response
    let usedAuthEndpoint = false
    
    // Try authenticated endpoint first if we have a token
    if (authToken) {
      response = await fetch(`${config.public.apiBaseUrl}/contribute/${token}/authenticated`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      })
      
      // If auth failed (401/403), fall back to anonymous endpoint
      if (response.status === 401 || response.status === 403) {
        // Clear invalid token
        localStorage.removeItem('accessToken')
        isAuthenticated.value = false
        
        response = await fetch(`${config.public.apiBaseUrl}/contribute/${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        usedAuthEndpoint = true
      }
    } else {
      // No token, use anonymous endpoint
      response = await fetch(`${config.public.apiBaseUrl}/contribute/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }
    
    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || 'Failed to contribute key')
    }
    
    const data = await response.json()
    
    // Update isAuthenticated based on whether we successfully used the auth endpoint
    isAuthenticated.value = usedAuthEndpoint
    
    // Store management token for anonymous contributors (only returned once!)
    if (data.managementToken) {
      managementToken.value = data.managementToken
    }
    
    success.value = true
  } catch (err: any) {
    submitError.value = err.message || 'Failed to contribute key'
  } finally {
    submitting.value = false
  }
}
</script>

