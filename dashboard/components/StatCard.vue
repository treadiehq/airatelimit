<template>
  <div :class="['p-4 rounded-lg', 'bg-gray-500/10 border border-gray-500/10']">
    <div class="flex items-center justify-between mb-2">
      <div class="text-sm text-white">{{ label }}</div>
      <div
        v-if="trend"
        :class="[
          'text-xs font-medium flex items-center space-x-1',
          trend > 0 ? 'text-red-400' : 'text-green-300'
        ]"
      >
        <svg
          class="w-3 h-3"
          fill="currentColor"
          viewBox="0 0 20 20"
          :class="{ 'transform rotate-180': trend < 0 }"
        >
          <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
        </svg>
        <span>{{ Math.abs(trend) }}%</span>
      </div>
    </div>

    <div class="flex items-baseline space-x-2">
      <div class="text-2xl font-bold text-white">
        <AnimatedCounter :value="value" />
      </div>
      <div v-if="max !== null" class="text-sm text-gray-400">
        / {{ max }}
      </div>
      <div v-else class="text-sm text-gray-400">
        / ∞
      </div>
    </div>

    <div v-if="max !== null" class="mt-3">
      <div class="flex items-center justify-between text-xs text-gray-400 mb-1">
        <span>{{ percentage.toFixed(1) }}% used</span>
      </div>
      <div class="w-full bg-gray-500/10 border border-gray-500/10 rounded-full h-1.5 overflow-hidden">
        <div
          :class="[
            'h-full transition-all duration-500 ease-out',
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
  variant?: 'blue' | 'green' | 'yellow' | 'red'
}>(), {
  variant: 'blue'
})

const percentage = computed(() => {
  if (props.max === null || props.max === 0) return 0
  return (props.value / props.max) * 100
})

// const bgClass = computed(() => {
//   const variants = {
//     blue: 'bg-blue-300/10',
//     green: 'bg-green-300/10',
//     yellow: 'bg-yellow-300/10',
//     red: 'bg-red-400/10'
//   }
  
//   // Auto-select based on percentage if not manual override
//   if (props.max !== null) {
//     if (percentage.value >= 90) return 'bg-red-400/10'
//     if (percentage.value >= 70) return 'bg-yellow-300/10'
//     return 'bg-green-300/10'
//   }
  
//   return variants[props.variant]
// })

const progressColor = computed(() => {
  if (props.max === null) return 'bg-blue-300'
  if (percentage.value >= 90) return 'bg-red-400'
  if (percentage.value >= 70) return 'bg-yellow-300'
  return 'bg-green-300'
})
</script>

