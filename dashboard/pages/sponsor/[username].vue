<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'

definePageMeta({
  layout: false,
})

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const { user, isAuthenticated } = useAuth()
const toast = useToast()

const username = computed(() => route.params.username as string)

// Form state
const isLoading = ref(false)
const isSubmitting = ref(false)
const recipientInfo = ref<{ username: string; displayName: string } | null>(null)
const error = ref('')

// Form fields
const apiKey = ref('')
const provider = ref<'openai' | 'anthropic' | 'google' | 'xai'>('openai')
const sponsorEmail = ref('')
const spendCapUsd = ref<number | null>(10)
const customAmount = ref('')
const showCustomAmount = ref(false)

// Preset amounts
const presetAmounts = [5, 10, 25, 50, 100]

// Result state
const result = ref<{
  id: string
  name: string
  status: string
  message: string
  managementToken?: string
} | null>(null)

// Provider options
const providers = [
  { value: 'openai', label: 'OpenAI', placeholder: 'sk-...' },
  { value: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-...' },
  { value: 'google', label: 'Google AI', placeholder: 'AIza...' },
  { value: 'xai', label: 'xAI', placeholder: 'xai-...' },
]

const selectedProvider = computed(() => providers.find(p => p.value === provider.value))

onMounted(async () => {
  await fetchRecipientInfo()
})

async function fetchRecipientInfo() {
  isLoading.value = true
  error.value = ''
  
  try {
    const response = await fetch(`${config.public.apiBaseUrl}/public/sponsor/${username.value}`)
    
    if (!response.ok) {
      if (response.status === 404) {
        error.value = `User @${username.value} hasn't set up their sponsor page yet`
      } else {
        error.value = 'Failed to load recipient info'
      }
      return
    }
    
    recipientInfo.value = await response.json()
  } catch (err) {
    error.value = 'Failed to connect to server'
  } finally {
    isLoading.value = false
  }
}

function selectAmount(amount: number | null) {
  if (amount === null) {
    showCustomAmount.value = true
    spendCapUsd.value = null
  } else {
    showCustomAmount.value = false
    spendCapUsd.value = amount
  }
}

function updateCustomAmount() {
  const parsed = parseFloat(customAmount.value)
  if (!isNaN(parsed) && parsed > 0) {
    spendCapUsd.value = parsed
  } else {
    spendCapUsd.value = null
  }
}

// Validate API key format matches provider
function validateApiKey(): { valid: boolean; error?: string } {
  const key = apiKey.value.trim()
  
  if (!key || key.length < 10) {
    return { valid: false, error: 'API key is too short' }
  }
  
  switch (provider.value) {
    case 'openai':
      if (!key.startsWith('sk-')) {
        return { valid: false, error: 'OpenAI keys should start with "sk-"' }
      }
      break
    case 'anthropic':
      if (!key.startsWith('sk-ant-')) {
        return { valid: false, error: 'Anthropic keys should start with "sk-ant-"' }
      }
      break
    case 'google':
      if (!key.startsWith('AIza')) {
        return { valid: false, error: 'Google AI keys should start with "AIza"' }
      }
      break
    case 'xai':
      if (!key.startsWith('xai-')) {
        return { valid: false, error: 'xAI keys should start with "xai-"' }
      }
      break
  }
  
  return { valid: true }
}

// Computed: is the current key valid for the selected provider
const apiKeyError = computed(() => {
  if (!apiKey.value) return null
  const validation = validateApiKey()
  return validation.valid ? null : validation.error
})

async function submitSponsorship() {
  if (!apiKey.value) {
    toast.error('Please enter your API key')
    return
  }
  
  // Validate API key format
  const keyValidation = validateApiKey()
  if (!keyValidation.valid) {
    toast.error(keyValidation.error || 'Invalid API key format')
    return
  }
  
  if (!spendCapUsd.value || spendCapUsd.value <= 0) {
    toast.error('Please select or enter a valid budget amount')
    return
  }
  
  if (!isAuthenticated.value && !sponsorEmail.value) {
    toast.error('Please enter your email to receive the management link')
    return
  }
  
  isSubmitting.value = true
  
  try {
    const token = localStorage.getItem('accessToken')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    const response = await fetch(`${config.public.apiBaseUrl}/public/sponsor/${username.value}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        apiKey: apiKey.value,
        provider: provider.value,
        sponsorEmail: sponsorEmail.value || undefined,
        spendCapUsd: spendCapUsd.value,
      }),
    })
    
    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || 'Failed to create sponsorship')
    }
    
    result.value = await response.json()
    toast.success('Sponsorship created successfully!')
  } catch (err: any) {
    toast.error(err.message || 'Failed to create sponsorship')
  } finally {
    isSubmitting.value = false
  }
}

</script>

<template>
  <div class="min-h-screen relative bg-black flex items-center justify-center p-4">
    <div class="radial-gradient absolute top-0 md:right-14 right-5"></div>

    <div class="w-full max-w-md relative z-10">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center gap-2 mb-3">
          <img src="/logo.png" alt="AI Rate Limiting" class="w-14 h-14">
        </div>
        <h1 class="text-2xl font-bold text-white mb-2">
          Sponsor @{{ username }}
        </h1>
        <p class="text-gray-400 text-sm">
          Share your AI API credits with {{ recipientInfo?.displayName || username }}
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="bg-gray-500/10 border border-gray-500/15 rounded-lg p-8">
        <div class="flex items-center justify-center">
          <div class="animate-spin rounded-full h-8 w-8 border-2 border-blue-300 border-t-transparent"></div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-gray-500/10 border border-gray-500/15 rounded-lg p-8">
        <div class="text-center">
          <div class="w-12 h-12 bg-red-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p class="text-gray-300">{{ error }}</p>
          <NuxtLink to="/" class="inline-flex items-center gap-2 mt-4 text-blue-300 hover:text-blue-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to home
          </NuxtLink>
        </div>
      </div>

      <!-- Success State -->
      <div v-else-if="result" class="bg-gray-500/10 border border-gray-500/15 rounded-lg p-8">
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-green-300/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 class="text-xl font-semibold text-white mb-2">Sponsorship Created!</h2>
          <p class="text-gray-400 text-sm">
            You've sponsored @{{ username }} with ${{ spendCapUsd?.toFixed(2) }} in {{ selectedProvider?.label }} credits
          </p>
        </div>

        <!-- Pending Status Info -->
        <div class="bg-blue-300/10 border border-blue-300/10 rounded-lg p-4 mb-6">
          <div class="flex gap-3">
            <svg class="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p class="text-blue-300 text-sm font-medium mb-1">Awaiting Acceptance</p>
              <p class="text-blue-300/70 text-sm">
                {{ result.message || 'The recipient will need to accept this sponsorship before they can use the API credits.' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Management Link Note -->
        <div v-if="result.managementToken" class="bg-yellow-300/10 border border-yellow-300/10 rounded-lg p-4 mb-6">
          <div class="flex gap-3">
            <svg class="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <div>
              <p class="text-yellow-300 text-sm font-medium mb-1">Check your email</p>
              <p class="text-yellow-300/70 text-sm">
                We've sent a management link to your email. Save it to revoke or manage this sponsorship later.
              </p>
            </div>
          </div>
        </div>

        <div class="flex gap-3">
          <button
            @click="result = null; apiKey = ''"
            class="flex-1 px-4 py-2 bg-gray-500/10 border border-gray-500/10 text-white rounded-lg hover:bg-gray-500/20 transition-colors"
          >
            Sponsor Again
          </button>
          <NuxtLink
            to="/"
            class="flex-1 px-4 py-2 bg-blue-300 text-black font-medium rounded-lg hover:bg-blue-400 transition-colors text-center"
          >
            Done
          </NuxtLink>
        </div>
      </div>

      <!-- Sponsor Form -->
      <div v-else class="relative">
        <!-- Powered by badge - attached to card -->
        <NuxtLink 
          to="/" 
          class="bg-gray-500/10 border border-gray-500/15 border-b-0 border-l-lg rounded-r-lg hover:bg-gray-500/20 transition-colors flex flex-row rot items-center justify-start origin-bottom-left py-1.5 px-3 gap-1 rounded-b-none absolute left-0 -ml-[0px] top-0 rounded-md"
        >
          <span class="text-[9px] text-gray-500 uppercase tracking-wider">Powered by</span>
          <span class="text-[11px] font-medium text-white flex items-center gap-0.5">
            <img src="/logo.png" alt="AI Rate Limiting" class="w-5 h-5">
            <!-- <span class="w-0.5 h-2.5 bg-blue-400 rounded-full"></span>
            <span class="w-0.5 h-2.5 bg-yellow-400 rounded-full"></span> -->
            <span class="text-[11px] font-medium text-white">AI Ratelimit</span>
            <!-- AI Ratelimit -->
          </span>
        </NuxtLink>
        
        <div class="bg-gray-500/10 border border-gray-500/15 rounded-lg p-8">
        <form @submit.prevent="submitSponsorship" class="space-y-6">
          <!-- Provider Selection -->
          <div>
            <label class="block text-sm font-medium text-white mb-2">
              AI Provider
            </label>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="p in providers"
                :key="p.value"
                type="button"
                @click="provider = p.value as any"
                :class="[
                  'px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                  provider === p.value
                    ? 'bg-blue-300 border-blue-300 text-black'
                    : 'bg-gray-500/10 border-gray-500/10 text-gray-300 hover:border-gray-500/30'
                ]"
              >
                {{ p.label }}
              </button>
            </div>
          </div>

          <!-- API Key -->
          <div>
            <label class="block text-sm font-medium text-white mb-2">
              Your {{ selectedProvider?.label }} API Key
            </label>
            <input
              v-model="apiKey"
              type="password"
              :placeholder="selectedProvider?.placeholder"
              :class="[
                'w-full px-4 py-2 text-white bg-gray-500/10 border rounded-lg focus:ring-2 focus:ring-gray-500/10 focus:border-transparent',
                apiKeyError ? 'border-red-400/50' : 'border-gray-500/10'
              ]"
              required
            />
            <p v-if="apiKeyError" class="text-xs text-red-400 mt-1.5">
              {{ apiKeyError }}
            </p>
            <p v-else class="text-xs text-gray-500 mt-1.5">
              Your key is encrypted and only used for {{ username }}'s requests
            </p>
          </div>

          <!-- Budget Amount -->
          <div>
            <label class="block text-sm font-medium text-white mb-2">
              Monthly Budget
            </label>
            <div class="grid grid-cols-3 gap-2 mb-2">
              <button
                v-for="amount in presetAmounts"
                :key="amount"
                type="button"
                @click="selectAmount(amount)"
                :class="[
                  'px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                  spendCapUsd === amount && !showCustomAmount
                    ? 'bg-blue-300 border-blue-300 text-black'
                    : 'bg-gray-500/10 border-gray-500/10 text-gray-300 hover:border-gray-500/30'
                ]"
              >
                ${{ amount }}
              </button>
              <button
                type="button"
                @click="selectAmount(null)"
                :class="[
                  'px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                  showCustomAmount
                    ? 'bg-blue-300 border-blue-300 text-black'
                    : 'bg-gray-500/10 border-gray-500/10 text-gray-300 hover:border-gray-500/30'
                ]"
              >
                Custom
              </button>
            </div>
            <input
              v-if="showCustomAmount"
              v-model="customAmount"
              @input="updateCustomAmount"
              type="text"
              placeholder="Enter amount (e.g., 75)"
              class="w-full px-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-gray-500/10 focus:border-transparent"
            />
          </div>

          <!-- Email (for anonymous users) -->
          <div v-if="!isAuthenticated">
            <label class="block text-sm font-medium text-white mb-2">
              Your Email
            </label>
            <input
              v-model="sponsorEmail"
              type="email"
              placeholder="you@example.com"
              class="w-full px-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-gray-500/10 focus:border-transparent"
              required
            />
            <p class="text-xs text-gray-500 mt-1.5">
              We'll send you a link to manage this sponsorship
            </p>
          </div>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="isSubmitting || !!apiKeyError"
            class="w-full px-4 py-2 font-medium bg-blue-300 text-black rounded-lg hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isSubmitting" class="flex items-center justify-center gap-2">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating...
            </span>
            <span v-else>
              Sponsor @{{ username }} with ${{ spendCapUsd?.toFixed(2) || '0.00' }}
            </span>
          </button>
        </form>
        </div>
      </div>
    </div>

    <!-- Mobile footer -->
    <div class="fixed bottom-4 left-1/2 -translate-x-1/2 md:hidden z-20">
      <NuxtLink 
        to="/" 
        class="flex items-center gap-2 bg-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-full px-3 py-1.5"
      >
        <span class="text-[10px] text-gray-500">Powered by</span>
        <span class="text-xs font-medium text-white flex items-center gap-1">
          <span class="w-1 h-2.5 bg-blue-400 rounded-full"></span>
          <span class="w-1 h-2.5 bg-yellow-400 rounded-full"></span>
          AI Ratelimit
        </span>
      </NuxtLink>
    </div>
  </div>
</template>
