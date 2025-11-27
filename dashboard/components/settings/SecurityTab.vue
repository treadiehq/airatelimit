<template>
  <div class="px-6 space-y-6">
    <!-- Security Header -->
    <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-4">
      <h3 class="font-semibold text-white mb-2">Prompt Injection Protection</h3>
      <p class="text-sm text-gray-400">
        Protect your system prompts from being extracted or leaked through prompt injection attacks. 
        Enable intelligent detection and blocking of malicious patterns.
      </p>
    </div>

    <!-- Enable Security -->
    <div class="bg-gray-500/10 border border-gray-500/20 rounded-lg p-6">
      <div class="flex items-center justify-between">
        <div>
          <h4 class="text-sm font-semibold text-white mb-1">Security Protection</h4>
          <p class="text-xs text-gray-400">Enable prompt injection detection for all requests.</p>
        </div>
        <button
          type="button"
          @click="editForm.securityEnabled = !editForm.securityEnabled"
          :class="editForm.securityEnabled ? 'bg-blue-300' : 'bg-gray-500/20'"
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
        >
          <span
            :class="editForm.securityEnabled ? 'translate-x-6' : 'translate-x-1'"
            class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
          />
        </button>
      </div>

      <!-- Security Mode -->
      <div v-if="editForm.securityEnabled" class="mt-4 pt-4 border-t border-gray-500/20">
        <label class="block text-sm font-medium text-white mb-3">When threats are detected</label>
        <div class="space-y-2">
          <label 
            :class="editForm.securityMode === 'block' ? 'border-blue-300/10 bg-blue-300/5' : 'border-gray-500/10 bg-gray-500/5 hover:bg-gray-500/10'"
            class="flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all"
          >
            <div class="relative flex items-center justify-center mt-0.5">
              <input
                type="radio"
                name="securityMode"
                value="block"
                v-model="editForm.securityMode"
                class="sr-only"
              />
              <div 
                :class="editForm.securityMode === 'block' ? 'border-blue-300' : 'border-gray-500'"
                class="w-4 h-4 rounded-full border-2 transition-colors"
              >
                <div 
                  v-if="editForm.securityMode === 'block'"
                  class="w-2 h-2 m-0.5 rounded-full bg-blue-300"
                ></div>
              </div>
            </div>
            <div>
              <span class="text-sm font-medium text-white">Block request</span>
              <p class="text-xs text-gray-400">Reject suspicious requests with an error</p>
            </div>
          </label>
          <label 
            :class="editForm.securityMode === 'log' ? 'border-blue-300/10 bg-blue-300/5' : 'border-gray-500/10 bg-gray-500/5 hover:bg-gray-500/10'"
            class="flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all"
          >
            <div class="relative flex items-center justify-center mt-0.5">
              <input
                type="radio"
                name="securityMode"
                value="log"
                v-model="editForm.securityMode"
                class="sr-only"
              />
              <div 
                :class="editForm.securityMode === 'log' ? 'border-blue-300' : 'border-gray-500'"
                class="w-4 h-4 rounded-full border-2 transition-colors"
              >
                <div 
                  v-if="editForm.securityMode === 'log'"
                  class="w-2 h-2 m-0.5 rounded-full bg-blue-300"
                ></div>
              </div>
            </div>
            <div>
              <span class="text-sm font-medium text-white">Log only</span>
              <p class="text-xs text-gray-400">Allow request but record the attempt</p>
            </div>
          </label>
        </div>
      </div>

      <!-- Advanced Heuristics -->
      <div v-if="editForm.securityEnabled" class="mt-4 pt-4 border-t border-gray-500/20">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-sm font-medium text-white mb-1">Advanced Heuristics</h4>
            <p class="text-xs text-gray-400">Detect sophisticated attacks using AI patterns</p>
          </div>
          <button
            type="button"
            @click="editForm.securityHeuristicsEnabled = !editForm.securityHeuristicsEnabled"
            :class="editForm.securityHeuristicsEnabled ? 'bg-blue-300' : 'bg-gray-500/20'"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
          >
            <span
              :class="editForm.securityHeuristicsEnabled ? 'translate-x-6' : 'translate-x-1'"
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
            />
          </button>
        </div>
      </div>

      <!-- Detection Categories -->
      <div v-if="editForm.securityEnabled" class="mt-4 pt-4 border-t border-gray-500/20">
        <label class="block text-sm font-medium text-white mb-3">Detection Categories</label>
        <div class="space-y-2">
          <label
            v-for="category in securityCategories"
            :key="category.id"
            :class="editForm.securityCategories.includes(category.id) ? 'border-blue-300/10 bg-blue-300/5' : 'border-gray-500/10 bg-gray-500/5 hover:bg-gray-500/10'"
            class="flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all"
          >
            <div class="relative flex items-center justify-center mt-0.5">
              <input
                type="checkbox"
                :checked="editForm.securityCategories.includes(category.id)"
                @change="toggleCategory(category.id)"
                class="sr-only"
              />
              <div 
                :class="editForm.securityCategories.includes(category.id) ? 'bg-blue-300 border-blue-300' : 'border-gray-500 bg-transparent'"
                class="w-4 h-4 rounded border-2 transition-all flex items-center justify-center"
              >
                <svg 
                  v-if="editForm.securityCategories.includes(category.id)"
                  class="w-2.5 h-2.5 text-black" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-sm font-medium text-white">{{ category.name }}</span>
                <span
                  :class="{
                    'bg-red-400/10 text-red-400': category.severity === 'high',
                    'bg-orange-300/10 text-orange-300': category.severity === 'medium',
                    'bg-yellow-300/10 text-yellow-300': category.severity === 'low'
                  }"
                  class="px-2 py-0.5 text-xs font-medium rounded"
                >
                  {{ category.severity }}
                </span>
              </div>
              <p class="text-xs text-gray-400">{{ category.description }}</p>
            </div>
          </label>
        </div>
      </div>

      <!-- Save Button -->
      <button
        v-if="editForm.securityEnabled"
        @click="$emit('update')"
        :disabled="updating"
        class="mt-6 w-full px-4 py-2 bg-blue-300 text-black text-sm font-medium rounded-lg hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ updating ? 'Saving...' : 'Save' }}
      </button>
    </div>

    <!-- Security Events -->
    <div class="bg-gray-500/10 border border-gray-500/20 rounded-lg p-6">
      <h4 class="text-sm font-semibold text-white mb-4">Recent Security Events</h4>

      <div v-if="loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-300"></div>
        <p class="text-gray-400 text-sm mt-3">Loading events...</p>
      </div>

      <div v-else-if="error" class="text-center py-12">
        <p class="text-red-400 text-sm">{{ error }}</p>
      </div>

      <div v-else-if="!events || events.length === 0" class="text-center py-12">
        <div class="flex justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" class="w-12 h-12 text-gray-500">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-white font-medium mb-1">All Clear</p>
        <p class="text-sm text-gray-400">No security threats detected</p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="event in events.slice(0, 10)"
          :key="event.id"
          class="p-3 bg-gray-500/10 border border-gray-500/20 rounded-lg"
        >
          <div class="flex items-start justify-between mb-2">
            <div class="flex items-center gap-2">
              <span
                :class="{
                  'bg-red-400/10 text-red-400': event.severity === 'high',
                  'bg-orange-300/10 text-orange-300': event.severity === 'medium',
                  'bg-yellow-300/10 text-yellow-300': event.severity === 'low'
                }"
                class="px-2 py-0.5 text-xs font-medium rounded"
              >
                {{ event.severity }}
              </span>
              <span
                :class="event.blocked ? 'bg-red-400/10 text-red-400' : 'bg-blue-300/10 text-blue-300'"
                class="px-2 py-0.5 text-xs font-medium rounded"
              >
                {{ event.blocked ? 'Blocked' : 'Logged' }}
              </span>
            </div>
            <span class="text-xs text-gray-500">{{ formatTime(event.createdAt) }}</span>
          </div>
          <p class="text-sm text-white mb-1">{{ event.reason }}</p>
          <div class="flex items-center gap-2 text-xs text-gray-400">
            <span>User: {{ event.identity }}</span>
            <span>•</span>
            <span>Pattern: {{ formatCategory(event.pattern) }}</span>
          </div>
          <div v-if="event.messagePreview" class="mt-2 p-2 bg-black/20 rounded text-xs text-gray-400 font-mono truncate">
            {{ event.messagePreview }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  projectId: string
  editForm: any
  updating: boolean
}>()

