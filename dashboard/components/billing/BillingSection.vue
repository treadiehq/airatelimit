<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <div v-if="!dataLoaded" class="space-y-6">
      <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-6 animate-pulse">
        <div class="flex items-center justify-between mb-4">
          <div class="h-5 w-28 bg-gray-500/20 rounded"></div>
          <div class="h-6 w-16 bg-gray-500/20 rounded-full"></div>
        </div>
        <div class="space-y-2">
          <div class="h-4 w-48 bg-gray-500/20 rounded"></div>
          <div class="h-3 w-64 bg-gray-500/20 rounded"></div>
        </div>
      </div>
    </div>

    <!-- Current Plan -->
    <div v-else class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">Current Plan</h3>
        <span 
          :class="[
            'px-3 py-1 text-xs font-medium rounded-full',
            hasPaidPlan 
              ? 'bg-gray-500/15 text-gray-300 border border-gray-500/10' 
              : (isSubscriptionExpired || trialDaysRemaining <= 0)
                ? 'bg-red-400/10 text-red-400 border border-red-400/10'
                : 'bg-yellow-300/10 border border-yellow-300/10 text-yellow-300'
          ]"
        >
          {{ currentPlan }}
        </span>
      </div>
      
      <!-- Expired Subscription -->
      <div v-if="subscription && isSubscriptionExpired" class="space-y-2">
        <p class="text-gray-400 text-sm">
          Your <span class="text-red-400 font-medium">{{ previousPlanName }} plan has expired</span>.
        </p>
        <p class="text-red-400 text-xs font-medium">
          Renew your subscription to continue using AI Ratelimit.
        </p>
      </div>
      
      <!-- Active Subscription -->
      <div v-else-if="subscription" class="space-y-3">
        <div class="flex justify-between text-sm">
          <span class="text-gray-400">Status</span>
          <span :class="subscription.status === 'active' ? 'text-green-300' : 'text-yellow-300'">
            {{ subscription.status }}
          </span>
        </div>
        <div v-if="subscription.currentPeriodEnd" class="flex justify-between text-sm">
          <span class="text-gray-400">Next billing date</span>
          <span class="text-white">{{ formatDate(subscription.currentPeriodEnd) }}</span>
        </div>
        <div v-if="subscription.cancelAtPeriodEnd" class="mt-4 p-3 bg-yellow-300/10 border border-yellow-300/10 rounded-lg">
          <p class="text-sm text-yellow-300">
            Your subscription will cancel at the end of the billing period.
          </p>
        </div>
      </div>
      
      <!-- No Subscription (Trial) -->
      <div v-else class="space-y-2">
        <p class="text-gray-400 text-sm">
          You're on a <span class="text-yellow-300 font-medium">{{ trialDaysText }}</span> with Basic plan features.
        </p>
        <p v-if="trialDaysRemaining > 0" class="text-gray-500 text-xs">
          Subscribe before your trial ends to continue using AI Ratelimit.
        </p>
        <p v-else class="text-gray-500 text-xs font-medium">
          Your trial has expired. Upgrade now to continue.
        </p>
      </div>
    </div>

    <!-- Usage Stats -->
    <div v-if="dataLoaded && usageStats" class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-6">
      <h3 class="text-lg font-semibold text-white mb-4">Usage This Period</h3>
      <div class="space-y-4">
        <!-- Requests -->
        <div>
          <div class="flex justify-between text-sm mb-1">
            <span class="text-gray-400">Requests</span>
            <span class="text-white">
              {{ formatNumber(usageStats.requests.current) }}
              <span v-if="usageStats.requests.limit !== Infinity" class="text-gray-500">
                / {{ formatNumber(usageStats.requests.limit) }}
              </span>
              <span v-else class="text-gray-500">/ Unlimited</span>
            </span>
          </div>
          <div class="h-2 bg-gray-500/20 rounded-full overflow-hidden">
            <div 
              class="h-full rounded-full transition-all duration-300"
              :class="usageStats.requests.percentage >= 90 ? 'bg-red-400' : usageStats.requests.percentage >= 75 ? 'bg-yellow-400' : 'bg-blue-400'"
              :style="{ width: `${Math.min(100, usageStats.requests.percentage)}%` }"
            ></div>
          </div>
          <p v-if="usageStats.requests.percentage >= 90" class="text-xs text-red-400 mt-1">
            You're approaching your request limit. Consider upgrading.
          </p>
        </div>
        
        <!-- Period info -->
        <p class="text-xs text-gray-500">
          Resets {{ formatDate(usageStats.periodEnd) }}
        </p>
      </div>
    </div>

    <!-- Upgrade Options (show for trial users AND expired subscriptions) -->
    <div v-if="dataLoaded && (!hasPaidPlan || isSubscriptionExpired)" class="grid md:grid-cols-3 gap-4">
      <!-- Basic Plan -->
      <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-6 relative flex flex-col">
        <div class="absolute -top-3 left-4">
          <span class="px-2 py-1 bg-gray-500 text-white text-xs font-medium rounded">Your Trial Plan</span>
        </div>
        <h4 class="text-lg font-semibold text-white mt-2">Basic</h4>
        <div class="mt-2">
          <span class="text-3xl font-bold text-white">$15</span>
          <span class="text-gray-400">/month</span>
        </div>
        <ul class="mt-4 space-y-2 flex-1">
          <li v-for="feature in basicFeatures" :key="feature" class="flex items-center gap-2 text-sm text-gray-300">
            <svg class="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ feature }}
          </li>
        </ul>
        <button
          @click="handleUpgrade('basic')"
          :disabled="loading"
          class="mt-6 w-full py-2 px-4 bg-blue-300 hover:bg-blue-400 text-sm disabled:opacity-50 text-black font-medium rounded-lg transition-colors"
        >
          {{ loading ? 'Loading...' : 'Continue' }}
        </button>
      </div>

      <!-- Pro Plan -->
      <div class="bg-gray-500/10 border border-blue-300/30 rounded-lg p-6 relative flex flex-col">
        <div class="absolute -top-3 left-4">
          <span class="px-2 py-1 bg-blue-300 text-black border border-blue-300/10 text-xs font-medium rounded">Popular</span>
        </div>
        <h4 class="text-lg font-semibold text-white mt-2">Pro</h4>
        <div class="mt-2">
          <span class="text-3xl font-bold text-white">$50</span>
          <span class="text-gray-400">/month</span>
        </div>
        <ul class="mt-4 space-y-2 flex-1">
          <li v-for="feature in proFeatures" :key="feature" class="flex items-center gap-2 text-sm text-gray-300">
            <svg class="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ feature }}
          </li>
        </ul>
        <button
          @click="handleUpgrade('pro')"
          :disabled="loading"
          class="mt-6 w-full py-2 px-4 bg-blue-300 hover:bg-blue-400 text-sm disabled:opacity-50 text-black font-medium rounded-lg transition-colors"
        >
          {{ loading ? 'Loading...' : 'Upgrade' }}
        </button>
      </div>

      <!-- Enterprise Plan -->
      <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-6 flex flex-col">
        <h4 class="text-lg font-semibold text-white">Enterprise</h4>
        <div class="mt-2">
          <span class="text-3xl font-bold text-white">Custom</span>
        </div>
        <ul class="mt-4 space-y-2 flex-1">
          <li v-for="feature in enterpriseFeatures" :key="feature" class="flex items-center gap-2 text-sm text-gray-300">
            <svg class="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ feature }}
          </li>
        </ul>
        <a
          href="mailto:enterprise@airatelimit.com"
          class="mt-6 w-full py-2 px-4 bg-gray-500/10 border text-sm border-gray-500/10 hover:bg-gray-500/15 text-white font-medium rounded-lg transition-colors inline-flex items-center justify-center"
        >
          Contact Sales
        </a>
      </div>
    </div>

    <!-- Manage Subscription -->
    <div v-if="dataLoaded && hasPaidPlan" class="flex gap-4">
      <button
        @click="handleManageSubscription"
        :disabled="loading"
        class="px-4 py-2 bg-gray-500/10 border border-gray-500/10 text-sm hover:bg-gray-500/15 text-white font-medium rounded-lg transition-colors"
      >
        Manage
      </button>
      <button
        @click="handleCancel"
        :disabled="loading"
        class="px-4 py-2 border border-red-400/10 text-sm font-medium rounded-lg text-red-400 hover:text-red-300 transition-colors"
      >
        Cancel
      </button>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="p-4 bg-red-400/10 border border-red-400/10 rounded-lg">
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Subscription {
  id: string
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'expired' | 'unpaid'
  plan: string
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
}

