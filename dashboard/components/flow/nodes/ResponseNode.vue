<template>
  <div class="response-node">
    <Handle type="target" :position="Position.Top" class="handle-top" />
    
    <div class="node-badge">RESPONSE</div>
    <div class="node-content">
      <div class="node-icon">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      
      <div class="config">
        <div class="config-row">
          <span class="config-label">Status</span>
          <select v-model.number="data.status" class="config-select">
            <option :value="200">200 OK</option>
            <option :value="429">429 Rate Limited</option>
            <option :value="402">402 Payment Required</option>
            <option :value="403">403 Forbidden</option>
          </select>
        </div>
        <div class="config-row">
          <input 
            v-model="data.message" 
            type="text" 
            class="config-input"
            placeholder="Message..."
          />
        </div>
        <label class="config-checkbox">
          <input type="checkbox" v-model="data.includeUpgradeUrl" />
          <span>Include upgrade URL</span>
        </label>
      </div>
    </div>

    <!-- Terminal node - no output -->
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

defineProps<{
  data: { 
    status: number
    message: string
    includeUpgradeUrl: boolean
  }
}>()
</script>

<style scoped>
.response-node {
  @apply relative bg-gray-900/95 border border-emerald-500/40 rounded-xl px-4 py-3 min-w-[200px];
  @apply shadow-lg shadow-emerald-500/10;
}

.node-badge {
  @apply absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[10px] font-bold;
  @apply bg-emerald-500 text-black rounded-full tracking-wider;
}

.node-content {
  @apply flex items-start gap-3 mt-2;
}

.node-icon {
  @apply w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0;
}

.config {
  @apply flex flex-col gap-2 flex-1;
}

.config-row {
  @apply flex items-center gap-1.5 text-xs;
}

.config-label {
  @apply text-gray-400 w-12;
}

.config-select {
  @apply bg-gray-800/80 border border-gray-700/50 rounded px-1.5 py-0.5 text-white text-xs flex-1;
  @apply focus:outline-none focus:border-emerald-500/50;
}

.config-input {
  @apply bg-gray-800/80 border border-gray-700/50 rounded px-2 py-1 text-white text-xs w-full;
  @apply focus:outline-none focus:border-emerald-500/50;
}

.config-checkbox {
  @apply flex items-center gap-2 text-xs text-gray-400 cursor-pointer;
}

.config-checkbox input {
  @apply rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500/50;
}

.handle-top {
  @apply !bg-emerald-400 !border-2 !border-gray-900 !w-3 !h-3;
}
</style>

