<template>
  <div class="space-y-6">
    <!-- Cost Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
        <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Today</div>
        <div class="text-2xl font-semibold text-white">${{ formatCost(costs?.today?.spent || 0) }}</div>
        <div class="text-xs text-green-400 mt-1">
          ${{ formatCost(costs?.today?.saved || 0) }} saved
        </div>
      </div>
      
      <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
        <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">This Week</div>
        <div class="text-2xl font-semibold text-white">${{ formatCost(costs?.thisWeek?.spent || 0) }}</div>
        <div class="text-xs text-gray-400 mt-1">
          {{ costs?.thisWeek?.requests || 0 }} requests
        </div>
      </div>
      
      <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
        <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">This Month</div>
        <div class="text-2xl font-semibold text-white">${{ formatCost(costs?.thisMonth?.spent || 0) }}</div>
        <div class="text-xs text-gray-400 mt-1">
          {{ costs?.thisMonth?.requests || 0 }} requests
        </div>
      </div>
      
      <div class="bg-blue-300/10 border border-blue-300/10 rounded-lg p-4">
        <div class="text-xs text-blue-300 uppercase tracking-wide mb-1">Projected (Month)</div>
        <div class="text-2xl font-semibold text-white">${{ formatCost(costs?.projected?.projectedMonthSpend || 0) }}</div>
        <div class="text-xs text-gray-400 mt-1">
          ${{ formatCost(costs?.projected?.avgDailyCost || 0) }}/day avg
        </div>
      </div>
    </div>

    <!-- Cost History Chart -->
    <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-6">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-sm font-medium text-white">Cost Over Time</h3>
        <div class="flex items-center gap-2 text-xs">
          <button 
            @click="historyDays = 7" 
            :class="historyDays === 7 ? 'text-white bg-gray-500/20' : 'text-gray-500 hover:text-gray-300'"
            class="px-2 py-1 rounded"
          >7d</button>
          <button 
            @click="historyDays = 14" 
            :class="historyDays === 14 ? 'text-white bg-gray-500/20' : 'text-gray-500 hover:text-gray-300'"
            class="px-2 py-1 rounded"
          >14d</button>
          <button 
            @click="historyDays = 30" 
            :class="historyDays === 30 ? 'text-white bg-gray-500/20' : 'text-gray-500 hover:text-gray-300'"
            class="px-2 py-1 rounded"
          >30d</button>
        </div>
      </div>
      
      <div v-if="historyLoading" class="h-48 flex items-center justify-center">
        <div class="animate-spin h-6 w-6 border-2 border-gray-500 border-t-white rounded-full"></div>
      </div>
      <div v-else class="h-48">
        <CostChart :data="history" />
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Cost by Model -->
      <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-6">
        <h3 class="text-sm font-medium text-white mb-4">Cost by Model</h3>
        
        <div v-if="modelsLoading" class="space-y-3">
          <div v-for="i in 3" :key="i" class="animate-pulse">
            <div class="h-4 bg-gray-500/10 rounded w-3/4"></div>
          </div>
        </div>
        
        <div v-else-if="byModel.length === 0" class="text-center py-8 text-gray-500">
          <svg class="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p class="text-sm">No usage data yet</p>
        </div>
        
        <div v-else class="space-y-3">
          <div v-for="model in byModel.slice(0, 5)" :key="model.model" class="group">
            <div class="flex items-center justify-between text-sm mb-1">
              <span class="text-gray-300 font-mono text-xs">{{ model.model || 'unknown' }}</span>
              <span class="text-white font-medium">${{ formatCost(model.cost) }}</span>
            </div>
            <div class="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                class="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                :style="{ width: `${model.percentOfTotal}%` }"
              ></div>
            </div>
            <div class="flex items-center justify-between text-xs text-gray-500 mt-1">
              <span>{{ model.requests.toLocaleString() }} requests</span>
              <span>{{ model.percentOfTotal.toFixed(1) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Users by Cost -->
      <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-6">
        <h3 class="text-sm font-medium text-white mb-4">Top Users by Cost</h3>
        
        <div v-if="usersLoading" class="space-y-3">
          <div v-for="i in 3" :key="i" class="animate-pulse">
            <div class="h-4 bg-gray-500/10 rounded w-2/3"></div>
          </div>
        </div>
        
        <div v-else-if="topUsers.length === 0" class="text-center py-8 text-gray-500">
          <svg class="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
          <p class="text-sm">No users yet</p>
        </div>
        
        <div v-else class="space-y-2">
          <div 
            v-for="(user, index) in topUsers.slice(0, 8)" 
            :key="user.identity"
            class="flex items-center justify-between py-2 border-b border-gray-500/10 last:border-0"
          >
            <div class="flex items-center gap-3">
              <span class="text-xs text-gray-600 w-4">{{ index + 1 }}</span>
              <span class="text-sm text-gray-300 font-mono truncate max-w-[150px]" :title="user.identity">
                {{ user.identity }}
              </span>
            </div>
            <div class="text-right">
              <div class="text-sm text-white font-medium">${{ formatCost(user.cost) }}</div>
              <div class="text-xs text-gray-500">{{ user.requests }} req</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Savings Summary -->
    <div v-if="(costs?.allTime?.saved || 0) > 0" class="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-6">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
          <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p class="text-lg font-semibold text-white">
            ${{ formatCost(costs?.allTime?.saved || 0) }} saved by rate limiting
          </p>
          <p class="text-sm text-gray-400">
            {{ costs?.allTime?.blocked || 0 }} requests blocked that would have cost you money
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  projectId: string
}>()

const api = useApi()

// State
const costs = ref<any>(null)
const history = ref<any[]>([])
const byModel = ref<any[]>([])
const topUsers = ref<any[]>([])
const historyDays = ref(14)

// Loading states
const costsLoading = ref(true)
const historyLoading = ref(true)
const modelsLoading = ref(true)
const usersLoading = ref(true)

// Format cost to 2 decimal places
const formatCost = (cost: number) => {
  if (cost < 0.01 && cost > 0) return cost.toFixed(4)
  return cost.toFixed(2)
}

// Fetch cost summary
const fetchCosts = async () => {
  costsLoading.value = true
  try {
    costs.value = await api(`/api/projects/${props.projectId}/analytics/costs`)
  } catch (error) {
    console.error('Failed to fetch costs:', error)
  } finally {
    costsLoading.value = false
  }
}

// Fetch cost history
const fetchHistory = async () => {
  historyLoading.value = true
  try {
    history.value = await api(`/api/projects/${props.projectId}/analytics/costs/history?days=${historyDays.value}`)
  } catch (error) {
    console.error('Failed to fetch history:', error)
  } finally {
    historyLoading.value = false
  }
}

// Fetch cost by model
const fetchByModel = async () => {
  modelsLoading.value = true
  try {
    byModel.value = await api(`/api/projects/${props.projectId}/analytics/costs/by-model?days=30`)
  } catch (error) {
    console.error('Failed to fetch by model:', error)
  } finally {
    modelsLoading.value = false
  }
}

// Fetch top users
const fetchTopUsers = async () => {
  usersLoading.value = true
  try {
    topUsers.value = await api(`/api/projects/${props.projectId}/analytics/costs/top-users?days=30&limit=10`)
  } catch (error) {
    console.error('Failed to fetch top users:', error)
  } finally {
    usersLoading.value = false
  }
}

// Watch for days change
watch(historyDays, () => {
  fetchHistory()
})

// Initial fetch
onMounted(() => {
  fetchCosts()
  fetchHistory()
  fetchByModel()
  fetchTopUsers()
})
</script>

