<template>
  <div class="split-node">
    <Handle type="target" :position="Position.Top" class="handle-top" />
    
    <div class="node-badge">SPLIT</div>
    <div class="node-content">
      <div class="node-header">
        <svg class="w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="6" y1="3" x2="6" y2="15"/>
          <circle cx="18" cy="6" r="3"/>
          <circle cx="6" cy="18" r="3"/>
          <path d="M18 9a9 9 0 0 1-9 9"/>
        </svg>
        <span class="text-sm font-medium text-white">If / Else</span>
      </div>
      
      <div class="condition-builder">
        <select v-model="data.condition" class="condition-select">
          <option value="tier">tier</option>
          <option value="identity">identity</option>
          <option value="session">session</option>
          <option value="model">model</option>
        </select>
        <select v-model="data.operator" class="operator-select">
          <option value="==">=</option>
          <option value="!=">≠</option>
          <option value="contains">contains</option>
        </select>
        <input 
          v-model="data.value" 
          type="text" 
          class="value-input"
          placeholder="value"
        />
      </div>
    </div>

    <div class="branches">
      <div class="branch branch-true">
        <span class="branch-label true">True</span>
        <Handle id="true" type="source" :position="Position.Bottom" class="handle-true" />
      </div>
      <div class="branch branch-false">
        <span class="branch-label false">False</span>
        <Handle id="false" type="source" :position="Position.Bottom" class="handle-false" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

defineProps<{
  data: { 
    condition: string
    operator: string
    value: string 
  }
}>()
</script>

<style scoped>
.split-node {
  @apply relative bg-gray-900/95 border border-purple-500/40 rounded-xl px-4 py-3 min-w-[200px];
  @apply shadow-lg shadow-purple-500/10;
}

.node-badge {
  @apply absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[10px] font-bold;
  @apply bg-purple-500 text-white rounded-full tracking-wider;
}

.node-header {
  @apply flex items-center gap-2 mt-1 mb-2;
}

.condition-builder {
  @apply flex flex-col gap-1.5;
}

.condition-select, .operator-select, .value-input {
  @apply bg-gray-800/80 border border-gray-700/50 rounded-md px-2 py-1 text-xs text-white;
  @apply focus:outline-none focus:border-purple-500/50;
}

.operator-select {
  @apply w-16;
}

.branches {
  @apply flex justify-between mt-3 pt-2 border-t border-gray-700/30;
}

.branch {
  @apply flex flex-col items-center gap-1;
}

.branch-label {
  @apply text-[10px] font-medium px-2 py-0.5 rounded-full;
}

.branch-label.true {
  @apply bg-emerald-500/20 text-emerald-400;
}

.branch-label.false {
  @apply bg-rose-500/20 text-rose-400;
}

.handle-top {
  @apply !bg-purple-400 !border-2 !border-gray-900 !w-3 !h-3;
}

.handle-true {
  @apply !bg-emerald-400 !border-2 !border-gray-900 !w-3 !h-3 !relative !left-0 !transform-none;
}

.handle-false {
  @apply !bg-rose-400 !border-2 !border-gray-900 !w-3 !h-3 !relative !left-0 !transform-none;
}
</style>

