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
            <h2 class="text-white text-lg font-medium">Configurations</h2>
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
              <div class="border-b border-gray-500/20">
                <nav class="-mb-px flex space-x-1">
                  <button
                    @click="configTab = 'basic'"
                    :class="configTab === 'basic' ? 'border-blue-300 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-400 hover:border-gray-300'"
                    class="whitespace-nowrap py-3 px-6 border-b-2 font-medium text-sm"
                  >
                    Basic Limits
                  </button>
                  <button
                    @click="configTab = 'providers'"
                    :class="configTab === 'providers' ? 'border-blue-300 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-400 hover:border-gray-300'"
                    class="whitespace-nowrap py-3 px-6 border-b-2 font-medium text-sm"
                  >
                    Provider Keys
                    <!-- <span v-if="hasProviderKeys" class="ml-1.5 w-1.5 h-1.5 bg-green-400 rounded-full inline-block"></span> -->
                  </button>
                  <button
                    @click="configTab = 'tiers'"
                    :class="configTab === 'tiers' ? 'border-blue-300 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-400 hover:border-gray-300'"
                    class="whitespace-nowrap py-3 px-6 border-b-2 font-medium text-sm"
                  >
                    Plan Tiers
                  </button>
                  <button
                    @click="handleIdentitiesTabClick"
                    :class="configTab === 'identities' ? 'border-blue-300 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-400 hover:border-gray-300'"
                    class="whitespace-nowrap py-3 px-6 border-b-2 font-medium text-sm"
                  >
                    Identities
                  </button>
                  <button
                    @click="configTab = 'api'"
                    :class="configTab === 'api' ? 'border-blue-300 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-400 hover:border-gray-300'"
                    class="whitespace-nowrap py-3 px-6 border-b-2 font-medium text-sm"
                  >
                    API Access
                  </button>
                  <button
                    @click="hasSecurity ? handleSecurityTabClick() : configTab = 'security'"
                    :class="configTab === 'security' ? 'border-blue-300 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-400 hover:border-gray-300'"
                    class="whitespace-nowrap py-3 px-6 border-b-2 font-medium text-sm inline-flex items-center gap-1.5"
                  >
                    Security
                    <svg v-if="!hasSecurity" class="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
                    </svg>
                  </button>
                  <button
                    @click="configTab = 'privacy'"
                    :class="configTab === 'privacy' ? 'border-blue-300 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-400 hover:border-gray-300'"
                    class="whitespace-nowrap py-3 px-6 border-b-2 font-medium text-sm inline-flex items-center gap-1.5"
                  >
                    Privacy
                    <svg v-if="!hasPrivacy" class="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
                    </svg>
                  </button>
                  <button
                    @click="configTab = 'routing'"
                    :class="configTab === 'routing' ? 'border-blue-300 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-400 hover:border-gray-300'"
                    class="whitespace-nowrap py-3 px-6 border-b-2 font-medium text-sm inline-flex items-center gap-1.5"
                  >
                    Routing
                    <svg v-if="!hasRouting" class="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
                    </svg>
                  </button>
                  <button
                    @click="configTab = 'prompts'"
                    :class="configTab === 'prompts' ? 'border-blue-300 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-400 hover:border-gray-300'"
                    class="whitespace-nowrap py-3 px-6 border-b-2 font-medium text-sm inline-flex items-center gap-1.5"
                  >
                    Prompts
                    <svg v-if="!hasPrompts" class="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
                    </svg>
                  </button>
                  <button
                    @click="configTab = 'public'"
                    :class="configTab === 'public' ? 'border-blue-300 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-400 hover:border-gray-300'"
                    class="whitespace-nowrap py-3 px-6 border-b-2 font-medium text-sm inline-flex items-center gap-1.5"
                  >
                    Public Endpoints
                    <svg v-if="!hasPublicEndpoints" class="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
                    </svg>
                  </button>
                  <button
                    @click="configTab = 'ip-restrictions'"
                    :class="configTab === 'ip-restrictions' ? 'border-blue-300 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-400 hover:border-gray-300'"
                    class="whitespace-nowrap py-3 px-6 border-b-2 font-medium text-sm inline-flex items-center gap-1.5"
                  >
                    IP Restrictions
                    <svg v-if="!hasIpRestrictions" class="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>

              <!-- Changes Summary -->
              <div class="px-6">
                <ChangesSummary :changes="changes" />
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

              <IdentitiesTab
                v-show="configTab === 'identities'"
                ref="identitiesTabRef"
                :project-key="project?.projectKey"
              />

              <SecurityTab
                v-if="hasSecurity"
                v-show="configTab === 'security'"
                ref="securityTabRef"
                :project-id="project?.id"
                :edit-form="editForm"
                :updating="updating"
                @update="handleUpdate"
              />
              <div v-else-if="configTab === 'security'" class="px-6 py-8">
                <UpgradePrompt
                  feature="securityConfig"
                  title="Security"
                  description="Enable content moderation, prompt injection detection, and other security features to protect your AI applications."
                />
              </div>

              <PrivacyTab
                v-if="hasPrivacy"
                v-show="configTab === 'privacy'"
                :edit-form="editForm"
                :updating="updating"
                @update="handleUpdate"
              />
              <div v-else-if="configTab === 'privacy'" class="px-6 py-8">
                <UpgradePrompt
                  feature="privacyConfig"
                  title="Privacy"
                  description="Enable PII anonymization and session-based rate limiting to protect your users' data privacy."
                />
              </div>

              <PromptsTab
                v-if="hasPrompts"
                v-show="configTab === 'prompts'"
                :project-key="project?.projectKey"
              />
              <div v-else-if="configTab === 'prompts'" class="px-6 py-8">
                <UpgradePrompt
                  feature="promptsConfig"
                  title="Prompts"
                  description="Manage system prompts server-side. Version control, A/B testing, and update prompts without redeploying your application."
                />
              </div>

              <ApiAccessTab
                v-show="configTab === 'api'"
                :project="project"
                @update="handleUpdate"
              />

              <ProviderKeysTab
                v-show="configTab === 'providers'"
                :project-id="project?.id"
                :project-key="project?.projectKey"
                :provider-keys="editForm.providerKeys"
                @update="handleProviderKeysUpdate"
              />

              <div v-if="hasRouting" v-show="configTab === 'routing'" class="px-6 pb-6">
                <RoutingConfig
                  :project-id="project?.id"
                  :routing-enabled="project?.routingEnabled"
                  :routing-config="project?.routingConfig"
                  @saved="handleRoutingSaved"
                />
              </div>
              <div v-else-if="configTab === 'routing'" class="px-6 py-8">
                <UpgradePrompt
                  feature="smartRouting"
                  title="Smart Routing"
                  description="Route requests intelligently between AI providers based on cost, latency, or custom rules. Add fallbacks and load balancing."
                />
              </div>

              <PublicEndpointsTab
                v-if="hasPublicEndpoints"
                v-show="configTab === 'public'"
                :project-id="project?.id"
                :project-key="project?.projectKey"
                :edit-form="editForm"
                :updating="updating"
                :has-stored-provider-keys="hasProviderKeys"
                @update="handleUpdate"
              />
              <div v-else-if="configTab === 'public'" class="px-6 py-8">
                <UpgradePrompt
                  feature="publicEndpoints"
                  title="Public Endpoints"
                  description="Call the AI API directly from your frontend without exposing API keys. Requests are validated against allowed origins for security."
                />
              </div>

              <IpRestrictionsTab
                v-if="hasIpRestrictions"
                v-show="configTab === 'ip-restrictions'"
                :project-id="project?.id"
                :edit-form="editForm"
                :updating="updating"
                @update="handleUpdate"
              />
              <div v-else-if="configTab === 'ip-restrictions'" class="px-6 py-8">
                <UpgradePrompt
                  feature="ipRestrictions"
                  title="IP Restrictions"
                  description="Restrict API access to specific IP addresses or CIDR ranges. Enterprise security feature for trusted network access control."
                />
              </div>
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
import IdentitiesTab from './settings/IdentitiesTab.vue'
import SecurityTab from './settings/SecurityTab.vue'
import PrivacyTab from './settings/PrivacyTab.vue'
import PromptsTab from './settings/PromptsTab.vue'
import ApiAccessTab from './settings/ApiAccessTab.vue'
import ProviderKeysTab from './settings/ProviderKeysTab.vue'
import RoutingConfig from './settings/RoutingConfig.vue'
import PublicEndpointsTab from './settings/PublicEndpointsTab.vue'
import IpRestrictionsTab from './settings/IpRestrictionsTab.vue'