const api = useApi()
const config = useRuntimeConfig()

const loading = ref(false)
const dataLoaded = ref(false)
const error = ref('')
const subscription = ref<Subscription | null>(null)
const trialEndsAt = ref<string | null>(null)
const usageStats = ref<{
  requests: { current: number; limit: number; percentage: number };
  tokens: number;
  periodStart: string;
  periodEnd: string;
} | null>(null)

// Check if subscription is expired or needs renewal
const isSubscriptionExpired = computed(() => {
  if (!subscription.value) return false
  return ['canceled', 'expired', 'unpaid', 'past_due'].includes(subscription.value.status)
})

const hasPaidPlan = computed(() => {
  if (!subscription.value) return false
  const isPaidPlan = ['basic', 'pro', 'enterprise'].includes(subscription.value.plan || '')
  const isActive = subscription.value.status === 'active' || subscription.value.status === 'trialing'
  return isPaidPlan && isActive
})

const currentPlan = computed(() => {
  if (subscription.value?.plan) {
    if (isSubscriptionExpired.value) {
      return 'Expired'
    }
    return subscription.value.plan.charAt(0).toUpperCase() + subscription.value.plan.slice(1)
  }
  return trialDaysRemaining.value <= 0 ? 'Expired' : 'Trial'
})

// Previous plan name for expired subscription messaging
const previousPlanName = computed(() => {
  if (subscription.value?.plan) {
    return subscription.value.plan.charAt(0).toUpperCase() + subscription.value.plan.slice(1)
  }
  return 'subscription'
})

