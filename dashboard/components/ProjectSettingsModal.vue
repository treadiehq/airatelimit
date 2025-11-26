<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 overflow-y-auto"
      @click.self="$emit('close')"
    >
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')"></div>
      
      <!-- Modal -->
      <div class="flex min-h-full items-center justify-center p-0">
        <div
          class="relative w-full h-screen bg-black border-0 rounded-none shadow-xl"
          @click.stop
        >
          <!-- Header -->
          <div class="flex items-center justify-between p-6 py-4 border-b border-gray-500/20">
            <h2 class="text-xl font-bold text-white">Configurations</h2>
            <button
              @click="$emit('close')"
              class="text-gray-400 hover:text-white transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="h-[calc(100vh-81px)] overflow-y-auto">
            <div class="space-y-6">
              <!-- Config Tabs -->
              <div class="border-b border-gray-500/10">
                <nav class="-mb-px flex space-x-1">
                  <button
                    @click="configTab = 'basic'"
                    :class="configTab === 'basic' ? 'border-blue-300 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-400 hover:border-gray-300'"
                    class="whitespace-nowrap py-3 px-6 border-b-2 font-medium text-sm"
                  >
                    Basic Limits
                  </button>
                  <button
                    @click="configTab = 'tiers'"
                    :class="configTab === 'tiers' ? 'border-blue-300 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-400 hover:border-gray-300'"
                    class="whitespace-nowrap py-3 px-6 border-b-2 font-medium text-sm"
                  >
                    Plan Tiers
                  </button>
                  <button
                    @click="handleSecurityTabClick"
                    :class="configTab === 'security' ? 'border-blue-300 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-400 hover:border-gray-300'"
                    class="whitespace-nowrap py-3 px-6 border-b-2 font-medium text-sm"
                  >
                    Security
                  </button>
                </nav>
              </div>

              <!-- Tab Content -->
              <BasicLimitsTab
                v-show="configTab === 'basic'"
                :project="project"
                :edit-form="editForm"
                :updating="updating"
                :update-error="updateError"
                :update-success="updateSuccess"
                @update="handleUpdate"
              />

              <TiersTab
                v-show="configTab === 'tiers'"
                :edit-form="editForm"
                :updating="updating"
                @update="handleUpdate"
                @delete-tier="deleteTier"
              />

              <SecurityTab
                v-show="configTab === 'security'"
                ref="securityTabRef"
                :project-id="project?.id"
                :edit-form="editForm"
                :updating="updating"
                @update="handleUpdate"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import BasicLimitsTab from './settings/BasicLimitsTab.vue'
import TiersTab from './settings/TiersTab.vue'
import SecurityTab from './settings/SecurityTab.vue'

const props = defineProps<{
  isOpen: boolean
  project: any
  editForm: any
  updating: boolean
  updateError: string
  updateSuccess: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update'): void
}>()

const configTab = ref('basic')
const securityTabRef = ref<InstanceType<typeof SecurityTab> | null>(null)

const handleUpdate = () => {
  emit('update')
}

const handleSecurityTabClick = () => {
  configTab.value = 'security'
  // Load security events when switching to the tab
  nextTick(() => {
    securityTabRef.value?.loadEvents()
  })
}

const deleteTier = (tierName: string) => {
  delete props.editForm.tiers[tierName]
}

// Reset tab when modal closes
watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    configTab.value = 'basic'
  }
})
</script>
