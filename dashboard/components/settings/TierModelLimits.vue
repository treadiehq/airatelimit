<template>
  <div class="mt-4 pt-4 border-t border-gray-500/10">
    <div class="flex items-center justify-between mb-2">
      <label class="text-xs font-medium text-white">Model-Specific Limits (Optional)</label>
      <button @click="showSection = !showSection" class="text-xs text-blue-300 hover:text-blue-400">
        {{ showSection ? 'Hide' : '+ Add Model Limits' }}
      </button>
    </div>
    
    <div v-if="showSection" class="space-y-2 mt-2">
      <!-- Empty state -->
      <div v-if="!tier.modelLimits || Object.keys(tier.modelLimits).length === 0" class="text-center py-4 bg-gray-500/5 border border-gray-500/10 rounded">
        <p class="text-xs text-gray-400">No model-specific limits yet. Add one below.</p>
      </div>
      
      <!-- Model limit cards -->
      <div v-for="(modelLimit, modelName) in tier.modelLimits" :key="modelName" class="bg-gray-500/5 border border-gray-500/10 rounded p-3">
        <div class="flex justify-between items-center mb-2">
          <span class="text-xs font-medium text-white">{{ modelName }}</span>
          <button @click="deleteModelLimit(String(modelName))" class="text-gray-500 hover:text-red-500 text-xs">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-3">
              <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-xs text-gray-400 mb-1">Requests</label>
            <div class="flex items-center space-x-1">
              <input
                v-model.number="modelLimit.requestLimit"
                type="number"
                min="-1"
                :disabled="modelLimit.requestLimit === -1"
                class="flex-1 px-2 py-1 text-xs text-white bg-gray-500/10 border border-gray-500/10 rounded disabled:opacity-50"
              />
              <label class="flex items-center cursor-pointer" title="Unlimited">
                <input
                  type="checkbox"
                  :checked="modelLimit.requestLimit === -1"
                  @change="modelLimit.requestLimit = ($event.target as HTMLInputElement).checked ? -1 : 0"
                  class="w-3 h-3 rounded border-gray-500/20 bg-gray-500/10 text-blue-300"
                />
              </label>
            </div>
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">Tokens</label>
            <div class="flex items-center space-x-1">
              <input
                v-model.number="modelLimit.tokenLimit"
                type="number"
                min="-1"
                :disabled="modelLimit.tokenLimit === -1"
                class="flex-1 px-2 py-1 text-xs text-white bg-gray-500/10 border border-gray-500/10 rounded disabled:opacity-50"
              />
              <label class="flex items-center cursor-pointer" title="Unlimited">
                <input
                  type="checkbox"
                  :checked="modelLimit.tokenLimit === -1"
                  @change="modelLimit.tokenLimit = ($event.target as HTMLInputElement).checked ? -1 : 0"
                  class="w-3 h-3 rounded border-gray-500/20 bg-gray-500/10 text-blue-300"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Add model input -->
      <div class="relative">
        <div class="flex items-center space-x-2">
          <div class="flex-1 relative">
            <input
              v-model="newModelName"
              @input="showSuggestions = true"
              @focus="showSuggestions = true"
              @blur="hideSuggestions"
              type="text"
              placeholder="Type model name"
              class="w-full px-2 py-1 text-xs text-white bg-gray-500/10 border border-gray-500/10 rounded focus:ring-1 focus:ring-blue-300/50"
            />
            <!-- Suggestions dropdown -->
            <div 
              v-if="showSuggestions && filteredModels.length > 0" 
              class="absolute z-20 w-full mt-1 bg-black border border-gray-500/20 rounded shadow-xl max-h-48 overflow-y-auto"
            >
              <div
                v-for="model in filteredModels"
                :key="model.name"
                @click="selectModel(model.name)"
                class="px-3 py-2 hover:bg-gray-500/10 cursor-pointer border-b border-gray-500/10 last:border-b-0"
              >
                <div class="text-xs text-white font-mono">{{ model.name }}</div>
                <div class="text-xs text-gray-500">{{ model.provider }}</div>
              </div>
            </div>
          </div>
          <button
            @click="addModelLimit"
            class="px-2 py-1 text-xs bg-gray-500/10 border border-gray-500/10 text-white rounded hover:bg-gray-500/15"
          >
            + Add
          </button>
        </div>
        <div v-if="newModelName && !isKnownModel(newModelName)" class="mt-1 text-xs text-amber-300/80">
          ⚠️ Unknown model
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  tierName: string
  tier: any
  knownModels: Array<{ name: string; provider: string; recommended: boolean }>
}>()

const showSection = ref(false)
const showSuggestions = ref(false)
const newModelName = ref('')

// Auto-show if there are existing model limits
watch(() => props.tier.modelLimits, (modelLimits) => {
  if (modelLimits && Object.keys(modelLimits).length > 0) {
    showSection.value = true
  }
}, { immediate: true })

const filteredModels = computed(() => {
  if (!newModelName.value) {
    return props.knownModels.filter(m => m.recommended).slice(0, 6)
  }
  return props.knownModels.filter(m => 
    m.name.toLowerCase().includes(newModelName.value.toLowerCase()) ||
    m.provider.toLowerCase().includes(newModelName.value.toLowerCase())
  ).slice(0, 8)
})

const isKnownModel = (modelName: string) => {
  return props.knownModels.some(m => m.name.toLowerCase() === modelName.toLowerCase())
}

const selectModel = (modelName: string) => {
  newModelName.value = modelName
  showSuggestions.value = false
}

const hideSuggestions = () => {
  setTimeout(() => {
    showSuggestions.value = false
  }, 200)
}

const addModelLimit = () => {
  if (newModelName.value && !props.tier.modelLimits?.[newModelName.value]) {
    if (!props.tier.modelLimits) {
      props.tier.modelLimits = {}
    }
    props.tier.modelLimits[newModelName.value] = {
      requestLimit: 0,
      tokenLimit: 0,
    }
    newModelName.value = ''
  }
}

const deleteModelLimit = (modelName: string) => {
  delete props.tier.modelLimits[modelName]
}
</script>

