<template>
  <div class="end-node">
    <Handle type="target" :position="Position.Top" class="handle-top" />
    
    <div class="node-content">
      <div class="node-icon">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <rect x="8" y="8" width="8" height="8" rx="1"/>
        </svg>
      </div>
      <span class="node-label">End</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

defineProps<{
  data: any
}>()
</script>

<style scoped>
.end-node {
  @apply bg-gray-800/90 border border-gray-600/40 rounded-xl px-4 py-3;
  @apply shadow-lg;
}

.node-content {
  @apply flex items-center gap-2;
}

.node-icon {
  @apply w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center text-gray-400;
}

.node-label {
  @apply text-sm font-medium text-gray-400;
}

.handle-top {
  @apply !bg-gray-400 !border-2 !border-gray-900 !w-3 !h-3;
}
</style>

