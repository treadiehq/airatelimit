<template>
  <div class="min-h-screen h-screen bg-black flex flex-col">
    <!-- Upgrade Required for Basic Plan -->
    <div v-if="planLoaded && !hasFlowDesigner" class="flex-1 flex flex-col items-center justify-center p-8">
      <div class="max-w-lg">
        <UpgradePrompt
          feature="flowDesigner"
          title="Flow Designer"
          description="Build visual AI workflows with our drag-and-drop Flow Designer."
        />
        <div class="mt-4 text-center">
          <NuxtLink 
            :to="`/projects/${projectId}`"
            class="text-xs text-gray-400 hover:text-white transition-colors inline-flex items-center gap-1"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to project
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Flow Designer Content -->
    <template v-else>
    <!-- Header -->
    <div class="bg-gray-500/10 border-b border-gray-500/10 p-3 flex justify-between items-center">
      <div class="flex items-center gap-4">
        <NuxtLink :to="`/projects/${projectId}`" class="">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </NuxtLink>
        <div>
          <h1 class="text-white text-lg font-medium">{{ project?.name || 'Loading...' }}</h1>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <!-- Validation warnings -->
        <div v-if="validationWarnings.length > 0" class="flex items-center gap-2">
          <div class="validation-warning" @click="showValidationDetails = !showValidationDetails">
            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
            </svg>
            <span>{{ validationWarnings.length }} issue{{ validationWarnings.length > 1 ? 's' : '' }}</span>
          </div>
          <!-- Validation dropdown -->
          <div v-if="showValidationDetails" class="validation-dropdown">
            <div class="validation-title">Flow Issues</div>
            <div v-for="(warning, i) in validationWarnings" :key="i" class="validation-item">
              {{ warning }}
            </div>
          </div>
        </div>
        <div v-if="hasUnsavedChanges" class="text-amber-300 text-xs">
          Unsaved changes
        </div>
        <button
          @click="clearCanvas"
          class="px-3 py-1.5 text-gray-400 text-sm font-medium rounded-lg border border-gray-500/15 hover:bg-gray-500/15 hover:text-white hover:border-gray-500/15 transition-colors"
        >
          Clear
        </button>
        <button
          @click="saveFlow"
          :disabled="saving"
          class="px-3 py-1.5 bg-blue-300 text-black text-sm font-medium rounded-lg hover:bg-blue-400 transition-colors"
        >
          Save
        </button>
      </div>
    </div>

    <!-- Flow Canvas -->
    <div class="flex-1 relative">
      <ClientOnly>
        <FlowDesigner
          ref="flowDesignerRef"
          v-if="project"
          :project-id="projectId"
          :initial-flow="project.flowConfig"
          @save="handleSave"
          @clear="handleClear"
        />
        <template #fallback>
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading flow designer...</p>
          </div>
        </template>
      </ClientOnly>
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '~/composables/useApi'
import { useToast } from '~/composables/useToast'

// Plan access check
const { hasFeature, loaded: planLoaded } = usePlan()
const hasFlowDesigner = computed(() => hasFeature('flowDesigner'))

definePageMeta({
  middleware: ['auth', 'trial']
})

const route = useRoute()
const api = useApi()
const toast = useToast()

const projectId = computed(() => route.params.id as string)
const project = ref<any>(null)
const saving = ref(false)
const hasUnsavedChanges = ref(false)
const currentFlow = ref<{ nodes: any[], edges: any[] } | null>(null)
const flowDesignerRef = ref<any>(null)
const showValidationDetails = ref(false)

