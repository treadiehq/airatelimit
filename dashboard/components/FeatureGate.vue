<template>
  <div>
    <!-- Feature is enabled - show content -->
    <slot v-if="isEnabled" />
    
    <!-- Feature is disabled - show upgrade prompt or fallback -->
    <slot v-else name="locked">
      <div v-if="showUpgrade" class="relative">
        <!-- Blurred preview -->
        <div v-if="showPreview" class="opacity-30 blur-sm pointer-events-none select-none">
          <slot name="preview" />
        </div>
        
        <!-- Upgrade overlay -->
        <div 
          :class="[
            'flex flex-col items-center justify-center text-center p-6',
            showPreview ? 'absolute inset-0 bg-black/60 backdrop-blur-sm rounded-lg' : 'bg-gray-500/10 border border-gray-500/10 rounded-lg'
          ]"
        >
          <div class="w-12 h-12 rounded-full bg-blue-300/20 flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-white mb-2">{{ title }}</h3>
          <p class="text-sm text-gray-400 mb-4 max-w-md">{{ description }}</p>
          <a
            :href="upgradeUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 px-4 py-2 bg-blue-300 hover:bg-blue-400 text-black font-medium rounded-lg transition-colors"
          >
            <span>{{ upgradeText }}</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </slot>
  </div>
</template>

<script setup lang="ts">
import type { DashboardFeatures } from '~/composables/useFeatures'

interface Props {
  feature: keyof DashboardFeatures
  title?: string
  description?: string
  upgradeText?: string
  showUpgrade?: boolean
  showPreview?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Enterprise Feature',
  description: 'This feature requires an Enterprise license.',
  upgradeText: 'Upgrade',
  showUpgrade: true,
  showPreview: false,
})

const { features, enterpriseUpgradeUrl, cloudSignupUrl } = useFeatures()

const isEnabled = computed(() => features.value[props.feature])

// Use appropriate upgrade URL based on feature type
const upgradeUrl = computed(() => {
  const billingFeatures: (keyof DashboardFeatures)[] = [
    'showBilling',
    'showUpgradePrompts',
    'showPricingPage',
    'showSubscriptionManagement',
    'showUsageBasedPricing',
  ]
  
  if (billingFeatures.includes(props.feature)) {
    return cloudSignupUrl.value
  }
  
  return enterpriseUpgradeUrl.value
})
</script>

