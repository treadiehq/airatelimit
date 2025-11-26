<template>
  <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-4">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-medium text-white">{{ title }}</h3>
      <div class="flex items-center gap-2 text-xs text-gray-400">
        <button
          v-for="period in periods"
          :key="period.value"
          @click="selectedPeriod = period.value"
          :class="[
            'px-2 py-1 rounded transition-colors',
            selectedPeriod === period.value 
              ? 'bg-blue-300/20 text-blue-300' 
              : 'hover:bg-gray-500/20'
          ]"
        >
          {{ period.label }}
        </button>
      </div>
    </div>
    
    <!-- Chart -->
    <div class="relative h-32">
      <svg class="w-full h-full" preserveAspectRatio="none">
        <!-- Grid lines -->
        <line 
          v-for="i in 4" 
          :key="i"
          x1="0" 
          :y1="(i * 25) + '%'" 
          x2="100%" 
          :y2="(i * 25) + '%'"
          stroke="currentColor"
          class="text-gray-700/30"
          stroke-dasharray="4"
        />
        
        <!-- Gradient fill -->
        <defs>
          <linearGradient id="chart-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#93c5fd" stop-opacity="0.3" />
            <stop offset="100%" stop-color="#93c5fd" stop-opacity="0" />
          </linearGradient>
        </defs>
        
        <!-- Area -->
        <path
          v-if="chartData.length > 0"
          :d="areaPath"
          fill="url(#chart-gradient)"
        />
        
        <!-- Line -->
        <path
          v-if="chartData.length > 0"
          :d="linePath"
          fill="none"
          stroke="#93c5fd"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        
        <!-- Data points -->
        <circle
          v-for="(point, i) in points"
          :key="i"
          :cx="point.x + '%'"
          :cy="point.y + '%'"
          r="3"
          fill="#93c5fd"
          class="opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
          @mouseenter="hoveredPoint = i"
          @mouseleave="hoveredPoint = null"
        />
      </svg>
      
      <!-- Tooltip -->
      <Transition
        enter-active-class="transition duration-150"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-100"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="hoveredPoint !== null && chartData[hoveredPoint]"
          class="absolute bg-black/90 text-white text-xs px-2 py-1 rounded pointer-events-none transform -translate-x-1/2 -translate-y-full z-10"
          :style="{ left: points[hoveredPoint]?.x + '%', top: (points[hoveredPoint]?.y - 3) + '%' }"
        >
          <div class="font-medium">{{ chartData[hoveredPoint].value.toLocaleString() }}</div>
          <div class="text-gray-400 text-[10px]">{{ chartData[hoveredPoint].label }}</div>
        </div>
      </Transition>
    </div>
    
    <!-- X-axis labels -->
    <div class="flex justify-between mt-2 text-xs text-gray-500">
      <span v-for="(item, i) in xLabels" :key="i">{{ item }}</span>
    </div>
    
    <!-- Summary -->
    <div class="flex items-center justify-between mt-4 pt-4 border-t border-gray-700/30">
      <div class="flex items-center gap-4">
        <div>
          <div class="text-xs text-gray-400">Total</div>
          <div class="text-lg font-bold text-white">{{ totalValue.toLocaleString() }}</div>
        </div>
        <div>
          <div class="text-xs text-gray-400">Average</div>
          <div class="text-lg font-bold text-white">{{ avgValue.toLocaleString() }}</div>
        </div>
      </div>
      <div v-if="percentChange !== null" class="flex items-center gap-1" :class="percentChange >= 0 ? 'text-green-400' : 'text-red-400'">
        <svg class="w-4 h-4" :class="{ 'rotate-180': percentChange < 0 }" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
        </svg>
        <span class="text-sm font-medium">{{ Math.abs(percentChange).toFixed(1) }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  title?: string
  data: Array<{ label: string; value: number }>
}>(), {
  title: 'Usage Over Time',
})

const periods = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
]

const selectedPeriod = ref('7d')
const hoveredPoint = ref<number | null>(null)

const chartData = computed(() => {
  const days = selectedPeriod.value === '7d' ? 7 : 30
  return props.data.slice(-days)
})

const points = computed(() => {
  if (chartData.value.length === 0) return []
  
  const max = Math.max(...chartData.value.map(d => d.value), 1)
  const padding = 5
  
  return chartData.value.map((d, i) => ({
    x: padding + (i / Math.max(chartData.value.length - 1, 1)) * (100 - padding * 2),
    y: padding + (1 - d.value / max) * (100 - padding * 2),
  }))
})

const linePath = computed(() => {
  if (points.value.length === 0) return ''
  return points.value
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x}% ${p.y}%`)
    .join(' ')
})

const areaPath = computed(() => {
  if (points.value.length === 0) return ''
  const padding = 5
  return [
    `M ${points.value[0].x}% 100%`,
    ...points.value.map(p => `L ${p.x}% ${p.y}%`),
    `L ${points.value[points.value.length - 1].x}% 100%`,
    'Z',
  ].join(' ')
})

const xLabels = computed(() => {
  if (chartData.value.length <= 7) {
    return chartData.value.map(d => d.label)
  }
  // Show first, middle, last for longer periods
  const labels: string[] = []
  labels.push(chartData.value[0]?.label || '')
  labels.push(chartData.value[Math.floor(chartData.value.length / 2)]?.label || '')
  labels.push(chartData.value[chartData.value.length - 1]?.label || '')
  return labels
})

const totalValue = computed(() => {
  return chartData.value.reduce((sum, d) => sum + d.value, 0)
})

const avgValue = computed(() => {
  if (chartData.value.length === 0) return 0
  return Math.round(totalValue.value / chartData.value.length)
})

const percentChange = computed(() => {
  if (chartData.value.length < 2) return null
  const half = Math.floor(chartData.value.length / 2)
  const firstHalf = chartData.value.slice(0, half).reduce((sum, d) => sum + d.value, 0)
  const secondHalf = chartData.value.slice(half).reduce((sum, d) => sum + d.value, 0)
  if (firstHalf === 0) return secondHalf > 0 ? 100 : 0
  return ((secondHalf - firstHalf) / firstHalf) * 100
})
</script>

