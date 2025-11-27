<template>
  <div class="flow-page">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <NuxtLink :to="`/projects/${projectId}`" class="back-link">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </NuxtLink>
        <div>
          <h1 class="page-title">Flow Designer</h1>
          <p class="page-subtitle">{{ project?.name || 'Loading...' }}</p>
        </div>
      </div>
      <div class="header-right">
        <div v-if="hasUnsavedChanges" class="unsaved-badge">
          Unsaved changes
        </div>
        <button
          @click="saveFlow"
          :disabled="saving"
          class="btn-save"
        >
          <svg v-if="saving" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" opacity="0.25"/>
            <path d="M12 2a10 10 0 0 1 10 10"/>
          </svg>
          <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          Save Flow
        </button>
      </div>
    </div>

    <!-- Flow Canvas -->
    <div class="flow-container">
      <ClientOnly>
        <FlowDesigner
          v-if="project"
          :project-id="projectId"
          :initial-flow="project.flowConfig"
          @save="handleSave"
        />
        <template #fallback>
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading flow designer...</p>
          </div>
        </template>
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '~/composables/useApi'
import { useToast } from '~/composables/useToast'

definePageMeta({
  middleware: ['auth']
})

const route = useRoute()
const { authFetch } = useApi()
const { showToast } = useToast()

const projectId = computed(() => route.params.id as string)
const project = ref<any>(null)
const saving = ref(false)
const hasUnsavedChanges = ref(false)
const currentFlow = ref<{ nodes: any[], edges: any[] } | null>(null)

// Fetch project
const fetchProject = async () => {
  try {
    const res = await authFetch(`/projects/${projectId.value}`)
    project.value = await res.json()
  } catch (error) {
    showToast('Failed to load project', 'error')
  }
}

// Handle flow save from designer
const handleSave = (flow: { nodes: any[], edges: any[] }) => {
  currentFlow.value = flow
  hasUnsavedChanges.value = true
}

// Save to backend
const saveFlow = async () => {
  if (!currentFlow.value) return
  
  saving.value = true
  try {
    await authFetch(`/projects/${projectId.value}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flowConfig: currentFlow.value
      })
    })
    hasUnsavedChanges.value = false
    showToast('Flow saved successfully!', 'success')
  } catch (error) {
    showToast('Failed to save flow', 'error')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchProject()
})
</script>

<style scoped>
.flow-page {
  @apply h-screen flex flex-col bg-gray-950;
}

.header {
  @apply flex items-center justify-between px-6 py-4 border-b border-gray-800;
  @apply bg-gray-900/80 backdrop-blur-sm;
}

.header-left {
  @apply flex items-center gap-4;
}

.back-link {
  @apply w-10 h-10 rounded-lg bg-gray-800/50 flex items-center justify-center;
  @apply text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all;
}

.page-title {
  @apply text-xl font-semibold text-white;
}

.page-subtitle {
  @apply text-sm text-gray-500;
}

.header-right {
  @apply flex items-center gap-4;
}

.unsaved-badge {
  @apply px-3 py-1 text-xs font-medium rounded-full;
  @apply bg-amber-500/20 text-amber-400 border border-amber-500/30;
}

.btn-save {
  @apply flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg;
  @apply bg-emerald-500 text-white hover:bg-emerald-600 transition-all;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
}

.flow-container {
  @apply flex-1 relative;
}

.loading-state {
  @apply absolute inset-0 flex flex-col items-center justify-center text-gray-500;
}

.loading-spinner {
  @apply w-8 h-8 border-2 border-gray-700 border-t-indigo-500 rounded-full animate-spin mb-4;
}
</style>

