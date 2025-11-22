<template>
  <div class="space-y-4">
    <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-4">
      <p class="text-sm text-white">
        This allows you to define complex conditions and actions.
        Example: "When usage reaches 80% on free tier, send upgrade message with deep link"
      </p>
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
              class="text-red-400 hover:text-red-500 text-sm"
            >
              Delete
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

    <!-- Add Rule Button -->
    <button
      @click="addRule"
      class="w-full py-3 border-2 border-dashed border-gray-500/10 rounded-lg text-gray-400 hover:border-gray-500/20 hover:text-gray-500"
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

