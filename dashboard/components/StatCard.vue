<template>
  <div :class="['p-4 rounded-lg group transition-all duration-300 hover:border-gray-500/20', 'bg-gray-500/10 border border-gray-500/10']">
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2">
      <div class="text-sm text-white">{{ label }}</div>
        <!-- Status pill -->
        <span 
          v-if="max !== null"
          :class="[
            'text-[10px] font-medium px-1.5 py-0.5 rounded-full transition-all',
            statusPillClasses
          ]"
        >
          {{ statusLabel }}
        </span>
      </div>
      <!-- Trend indicator with context -->
      <div
        v-if="trend !== undefined && trend !== 0"
        :class="[
          'text-xs font-medium flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-all',
          trendClasses
        ]"
      >
        <svg
          class="w-3 h-3 transition-transform"
          fill="currentColor"
          viewBox="0 0 20 20"
          :class="{ 'rotate-180': trend < 0 }"
        >
          <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
        </svg>
        <span>{{ Math.abs(trend) }}%</span>
        <span class="text-gray-500 hidden sm:inline">vs yesterday</span>
      </div>
    </div>

    <div class="flex items-center justify-between">
      <div class="flex items-baseline gap-1">
        <div class="text-2xl font-bold text-white tabular-nums">
          <AnimatedCounter :value="value" :format-fn="formatDisplayValue" />
        </div>
        <span v-if="unit" class="text-sm text-gray-500 font-medium">{{ unit }}</span>
        <div v-if="max !== null" class="text-sm text-gray-500 ml-1">
          <span class="text-gray-600">/</span> {{ formatNumber(max) }}
        </div>
        <div v-else class="text-sm text-gray-500 ml-1">
          <span class="text-green-400/60">∞</span>
        </div>
      </div>
      
      <!-- Sparkline -->
      <Sparkline
        v-if="history && history.length > 1"
        :data="history"
        :width="80"
        :height="28"
        :color="sparklineColor"
        :show-dot="true"
        :dot-radius="2"
        :stroke-width="1.5"
        class="opacity-60 group-hover:opacity-100 transition-opacity"
      />
    </div>

    <div v-if="max !== null" class="mt-3">
      <div class="flex items-center justify-between text-xs mb-1">
        <span class="text-gray-500">{{ percentage.toFixed(1) }}% used</span>
        <span v-if="percentage >= 80" class="text-gray-500">
          {{ formatNumber(max - value) }} remaining
        </span>
      </div>
      <div class="w-full bg-gray-500/10 border border-gray-500/10 rounded-full h-1.5 overflow-hidden">
        <div
          :class="[
            'h-full transition-all duration-500 ease-out rounded-full',
            progressColor
          ]"
          :style="{ width: `${Math.min(percentage, 100)}%` }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  label: string
  value: number
  max: number | null
  trend?: number
  history?: number[]
  variant?: 'blue' | 'green' | 'yellow' | 'red'
  unit?: string
}>(), {
  variant: 'blue'
})

const percentage = computed(() => {
  if (props.max === null || props.max === 0) return 0
  return (props.value / props.max) * 100
})

const formatNumber = (num: number | null | undefined) => {
  if (num == null) return '0'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toLocaleString()
}

// Smart display value formatter for AnimatedCounter
const formatDisplayValue = (num: number | null | undefined) => {
  if (num == null) return 0
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 10000) return (num / 1000).toFixed(1) + 'K'
  if (num >= 1000) return num.toLocaleString()
  return num
}

// Status pill based on usage percentage
const statusLabel = computed(() => {
  if (props.max === null) return 'Unlimited'
  if (percentage.value >= 90) return 'Critical'
  if (percentage.value >= 70) return 'Warning'
  if (percentage.value >= 50) return 'Moderate'
  return 'Healthy'
})

const statusPillClasses = computed(() => {
  if (props.max === null) return 'bg-blue-400/10 text-blue-300'
  if (percentage.value >= 90) return 'bg-red-400/15 text-red-400 animate-pulse'
  if (percentage.value >= 70) return 'bg-yellow-400/15 text-yellow-400'
  if (percentage.value >= 50) return 'bg-orange-400/10 text-orange-300'
  return 'bg-green-400/10 text-green-400'
})

// Trend indicator classes
const trendClasses = computed(() => {
  if (!props.trend) return ''
  // For usage metrics, up is usually bad (more usage), down is good
  if (props.trend > 0) return 'bg-red-400/10 text-red-400'
  return 'bg-green-400/10 text-green-400'
})

const progressColor = computed(() => {
  if (props.max === null) return 'bg-blue-300'
  if (percentage.value >= 90) return 'bg-red-400'
  if (percentage.value >= 70) return 'bg-yellow-300'
  return 'bg-green-300'
})

const sparklineColor = computed(() => {
  if (props.max === null) return '#93c5fd' // blue-300
  if (percentage.value >= 90) return '#f87171' // red-400
  if (percentage.value >= 70) return '#fcd34d' // yellow-300
  return '#86efac' // green-300
})
</script>

