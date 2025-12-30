<template>
  <div class="min-h-screen bg-black">
    <nav class="bg-black border-b border-gray-500/20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-10 items-center">
          <div class="flex items-center space-x-4">
            <NuxtLink to="/projects" class="text-base font-medium text-white">
              <img src="/logo.png" alt="AI Rate Limiting" class="w-6 h-6">
            </NuxtLink>
            <span class="text-sm text-gray-500/50">|</span>
            <div class="text-sm text-white font-medium">{{ organization?.name || 'Loading...' }}</div>
          </div>
          
          <div class="flex items-center space-x-4">
            <!-- Plan badge (cloud mode only, shown for owners after data loads) -->
            <NuxtLink 
              v-if="features.showBilling && planLoaded && isOwner"
              to="/billing"
              :class="[
                'relative text-[10px] font-medium px-2.5 py-1 rounded-md transition-all duration-300',
                planBadgeClasses,
                isTrialUrgent ? 'shadow-[0_0_12px_rgba(251,146,60,0.4)]' : ''
              ]"
            >
              <!-- Animated glow ring for urgent trials -->
              <span 
                v-if="isTrialUrgent" 
                class="absolute inset-0 rounded-md opacity-75"
                :class="trialDaysRemaining <= 0 ? 'bg-red-400/10' : 'bg-orange-300/10'"
              ></span>
              <span class="relative">{{ planLabel }}</span>
            </NuxtLink>
            
            <!-- User dropdown -->
            <div class="relative">
              <button
                @click="toggleDropdown"
                class="flex items-center space-x-2 focus:outline-none"
              >
                <div class="w-6 h-6 bg-amber-300/50 rounded-full flex items-center justify-center text-white font-medium text-[10px]">
                  {{ userInitials }}
                </div>
              </button>

              <!-- Dropdown Menu -->
              <div
                v-if="showDropdown"
                class="absolute right-0 mt-2 w-56 bg-black rounded-lg shadow-lg border border-gray-500/20 py-1 z-50"
              >
                <div class="px-4 py-3 border-b border-gray-500/20">
                  <p class="text-sm text-gray-400">Signed in as</p>
                  <p class="text-sm font-medium text-white truncate">{{ user?.email }}</p>
                  <!-- Deployment mode badge -->
                  <!-- <p class="text-xs text-gray-500 mt-1 capitalize">{{ mode }} mode</p> -->
                </div>
                
                <!-- Billing link in dropdown (cloud mode, owners only) -->
                <NuxtLink
                  v-if="features.showBilling && isOwner"
                  to="/billing"
                  @click="showDropdown = false"
                  class="w-full text-left px-4 py-2 text-xs text-gray-400 hover:bg-gray-500/10 hover:text-white flex items-center justify-between"
                >
                  <span class="flex items-center space-x-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <span>Billing</span>
                  </span>
                  <span v-if="planLoaded" :class="['text-[10px] px-2 py-0.5 rounded-full', planBadgeClasses]">
                    {{ planLabel }}
                  </span>
                </NuxtLink>
                
                <!-- Team link (cloud + enterprise mode) -->
                <NuxtLink
                  v-if="features.showTeamManagement"
                  to="/team"
                  @click="showDropdown = false"
                  class="w-full text-left px-4 py-2 text-xs text-gray-400 hover:bg-gray-500/10 hover:text-white flex items-center space-x-2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>Team</span>
                </NuxtLink>
                
                <!-- Admin link (cloud mode, admin users only) -->
                <NuxtLink
                  v-if="mode === 'cloud' && isAdmin"
                  to="/admin"
                  @click="showDropdown = false"
                  class="w-full text-left px-4 py-2 text-xs text-gray-400 hover:bg-gray-500/10 hover:text-white flex items-center space-x-2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Admin</span>
                </NuxtLink>
                
                <button
                  @click="handleLogout"
                  class="w-full text-left px-4 py-2 text-xs text-gray-400 hover:bg-gray-500/10 hover:text-white flex items-center space-x-2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <!-- Enterprise Upsell Banner (self-hosted only) -->
    <!-- <div v-if="features.showEnterpriseUpsell && !dismissedUpsell" class="bg-purple-300/10 border-b border-purple-300/10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div class="flex items-center justify-between">
          <p class="text-sm text-gray-300">
            <span class="font-medium text-purple-300">Self-hosted mode.</span>
            Need SSO, audit logs, or team management?
            <a :href="enterpriseUpgradeUrl" target="_blank" rel="noopener noreferrer" class="text-purple-300 hover:text-purple-200 underline ml-1">
              Upgrade to Enterprise →
            </a>
          </p>
          <button @click="dismissUpsell" class="text-gray-500 hover:text-gray-300 p-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div> -->

    <!-- Enterprise License Warning Banner -->
    <div v-if="isEnterprise && expirationWarning" :class="[
      'border-b',
      expirationWarning.type === 'error' 
        ? 'bg-red-400/10 border-red-400/10' 
        : 'bg-yellow-300/10 border-yellow-300/10'
    ]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div class="flex items-center justify-between">
          <p :class="[
            'text-sm flex items-center gap-2',
            expirationWarning.type === 'error' ? 'text-red-400' : 'text-yellow-300'
          ]">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{{ expirationWarning.message }}</span>
          </p>
          <a 
            href="mailto:sales@airatelimit.com" 
            :class="[
              'text-sm font-medium px-3 py-1 rounded',
              expirationWarning.type === 'error' 
                ? 'bg-red-400/10 text-red-400 hover:bg-red-400/10' 
                : 'bg-yellow-300/10 text-yellow-300 hover:bg-yellow-300/10'
            ]"
          >
            Contact Sales →
          </a>
        </div>
      </div>
    </div>

    <slot />
    
    <!-- Powered by badge (self-hosted only, unless custom branding enabled) -->
    <div v-if="features.showPoweredBy" class="fixed bottom-4 right-4">
      <a
        href="https://airatelimit.com"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-0.5 px-2 py-1 bg-gray-500/10 border border-gray-500/10 rounded-md text-xs text-gray-400 hover:text-white transition-colors"
      >
        <span class="text-[10px] text-gray-500">Powered by</span>
        <span class="text-[10px] text-gray-400 flex items-center gap-0.5">
          <img src="/logo.png" alt="AI Ratelimit" class="w-4 h-4">
          <span class="text-[10px] text-white">AI Ratelimit</span>
        </span>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
