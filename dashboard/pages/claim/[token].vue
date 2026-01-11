<template>
  <div class="min-h-screen relative bg-black flex items-center justify-center p-4">
    <div class="radial-gradient absolute top-0 md:right-14 right-5"></div>
    <div class="max-w-md w-full relative z-10">
      <!-- Logo/Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center gap-2 mb-3">
          <img src="/logo.png" alt="AI Ratelimit" class="w-14 h-14">
        </div>
        <h1 class="text-2xl font-bold text-white mb-2">Claim Sponsorship</h1>
        <p class="text-gray-400 text-sm">Someone wants to sponsor your AI usage</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="bg-gray-500/10 border border-gray-500/15 rounded-lg p-8 text-center">
        <div class="animate-spin w-8 h-8 border-2 border-blue-300 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p class="text-gray-400">Loading sponsorship details...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-400/10 border border-red-400/10 rounded-lg p-8 text-center">
        <div class="w-16 h-16 bg-red-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-white mb-2">Unable to Load</h3>
        <p class="text-red-400 text-sm">{{ error }}</p>
        <NuxtLink to="/" class="mt-4 inline-block text-blue-300 hover:text-blue-200 text-sm">
          ← Back to Home
        </NuxtLink>
      </div>

      <!-- Unavailable State -->
      <div v-else-if="sponsorship && !sponsorship.isAvailable" class="bg-gray-500/10 border border-gray-500/15 rounded-lg p-8 text-center">
        <div class="w-16 h-16 bg-amber-300/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-white mb-2">Sponsorship Unavailable</h3>
        <p class="text-gray-400 text-sm">{{ sponsorship.unavailableReason }}</p>
        <NuxtLink to="/" class="mt-4 inline-block text-blue-300 hover:text-blue-200 text-sm">
          ← Back to Home
        </NuxtLink>
      </div>

      <!-- Success State -->
      <div v-else-if="claimed" class="bg-gray-500/10 border border-gray-500/15 rounded-lg p-8 text-center">
        <div class="w-16 h-16 bg-green-300/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-white mb-2">Sponsorship Claimed!</h3>
        <p class="text-gray-400 text-sm mb-4">
          You've successfully claimed <strong class="text-white">{{ claimedSponsorship?.name }}</strong>.
        </p>

        <!-- Show token -->
        <div v-if="claimedToken" class="bg-black border border-gray-500/20 rounded-lg p-4 mb-4">
          <p class="text-xs text-gray-400 mb-2">Your Sponsored Token (save this - shown only once!)</p>
          <code class="text-xs text-blue-300 break-all">{{ claimedToken }}</code>
          <button
            @click="copyToken"
            class="mt-2 text-xs text-gray-400 hover:text-white flex items-center gap-1 mx-auto"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy
          </button>
        </div>

        <NuxtLink to="/sponsorships?tab=received" class="inline-block px-4 py-2 bg-blue-300 text-black rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors">
          View My Sponsorships
        </NuxtLink>
      </div>

      <!-- Claim Form -->
      <div v-else-if="sponsorship" class="bg-gray-500/10 border border-gray-500/15 rounded-lg p-8">
        <!-- Sponsor Info -->
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-blue-300/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-white mb-1">{{ sponsorship.name }}</h3>
          <p v-if="sponsorship.sponsorName" class="text-sm text-gray-400">
            from <span class="text-blue-300">{{ sponsorship.sponsorName }}</span>
          </p>
        </div>

        <!-- Sponsorship Details -->
        <div class="space-y-3 mb-6">
          <div v-if="sponsorship.description" class="text-sm text-gray-300 text-center">
            {{ sponsorship.description }}
          </div>

          <div class="bg-black/30 rounded-lg p-4 space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-400">Budget</span>
              <span class="text-white font-medium">
                ${{ sponsorship.claimType === 'multi_link' && sponsorship.perClaimBudgetUsd 
                  ? sponsorship.perClaimBudgetUsd.toFixed(2) 
                  : sponsorship.budgetUsd?.toFixed(2) || '∞' }}
              </span>
            </div>
            <div v-if="sponsorship.claimType === 'multi_link'" class="flex justify-between text-sm">
              <span class="text-gray-400">Claims Available</span>
              <span class="text-white font-medium">
                {{ (sponsorship.maxClaims || 0) - (sponsorship.currentClaims || 0) }} remaining
              </span>
            </div>
            <div v-if="sponsorship.expiresAt" class="flex justify-between text-sm">
              <span class="text-gray-400">Expires</span>
              <span class="text-white font-medium">
                {{ new Date(sponsorship.expiresAt).toLocaleDateString() }}
              </span>
            </div>
          </div>
        </div>

        <!-- Auth Required Message -->
        <div v-if="!isAuthenticated" class="mb-4">
          <div class="bg-blue-300/10 border border-blue-300/20 rounded-lg p-4 text-center">
            <p class="text-sm text-blue-300 mb-3">
              Sign in or create an account to claim this sponsorship
            </p>
            <div class="flex gap-2 justify-center">
              <NuxtLink 
                :to="`/login?redirect=/claim/${token}`" 
                class="px-4 py-2 bg-blue-300 text-black rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
              >
                Login In
              </NuxtLink>
              <NuxtLink 
                :to="`/signup?redirect=/claim/${token}`" 
                class="px-4 py-2 bg-gray-500/20 text-white rounded-lg text-sm font-medium hover:bg-gray-500/30 transition-colors"
              >
                Sign Up
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- Claim Button -->
        <button
          v-else
          @click="claimSponsorship"
          :disabled="claiming"
          class="w-full px-4 py-3 bg-blue-300 text-black rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ claiming ? 'Claiming...' : 'Claim Sponsorship' }}
        </button>

        <div v-if="claimError" class="mt-4 p-3 bg-red-400/10 border border-red-400/10 text-red-400 rounded-lg text-sm text-center">
          {{ claimError }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
})

const route = useRoute()
const token = route.params.token as string
const api = useApi()
const { isAuthenticated, loadFromStorage } = useAuth()
const { copy } = useClipboard()

const loading = ref(true)
const error = ref('')
const sponsorship = ref<any>(null)
const claiming = ref(false)
const claimError = ref('')
const claimed = ref(false)
const claimedSponsorship = ref<any>(null)
const claimedToken = ref('')

// Load auth state
onMounted(async () => {
  loadFromStorage()
  await loadSponsorship()
})

const loadSponsorship = async () => {
  try {
    loading.value = true
    error.value = ''
    sponsorship.value = await api(`/claim/token/${token}`, { noAuth: true })
  } catch (err: any) {
    error.value = err.message || 'Failed to load sponsorship'
  } finally {
    loading.value = false
  }
}

const claimSponsorship = async () => {
  try {
    claiming.value = true
    claimError.value = ''
    
    const result = await api(`/claim/token/${token}`, { method: 'POST' })
    
    claimed.value = true
    claimedSponsorship.value = result.sponsorship
    claimedToken.value = result.token
  } catch (err: any) {
    claimError.value = err.message || 'Failed to claim sponsorship'
  } finally {
    claiming.value = false
  }
}

const copyToken = () => {
  copy(claimedToken.value)
}

useHead({
  title: sponsorship.value?.name ? `Claim: ${sponsorship.value.name} - AI Ratelimit` : 'Claim Sponsorship - AI Ratelimit',
})
</script>
