<template>
  <div class="model-node">
    <Handle type="target" :position="Position.Top" class="handle-top" />
    
    <div class="node-badge">MODEL</div>
    <div class="node-content">
      <div class="node-icon">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="4" y="4" width="16" height="16" rx="2"/>
          <rect x="9" y="9" width="6" height="6"/>
          <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>
        </svg>
      </div>
      
      <div class="config">
        <div class="provider-logo">
          <img 
            v-if="data.provider === 'openai'" 
            src="https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg" 
            class="w-4 h-4"
            alt="OpenAI"
          />
          <span v-else class="text-xs">🤖</span>
          <span class="provider-name">{{ providerName }}</span>
        </div>
        
        <select v-model="data.provider" class="config-select">
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="google">Google</option>
        </select>
        
        <select v-model="data.model" class="config-select">
          <optgroup v-if="data.provider === 'openai'" label="OpenAI">
            <option value="gpt-4o">gpt-4o</option>
            <option value="gpt-4o-mini">gpt-4o-mini</option>
            <option value="gpt-4-turbo">gpt-4-turbo</option>
            <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
          </optgroup>
          <optgroup v-if="data.provider === 'anthropic'" label="Anthropic">
            <option value="claude-3-5-sonnet-20241022">claude-3.5-sonnet</option>
            <option value="claude-3-haiku-20240307">claude-3-haiku</option>
          </optgroup>
          <optgroup v-if="data.provider === 'google'" label="Google">
            <option value="gemini-pro">gemini-pro</option>
            <option value="gemini-pro-vision">gemini-pro-vision</option>
          </optgroup>
        </select>
      </div>
    </div>

    <Handle type="source" :position="Position.Bottom" class="handle-bottom" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'

const props = defineProps<{
  data: { 
    provider: string
    model: string
  }
}>()

const providerName = computed(() => {
  const names: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google'
  }
  return names[props.data.provider] || props.data.provider
})
</script>

<style scoped>
.model-node {
  @apply relative bg-gray-900/95 border border-cyan-500/40 rounded-xl px-4 py-3 min-w-[180px];
  @apply shadow-lg shadow-cyan-500/10;
}

.node-badge {
  @apply absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[10px] font-bold;
  @apply bg-cyan-500 text-black rounded-full tracking-wider;
}

.node-content {
  @apply flex items-start gap-3 mt-2;
}

.node-icon {
  @apply w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 flex-shrink-0;
}

.config {
  @apply flex flex-col gap-2 flex-1;
}

.provider-logo {
  @apply flex items-center gap-2;
}

.provider-name {
  @apply text-xs font-medium text-white;
}

.config-select {
  @apply bg-gray-800/80 border border-gray-700/50 rounded px-2 py-1 text-white text-xs;
  @apply focus:outline-none focus:border-cyan-500/50;
}

.handle-top, .handle-bottom {
  @apply !bg-cyan-400 !border-2 !border-gray-900 !w-3 !h-3;
}
</style>