const { user, logout } = useAuth()
const { organization, loadOrganization } = useOrganization()
const { features, mode, enterpriseUpgradeUrl, isEnterprise } = useFeatures()
const { loadLicense, expirationWarning, isExpired: licenseExpired, daysRemaining: licenseDaysRemaining } = useLicense()
const { isOwner, loadMembers } = useTeam()
const { isAdmin } = useAdmin()
const api = useApi()

const showDropdown = ref(false)
const dismissedUpsell = ref(false)
const planLoaded = ref(false)
const currentPlan = ref<string>('trial')
const trialDaysRemaining = ref<number>(7)

// Restore cached plan data immediately to prevent flash
if (process.client) {
  const cached = localStorage.getItem('plan-cache')
  if (cached) {
    try {
      const { plan, days } = JSON.parse(cached)
      currentPlan.value = plan
      trialDaysRemaining.value = days
      planLoaded.value = true
    } catch {}
  }
}

const userInitials = computed(() => {
  if (!user.value?.email) return '?'
  const email = user.value.email
  const name = email.split('@')[0]
  return name.substring(0, 2).toUpperCase()
})

// Plan display
const planLabel = computed(() => {
  if (currentPlan.value === 'trial') {
    const days = trialDaysRemaining.value
    if (days <= 0) return 'Trial Expired'
    if (days === 1) return '1 day left'
    return `${days} days left`
  }
  
  const labels: Record<string, string> = {
    basic: 'Basic',
    pro: 'Pro',
    enterprise: 'Enterprise',
  }
  return labels[currentPlan.value] || 'Trial'
})

