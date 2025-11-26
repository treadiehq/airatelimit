<template>
  <div class="space-y-4 px-6">
    <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-4">
      <h3 class="font-semibold text-white mb-2">How Tier-Based Limits Work</h3>
      <p class="text-sm text-white mb-2">
        Define different limits for <strong>free</strong>, <strong>pro</strong>, <strong>enterprise</strong>, etc.
        Your app passes a <code class="bg-gray-500/10 text-white px-1 rounded">tier</code> parameter in API calls.
      </p>
      <div class="mt-3 p-3 bg-gray-500/5 border border-gray-500/10 rounded-lg">
        <p class="text-xs text-gray-300 font-semibold mb-1">Template Variables</p>
        <p class="text-xs text-gray-400">
          Use in custom messages: <code class="bg-gray-500/10 text-white px-1 rounded text-xs">{{"{{"}}tier}}</code>, 
          <code class="bg-gray-500/10 text-white px-1 rounded text-xs">{{"{{"}}limit}}</code>, 
          <code class="bg-gray-500/10 text-white px-1 rounded text-xs">{{"{{"}}usage}}</code>, 
          <code class="bg-gray-500/10 text-white px-1 rounded text-xs">{{"{{"}}limitType}}</code>, 
          <code class="bg-gray-500/10 text-white px-1 rounded text-xs">{{"{{"}}period}}</code>
        </p>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="Object.keys(editForm.tiers || {}).length === 0" class="text-center py-12 bg-gray-500/10 border border-gray-500/20 rounded-lg">
      <div class="flex justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" class="w-20 h-20 text-gray-500">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-white mb-2">No Tiers Configured</h3>
      <p class="text-sm text-gray-400 mb-4 max-w-md mx-auto">
        Tiers let you set different limits for free, pro, and enterprise users. Add your first tier below.
      </p>
    </div>

    <!-- Tier Cards -->
    <div v-for="(tier, tierName) in editForm.tiers" :key="tierName" class="border border-gray-500/10 rounded-lg p-4">
      <div class="flex justify-between items-center mb-3">
        <h4 class="font-semibold text-white capitalize">{{ tierName }} Tier</h4>
        <button @click="$emit('deleteTier', String(tierName))" class="text-gray-500 hover:text-red-500 text-xs">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4">
            <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
      
      <!-- Limits -->
      <div class="grid grid-cols-2 gap-4 mb-3">
        <div>
          <label class="block text-xs font-medium text-white mb-1">Request Limit</label>
          <input
            v-model.number="tier.requestLimit"
            type="number"
            min="0"
            class="w-full px-3 py-2 text-sm text-white bg-gray-500/10 border border-gray-500/10 rounded-lg"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-white mb-1">Token Limit</label>
          <input
            v-model.number="tier.tokenLimit"
            type="number"
            min="0"
            class="w-full px-3 py-2 text-sm text-white bg-gray-500/10 border border-gray-500/10 rounded-lg"
          />
        </div>
      </div>

      <!-- Model Limits -->
      <TierModelLimits
        :tier-name="String(tierName)"
        :tier="tier"
        :known-models="knownModels"
      />

      <!-- Custom Message -->
      <div class="mt-4">
        <label class="block text-xs font-medium text-white mb-1">
          Custom Message (Optional)
          <span class="text-gray-500 font-normal ml-1">- Supports {{"{{"}}tier}}, {{"{{"}}limit}}, {{"{{"}}usage}}</span>
        </label>
        <textarea
          v-model="tier.customMessage"
          rows="3"
          placeholder='You&apos;ve used {{usage}}/{{limit}} {{tier}} {{limitType}} this {{period}}. [Upgrade](app://upgrade)!'
          class="w-full px-3 py-2 text-sm text-white bg-gray-500/10 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-blue-300/50 focus:border-transparent font-mono"
        />
      </div>
    </div>

    <!-- Add Tier -->
    <div class="flex items-center space-x-2">
      <input
        v-model="newTierName"
        type="text"
        placeholder="e.g., free, pro, enterprise"
        class="flex-1 px-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg text-sm"
      />
      <button
        @click="addTier"
        class="px-4 py-2 bg-gray-500/10 border border-gray-500/10 text-white text-sm font-medium rounded-lg hover:bg-gray-500/15"
      >
        + Add Tier
      </button>
    </div>

    <button
      @click="$emit('update')"
      :disabled="updating"
      class="w-full px-6 py-2 bg-blue-300 text-black text-sm font-medium rounded-lg hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {{ updating ? 'Saving...' : 'Save Tiers' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import TierModelLimits from './TierModelLimits.vue'

const props = defineProps<{
  editForm: any
  updating: boolean
}>()

const emit = defineEmits<{
  (e: 'update'): void
  (e: 'deleteTier', tierName: string): void
}>()

const newTierName = ref('')

const knownModels = [
  { name: 'gpt-4o', provider: 'OpenAI', recommended: true },
  { name: 'gpt-4o-mini', provider: 'OpenAI', recommended: true },
  { name: 'gpt-4-turbo', provider: 'OpenAI', recommended: false },
  { name: 'o1-preview', provider: 'OpenAI', recommended: true },
  { name: 'o1-mini', provider: 'OpenAI', recommended: true },
  { name: 'claude-3-5-sonnet-20241022', provider: 'Anthropic', recommended: true },
  { name: 'claude-3-5-sonnet-latest', provider: 'Anthropic', recommended: true },
  { name: 'gemini-2.5-flash', provider: 'Google', recommended: true },
  { name: 'gemini-2.0-flash-exp', provider: 'Google', recommended: true },
  { name: 'gemini-1.5-pro', provider: 'Google', recommended: true },
  { name: 'grok-beta', provider: 'xAI', recommended: true },
]

const addTier = () => {
  if (newTierName.value && !props.editForm.tiers[newTierName.value]) {
    props.editForm.tiers[newTierName.value] = {
      requestLimit: 0,
      tokenLimit: 0,
      customMessage: '',
      modelLimits: {},
    }
    newTierName.value = ''
  }
}
</script>

