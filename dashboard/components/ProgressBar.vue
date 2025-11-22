<template>
  <div class="space-y-1">
    <div class="flex items-center justify-between text-xs">
      <span class="text-gray-400">{{ label }}</span>
      <span :class="percentageColor">{{ used }} / {{ total === null ? '∞' : total }}</span>
    </div>
    <div class="w-full bg-gray-500/10 border border-gray-500/10 rounded-full h-2 overflow-hidden">
      <div
        :class="[
          'h-full transition-all duration-500 ease-out rounded-full',
          barColor
        ]"
        :style="{ width: `${percentage}%` }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  label: string
  used: number
  total: number | null
  warningThreshold?: number
  dangerThreshold?: number
}>(), {
  warningThreshold: 70,
  dangerThreshold: 90
})

const percentage = computed(() => {
  if (props.total === null || props.total === 0) return 0
  return Math.min(100, (props.used / props.total) * 100)
})

const barColor = computed(() => {
  if (props.total === null) return 'bg-blue-300/10'
  if (percentage.value >= props.dangerThreshold) return 'bg-red-400/10'
  if (percentage.value >= props.warningThreshold) return 'bg-yellow-300/10'
  return 'bg-green-300/10'
})

const percentageColor = computed(() => {
  if (props.total === null) return 'text-blue-300'
  if (percentage.value >= props.dangerThreshold) return 'text-red-400 font-medium'
  if (percentage.value >= props.warningThreshold) return 'text-yellow-300 font-medium'
  return 'text-green-300'
})
</script>

