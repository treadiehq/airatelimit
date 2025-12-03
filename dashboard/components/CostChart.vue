<template>
  <div class="relative w-full h-full">
    <!-- Y-axis labels -->
    <div class="absolute left-0 top-0 bottom-6 w-12 flex flex-col justify-between text-xs text-gray-500">
      <span>${{ formatValue(maxValue) }}</span>
      <span>${{ formatValue(maxValue / 2) }}</span>
      <span>$0</span>
    </div>
    
    <!-- Chart area -->
    <div class="ml-14 h-full flex flex-col">
      <!-- Bars -->
      <div class="flex-1 flex items-end gap-1">
        <div 
          v-for="(item, index) in data" 
          :key="index"
          class="flex-1 flex flex-col items-center group"
        >
          <!-- Tooltip -->
          <div class="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs whitespace-nowrap z-10 pointer-events-none">
            <div class="text-white font-medium">${{ item.cost?.toFixed(4) || '0.00' }}</div>
            <div class="text-gray-400">{{ item.requests || 0 }} requests</div>
          </div>
          
          <!-- Bar -->
          <div 
            class="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all duration-300 hover:from-blue-400 hover:to-blue-300 cursor-pointer min-h-[2px]"
            :style="{ height: `${getBarHeight(item.cost || 0)}%` }"
          ></div>
        </div>
      </div>
      
      <!-- X-axis labels -->
      <div class="flex gap-1 pt-2 border-t border-gray-800">
        <div 
          v-for="(item, index) in data" 
          :key="index"
          class="flex-1 text-center text-xs text-gray-500 truncate"
        >
          {{ formatDate(item.date) }}
        </div>
      </div>
    </div>
    
    <!-- Grid lines -->
    <div class="absolute left-14 right-0 top-0 bottom-6 pointer-events-none">
      <div class="h-full flex flex-col justify-between">
        <div class="border-b border-gray-800/50"></div>
        <div class="border-b border-gray-800/50"></div>
        <div class="border-b border-gray-800/50"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  data: Array<{
    date: string
    cost: number
    requests: number
    tokens: number
    saved: number
  }>
}>()

const maxValue = computed(() => {
  if (!props.data.length) return 1
  const max = Math.max(...props.data.map(d => d.cost || 0))
  return max > 0 ? max * 1.1 : 1 // Add 10% padding
})

const getBarHeight = (value: number) => {
  if (maxValue.value === 0) return 0
  return Math.max((value / maxValue.value) * 100, 2) // Min 2% for visibility
}

const formatValue = (value: number) => {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  if (value >= 1) return value.toFixed(2)
  if (value >= 0.01) return value.toFixed(2)
  return value.toFixed(4)
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const today = new Date()
  
  // Check if it's today
  if (date.toDateString() === today.toDateString()) return 'Today'
  
  // Check if it's yesterday
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Yest'
  
  // Return short day name
  return date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3)
}
</script>