// Validate flow and return warnings
const validationWarnings = computed(() => {
  if (!currentFlow.value) return []
  
  const warnings: string[] = []
  const { nodes, edges } = currentFlow.value
  
  // Check for start node
  const startNode = nodes.find(n => n.type === 'start')
  if (!startNode) {
    warnings.push('Missing Start node')
    return warnings // Can't check further without start
  }
  
  // Check if start node has outgoing edge
  const startEdges = edges.filter(e => e.source === startNode.id)
  if (startEdges.length === 0) {
    warnings.push('Start node is not connected to anything')
  }
  
  // Check for terminal nodes (Allow or LimitResponse)
  const terminalNodes = nodes.filter(n => n.type === 'allow' || n.type === 'limitResponse')
  if (terminalNodes.length === 0) {
    warnings.push('Missing terminal node (Allow or Limit Response)')
  }
  
  // Check for disconnected nodes (non-terminal nodes without outgoing edges)
  const nonTerminalTypes = ['start', 'checkTier', 'checkLimit', 'checkModel']
  for (const node of nodes) {
    if (nonTerminalTypes.includes(node.type)) {
      const outgoingEdges = edges.filter(e => e.source === node.id)
      if (outgoingEdges.length === 0 && node.type !== 'start') {
        warnings.push(`"${getNodeLabel(node)}" has no outgoing connections`)
      }
    }
    
    // Check if node is reachable (has incoming edge or is start)
    if (node.type !== 'start') {
      const incomingEdges = edges.filter(e => e.target === node.id)
      if (incomingEdges.length === 0) {
        warnings.push(`"${getNodeLabel(node)}" is not reachable`)
      }
    }
  }
  
  // Check CheckTier nodes have edges for each tier
  for (const node of nodes.filter(n => n.type === 'checkTier')) {
    const tiers = node.data?.tiers || []
    for (const tier of tiers) {
      const tierEdge = edges.find(e => e.source === node.id && e.sourceHandle === tier)
      if (!tierEdge) {
        warnings.push(`Check Tier: "${tier}" output not connected`)
      }
    }
  }
  
  // Check CheckLimit/CheckModel nodes have both outputs connected
  for (const node of nodes.filter(n => n.type === 'checkLimit' || n.type === 'checkModel')) {
    const passEdge = edges.find(e => e.source === node.id && e.sourceHandle === 'pass')
    const exceededEdge = edges.find(e => e.source === node.id && e.sourceHandle === 'exceeded')
    
    if (!passEdge) {
      warnings.push(`"${getNodeLabel(node)}" - "Within Limit" not connected`)
    }
    if (!exceededEdge) {
      warnings.push(`"${getNodeLabel(node)}" - "Exceeded" not connected`)
    }
  }
  
  return warnings
})

const getNodeLabel = (node: any) => {
  const labels: Record<string, string> = {
    start: 'Start',
    checkTier: 'Check Tier',
    checkLimit: 'Check Limit',
    checkModel: 'Check Model',
    limitResponse: 'Limit Response',
    allow: 'Allow'
  }
  return labels[node.type] || node.type
}

// Fetch project
const fetchProject = async () => {
  try {
    project.value = await api(`/projects/${projectId.value}`)
  } catch (err) {
    toast.error('Failed to load project')
  }
}

// Handle flow save from designer
const handleSave = (flow: { nodes: any[], edges: any[] }) => {
  currentFlow.value = flow
  hasUnsavedChanges.value = true
}

// Handle clear from designer
const handleClear = () => {
  currentFlow.value = null
  hasUnsavedChanges.value = false
}

// Clear canvas from header button
const clearCanvas = () => {
  flowDesignerRef.value?.clearFlow()
}

// Save to backend
const saveFlow = async () => {
  if (!currentFlow.value) return
  
  // Warn about validation issues but still allow saving
  if (validationWarnings.value.length > 0) {
    const proceed = confirm(
      `Your flow has ${validationWarnings.value.length} issue(s):\n\n` +
      validationWarnings.value.map(w => `• ${w}`).join('\n') +
      '\n\nIncomplete flows will default to "allow". Save anyway?'
    )
    if (!proceed) return
  }
  
  saving.value = true
  try {
    await api(`/projects/${projectId.value}`, {
      method: 'PATCH',
      body: { flowConfig: currentFlow.value }
    })
    hasUnsavedChanges.value = false
    toast.success('Flow saved successfully!')
  } catch (err) {
    toast.error('Failed to save flow')
  } finally {
    saving.value = false
  }
}

// Close validation dropdown when clicking outside
const closeValidation = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.validation-warning') && !target.closest('.validation-dropdown')) {
    showValidationDetails.value = false
  }
}

onMounted(() => {
  fetchProject()
  document.addEventListener('click', closeValidation)
})
</script>

<style scoped>
.validation-warning {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.3);
  cursor: pointer;
  transition: all 0.2s ease;
}

.validation-warning:hover {
  background: rgba(245, 158, 11, 0.3);
}

.validation-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  width: 280px;
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 50;
  overflow: hidden;
}

.validation-title {
  padding: 10px 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.validation-item {
  padding: 10px 12px;
  font-size: 12px;
  color: #fbbf24;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.validation-item:last-child {
  border-bottom: none;
}

.unsaved-badge {
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 9999px;
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.loading-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6b7280;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 2px solid #374151;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
