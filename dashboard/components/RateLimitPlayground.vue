<template>
  <div class="bg-gray-500/10 inner-container mb-[-1px] ml-[-1px] relative border border-gray-500/10">
    <div class="divide-y divide-gray-500/15">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6 py-1 px-4">
        <div class="flex items-center gap-3">
          <!-- <div class="w-2 h-2 rounded-full bg-green-300 animate-pulse"></div> -->
          <span class="text-sm text-white">Playground</span>
        </div>
        
        <!-- Tier Switcher -->
        <div class="flex items-center gap-2 bg-gray-500/5 rounded-lg p-0.5 border border-gray-500/10">
          <button 
            @click="setTier('free')"
            :class="[
              'px-3 py-1 text-xs font-medium rounded-md transition-all duration-200',
              tier === 'free' 
                ? 'bg-gray-500/5 border border-gray-500/10 text-white' 
                : 'text-gray-500 hover:text-gray-300 border border-transparent'
            ]"
          >
            Free
          </button>
          <button 
            @click="setTier('pro')"
            :class="[
              'px-3 py-1 text-xs font-medium rounded-md transition-all duration-200',
              tier === 'pro' 
                ? 'bg-gray-500/5 border border-gray-500/10 text-white' 
                : 'text-gray-500 hover:text-gray-300 border border-transparent'
            ]"
          >
            Pro ✨
          </button>
        </div>
      </div>

      <!-- Main Demo Area -->
      <div class="space-y-5 pb-6 px-4">
        <!-- Model Limits Config -->
        <div class="px-4">
          <!-- <div class="text-xs text-gray-500 font-medium mb-3 uppercase tracking-wide">{{ tier === 'free' ? 'Free' : 'Pro' }} Tier Limits</div> -->
          <div class="space-y-3">
            <div v-for="model in models" :key="model.id" class="flex items-center gap-3">
              <button 
                @click="selectedModel = model.id"
                :class="[
                  'w-24 text-left text-sm font-mono transition-colors',
                  selectedModel === model.id ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                ]"
              >
                {{ model.name }}:
              </button>
              <div 
                :ref="(el) => { if (el) sliderRefs[model.id] = el as HTMLElement }"
                class="flex-1 relative h-2 bg-gray-500/10 border border-gray-500/10 rounded-full cursor-pointer select-none"
                @mousedown="(e) => startDrag(e, model.id)"
                @touchstart.prevent="(e) => startDrag(e, model.id)"
              >
                <!-- Usage fill -->
                <div 
                  class="absolute inset-y-0 left-0 rounded-full transition-all duration-500 pointer-events-none"
                  :class="getModelBarClass(model.id)"
                  :style="{ width: `${getModelUsagePercent(model.id)}%` }"
                ></div>
                <!-- Limit indicator (draggable) -->
                <div 
                  class="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-gray-300 rounded-full border-2 border-gray-900 shadow-lg cursor-grab hover:bg-white hover:scale-110 transition-all z-10 pointer-events-none"
                  :class="{ 'scale-125 bg-white': draggingModel === model.id }"
                  :style="{ left: `calc(${getModelLimitPosition(model.id)}% - 8px)` }"
                ></div>
              </div>
              <span class="w-20 text-right text-sm" :class="getModelLimitClass(model.id)">
                {{ getModelLimitDisplay(model.id) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Response Area -->
        <div class="bg-gray-500/5 rounded-lg border border-gray-500/5 overflow-hidden">
          <div class="px-4 py-2 border-b border-gray-500/10 flex items-center justify-between">
            <span class="text-xs text-gray-500 font-mono">
              response <span class="text-gray-600">· {{ models.find(m => m.id === selectedModel)?.name }}</span>
            </span>
            <span 
              v-if="lastStatus" 
              :class="[
                'text-xs font-mono px-2 py-0.5 rounded',
                lastStatus === 200 ? 'bg-green-300/10 text-green-300' : 'bg-red-400/10 text-red-400'
              ]"
            >
              {{ lastStatus }}
            </span>
          </div>
          <div class="p-4 min-h-[100px] font-mono text-sm">
            <div v-if="isLoading" class="flex items-center gap-2 text-gray-400">
              <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span class="typing-dots">Generating response</span>
            </div>
            <div v-else-if="response" class="space-y-2 text-left">
              <pre v-if="isError" class="text-red-400 whitespace-pre-wrap text-xs leading-relaxed">{{ response }}</pre>
              <div v-else class="text-gray-300">
                <TypewriterText :text="response" :key="responseKey" />
              </div>
            </div>
            <div v-else class="text-gray-500 italic">
              Select a model above and click "Send Request" <span class="text-gray-400">→</span>
            </div>
          </div>
        </div>

        <!-- Action Button -->
        <div class="flex items-center gap-4">
          <button 
            @click="sendRequest"
            :disabled="isLoading || isCurrentModelLimited"
            class="flex-1 group relative overflow-hidden rounded-lg font-medium py-3 px-6 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            :class="buttonClass"
          >
            <span class="relative z-10 flex items-center justify-center gap-2">
              <!-- <svg v-if="!isLoading" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <svg v-else class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg> -->
              {{ isLoading ? 'Sending...' : `Send` }}
            </span>
          </button>
          
          <button 
            @click="reset"
            class="px-4 py-3 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-gray-500/5 border border-gray-500/10"
            title="Reset demo"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <!-- Upgrade Banner -->
        <div 
          v-if="hasHitAnyLimit && tier === 'free'" 
          class="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-4 flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-blue-300/10 rounded-full flex items-center justify-center">
              <svg class="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p class="text-sm font-medium text-white">Need more requests?</p>
              <p class="text-xs text-gray-400">Upgrade to Pro for 10x higher limits</p>
            </div>
          </div>
          <button 
            @click="setTier('pro')"
            class="px-4 py-2 bg-gray-500/5 border border-gray-500/10 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            Upgrade to Pro
          </button>
        </div>

        <!-- Hint -->
        <p v-if="!hasHitAnyLimit && tier === 'free'" class="text-center text-xs text-gray-600">
          Try hitting the limit on {{ models.find(m => m.id === selectedModel)?.name }} to see the upgrade experience
        </p>
        <p v-else-if="!hasHitAnyLimit && tier === 'pro'" class="text-center text-xs text-gray-600">
          Drag the sliders to adjust limits, or switch to Free tier to test rate limiting
        </p>
      </div>
    </div>
    <span class="main-section bottom-l absolute w-[1px] h-[1px] bottom-[-1px] left-[-1px]"></span>
    <span class="main-section bottom-l absolute w-[1px] h-[1px] bottom-[-1px] right-[-1px]"></span>
    <span class="main-section bottom-l absolute w-[1px] h-[1px] top-[-1px] right-[-1px]"></span>
    <span class="main-section bottom-l absolute w-[1px] h-[1px] top-[-1px] left-[-1px]"></span>
  </div>
</template>

<script setup lang="ts">
type ModelId = 'gpt4o' | 'claude' | 'gemini'

interface Model {
  id: ModelId
  name: string
  freeLimitDisplay: string
  proLimitDisplay: string
  freeLimit: number
  proLimit: number
}

const models: Model[] = [
  { id: 'gpt4o', name: 'GPT-4o', freeLimitDisplay: '5/day', proLimitDisplay: '100/day', freeLimit: 5, proLimit: 100 },
  { id: 'claude', name: 'Claude', freeLimitDisplay: '10/day', proLimitDisplay: '200/day', freeLimit: 10, proLimit: 200 },
  { id: 'gemini', name: 'Gemini', freeLimitDisplay: 'Unlimited', proLimitDisplay: 'Unlimited', freeLimit: Infinity, proLimit: Infinity },
]

const tier = ref<'free' | 'pro'>('free')
const selectedModel = ref<ModelId>('gpt4o')
const usage = ref<Record<ModelId, number>>({ gpt4o: 0, claude: 0, gemini: 0 })
const isLoading = ref(false)
const response = ref('')
const responseKey = ref(0)
const lastStatus = ref<number | null>(null)
const isError = ref(false)

// Draggable slider state
const sliderRefs = reactive<Record<ModelId, HTMLElement | null>>({ gpt4o: null, claude: null, gemini: null })
const draggingModel = ref<ModelId | null>(null)
const customLimits = ref<Record<ModelId, number | null>>({ gpt4o: null, claude: null, gemini: null })

// Max values for slider (what 100% represents)
const maxSliderValue = computed(() => tier.value === 'free' ? 20 : 200)

const getModelLimit = (modelId: ModelId) => {
  // Use custom limit if set
  if (customLimits.value[modelId] !== null) {
    return customLimits.value[modelId]!
  }
  const model = models.find(m => m.id === modelId)!
  return tier.value === 'free' ? model.freeLimit : model.proLimit
}

const getModelUsagePercent = (modelId: ModelId) => {
  const limit = getModelLimit(modelId)
  if (limit === Infinity) return 0
  return Math.min((usage.value[modelId] / limit) * 100, 100)
}

const getModelLimitPosition = (modelId: ModelId) => {
  const limit = getModelLimit(modelId)
  if (limit === Infinity) return 100
  return Math.min((limit / maxSliderValue.value) * 100, 100)
}

const getModelBarClass = (modelId: ModelId) => {
  const percent = getModelUsagePercent(modelId)
  if (percent >= 100) return 'bg-red-400'
  if (percent >= 80) return 'bg-orange-300'
  if (percent >= 60) return 'bg-yellow-300'
  return 'bg-blue-300'
}

const getModelLimitClass = (modelId: ModelId) => {
  const limit = getModelLimit(modelId)
  if (limit === Infinity) return 'text-green-300'
  if (usage.value[modelId] >= limit) return 'text-red-400 font-medium'
  return 'text-gray-400'
}

const getModelLimitDisplay = (modelId: ModelId) => {
  const limit = getModelLimit(modelId)
  if (limit === Infinity) return 'Unlimited'
  return `${limit}/day`
}

// Drag handlers
const startDrag = (e: MouseEvent | TouchEvent, modelId: ModelId) => {
  // Don't allow dragging Gemini (unlimited)
  const model = models.find(m => m.id === modelId)!
  if (model.freeLimit === Infinity && model.proLimit === Infinity) return
  
  draggingModel.value = modelId
  selectedModel.value = modelId
  
  // Update position immediately
  updateDragPosition(e)
  
  // Add global listeners
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', onDrag, { passive: false })
  document.addEventListener('touchend', stopDrag)
}

const onDrag = (e: MouseEvent | TouchEvent) => {
  if (!draggingModel.value) return
  e.preventDefault()
  updateDragPosition(e)
}

const updateDragPosition = (e: MouseEvent | TouchEvent) => {
  if (!draggingModel.value) return
  
  const slider = sliderRefs[draggingModel.value]
  if (!slider) return
  
  const rect = slider.getBoundingClientRect()
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  
  // Calculate percentage position
  let percent = ((clientX - rect.left) / rect.width) * 100
  percent = Math.max(5, Math.min(100, percent)) // Clamp between 5% and 100%
  
  // Convert to actual limit value
  const newLimit = Math.round((percent / 100) * maxSliderValue.value)
  customLimits.value[draggingModel.value] = Math.max(1, newLimit)
}

const stopDrag = () => {
  draggingModel.value = null
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', stopDrag)
}

const isCurrentModelLimited = computed(() => {
  const limit = getModelLimit(selectedModel.value)
  return limit !== Infinity && usage.value[selectedModel.value] >= limit
})

const hasHitAnyLimit = computed(() => {
  return models.some(model => {
    const limit = getModelLimit(model.id)
    return limit !== Infinity && usage.value[model.id] >= limit
  })
})

const buttonClass = computed(() => {
  if (isCurrentModelLimited.value) {
    return 'bg-gray-500/5 text-gray-300 cursor-not-allowed'
  }
  return 'bg-white text-black hover:bg-gray-300'
})

const mockResponses: Record<ModelId, string[]> = {
  gpt4o: [
    "Hello! I'm GPT-4o. I can help with coding, analysis, writing, and more. What would you like to know?",
    "Great to meet you! I'm here to assist with any questions or tasks you have in mind.",
  ],
  claude: [
    "Hi there! I'm Claude. I'd be happy to help you think through problems or answer questions.",
    "Hello! I'm designed to be helpful, harmless, and honest. What can I assist you with today?",
  ],
  gemini: [
    "Hey! I'm Gemini. I can help with creative tasks, coding, research, and much more!",
    "Hello! I'm ready to help. Whether it's analysis, writing, or brainstorming—let's get started!",
  ],
}

const sendRequest = async () => {
  const model = selectedModel.value
  const limit = getModelLimit(model)
  
  if (isLoading.value || (limit !== Infinity && usage.value[model] >= limit)) return
  
  isLoading.value = true
  response.value = ''
  isError.value = false
  lastStatus.value = null
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 500))
  
  usage.value[model]++
  
  if (limit !== Infinity && usage.value[model] > limit) {
    // Rate limited
    lastStatus.value = 429
    isError.value = true
    response.value = JSON.stringify({
      error: {
        message: `You've used ${limit}/${limit} ${models.find(m => m.id === model)?.name} requests. Upgrade to Pro!`,
        type: "rate_limit_exceeded",
        code: "limit_exceeded"
      }
    }, null, 2)
  } else if (limit !== Infinity && usage.value[model] === limit) {
    // Last request before limit
    lastStatus.value = 200
    responseKey.value++
    const responses = mockResponses[model]
    response.value = responses[Math.floor(Math.random() * responses.length)] + "\n\n⚠️ You've reached your " + models.find(m => m.id === model)?.name + " limit!"
  } else {
    // Normal response
    lastStatus.value = 200
    responseKey.value++
    const responses = mockResponses[model]
    response.value = responses[Math.floor(Math.random() * responses.length)]
  }
  
  isLoading.value = false
}

const reset = () => {
  usage.value = { gpt4o: 0, claude: 0, gemini: 0 }
  customLimits.value = { gpt4o: null, claude: null, gemini: null }
  response.value = ''
  lastStatus.value = null
  isError.value = false
}

const setTier = (newTier: 'free' | 'pro') => {
  tier.value = newTier
  // Reset custom limits when switching tiers
  customLimits.value = { gpt4o: null, claude: null, gemini: null }
}
</script>

<style scoped>
.playground-container {
  background: linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%);
  background-color: rgba(107, 114, 128, 0.05);
  border: 1px solid rgba(107, 114, 128, 0.1);
  border-radius: 0.75rem;
  padding: 1.5rem;
}

.typing-dots::after {
  content: '';
  animation: dots 1.5s infinite;
}

@keyframes dots {
  0%, 20% { content: ''; }
  40% { content: '.'; }
  60% { content: '..'; }
  80%, 100% { content: '...'; }
}
</style>