const props = defineProps<{
  isOpen: boolean
  project: any
  editForm: any
  updating: boolean
  updateError: string
  updateSuccess: boolean
}>()

// Plan feature checks
const { hasFeature, loaded: planLoaded } = usePlan()
const hasPrivacy = computed(() => hasFeature('privacyConfig'))
const hasSecurity = computed(() => hasFeature('securityConfig'))
const hasRouting = computed(() => hasFeature('smartRouting'))
const hasPrompts = computed(() => hasFeature('promptsConfig'))
const hasPublicEndpoints = computed(() => hasFeature('publicEndpoints'))
const hasIpRestrictions = computed(() => hasFeature('ipRestrictions'))

// Track changes for diff view
const changes = computed(() => {
  if (!props.project) return []
  
  const diffs: Array<{ field: string; from: any; to: any }> = []
  
  // Check basic fields
  if (props.editForm.name !== props.project.name) {
    diffs.push({ field: 'Name', from: props.project.name, to: props.editForm.name })
  }
  if (props.editForm.limitPeriod !== (props.project.limitPeriod || 'daily')) {
    diffs.push({ field: 'Limit Period', from: props.project.limitPeriod || 'daily', to: props.editForm.limitPeriod })
  }
  if (props.editForm.limitType !== (props.project.limitType || 'both')) {
    diffs.push({ field: 'Limit Type', from: props.project.limitType || 'both', to: props.editForm.limitType })
  }
  if (props.editForm.dailyRequestLimit !== props.project.dailyRequestLimit) {
    diffs.push({ field: 'Request Limit', from: props.project.dailyRequestLimit, to: props.editForm.dailyRequestLimit })
  }
  if (props.editForm.dailyTokenLimit !== props.project.dailyTokenLimit) {
    diffs.push({ field: 'Token Limit', from: props.project.dailyTokenLimit, to: props.editForm.dailyTokenLimit })
  }
  if (props.editForm.securityEnabled !== (props.project.securityEnabled || false)) {
    diffs.push({ field: 'Security Enabled', from: props.project.securityEnabled || false, to: props.editForm.securityEnabled })
  }
  if (props.editForm.securityMode !== (props.project.securityMode || 'block')) {
    diffs.push({ field: 'Security Mode', from: props.project.securityMode || 'block', to: props.editForm.securityMode })
  }
  
  return diffs
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update'): void
  (e: 'update-provider-keys'): void
  (e: 'routing-saved'): void
}>()

const configTab = ref('basic')
const securityTabRef = ref<InstanceType<typeof SecurityTab> | null>(null)
const identitiesTabRef = ref<InstanceType<typeof IdentitiesTab> | null>(null)

const handleUpdate = () => {
  emit('update')
}

const handleIdentitiesTabClick = () => {
  configTab.value = 'identities'
  // Refresh identities when switching to the tab
  nextTick(() => {
    identitiesTabRef.value?.loadIdentities()
  })
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

const hasProviderKeys = computed(() => {
  return props.project?.providerKeys && Object.keys(props.project.providerKeys).length > 0
})

const handleProviderKeysUpdate = (providerKeys: Record<string, { apiKey: string; baseUrl?: string }>) => {
  props.editForm.providerKeys = providerKeys
  emit('update-provider-keys')
}

const handleRoutingSaved = () => {
  emit('routing-saved')
}

// Reset tab when modal closes
watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    configTab.value = 'basic'
  }
})
</script>