// Check if trial is in urgent state (expiring soon or expired)
const isTrialUrgent = computed(() => {
  return currentPlan.value === 'trial' && trialDaysRemaining.value <= 3
})

const planBadgeClasses = computed(() => {
  switch (currentPlan.value) {
    case 'enterprise':
      return 'bg-gray-500/10 border border-gray-500/10 text-gray-300 hover:bg-gray-500/15'
    case 'pro':
      return 'bg-gray-500/10 border border-gray-500/10 text-gray-300 hover:bg-gray-500/15'
    case 'basic':
      return 'bg-gray-500/10 border border-gray-500/10 text-gray-300 hover:bg-gray-500/15'
    default:
      // Trial - yellow normally, red if expired or nearly expired
      if (trialDaysRemaining.value <= 0) {
        return 'bg-red-400/10 border border-red-400/10 text-red-300 hover:bg-red-400/15'
      }
      if (trialDaysRemaining.value <= 2) {
        return 'bg-orange-300/10 border border-orange-300/10 text-orange-300 hover:bg-orange-300/15'
      }
      if (trialDaysRemaining.value <= 3) {
        return 'bg-yellow-300/10 border border-yellow-300/10 text-yellow-300 hover:bg-yellow-300/15'
      }
      return 'bg-yellow-300/10 text-yellow-300 hover:bg-yellow-300/10'
  }
})

const loadPlan = async () => {
  if (!features.value.showBilling) return
  
  try {
    const subscription = await api('/billing/subscription')
    if (subscription?.plan) {
      currentPlan.value = subscription.plan
    } else {
      currentPlan.value = 'trial'
    }
  } catch {
    // No subscription = trial
    currentPlan.value = 'trial'
  }
  
  // Load trial info if on trial
  if (currentPlan.value === 'trial') {
    try {
      const trialInfo = await api('/billing/trial')
      if (trialInfo?.daysRemaining !== undefined) {
        trialDaysRemaining.value = trialInfo.daysRemaining
      }
    } catch {
      // Default to 7 days
    }
  }
  
  // Cache plan data to prevent flash on navigation
  if (process.client) {
    localStorage.setItem('plan-cache', JSON.stringify({
      plan: currentPlan.value,
      days: trialDaysRemaining.value,
    }))
  }
  
  planLoaded.value = true
}

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

const handleLogout = () => {
  showDropdown.value = false
  logout()
}

const dismissUpsell = () => {
  dismissedUpsell.value = true
  if (process.client) {
    localStorage.setItem('enterprise-upsell-dismissed', 'true')
  }
}

// Close dropdown when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.relative')) {
    showDropdown.value = false
  }
}

onMounted(() => {
  loadOrganization()
  loadPlan()
  loadLicense() // Load license status for enterprise mode
  loadMembers() // Load team members to determine user role
  if (process.client) {
    document.addEventListener('click', handleClickOutside)
    // Restore dismissed state
    dismissedUpsell.value = localStorage.getItem('enterprise-upsell-dismissed') === 'true'
    // Debug: Log admin visibility conditions
    console.log('[Layout] Admin link conditions:', {
      mode: mode.value,
      isAdmin: isAdmin.value,
      showLink: mode.value === 'cloud' && isAdmin.value
    })
  }
})

onUnmounted(() => {
  if (process.client) {
    document.removeEventListener('click', handleClickOutside)
  }
})
</script>

<style scoped>
@keyframes ping-slow {
  0% {
    transform: scale(1);
    opacity: 0.75;
  }
  50% {
    transform: scale(1.15);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

.animate-ping-slow {
  animation: ping-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>

