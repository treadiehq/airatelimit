<template>
  <div class="relative overflow-hidden rounded-lg bg-gray-500/10 border border-gray-500/10 p-4">
    
    <div class="relative">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-lg bg-blue-300/10 flex items-center justify-center">
            <svg class="w-3.5 h-3.5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span class="text-sm font-medium text-blue-300">Money Saved</span>
        </div>
        
        <!-- Period selector -->
        <div class="flex items-center gap-1 text-xs">
          <button
            v-for="period in periods"
            :key="period.value"
            @click="selectedPeriod = period.value"
            :class="[
              'px-2 py-1 rounded transition-colors',
              selectedPeriod === period.value 
                ? 'bg-blue-300/10 text-blue-300' 
                : 'text-gray-400 hover:text-blue-300 hover:bg-blue-300/10'
            ]"
          >
            {{ period.label }}
          </button>
        </div>
      </div>

      <!-- Main savings number -->
      <div class="mb-4">
        <div class="flex items-baseline gap-1">
          <span class="text-4xl font-bold text-white">$</span>
          <span class="text-5xl font-bold text-white tabular-nums">
            <AnimatedCounter :value="displaySavings" :format-fn="formatNumber" />
          </span>
        </div>
        <p class="text-sm text-gray-500 mt-1">
          from {{ currentPeriodData.blocked.toLocaleString() }} blocked requests
        </p>
      </div>

      <!-- Comparison stats -->
      <div class="grid grid-cols-2 gap-4 pt-4 border-t border-gray-500/10">
        <div>
          <div class="text-xs text-gray-400 mb-1">Spent</div>
          <div class="text-lg font-semibold text-white">${{ formatNumber(currentPeriodData.spent) }}</div>
          <div class="text-xs text-gray-500">{{ currentPeriodData.requests.toLocaleString() }} requests</div>
        </div>
        <div>
          <div class="text-xs text-gray-400 mb-1">Without Limits</div>
          <div class="text-lg font-semibold text-gray-400">${{ formatNumber(currentPeriodData.spent + currentPeriodData.saved) }}</div>
          <div class="flex items-center gap-1 text-xs text-green-300">
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            {{ savingsPercentage }}% lower
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface CostData {
  spent: number;
  saved: number;
  requests: number;
  blocked: number;
}

const props = defineProps<{
  costs: {
    today: CostData;
    thisWeek: CostData;
    thisMonth: CostData;
    allTime: CostData;
  } | null;
}>()

const periods = [
  { label: 'Today', value: 'today' },
  { label: 'Week', value: 'thisWeek' },
  { label: 'Month', value: 'thisMonth' },
  { label: 'All', value: 'allTime' },
]

const selectedPeriod = ref<'today' | 'thisWeek' | 'thisMonth' | 'allTime'>('thisMonth')

const currentPeriodData = computed(() => {
  if (!props.costs) {
    return { spent: 0, saved: 0, requests: 0, blocked: 0 }
  }
  return props.costs[selectedPeriod.value]
})

const displaySavings = computed(() => {
  return Math.round(currentPeriodData.value.saved * 100) / 100
})

const savingsPercentage = computed(() => {
  const total = currentPeriodData.value.spent + currentPeriodData.value.saved
  if (total === 0) return 0
  return Math.round((currentPeriodData.value.saved / total) * 100)
})

const formatNumber = (num: number) => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toFixed(2)
}
</script>

