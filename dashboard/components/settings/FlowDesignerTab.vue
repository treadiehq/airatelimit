<template>
  <div class="flow-designer-tab">
    <div class="header">
      <div>
        <h3 class="title">Visual Rule Designer</h3>
        <p class="description">
          Build rate limiting rules using a visual drag-and-drop flow builder.
        </p>
      </div>
      <div class="header-actions">
        <button
          v-if="!isFullscreen"
          @click="openFullscreen"
          class="btn-expand"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 3 21 3 21 9"/>
            <polyline points="9 21 3 21 3 15"/>
            <line x1="21" y1="3" x2="14" y2="10"/>
            <line x1="3" y1="21" x2="10" y2="14"/>
          </svg>
          Open Designer
        </button>
      </div>
    </div>

    <div class="preview-container">
      <div v-if="hasFlow" class="flow-preview">
        <div class="flow-stats">
          <div class="stat">
            <span class="stat-value">{{ nodeCount }}</span>
            <span class="stat-label">Nodes</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ edgeCount }}</span>
            <span class="stat-label">Connections</span>
          </div>
        </div>
        <div class="flow-mini-preview">
          <div 
            v-for="node in previewNodes" 
            :key="node.id"
            class="mini-node"
            :class="node.type"
          >
            {{ node.type }}
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <div class="empty-icon">
          <svg class="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="8" y="14" width="8" height="7" rx="1"/>
            <line x1="6.5" y1="10" x2="6.5" y2="14"/>
            <line x1="17.5" y1="10" x2="17.5" y2="14"/>
            <line x1="6.5" y1="14" x2="12" y2="14"/>
            <line x1="17.5" y1="14" x2="12" y2="14"/>
          </svg>
        </div>
        <h4 class="empty-title">No flow configured</h4>
        <p class="empty-text">Create a visual flow to define rate limiting rules.</p>
        <button @click="openFullscreen" class="btn-create">
          Create Flow
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  editForm: {
    flowConfig?: {
      nodes: any[]
      edges: any[]
    }
  }
}>()

const emit = defineEmits<{
  (e: 'openDesigner'): void
}>()

const hasFlow = computed(() => {
  return props.editForm.flowConfig?.nodes && props.editForm.flowConfig.nodes.length > 1
})

const nodeCount = computed(() => props.editForm.flowConfig?.nodes?.length || 0)
const edgeCount = computed(() => props.editForm.flowConfig?.edges?.length || 0)

const previewNodes = computed(() => {
  return props.editForm.flowConfig?.nodes?.slice(0, 5) || []
})

const isFullscreen = false

const openFullscreen = () => {
  emit('openDesigner')
}
</script>

<style scoped>
.flow-designer-tab {
  @apply space-y-6;
}

.header {
  @apply flex items-start justify-between;
}

.title {
  @apply text-lg font-semibold text-white;
}

.description {
  @apply text-sm text-gray-400 mt-1;
}

.header-actions {
  @apply flex gap-2;
}

.btn-expand {
  @apply flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg;
  @apply bg-indigo-500/20 text-indigo-400 border border-indigo-500/30;
  @apply hover:bg-indigo-500/30 transition-all;
}

.preview-container {
  @apply rounded-xl border border-gray-700/50 bg-gray-800/30 overflow-hidden;
}

.flow-preview {
  @apply p-6;
}

.flow-stats {
  @apply flex gap-6 mb-4;
}

.stat {
  @apply flex flex-col;
}

.stat-value {
  @apply text-2xl font-bold text-white;
}

.stat-label {
  @apply text-xs text-gray-500;
}

.flow-mini-preview {
  @apply flex flex-wrap gap-2 mt-4;
}

.mini-node {
  @apply px-2 py-1 text-xs font-medium rounded-md capitalize;
}

.mini-node.start {
  @apply bg-blue-500/20 text-blue-400 border border-blue-500/30;
}

.mini-node.split {
  @apply bg-purple-500/20 text-purple-400 border border-purple-500/30;
}

.mini-node.rateLimit {
  @apply bg-rose-500/20 text-rose-400 border border-rose-500/30;
}

.mini-node.budgetLimit {
  @apply bg-amber-500/20 text-amber-400 border border-amber-500/30;
}

.mini-node.response {
  @apply bg-emerald-500/20 text-emerald-400 border border-emerald-500/30;
}

.mini-node.model {
  @apply bg-cyan-500/20 text-cyan-400 border border-cyan-500/30;
}

.empty-state {
  @apply py-12 text-center;
}

.empty-icon {
  @apply mx-auto w-16 h-16 rounded-xl bg-gray-800/50 flex items-center justify-center text-gray-600 mb-4;
}

.empty-title {
  @apply text-lg font-medium text-gray-300 mb-2;
}

.empty-text {
  @apply text-sm text-gray-500 mb-6;
}

.btn-create {
  @apply px-6 py-2.5 text-sm font-medium rounded-lg;
  @apply bg-indigo-500 text-white hover:bg-indigo-600 transition-all;
}
</style>

