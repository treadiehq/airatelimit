<template>
  <div class="rate-limit-node">
    <Handle type="target" :position="Position.Top" class="handle-top" />
    
    <div class="node-badge">RATE LIMIT</div>
    <div class="node-content">
      <div class="node-icon">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>
      
      <div class="config">
        <div class="config-row">
          <span class="config-label">On</span>
          <select v-model="data.identifier" class="config-select">
            <option value="identity">identity</option>
            <option value="session">session</option>
            <option value="ip">IP address</option>
          </select>
        </div>
        <div class="config-row">
          <input 
            v-model.number="data.limit" 
            type="number" 
            class="config-number"
          />
          <span class="config-unit">requests /</span>
          <select v-model="data.window" class="config-select-sm">
            <option value="min">min</option>
            <option value="hour">hour</option>
            <option value="day">day</option>
          </select>
        </div>
      </div>
    </div>

    <div class="outputs">
      <div class="output">
        <Handle id="pass" type="source" :position="Position.Bottom" class="handle-pass" />
      </div>
      <div class="output">
        <span class="output-label">Fallback</span>
        <Handle id="fallback" type="source" :position="Position.Right" class="handle-fallback" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

defineProps<{
  data: { 
    limit: number
    window: string
    identifier: string
  }
}>()
</script>

<style scoped>
.rate-limit-node {
  @apply relative bg-gray-900/95 border border-rose-500/40 rounded-xl px-4 py-3 min-w-[200px];
  @apply shadow-lg shadow-rose-500/10;
}

.node-badge {
  @apply absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[10px] font-bold;
  @apply bg-rose-500 text-white rounded-full tracking-wider whitespace-nowrap;
}

.node-content {
  @apply flex items-start gap-3 mt-2;
}

.node-icon {
  @apply w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400 flex-shrink-0;
}

.config {
  @apply flex flex-col gap-2;
}

.config-row {
  @apply flex items-center gap-1.5 text-xs;
}

.config-label {
  @apply text-gray-400;
}

.config-select, .config-select-sm {
  @apply bg-gray-800/80 border border-gray-700/50 rounded px-1.5 py-0.5 text-white text-xs;
  @apply focus:outline-none focus:border-rose-500/50;
}

.config-select-sm {
  @apply w-14;
}

.config-number {
  @apply bg-gray-800/80 border border-gray-700/50 rounded px-1.5 py-0.5 text-white text-xs w-14;
  @apply focus:outline-none focus:border-rose-500/50;
}

.config-unit {
  @apply text-gray-500;
}

.outputs {
  @apply flex justify-between items-center mt-3 pt-2 border-t border-gray-700/30;
}

.output {
  @apply flex items-center gap-1;
}

.output-label {
  @apply text-[10px] text-gray-500;
}

.handle-top {
  @apply !bg-rose-400 !border-2 !border-gray-900 !w-3 !h-3;
}

.handle-pass {
  @apply !bg-rose-400 !border-2 !border-gray-900 !w-3 !h-3;
}

.handle-fallback {
  @apply !bg-amber-400 !border-2 !border-gray-900 !w-3 !h-3;
}
</style>

