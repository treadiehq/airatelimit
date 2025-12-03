<template>
  <div class="space-y-6">
    <!-- Enable Routing Toggle -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-sm font-medium text-white">Smart Model Routing</h3>
        <p class="text-xs text-gray-500 mt-1">Automatically route requests to optimal models</p>
      </div>
      <button
        @click="toggleRouting"
        :class="[
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          localConfig.enabled ? 'bg-blue-500' : 'bg-gray-700'
        ]"
      >
        <span
          :class="[
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            localConfig.enabled ? 'translate-x-6' : 'translate-x-1'
          ]"
        ></span>
      </button>
    </div>

    <!-- Empty State when disabled -->
    <div v-if="!localConfig.enabled" class="py-12">
      <div class="text-center max-w-md mx-auto">
        <div class="w-16 h-16 bg-gray-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <h4 class="text-white font-medium mb-2">Route requests intelligently</h4>
        <p class="text-gray-500 text-sm mb-6">
          Smart routing can automatically redirect requests to cheaper or faster models based on your rules. Save money by routing simple queries to smaller models.
        </p>
        
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left mb-6">
          <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-3">
            <div class="text-blue-400 text-xs font-medium mb-1">💰 Cost Optimization</div>
            <p class="text-gray-500 text-xs">Route simple queries to gpt-4o-mini instead of gpt-4o</p>
          </div>
          <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-3">
            <div class="text-green-400 text-xs font-medium mb-1">🎯 Tier Overrides</div>
            <p class="text-gray-500 text-xs">Free users get cheaper models automatically</p>
          </div>
          <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-3">
            <div class="text-purple-400 text-xs font-medium mb-1">🔄 Model Mapping</div>
            <p class="text-gray-500 text-xs">Redirect any model request to another</p>
          </div>
        </div>

        <button
          @click="toggleRouting"
          class="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
        >
          Enable Smart Routing
        </button>
      </div>
    </div>

    <div v-if="localConfig.enabled" class="space-y-6 pt-4 border-t border-gray-500/10">
      <!-- Routing Strategy -->
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-2">Routing Strategy</label>
        <select
          v-model="localConfig.strategy"
          class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="cost">Cost Optimization</option>
          <option value="quality">Quality First</option>
          <option value="fallback">Fallback Chain</option>
          <option value="latency">Latency Optimization</option>
        </select>
        <p class="text-xs text-gray-500 mt-1">
          <span v-if="localConfig.strategy === 'cost'">Route to cheaper models when appropriate</span>
          <span v-else-if="localConfig.strategy === 'quality'">Always use the best available model</span>
          <span v-else-if="localConfig.strategy === 'fallback'">Try models in order until one succeeds</span>
          <span v-else>Route to fastest responding model</span>
        </p>
      </div>

      <!-- Cost Optimization Settings -->
      <div v-if="localConfig.strategy === 'cost'" class="space-y-4 bg-gray-500/5 rounded-lg p-4">
        <h4 class="text-sm font-medium text-white">Cost Optimization Settings</h4>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs text-gray-400 mb-1">Token Threshold</label>
            <input
              v-model.number="localConfig.costOptimization.tokenThreshold"
              type="number"
              placeholder="500"
              class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
            <p class="text-xs text-gray-500 mt-1">Use cheap model below this</p>
          </div>
          
          <div>
            <label class="block text-xs text-gray-400 mb-1">Cheap Model</label>
            <input
              v-model="localConfig.costOptimization.cheapModel"
              type="text"
              placeholder="gpt-4o-mini"
              class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <!-- Model Mappings -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-gray-300">Model Mappings</label>
          <button
            @click="addMapping"
            class="text-xs text-blue-400 hover:text-blue-300"
          >
            + Add Mapping
          </button>
        </div>
        <p class="text-xs text-gray-500">Redirect requests for one model to another</p>
        
        <div v-if="mappingsList.length === 0" class="text-center py-4 text-gray-500 text-sm">
          No mappings configured
        </div>
        
        <div v-for="(mapping, index) in mappingsList" :key="index" class="flex items-center gap-2">
          <input
            v-model="mapping.from"
            type="text"
            placeholder="gpt-4o"
            class="flex-1 bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
          />
          <span class="text-gray-500">→</span>
          <input
            v-model="mapping.to"
            type="text"
            placeholder="gpt-4o-mini"
            class="flex-1 bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
          />
          <button
            @click="removeMapping(index)"
            class="text-red-400 hover:text-red-300 p-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Tier Overrides -->
      <div class="space-y-3">
        <label class="text-sm font-medium text-gray-300">Tier-Specific Overrides</label>
        <p class="text-xs text-gray-500">Force different models for specific tiers (e.g., free users get cheaper models)</p>
        
        <div class="grid grid-cols-1 gap-3">
          <div class="bg-gray-500/5 rounded-lg p-3">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-gray-300">Free Tier</span>
            </div>
            <div class="flex items-center gap-2 text-xs">
              <span class="text-gray-500">gpt-4o →</span>
              <input
                v-model="localConfig.tierOverrides.free"
                type="text"
                placeholder="gpt-4o-mini"
                class="flex-1 bg-gray-500/10 border border-gray-500/20 rounded px-2 py-1 text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Save Button -->
    <div v-if="localConfig.enabled" class="flex justify-end pt-4">
      <button
        @click="save"
        :disabled="saving"
        class="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
      >
        {{ saving ? 'Saving...' : 'Save Routing Config' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  projectId: string
  routingEnabled?: boolean
  routingConfig?: any
}>()

const emit = defineEmits(['saved'])

const api = useApi()
const { addToast } = useToast()

const saving = ref(false)

const localConfig = ref({
  enabled: props.routingEnabled || false,
  strategy: props.routingConfig?.strategy || 'cost',
  costOptimization: {
    enabled: true,
    tokenThreshold: props.routingConfig?.costOptimization?.tokenThreshold || 500,
    cheapModel: props.routingConfig?.costOptimization?.cheapModel || 'gpt-4o-mini',
    premiumModel: props.routingConfig?.costOptimization?.premiumModel || 'gpt-4o',
  },
  modelMappings: props.routingConfig?.modelMappings || {},
  tierOverrides: {
    free: props.routingConfig?.tierModelOverrides?.free?.['gpt-4o'] || '',
  },
})

// Convert modelMappings object to array for easier editing
const mappingsList = ref<Array<{ from: string; to: string }>>(
  Object.entries(localConfig.value.modelMappings || {}).map(([from, to]) => ({ from, to: to as string }))
)

const toggleRouting = () => {
  localConfig.value.enabled = !localConfig.value.enabled
}

const addMapping = () => {
  mappingsList.value.push({ from: '', to: '' })
}

const removeMapping = (index: number) => {
  mappingsList.value.splice(index, 1)
}

const save = async () => {
  saving.value = true
  try {
    // Convert mappings array back to object
    const modelMappings: Record<string, string> = {}
    for (const m of mappingsList.value) {
      if (m.from && m.to) {
        modelMappings[m.from] = m.to
      }
    }

    // Build tier overrides
    const tierModelOverrides: Record<string, Record<string, string>> = {}
    if (localConfig.value.tierOverrides.free) {
      tierModelOverrides.free = {
        'gpt-4o': localConfig.value.tierOverrides.free,
        'gpt-4-turbo': localConfig.value.tierOverrides.free,
      }
    }

    await api(`/api/projects/${props.projectId}/routing`, {
      method: 'PUT',
      body: {
        routingEnabled: localConfig.value.enabled,
        routingConfig: {
          strategy: localConfig.value.strategy,
          costOptimization: localConfig.value.strategy === 'cost' ? {
            enabled: true,
            tokenThreshold: localConfig.value.costOptimization.tokenThreshold,
            cheapModel: localConfig.value.costOptimization.cheapModel,
            premiumModel: localConfig.value.costOptimization.premiumModel,
          } : undefined,
          modelMappings,
          tierModelOverrides,
        },
      },
    })

    addToast('Routing configuration saved', 'success')
    emit('saved')
  } catch (error: any) {
    addToast(error.message || 'Failed to save', 'error')
  } finally {
    saving.value = false
  }
}

// Watch for prop changes
watch(() => props.routingEnabled, (val) => {
  localConfig.value.enabled = val || false
})

watch(() => props.routingConfig, (val) => {
  if (val) {
    localConfig.value.strategy = val.strategy || 'cost'
    if (val.costOptimization) {
      localConfig.value.costOptimization = { ...localConfig.value.costOptimization, ...val.costOptimization }
    }
    localConfig.value.modelMappings = val.modelMappings || {}
    mappingsList.value = Object.entries(val.modelMappings || {}).map(([from, to]) => ({ from, to: to as string }))
  }
}, { deep: true })
</script>

