<template>
  <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-6">
    <div class="flex items-start gap-4">
      <div class="flex-shrink-0 w-8 h-8 bg-gray-500/10 rounded-lg flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4">
          <path d="M11.5 1A3.5 3.5 0 0 0 8 4.5V7H2.5A1.5 1.5 0 0 0 1 8.5v5A1.5 1.5 0 0 0 2.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 9.5 7V4.5a2 2 0 1 1 4 0v1.75a.75.75 0 0 0 1.5 0V4.5A3.5 3.5 0 0 0 11.5 1Z" />
        </svg>
      </div>
      <div class="flex-1">
        <h3 class="text-lg font-semibold text-white">{{ title }}</h3>
        <p class="text-sm text-gray-400 mt-1">{{ description }}</p>
        <div class="mt-4 flex items-center gap-3">
          <NuxtLink
            to="/billing"
            class="inline-flex items-center px-4 py-2 bg-blue-300 hover:bg-blue-400 text-black text-sm font-medium rounded-lg transition-colors"
          >
            Upgrade to {{ minPlan }}
            <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </NuxtLink>
          <span class="text-xs text-gray-500">
            Starting at ${{ minPrice }}/month
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  feature: string;
  title?: string;
  description?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Pro Feature',
  description: 'This feature requires a Pro plan or higher.',
});

// Map features to minimum plan
const featurePlanMap: Record<string, { plan: string; price: number }> = {
  flowDesigner: { plan: 'Pro', price: 50 },
  promptsConfig: { plan: 'Pro', price: 50 },
  privacyConfig: { plan: 'Pro', price: 50 },
  smartRouting: { plan: 'Pro', price: 50 },
  securityConfig: { plan: 'Pro', price: 50 },
  publicEndpoints: { plan: 'Pro', price: 50 },
  sso: { plan: 'Enterprise', price: 0 },
  selfHosting: { plan: 'Enterprise', price: 0 },
  dedicatedSupport: { plan: 'Enterprise', price: 0 },
  auditLogs: { plan: 'Enterprise', price: 0 },
};

const planInfo = computed(() => featurePlanMap[props.feature] || { plan: 'Pro', price: 50 });
const minPlan = computed(() => planInfo.value.plan);
const minPrice = computed(() => planInfo.value.price || 'Custom');
</script>