defineEmits<{
  (e: 'update'): void
}>()

const api = useApi()
const loading = ref(false)
const error = ref('')
const events = ref<any[]>([])

const securityCategories = [
  { id: 'systemPromptExtraction', name: 'System Prompt Extraction', description: 'Detects attempts to extract or reveal system prompts', severity: 'high' },
  { id: 'roleManipulation', name: 'Role Manipulation', description: 'Detects attempts to change the AI role (e.g., "DAN mode")', severity: 'high' },
  { id: 'instructionOverride', name: 'Instruction Override', description: 'Detects attempts to inject system-level commands', severity: 'high' },
  { id: 'boundaryBreaking', name: 'Boundary Breaking', description: 'Detects attempts to break out of conversation context', severity: 'medium' },
  { id: 'obfuscation', name: 'Obfuscation', description: 'Detects suspicious encoding or obfuscation techniques', severity: 'medium' },
  { id: 'directLeakage', name: 'Direct Leakage', description: 'Detects direct requests to leak internal context', severity: 'high' }
]

const toggleCategory = (categoryId: string) => {
  const index = props.editForm.securityCategories.indexOf(categoryId)
  if (index > -1) {
    props.editForm.securityCategories.splice(index, 1)
  } else {
    props.editForm.securityCategories.push(categoryId)
  }
}

const loadEvents = async () => {
  if (!props.projectId) return
  loading.value = true
  error.value = ''
  try {
    events.value = await api(`/projects/${props.projectId}/security/events?limit=50`)
  } catch (err: any) {
    error.value = err.message || 'Failed to load security events'
  } finally {
    loading.value = false
  }
}

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

const formatCategory = (category: string) => {
  return category.replace(/([A-Z])/g, ' $1').trim()
}

// Load events when component mounts
onMounted(loadEvents)

// Expose load function for parent to call
defineExpose({ loadEvents })
</script>

