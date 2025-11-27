<template>
  <div class="start-node">
    <div class="node-badge">START</div>
    <div class="node-content">
      <div class="node-icon">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
      </div>
      <div class="node-text">
        <div class="node-title">{{ data.label || 'Request In' }}</div>
        <div class="node-subtitle">Entry point</div>
      </div>
    </div>
    <Handle type="source" :position="Position.Bottom" class="handle-bottom" />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

defineProps<{
  data: { label?: string }
}>()
</script>

<style scoped>
.start-node {
  @apply relative bg-gray-900/95 border border-blue-500/40 rounded-xl px-4 py-3 min-w-[180px];
  @apply shadow-lg shadow-blue-500/10;
}

.node-badge {
  @apply absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[10px] font-bold;
  @apply bg-blue-500 text-white rounded-full tracking-wider;
}

.node-content {
  @apply flex items-center gap-3 mt-1;
}

.node-icon {
  @apply w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400;
}

.node-title {
  @apply text-sm font-medium text-white;
}

.node-subtitle {
  @apply text-xs text-gray-500;
}

.handle-bottom {
  @apply !bg-blue-400 !border-2 !border-gray-900 !w-3 !h-3;
}
</style>