// Trial days remaining
const trialDaysRemaining = computed(() => {
  if (!trialEndsAt.value) return 7 // Default to 7 if not loaded yet
  const now = new Date()
  const endDate = new Date(trialEndsAt.value)
  const diffTime = endDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
})

const trialDaysText = computed(() => {
  const days = trialDaysRemaining.value
  if (days <= 0) return 'expired trial'
  if (days === 1) return '1 day left in your trial'
  return `${days}-day free trial`
})

const basicFeatures = [
  '3 projects',
  '100K requests/month',
  'Cost tracking',
  'Usage analytics',
  'Email support',
]

const proFeatures = [
  '50 projects',
  '1M requests/month',
  'Flow Designer',
  'Server-side Prompts',
  'Privacy',
  'Smart routing',
  'Public endpoints',
  'Security',
  'Team (up to 5 members)',
]

const enterpriseFeatures = [
  'Everything in Pro',
  'Unlimited projects & requests',
  'Unlimited team members',
  'SSO',
  'Self-hosting',
  'Dedicated support',
  'Audit logs',
]

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const formatNumber = (num: number | null | undefined) => {
  if (num == null) return '0'
  if (num === Infinity) return 'Unlimited'
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toLocaleString()
}

const loadSubscription = async () => {
  try {
    const data = await api('/billing/subscription')
    subscription.value = data
    // If trialing, get trial end date from subscription
    if (data?.status === 'trialing' && data?.trialEnd) {
      trialEndsAt.value = data.trialEnd
    }
  } catch (err) {
    // No subscription is fine
    subscription.value = null
  }
}

const loadTrialInfo = async () => {
  try {
    const data = await api('/billing/trial')
    if (data?.trialEndsAt) {
      trialEndsAt.value = data.trialEndsAt
    }
  } catch (err) {
    // Use default 7 days from now if can't load
  }
}

const loadUsageStats = async () => {
  try {
    const data = await api('/billing/usage')
    if (data) {
      usageStats.value = {
        requests: data.requests,
        tokens: data.tokens,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
      }
    }
  } catch (err) {
    // Usage stats not critical
  }
}

const handleUpgrade = async (plan: 'basic' | 'pro' | 'enterprise') => {
  loading.value = true
  error.value = ''
  
  try {
    const { url } = await api('/billing/checkout', {
      method: 'POST',
      body: { plan },
    })
    
    // Redirect to Stripe Checkout
    window.location.href = url
  } catch (err: any) {
    error.value = err.message || 'Failed to start checkout'
  } finally {
    loading.value = false
  }
}

const handleManageSubscription = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const { url } = await api('/billing/portal', {
      method: 'POST',
    })
    
    // Redirect to Stripe Customer Portal
    window.location.href = url
  } catch (err: any) {
    error.value = err.message || 'Failed to open billing portal'
  } finally {
    loading.value = false
  }
}

const handleCancel = async () => {
  if (!confirm('Are you sure you want to cancel your subscription?')) return
  
  loading.value = true
  error.value = ''
  
  try {
    await api('/billing/cancel', {
      method: 'POST',
    })
    await loadSubscription()
  } catch (err: any) {
    error.value = err.message || 'Failed to cancel subscription'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadSubscription(), loadTrialInfo(), loadUsageStats()])
  dataLoaded.value = true
})
</script>

