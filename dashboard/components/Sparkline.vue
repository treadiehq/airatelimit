<template>
  <div class="relative" :style="{ width: width + 'px', height: height + 'px' }">
    <svg :width="width" :height="height" class="overflow-visible">
      <!-- Gradient fill -->
      <defs>
        <linearGradient :id="gradientId" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" :stop-color="color" stop-opacity="0.3" />
          <stop offset="100%" :stop-color="color" stop-opacity="0" />
        </linearGradient>
      </defs>
      
      <!-- Area fill -->
      <path
        v-if="showArea"
        :d="areaPath"
        :fill="`url(#${gradientId})`"
        class="transition-all duration-500"
      />
      
      <!-- Line -->
      <path
        :d="linePath"
        fill="none"
        :stroke="color"
        :stroke-width="strokeWidth"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="transition-all duration-500"
      />
      
      <!-- End dot -->
      <circle
        v-if="showDot && points.length > 0"
        :cx="points[points.length - 1]?.x"
        :cy="points[points.length - 1]?.y"
        :r="dotRadius"
        :fill="color"
        class="animate-pulse"
      />
    </svg>
    
    <!-- Tooltip on hover -->
    <div
      v-if="hoveredIndex !== null && data[hoveredIndex] !== undefined"
      class="absolute bg-black/90 text-white text-xs px-2 py-1 rounded pointer-events-none transform -translate-x-1/2 -translate-y-full"
      :style="{ left: points[hoveredIndex]?.x + 'px', top: (points[hoveredIndex]?.y - 8) + 'px' }"
    >
      {{ formatValue(data[hoveredIndex]) }}
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  data: number[]
  width?: number
  height?: number
  color?: string
  strokeWidth?: number
  showArea?: boolean
  showDot?: boolean
  dotRadius?: number
  formatValue?: (val: number) => string
}>(), {
  width: 100,
  height: 32,
  color: '#93c5fd',
  strokeWidth: 2,
  showArea: true,
  showDot: true,
  dotRadius: 3,
  formatValue: (val: number) => val.toLocaleString(),
})

const gradientId = `sparkline-gradient-${Math.random().toString(36).slice(2)}`
const hoveredIndex = ref<number | null>(null)

const points = computed(() => {
  if (props.data.length === 0) return []
  
  const max = Math.max(...props.data, 1)
  const min = Math.min(...props.data, 0)
  const range = max - min || 1
  
  const padding = props.strokeWidth + props.dotRadius
  const usableWidth = props.width - padding * 2
  const usableHeight = props.height - padding * 2
  
  return props.data.map((val, i) => ({
    x: padding + (i / Math.max(props.data.length - 1, 1)) * usableWidth,
    y: padding + (1 - (val - min) / range) * usableHeight,
  }))
})

const linePath = computed(() => {
  if (points.value.length === 0) return ''
  return points.value
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')
})

const areaPath = computed(() => {
  if (points.value.length === 0) return ''
  const padding = props.strokeWidth + props.dotRadius
  const baseline = props.height - padding
  
  return [
    `M ${points.value[0].x} ${baseline}`,
    ...points.value.map(p => `L ${p.x} ${p.y}`),
    `L ${points.value[points.value.length - 1].x} ${baseline}`,
    'Z',
  ].join(' ')
})
</script>

