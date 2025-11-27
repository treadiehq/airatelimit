<template>
  <div class="flow-designer h-full w-full">
    <!-- Toolbar -->
    <div class="absolute top-4 left-4 z-10 flex gap-2">
      <button
        v-for="nodeType in nodeTypes"
        :key="nodeType.type"
        @click="addNode(nodeType.type)"
        :class="nodeType.color"
        class="px-3 py-1.5 text-xs font-medium rounded-lg border transition-all hover:scale-105 flex items-center gap-1.5"
      >
        <component :is="nodeType.icon" class="w-3.5 h-3.5" />
        {{ nodeType.label }}
      </button>
    </div>

    <!-- Save/Load -->
    <div class="absolute top-4 right-4 z-10 flex gap-2">
      <button
        @click="saveFlow"
        class="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all"
      >
        Save Flow
      </button>
      <button
        @click="clearFlow"
        class="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all"
      >
        Clear
      </button>
    </div>

    <!-- Vue Flow Canvas -->
    <VueFlow
      v-model:nodes="nodes"
      v-model:edges="edges"
      :node-types="customNodeTypes"
      :default-viewport="{ zoom: 0.8, x: 100, y: 100 }"
      :snap-to-grid="true"
      :snap-grid="[16, 16]"
      @connect="onConnect"
      class="bg-gray-950"
      fit-view-on-init
    >
      <Background :gap="20" :size="1" pattern-color="rgba(255,255,255,0.03)" />
      <Controls position="bottom-left" class="!bg-gray-800 !border-gray-700" />
      <MiniMap 
        class="!bg-gray-900 !border-gray-700" 
        :node-color="nodeColor"
        position="bottom-right"
      />
    </VueFlow>
  </div>
</template>

<script setup lang="ts">
import { ref, markRaw } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'

import StartNode from './nodes/StartNode.vue'
import SplitNode from './nodes/SplitNode.vue'
import RateLimitNode from './nodes/RateLimitNode.vue'
import BudgetLimitNode from './nodes/BudgetLimitNode.vue'
import ResponseNode from './nodes/ResponseNode.vue'
import ModelNode from './nodes/ModelNode.vue'
import EndNode from './nodes/EndNode.vue'

const props = defineProps<{
  projectId: string
  initialFlow?: { nodes: any[], edges: any[] }
}>()

const emit = defineEmits<{
  (e: 'save', flow: { nodes: any[], edges: any[] }): void
}>()

const { addEdges } = useVueFlow()

// Custom node types
const customNodeTypes = {
  start: markRaw(StartNode),
  split: markRaw(SplitNode),
  rateLimit: markRaw(RateLimitNode),
  budgetLimit: markRaw(BudgetLimitNode),
  response: markRaw(ResponseNode),
  model: markRaw(ModelNode),
  end: markRaw(EndNode),
}

// Node type definitions for toolbar
const nodeTypes = [
  { 
    type: 'start', 
    label: 'Start', 
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: 'IconPlay'
  },
  { 
    type: 'split', 
    label: 'If/Else', 
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    icon: 'IconGitBranch'
  },
  { 
    type: 'rateLimit', 
    label: 'Rate Limit', 
    color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    icon: 'IconGauge'
  },
  { 
    type: 'budgetLimit', 
    label: 'Budget Limit', 
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: 'IconCoin'
  },
  { 
    type: 'response', 
    label: 'Response', 
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    icon: 'IconMessage'
  },
  { 
    type: 'model', 
    label: 'Model', 
    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    icon: 'IconCpu'
  },
  { 
    type: 'end', 
    label: 'End', 
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    icon: 'IconStop'
  },
]

// Simple icon components
const IconPlay = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>' }
const IconGitBranch = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>' }
const IconGauge = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>' }
const IconCoin = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 10h6M9 14h6"/></svg>' }
const IconMessage = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' }
const IconCpu = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/></svg>' }
const IconStop = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="8" y="8" width="8" height="8" rx="1"/></svg>' }

// Nodes and edges
const nodes = ref(props.initialFlow?.nodes || [
  {
    id: 'start-1',
    type: 'start',
    position: { x: 250, y: 50 },
    data: { label: 'Request In' }
  }
])

const edges = ref(props.initialFlow?.edges || [])

// Add new node
let nodeId = nodes.value.length + 1
const addNode = (type: string) => {
  const newNode = {
    id: `${type}-${nodeId++}`,
    type,
    position: { x: 250, y: 100 + nodes.value.length * 100 },
    data: getDefaultData(type)
  }
  nodes.value.push(newNode)
}

const getDefaultData = (type: string) => {
  switch (type) {
    case 'start':
      return { label: 'Request In' }
    case 'split':
      return { condition: 'tier', operator: '==', value: 'free' }
    case 'rateLimit':
      return { limit: 100, window: 'day', identifier: 'identity' }
    case 'budgetLimit':
      return { limit: 10, currency: 'USD', window: 'day', identifier: 'identity' }
    case 'response':
      return { 
        status: 429, 
        message: 'Rate limit exceeded', 
        includeUpgradeUrl: true 
      }
    case 'model':
      return { provider: 'openai', model: 'gpt-4o-mini' }
    case 'end':
      return {}
    default:
      return {}
  }
}

// Handle connections
const onConnect = (params: any) => {
  addEdges([{
    ...params,
    type: 'smoothstep',
    animated: true,
    style: { stroke: 'rgba(255,255,255,0.3)' }
  }])
}

// Minimap node colors
const nodeColor = (node: any) => {
  const colors: Record<string, string> = {
    start: '#3b82f6',
    split: '#a855f7',
    rateLimit: '#f43f5e',
    budgetLimit: '#f59e0b',
    response: '#10b981',
    model: '#06b6d4',
    end: '#6b7280',
  }
  return colors[node.type] || '#666'
}

// Save flow
const saveFlow = () => {
  emit('save', {
    nodes: nodes.value,
    edges: edges.value
  })
}

// Clear flow
const clearFlow = () => {
  nodes.value = [
    {
      id: 'start-1',
      type: 'start',
      position: { x: 250, y: 50 },
      data: { label: 'Request In' }
    }
  ]
  edges.value = []
}
</script>

<style>
.vue-flow__node {
  border-radius: 8px;
}

.vue-flow__edge-path {
  stroke-width: 2;
}

.vue-flow__controls {
  background: rgba(31, 41, 55, 0.9) !important;
  border-color: rgba(75, 85, 99, 0.5) !important;
}

.vue-flow__controls-button {
  background: transparent !important;
  border-color: rgba(75, 85, 99, 0.5) !important;
  color: #9ca3af !important;
}

.vue-flow__controls-button:hover {
  background: rgba(75, 85, 99, 0.3) !important;
}

.vue-flow__minimap {
  background: rgba(17, 24, 39, 0.9) !important;
  border-color: rgba(75, 85, 99, 0.5) !important;
}
</style>

