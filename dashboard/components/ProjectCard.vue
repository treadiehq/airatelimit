<template>
  <div
    class="bg-gray-500/10 border border-gray-500/10 p-4 rounded-lg shadow-md hover:shadow-xl transition-all duration-200 hover:border-gray-500/15 relative group"
  >
    <!-- Quick Actions Menu -->
    <div class="absolute top-4 right-4">
      <button
        @click.prevent="toggleMenu"
        class="p-1.5 rounded-lg hover:bg-gray-500/10 transition-colors"
      >
        <svg class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      <!-- Dropdown Menu -->
      <div
        v-if="showMenu"
        class="absolute right-0 mt-2 w-48 bg-black border border-gray-500/20 rounded-lg shadow-lg py-1 z-10"
      >
        <button
          @click="handleViewDetails"
          class="w-full text-left px-4 py-2 text-sm text-gray-400 hover:bg-gray-500/10 flex items-center space-x-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>View Details</span>
        </button>
        <button
          @click="copyKey"
          class="w-full text-left px-4 py-2 text-sm text-gray-400 hover:bg-gray-500/10 flex items-center space-x-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Copy API Key</span>
        </button>
        <button
          @click="handleDelete"
          class="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 flex items-center space-x-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>Delete</span>
        </button>
      </div>
    </div>

    <!-- Status Badge -->
    <div class="mb-3">
      <span
        :class="[
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
          statusBadge.class
        ]"
      >
        <span :class="['w-1.5 h-1.5 rounded-full mr-1.5', statusBadge.dotClass]"></span>
        {{ statusBadge.text }}
      </span>
    </div>

    <!-- Click to view details -->
    <NuxtLink :to="`/projects/${project.id}`" class="block">
      <!-- Project Name -->
      <h3 class="text-lg font-semibold text-white mb-2 pr-8">
        {{ project.name }}
      </h3>

      <!-- Provider -->
      <!-- <div class="flex items-center text-gray-400 text-sm mb-4">
        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
        <span class="capitalize">{{ project.provider || 'OpenAI' }}</span>
      </div> -->

      <!-- Usage Progress Bars -->
      <div class="space-y-3 mb-1">
        <ProgressBar
          v-if="project.limitType !== 'tokens'"
          label="Requests"
          :used="usage.requestsUsed || 0"
          :total="project.dailyRequestLimit"
        />
        <ProgressBar
          v-if="project.limitType !== 'requests'"
          label="Tokens"
          :used="usage.tokensUsed || 0"
          :total="project.dailyTokenLimit"
        />
      </div>

      <!-- Project Key with Copy -->
      <!-- <div class="mt-4 pt-4 border-t border-gray-500/10">
        <div class="flex items-center justify-between group/key">
          <code class="text-xs bg-gray-500/10 px-2 py-1 rounded flex-1 truncate mr-2">
            {{ project.projectKey }}
          </code>
          <button
            @click.prevent="copyKey"
            class="p-1.5 rounded hover:bg-gray-500/10 transition-colors"
            title="Copy to clipboard"
          >
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div> -->
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  project: any
  usage?: any
}>()

const emit = defineEmits<{
  delete: [id: string]
}>()

const { copy } = useClipboard()
const showMenu = ref(false)

const toggleMenu = () => {
  showMenu.value = !showMenu.value
}

const handleViewDetails = () => {
  showMenu.value = false
  navigateTo(`/projects/${props.project.id}`)
}

const copyKey = () => {
  copy(props.project.projectKey, 'Project key copied!')
  showMenu.value = false
}

const handleDelete = () => {
  showMenu.value = false
  emit('delete', props.project.id)
}

// Calculate status
const statusBadge = computed(() => {
  const hasLimits = props.project.dailyRequestLimit || props.project.dailyTokenLimit
  if (!hasLimits) {
    return {
      text: 'No Limits',
      class: 'bg-blue-300/10 text-blue-300',
      dotClass: 'bg-blue-300'
    }
  }

  const requestExceeded = props.project.dailyRequestLimit && 
    (props.usage?.requestsUsed || 0) >= props.project.dailyRequestLimit
  const tokenExceeded = props.project.dailyTokenLimit && 
    (props.usage?.tokensUsed || 0) >= props.project.dailyTokenLimit

  if (requestExceeded || tokenExceeded) {
    return {
      text: 'Exceeded',
      class: 'bg-red-400/10 text-red-400',
      dotClass: 'bg-red-400 animate-pulse'
    }
  }

  const requestWarning = props.project.dailyRequestLimit && 
    (props.usage?.requestsUsed || 0) / props.project.dailyRequestLimit > 0.7
  const tokenWarning = props.project.dailyTokenLimit && 
    (props.usage?.tokensUsed || 0) / props.project.dailyTokenLimit > 0.7

  if (requestWarning || tokenWarning) {
    return {
      text: 'Near Limit',
      class: 'bg-yellow-300/10 text-yellow-300',
      dotClass: 'bg-yellow-300'
    }
  }

  return {
    text: 'Within Limits',
    class: 'bg-green-300/10 text-green-300',
    dotClass: 'bg-green-300'
  }
})

// Close menu when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.group')) {
    showMenu.value = false
  }
}

onMounted(() => {
  if (process.client) {
    document.addEventListener('click', handleClickOutside)
  }
})

onUnmounted(() => {
  if (process.client) {
    document.removeEventListener('click', handleClickOutside)
  }
})
</script>

