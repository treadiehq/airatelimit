<template>
  <div class="space-y-4">
    <!-- Templates & Testing Section (only show when rules exist) -->
    <div v-if="rules.length > 0" class="flex gap-2">
      <button
        @click="toggleTemplates"
        class="flex-1 px-4 py-2.5 bg-gray-500/10 border border-gray-500/20 text-white text-sm font-medium rounded-lg hover:bg-gray-500/20 transition-colors flex items-center justify-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
          <path d="M3.196 12.87l-.825.483a.75.75 0 000 1.294l7.25 4.25a.75.75 0 00.758 0l7.25-4.25a.75.75 0 000-1.294l-.825-.484-5.666 3.322a2.25 2.25 0 01-2.276 0L3.196 12.87z" />
          <path d="M3.196 8.87l-.825.483a.75.75 0 000 1.294l7.25 4.25a.75.75 0 00.758 0l7.25-4.25a.75.75 0 000-1.294l-.825-.484-5.666 3.322a2.25 2.25 0 01-2.276 0L3.196 8.87z" />
          <path d="M10.38 1.103a.75.75 0 00-.76 0l-7.25 4.25a.75.75 0 000 1.294l7.25 4.25a.75.75 0 00.76 0l7.25-4.25a.75.75 0 000-1.294l-7.25-4.25z" />
        </svg>
        {{ showTemplates ? 'Hide' : 'Show' }} Templates
      </button>
      <button
        @click="toggleTester"
        class="flex-1 px-4 py-2.5 bg-gray-500/10 border border-gray-500/20 text-white text-sm font-medium rounded-lg hover:bg-gray-500/20 transition-colors flex items-center justify-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
          <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
        </svg>
        {{ showTester ? 'Hide' : 'Show' }} Tester
      </button>
    </div>

    <!-- Templates Panel -->
    <div v-if="showTemplates" class="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4 space-y-3">
      <h3 class="text-sm font-semibold text-white">Rule Templates</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          v-for="template in ruleTemplates"
          :key="template.id"
          class="bg-gray-500/10 border border-gray-500/20 rounded-lg p-3 hover:bg-gray-500/20 cursor-pointer transition-colors"
          @click="applyTemplate(template)"
        >
          <div class="flex items-start justify-between mb-1">
            <h4 class="text-sm font-medium text-white">{{ template.name }}</h4>
            <span class="text-xs text-gray-400 bg-gray-500/20 px-2 py-0.5 rounded">{{ template.category }}</span>
          </div>
          <p class="text-xs text-gray-400">{{ template.description }}</p>
        </div>
      </div>
    </div>

    <!-- Rule Tester Panel -->
    <div v-if="showTester" class="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4 space-y-3">
      <h3 class="text-sm font-semibold text-white">Test Rules</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label class="block text-xs text-gray-400 mb-1">Identity</label>
          <input
            v-model="testContext.identity"
            type="text"
            placeholder="user-123"
            class="w-full px-3 py-2 text-sm text-white bg-gray-500/10 border border-gray-500/20 rounded-lg"
          />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Tier</label>
          <input
            v-model="testContext.tier"
            type="text"
            placeholder="free"
            class="w-full px-3 py-2 text-sm text-white bg-gray-500/10 border border-gray-500/20 rounded-lg"
          />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Requests Used</label>
          <input
            v-model.number="testContext.requestsUsed"
            type="number"
            placeholder="4"
            class="w-full px-3 py-2 text-sm text-white bg-gray-500/10 border border-gray-500/20 rounded-lg"
          />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Tokens Used</label>
          <input
            v-model.number="testContext.tokensUsed"
            type="number"
            placeholder="8000"
            class="w-full px-3 py-2 text-sm text-white bg-gray-500/10 border border-gray-500/20 rounded-lg"
          />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-gray-400 mb-1">Request Limit</label>
          <input
            v-model.number="testContext.requestLimit"
            type="number"
            placeholder="5"
            class="w-full px-3 py-2 text-sm text-white bg-gray-500/10 border border-gray-500/20 rounded-lg"
          />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Token Limit</label>
          <input
            v-model.number="testContext.tokenLimit"
            type="number"
            placeholder="10000"
            class="w-full px-3 py-2 text-sm text-white bg-gray-500/10 border border-gray-500/20 rounded-lg"
          />
        </div>
      </div>
      <button
        @click="testRules"
        class="w-full px-4 py-2 bg-blue-300 text-black text-sm font-medium rounded-lg hover:bg-blue-400"
      >
        Test Rules
      </button>
      
      <!-- Test Results -->
      <div v-if="testResult" class="mt-3 p-3 rounded-lg" :class="testResult.matched ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-green-500/10 border border-green-500/20'">
        <div class="flex items-start gap-2">
          <svg v-if="testResult.matched" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 text-yellow-400 shrink-0">
            <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 text-green-400 shrink-0">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
          </svg>
          <div class="flex-1">
            <p class="text-sm font-medium" :class="testResult.matched ? 'text-yellow-300' : 'text-green-300'">
              {{ testResult.matched ? `Rule Matched: "${testResult.ruleName}"` : 'No Rules Matched - Request Would Proceed' }}
            </p>
            <p v-if="testResult.matched" class="text-xs text-gray-400 mt-1">
              Action: {{ testResult.action.type }}
            </p>
            <pre v-if="testResult.matched && testResult.action.response" class="mt-2 text-xs text-gray-300 bg-black/20 p-2 rounded overflow-x-auto">{{ JSON.stringify(testResult.action.response, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="rules.length === 0" class="text-center py-16 bg-gray-500/10 border border-gray-500/20 rounded-lg">
      <div class="flex justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" class="w-20 h-20 text-gray-500">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-white mb-2">No Rules Yet</h3>
      <p class="text-sm text-gray-400 mb-6 max-w-md mx-auto">
        Rules let you customize responses based on usage patterns. Start by using a template or create your own rule.
      </p>
      <div class="flex items-center justify-center gap-3">
        <button
          @click="toggleTemplates"
          class="px-6 py-2.5 bg-gray-500/10 border border-gray-500/20 text-white text-sm font-medium rounded-lg hover:bg-gray-500/20 inline-flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
            <path d="M3.196 12.87l-.825.483a.75.75 0 000 1.294l7.25 4.25a.75.75 0 00.758 0l7.25-4.25a.75.75 0 000-1.294l-.825-.484-5.666 3.322a2.25 2.25 0 01-2.276 0L3.196 12.87z" />
            <path d="M3.196 8.87l-.825.483a.75.75 0 000 1.294l7.25 4.25a.75.75 0 00.758 0l7.25-4.25a.75.75 0 000-1.294l-.825-.484-5.666 3.322a2.25 2.25 0 01-2.276 0L3.196 8.87z" />
            <path d="M10.38 1.103a.75.75 0 00-.76 0l-7.25 4.25a.75.75 0 000 1.294l7.25 4.25a.75.75 0 00.76 0l7.25-4.25a.75.75 0 000-1.294l-7.25-4.25z" />
          </svg>
          Browse Templates
        </button>
        <button
          @click="addRule"
          class="px-6 py-2.5 bg-blue-300 text-black text-sm font-medium rounded-lg hover:bg-blue-400 inline-flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          Add Rule
        </button>
      </div>
    </div>

    <!-- Rule List -->
    <div v-for="(rule, index) in rules" :key="rule.id" class="border border-gray-500/10 rounded-lg p-4 space-y-3">
      <div class="flex justify-between items-start">
        <div class="flex-1 space-y-3">
          <!-- Rule Header -->
          <div class="flex items-center space-x-3">
            <input
              v-model="rule.enabled"
              type="checkbox"
              class="h-4 w-4 text-gray-400 rounded-lg border border-gray-500/10 bg-gray-500/10"
            />
            <input
              v-model="rule.name"
              type="text"
              placeholder="Rule name (e.g., Free tier 80% warning)"
              class="flex-1 px-3 py-2.5 text-sm text-white bg-gray-500/10 border border-gray-500/20 rounded-lg focus:ring-2 focus:ring-blue-300/50 hover:bg-gray-500/20"
            />
            <button
              @click="deleteRule(index)"
              class="text-gray-500 hover:text-red-500 text-xs"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4">
                <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>

          <!-- Condition Builder -->
          <div class="bg-gray-500/10 border border-gray-500/10 p-3 rounded-lg">
            <label class="block text-xs font-semibold text-white mb-2">WHEN (Condition)</label>
            
            <div class="space-y-2">
              <div class="relative">
                <select
                  v-model="rule.condition.type"
                  @change="resetCondition(rule)"
                  class="w-full px-3 py-2.5 text-sm text-white bg-gray-500/10 border border-gray-500/20 rounded-lg focus:ring-2 focus:ring-blue-300/50 focus:border-transparent appearance-none cursor-pointer pr-10 transition-all hover:bg-gray-500/20"
                >
                  <option value="usage_percent">Usage Percentage</option>
                  <option value="usage_absolute">Absolute Usage</option>
                  <option value="tier_match">Tier Matches</option>
                  <option value="composite">Multiple Conditions (AND/OR)</option>
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <!-- Usage Percent -->
              <div v-if="rule.condition.type === 'usage_percent'" class="grid grid-cols-3 gap-2">
                <div class="relative">
                  <select v-model="rule.condition.metric" class="w-full px-3 py-2.5 text-sm text-white bg-gray-500/10 border border-gray-500/20 rounded-lg appearance-none cursor-pointer pr-8 hover:bg-gray-500/20">
                    <option value="requests">Requests</option>
                    <option value="tokens">Tokens</option>
                  </select>
                  <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <div class="relative">
                  <select v-model="rule.condition.operator" class="w-full px-3 py-2.5 text-sm text-white bg-gray-500/10 border border-gray-500/20 rounded-lg appearance-none cursor-pointer pr-8 hover:bg-gray-500/20">
                    <option value="gte">≥</option>
                    <option value="gt">&gt;</option>
                    <option value="lte">≤</option>
                    <option value="lt">&lt;</option>
                    <option value="eq">=</option>
                  </select>
                  <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <input
                  v-model.number="rule.condition.threshold"
                  type="number"
                  placeholder="e.g., 80"
                  class="px-3 py-2.5 text-sm text-white bg-gray-500/10 border border-gray-500/20 rounded-lg focus:ring-2 focus:ring-blue-300/50 hover:bg-gray-500/20"
                />
              </div>

              <!-- Usage Absolute -->
              <div v-if="rule.condition.type === 'usage_absolute'" class="grid grid-cols-3 gap-2">
                <div class="relative">
                  <select v-model="rule.condition.metric" class="w-full px-3 py-2.5 text-sm text-white bg-gray-500/10 border border-gray-500/20 rounded-lg appearance-none cursor-pointer pr-8 hover:bg-gray-500/20">
                    <option value="requests">Requests</option>
                    <option value="tokens">Tokens</option>
                  </select>
                  <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <div class="relative">
                  <select v-model="rule.condition.operator" class="w-full px-3 py-2.5 text-sm text-white bg-gray-500/10 border border-gray-500/20 rounded-lg appearance-none cursor-pointer pr-8 hover:bg-gray-500/20">
                    <option value="gte">≥</option>
                    <option value="gt">&gt;</option>
                    <option value="lte">≤</option>
                    <option value="lt">&lt;</option>
                    <option value="eq">=</option>
                  </select>
                  <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <input
                  v-model.number="rule.condition.threshold"
                  type="number"
                  placeholder="e.g., 1000"
                  class="px-3 py-2.5 text-sm text-white bg-gray-500/10 border border-gray-500/20 rounded-lg focus:ring-2 focus:ring-blue-300/50 hover:bg-gray-500/20"
                />
              </div>

              <!-- Tier Match -->
              <div v-if="rule.condition.type === 'tier_match'">
                <input
                  v-model="rule.condition.tierValue"
                  type="text"
                  placeholder="Tier name (e.g., free)"
                  class="w-full px-3 py-2.5 text-sm text-white bg-gray-500/10 border border-gray-500/20 rounded-lg focus:ring-2 focus:ring-blue-300/50 hover:bg-gray-500/20"
                />
              </div>

              <!-- Composite (future enhancement) -->
              <div v-if="rule.condition.type === 'composite'" class="text-sm text-gray-400 italic">
                Advanced: Combine multiple conditions with AND/OR logic
              </div>
            </div>
          </div>

          <!-- Action Builder -->
          <div class="bg-gray-500/10 border border-gray-500/10 p-3 rounded-lg">
            <label class="block text-xs font-semibold text-white mb-2">THEN (Action)</label>
            
            <div class="space-y-2">
              <div class="relative">
                <select
                  v-model="rule.action.type"
                  class="w-full px-3 py-2.5 text-sm text-white bg-gray-500/10 border border-gray-500/20 rounded-lg focus:ring-2 focus:ring-blue-300/50 focus:border-transparent appearance-none cursor-pointer pr-10 transition-all hover:bg-gray-500/20"
                >
                  <option value="allow">Allow (Continue)</option>
                  <option value="block">Block (Generic Error)</option>
                  <option value="custom_response">Custom Response</option>
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <!-- Custom Response -->
              <div v-if="rule.action.type === 'custom_response'" class="space-y-2">
                <textarea
                  v-model="rule.action.responseText"
                  @input="updateResponseJSON(rule)"
                  rows="3"
                  placeholder='{"error": "upgrade_needed", "message": "You are at 80%! Upgrade to Pro", "deepLink": "myapp://upgrade"}'
                  class="w-full px-3 py-2.5 text-sm text-white bg-gray-500/10 border border-gray-500/20 rounded-lg focus:ring-2 focus:ring-blue-300/50 hover:bg-gray-500/20 font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Rule Button (only show when rules exist) -->
    <button
      v-if="rules.length > 0"
      @click="addRule"
      class="w-full py-3 border-2 border-dashed border-gray-500/35 rounded-lg text-gray-400 hover:border-gray-500/55 hover:text-white"
    >
      + Add Rule
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: any[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: any[]): void
}>()

const rules = computed({
  get: () => props.modelValue || [],
  set: (value) => emit('update:modelValue', value),
})

// Templates and testing state
const showTemplates = ref(false)
const showTester = ref(false)
const testContext = ref({
  identity: 'user-123',
  tier: 'free',
  requestsUsed: 4,
  tokensUsed: 8000,
  requestLimit: 5,
  tokenLimit: 10000,
})
const testResult = ref<any>(null)

// Rule Templates
const ruleTemplates = [
  {
    id: 'free-80-warning',
    name: 'Free Tier 80% Warning',
    category: 'Free Tier',
    description: 'Warn users at 80% of request limit',
    rule: {
      name: 'Free tier 80% warning',
      enabled: true,
      condition: {
        type: 'usage_percent',
        metric: 'requests',
        operator: 'gte',
        threshold: 80,
      },
      action: {
        type: 'custom_response',
        responseText: JSON.stringify({
          error: 'approaching_limit',
          message: 'You\'ve used 80% of your free requests today. Upgrade to Pro for unlimited access!',
          deepLink: 'myapp://upgrade?plan=pro',
          usagePercent: 80,
        }, null, 2),
      },
    },
  },
  {
    id: 'free-100-block',
    name: 'Free Tier 100% Block',
    category: 'Free Tier',
    description: 'Block when limit is reached',
    rule: {
      name: 'Free tier limit exceeded',
      enabled: true,
      condition: {
        type: 'usage_percent',
        metric: 'requests',
        operator: 'gte',
        threshold: 100,
      },
      action: {
        type: 'custom_response',
        responseText: JSON.stringify({
          error: 'limit_exceeded',
          message: 'You\'ve reached your daily limit. Upgrade to Pro for unlimited requests!',
          deepLink: 'myapp://upgrade?plan=pro',
          webUrl: 'https://yourapp.com/pricing',
        }, null, 2),
      },
    },
  },
  {
    id: 'token-90-warning',
    name: 'Token 90% Warning',
    category: 'Tokens',
    description: 'Warn at 90% token usage',
    rule: {
      name: 'Token usage 90% warning',
      enabled: true,
      condition: {
        type: 'usage_percent',
        metric: 'tokens',
        operator: 'gte',
        threshold: 90,
      },
      action: {
        type: 'custom_response',
        responseText: JSON.stringify({
          error: 'approaching_token_limit',
          message: 'You\'ve used 90% of your daily tokens. Consider upgrading!',
          deepLink: 'myapp://upgrade',
        }, null, 2),
      },
    },
  },
  {
    id: 'pro-95-warning',
    name: 'Pro Tier 95% Warning',
    category: 'Pro Tier',
    description: 'Warn Pro users at 95%',
    rule: {
      name: 'Pro tier 95% warning',
      enabled: true,
      condition: {
        type: 'usage_percent',
        metric: 'requests',
        operator: 'gte',
        threshold: 95,
      },
      action: {
        type: 'custom_response',
        responseText: JSON.stringify({
          error: 'approaching_limit',
          message: 'You\'re at 95% of your Pro plan limit. Consider upgrading to Enterprise!',
          deepLink: 'myapp://upgrade?plan=enterprise',
        }, null, 2),
      },
    },
  },
  {
    id: 'image-gen-5-limit',
    name: 'Image Generation Limit',
    category: 'Image Gen',
    description: '5 images per day for free users',
    rule: {
      name: 'Free tier image generation limit',
      enabled: true,
      condition: {
        type: 'usage_absolute',
        metric: 'requests',
        operator: 'gte',
        threshold: 5,
      },
      action: {
        type: 'custom_response',
        responseText: JSON.stringify({
          error: 'daily_limit_reached',
          message: 'You\'ve generated 5 images today (free limit). Upgrade to create unlimited images!',
          deepLink: 'myapp://upgrade',
          remainingImages: 0,
        }, null, 2),
      },
    },
  },
  {
    id: 'enterprise-allow',
    name: 'Enterprise Unlimited',
    category: 'Enterprise',
    description: 'Always allow enterprise users',
    rule: {
      name: 'Enterprise tier - always allow',
      enabled: true,
      condition: {
        type: 'tier_match',
        tierValue: 'enterprise',
      },
      action: {
        type: 'allow',
        responseText: '',
      },
    },
  },
]

const toggleTemplates = () => {
  showTemplates.value = !showTemplates.value
  if (showTemplates.value) {
    showTester.value = false
  }
}

const toggleTester = () => {
  showTester.value = !showTester.value
  if (showTester.value) {
    showTemplates.value = false
  }
}

const applyTemplate = (template: any) => {
  const newRule = {
    id: `rule-${Date.now()}`,
    ...JSON.parse(JSON.stringify(template.rule)),
  }
  rules.value = [...rules.value, newRule]
  showTemplates.value = false
}

const testRules = () => {
  const context = testContext.value
  
  // Calculate usage percentages
  const requestPercent = context.requestLimit > 0 
    ? (context.requestsUsed / context.requestLimit) * 100 
    : 0
  const tokenPercent = context.tokenLimit > 0 
    ? (context.tokensUsed / context.tokenLimit) * 100 
    : 0

  // Test each enabled rule
  for (const rule of rules.value) {
    if (!rule.enabled) continue

    let matched = false

    // Evaluate condition
    switch (rule.condition.type) {
      case 'usage_percent': {
        const percent = rule.condition.metric === 'requests' ? requestPercent : tokenPercent
        matched = compareValues(percent, rule.condition.operator, rule.condition.threshold)
        break
      }
      case 'usage_absolute': {
        const value = rule.condition.metric === 'requests' ? context.requestsUsed : context.tokensUsed
        matched = compareValues(value, rule.condition.operator, rule.condition.threshold)
        break
      }
      case 'tier_match': {
        matched = context.tier === rule.condition.tierValue
        break
      }
    }

    if (matched) {
      let response = null
      if (rule.action.type === 'custom_response') {
        try {
          response = JSON.parse(rule.action.responseText)
        } catch {
          response = { error: 'Invalid JSON in rule action' }
        }
      }

      testResult.value = {
        matched: true,
        ruleName: rule.name || 'Unnamed Rule',
        action: {
          type: rule.action.type,
          response,
        },
      }
      return
    }
  }

  testResult.value = {
    matched: false,
  }
}

const compareValues = (value: number, operator: string, threshold: number): boolean => {
  switch (operator) {
    case 'gt': return value > threshold
    case 'gte': return value >= threshold
    case 'lt': return value < threshold
    case 'lte': return value <= threshold
    case 'eq': return value === threshold
    default: return false
  }
}

const addRule = () => {
  const newRule = {
    id: `rule-${Date.now()}`,
    name: '',
    enabled: true,
    condition: {
      type: 'usage_percent',
      metric: 'requests',
      operator: 'gte',
      threshold: 80,
    },
    action: {
      type: 'custom_response',
      responseText: JSON.stringify({
        error: 'approaching_limit',
        message: 'You\'ve used 80% of your daily limit. Upgrade to Pro!',
        deepLink: 'myapp://upgrade',
      }, null, 2),
    },
  }

  rules.value = [...rules.value, newRule]
}

const deleteRule = (index: number) => {
  if (confirm('Delete this rule?')) {
    rules.value = rules.value.filter((_, i) => i !== index)
  }
}

const resetCondition = (rule: any) => {
  // Reset condition fields when type changes
  if (rule.condition.type === 'usage_percent' || rule.condition.type === 'usage_absolute') {
    rule.condition.metric = 'requests'
    rule.condition.operator = 'gte'
    rule.condition.threshold = 0
  } else if (rule.condition.type === 'tier_match') {
    rule.condition.tierValue = ''
  }
}

const updateResponseJSON = (rule: any) => {
  try {
    rule.action.response = JSON.parse(rule.action.responseText)
  } catch {
    // Keep responseText for editing, parse on save
  }
}

// Parse response text to JSON on mount for existing rules
onMounted(() => {
  rules.value.forEach(rule => {
    if (rule.action.type === 'custom_response' && rule.action.response) {
      rule.action.responseText = JSON.stringify(rule.action.response, null, 2)
    }
  })
})
</script>

