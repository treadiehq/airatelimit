<template>
  <div class="min-h-screen bg-black flex items-center justify-center px-4">
    <div class="max-w-md w-full">
      <!-- Loading State -->
      <div v-if="loading" class="text-center">
        <div class="w-12 h-12 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-gray-400">Loading invitation...</p>
      </div>

      <!-- Invalid/Expired Invite -->
      <div v-else-if="!inviteDetails?.valid" class="text-center">
        <div class="w-16 h-16 rounded-full bg-red-400/10 flex items-center justify-center mx-auto mb-6">
          <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 class="text-xl font-bold text-white mb-2">Invalid Invitation</h1>
        <p class="text-gray-400 mb-6">
          This invitation link is invalid or has expired. Please ask your team administrator for a new invitation.
        </p>
        <NuxtLink
          to="/login"
          class="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
        >
          Go to Login
        </NuxtLink>
      </div>

      <!-- Valid Invite -->
      <div v-else class="bg-black border border-gray-500/20 rounded-xl p-8">
        <div class="text-center mb-6">
          <div class="w-16 h-16 rounded-full bg-blue-300/10 flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 class="text-xl font-bold text-white mb-2">You're Invited!</h1>
          <p class="text-gray-400">
            You've been invited to join <span class="text-white font-medium">{{ inviteDetails.organizationName }}</span>
          </p>
        </div>

        <!-- Invite Details -->
        <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-4 mb-6">
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-sm text-gray-400">Email</span>
              <span class="text-sm text-white">{{ inviteDetails.email }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-400">Role</span>
              <span 
                :class="[
                  'text-xs px-2 py-0.5 rounded-full border',
                  roleConfig.bgColor,
                  roleConfig.color
                ]"
              >
                {{ roleConfig.label }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-400">Expires</span>
              <span class="text-sm text-gray-300">{{ formatDate(inviteDetails.expiresAt) }}</span>
            </div>
          </div>
        </div>

        <!-- Not logged in -->
        <div v-if="!isLoggedIn">
          <p class="text-sm text-gray-400 text-center mb-4">
            Use <span class="text-white">{{ inviteDetails.email }}</span> to accept this invitation.
          </p>
          <div class="space-y-3">
            <NuxtLink
              :to="`/login?redirect=${encodeURIComponent('/auth/invite?token=' + token)}`"
              class="w-full inline-flex justify-center items-center gap-2 px-4 py-2.5 bg-blue-300 hover:bg-blue-400 text-black font-medium rounded-lg transition-colors"
            >
              Sign In to Accept
            </NuxtLink>
            <p class="text-xs text-gray-500 text-center">or</p>
            <NuxtLink
              :to="`/signup?token=${token}&email=${encodeURIComponent(inviteDetails.email || '')}`"
              class="w-full inline-flex justify-center items-center gap-2 px-4 py-2.5 border border-gray-500/20 hover:bg-gray-500/10 text-white font-medium rounded-lg transition-colors"
            >
              Create Account to Accept
            </NuxtLink>
          </div>
        </div>

        <!-- Logged in with wrong email -->
        <div v-else-if="user?.email?.toLowerCase() !== inviteDetails.email?.toLowerCase()">
          <div class="bg-amber-300/10 border border-amber-300/10 rounded-lg p-4 mb-4">
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 class="text-sm font-medium text-amber-300">Wrong Account</h3>
                <p class="text-sm text-amber-300/70 mt-1">
                  You're signed in as <span class="font-medium">{{ user?.email }}</span>, but this invitation was sent to <span class="font-medium">{{ inviteDetails.email }}</span>.
                </p>
              </div>
            </div>
          </div>
          <button
            @click="handleLogoutAndLogin"
            class="w-full inline-flex justify-center items-center gap-2 px-4 py-2.5 bg-gray-500/10 hover:bg-gray-500/10 text-gray-400 font-medium rounded-lg transition-colors"
          >
            Sign Out & Use Different Account
          </button>
        </div>

        <!-- Logged in with correct email -->
        <div v-else>
          <button
            @click="handleAccept"
            :disabled="accepting"
            class="w-full inline-flex justify-center items-center gap-2 px-4 py-2.5 bg-blue-300 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium rounded-lg transition-colors"
          >
            <span v-if="accepting">Joining...</span>
            <span v-else>Accept Invitation</span>
          </button>
          <p class="text-xs text-gray-500 text-center mt-3">
            By accepting, you'll leave your current organization and join {{ inviteDetails.organizationName }}.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ROLE_CONFIG, type MemberRole } from '~/composables/useTeam'

definePageMeta({
  layout: false, // No layout for this page
})

useHead({
  title: 'Accept Invitation - AI Ratelimit'
})

const route = useRoute()
const router = useRouter()
const { user, logout } = useAuth()
const { verifyInvite, acceptInvite } = useTeam()

const token = computed(() => route.query.token as string)
const loading = ref(true)
const accepting = ref(false)
const inviteDetails = ref<{
  valid: boolean
  email?: string
  role?: MemberRole
  organizationName?: string
  expiresAt?: string
} | null>(null)

const isLoggedIn = computed(() => !!user.value?.email)

const roleConfig = computed(() => {
  if (!inviteDetails.value?.role) return ROLE_CONFIG.member
  return ROLE_CONFIG[inviteDetails.value.role]
})

const formatDate = (dateString?: string) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const handleAccept = async () => {
  if (!token.value) return
  
  accepting.value = true
  try {
    await acceptInvite(token.value)
    // Redirect to projects page after accepting
    router.push('/projects')
  } catch (err) {
    // Error handled by composable
  } finally {
    accepting.value = false
  }
}

const handleLogoutAndLogin = () => {
  logout()
  router.push(`/login?redirect=/auth/invite?token=${token.value}&email=${inviteDetails.value?.email}`)
}

onMounted(async () => {
  if (!token.value) {
    loading.value = false
    return
  }
  
  try {
    inviteDetails.value = await verifyInvite(token.value)
  } catch (err) {
    inviteDetails.value = { valid: false }
  } finally {
    loading.value = false
  }
})
</script>

