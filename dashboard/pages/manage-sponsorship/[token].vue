<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '~/composables/useToast'

definePageMeta({
  layout: false,
})

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const { showToast } = useToast()

const token = computed(() => route.params.token as string)

// State
const isLoading = ref(true)
const isRevoking = ref(false)
const error = ref('')
const sponsorship = ref<{
  id: string
  name: string
  targetGitHubUsername: string
  spendCapUsd: number
  spentUsd: number
  provider: string
  status: string
  createdAt: string
} | null>(null)

const showRevokeConfirm = ref(false)
const revokeReason = ref('')

onMounted(async () => {
  await fetchSponsorship()
})

async function fetchSponsorship() {
  isLoading.value = true
  error.value = ''
  
  try {
    const response = await fetch(`${config.public.apiBaseUrl}/public/sponsor/manage/${token.value}`)
    
    if (!response.ok) {
      if (response.status === 404) {
        error.value = 'Invalid or expired management link'
      } else {
        error.value = 'Failed to load sponsorship'
      }
      return
    }
    
    sponsorship.value = await response.json()
  } catch (err) {
    error.value = 'Failed to connect to server'
  } finally {
    isLoading.value = false
  }
}

async function revokeSponsorship() {
  isRevoking.value = true
  
  try {
    const response = await fetch(`${config.public.apiBaseUrl}/public/sponsor/manage/${token.value}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: revokeReason.value || undefined }),
    })
    
    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || 'Failed to revoke sponsorship')
    }
    
    showToast('Sponsorship revoked successfully', 'success')
    await fetchSponsorship()
    showRevokeConfirm.value = false
  } catch (err: any) {
    showToast(err.message || 'Failed to revoke sponsorship', 'error')
  } finally {
    isRevoking.value = false
  }
}

const usagePercent = computed(() => {
  if (!sponsorship.value?.spendCapUsd) return 0
  return Math.min(100, (Number(sponsorship.value.spentUsd) / Number(sponsorship.value.spendCapUsd)) * 100)
})

const formattedDate = computed(() => {
  if (!sponsorship.value?.createdAt) return ''
  return new Date(sponsorship.value.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})
</script>

<template>
  <div class="min-h-screen relative bg-black flex items-center justify-center p-4">
    <div class="radial-gradient absolute top-0 md:right-14 right-5"></div>

    <!-- Mobile footer -->
    <div class="fixed bottom-4 left-1/2 -translate-x-1/2 md:hidden z-20">
      <NuxtLink 
        to="/" 
        class="flex items-center gap-2 bg-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-full px-3 py-1.5"
      >
        <span class="text-[9px] text-gray-500">Powered by</span>
        <span class="text-xs font-medium text-white flex items-center gap-1">
          <span class="w-1 h-2.5 bg-blue-400 rounded-full"></span>
          <img src="/logo.png" alt="AI Rate Limiting" class="w-5 h-5">
            <!-- <span class="w-0.5 h-2.5 bg-blue-400 rounded-full"></span>
            <span class="w-0.5 h-2.5 bg-yellow-400 rounded-full"></span> -->
            <span class="text-[11px] font-medium text-white">AI Ratelimit</span>
        </span>
      </NuxtLink>
    </div>

    <div class="w-full max-w-md relative z-10">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center gap-2 mb-3">
          <img src="/logo.png" alt="AI Rate Limiting" class="w-14 h-14">
        </div>
        <h1 class="text-2xl font-bold text-white mb-2">Manage Sponsorship</h1>
        <p class="text-gray-400 text-sm">View and manage your sponsorship</p>
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
          <p class="text-gray-300 mb-4">{{ error }}</p>
          <NuxtLink to="/" class="inline-flex items-center gap-2 text-blue-300 hover:text-blue-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to home
          </NuxtLink>
        </div>
      </div>

      <!-- Sponsorship Details -->
      <div v-else-if="sponsorship" class="relative">
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
        <!-- Status Badge -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-semibold text-white">{{ sponsorship.name }}</h2>
          <span
            :class="[
              'px-2.5 py-1 rounded-full text-xs font-medium',
              sponsorship.status === 'active' ? 'bg-green-300/10 text-green-300' :
              sponsorship.status === 'revoked' ? 'bg-red-400/10 text-red-400' :
              'bg-gray-500/10 text-gray-400'
            ]"
          >
            {{ sponsorship.status }}
          </span>
        </div>

        <!-- Details -->
        <div class="space-y-4 mb-6">
          <div class="flex items-center justify-between py-3 border-b border-gray-500/10">
            <span class="text-gray-400 text-sm">Recipient</span>
            <span class="text-white font-medium">@{{ sponsorship.targetGitHubUsername }}</span>
          </div>
          
          <div class="flex items-center justify-between py-3 border-b border-gray-500/10">
            <span class="text-gray-400 text-sm">Provider</span>
            <span class="text-white font-medium capitalize">{{ sponsorship.provider }}</span>
          </div>
          
          <div class="flex items-center justify-between py-3 border-b border-gray-500/10">
            <span class="text-gray-400 text-sm">Created</span>
            <span class="text-white font-medium">{{ formattedDate }}</span>
          </div>
          
          <div class="py-3">
            <div class="flex items-center justify-between mb-2">
              <span class="text-gray-400 text-sm">Budget Used</span>
              <span class="text-white font-medium">
                ${{ Number(sponsorship.spentUsd).toFixed(2) }} / ${{ Number(sponsorship.spendCapUsd).toFixed(2) }}
              </span>
            </div>
            <div class="w-full h-2 bg-gray-500/20 rounded-full overflow-hidden">
              <div 
                class="h-full bg-blue-300 transition-all duration-300"
                :style="{ width: `${usagePercent}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div v-if="sponsorship.status === 'active'">
          <button
            @click="showRevokeConfirm = true"
            class="w-full px-4 py-2 bg-red-400/10 hover:bg-red-400/20 text-red-400 border border-red-400/20 rounded-lg transition-colors"
          >
            Revoke Sponsorship
          </button>
        </div>

        <div v-else class="text-center text-gray-500 text-sm py-4">
          This sponsorship has been revoked and is no longer active.
        </div>

        <!-- Upgrade CTA -->
        <div class="mt-6 pt-4 border-t border-gray-500/10">
          <p class="text-xs text-gray-500 text-center mb-3">
            Want more control over your sponsorships?
          </p>
          <NuxtLink
            to="/signup"
            class="block w-full px-4 py-2 bg-gray-500/10 border border-gray-500/10 hover:bg-gray-500/20 text-white text-center rounded-lg transition-colors text-sm"
          >
            Create an AI Ratelimit Account
          </NuxtLink>
        </div>
        </div>
      </div>

      <!-- Revoke Confirmation Modal -->
      <Teleport to="body">
        <div v-if="showRevokeConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="fixed inset-0 bg-black/60" @click="showRevokeConfirm = false"></div>
          <div class="relative bg-black border border-gray-500/20 rounded-lg p-6 max-w-md w-full">
            <h3 class="text-lg font-semibold text-white mb-2">Revoke Sponsorship?</h3>
            <p class="text-gray-400 text-sm mb-4">
              This will immediately stop @{{ sponsorship?.targetGitHubUsername }} from using your API credits. This action cannot be undone.
            </p>
            
            <div class="mb-4">
              <label class="block text-sm text-gray-400 mb-2">Reason (optional)</label>
              <input
                v-model="revokeReason"
                type="text"
                placeholder="e.g., Budget exhausted"
                class="w-full px-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-gray-500/10 focus:border-transparent"
              />
            </div>
            
            <div class="flex gap-3">
              <button
                @click="showRevokeConfirm = false"
                class="flex-1 px-4 py-2 bg-gray-500/10 border border-gray-500/10 hover:bg-gray-500/20 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                @click="revokeSponsorship"
                :disabled="isRevoking"
                class="flex-1 px-4 py-2 bg-red-400 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {{ isRevoking ? 'Revoking...' : 'Revoke' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>
