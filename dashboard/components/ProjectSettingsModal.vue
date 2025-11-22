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
            <!-- Configuration Section -->
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
                    @click="configTab = 'models'"
                    :class="configTab === 'models' ? 'border-blue-300 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-400 hover:border-gray-300'"
                    class="whitespace-nowrap py-3 px-6 border-b-2 font-medium text-sm"
                  >
                    Model Limits
                  </button>
                  <button
                    @click="configTab = 'rules'"
                    :class="configTab === 'rules' ? 'border-blue-300 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-400 hover:border-gray-300'"
                    class="whitespace-nowrap py-3 px-6 border-b-2 font-medium text-sm"
                  >
                    Visual Rules
                  </button>
                  <button
                    @click="loadAnalytics(); configTab = 'analytics'"
                    :class="configTab === 'analytics' ? 'border-blue-300 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-400 hover:border-gray-300'"
                    class="whitespace-nowrap py-3 px-6 border-b-2 font-medium text-sm"
                  >
                    Analytics
                  </button>
                </nav>
              </div>

              <!-- Basic Limits Tab -->
              <form v-show="configTab === 'basic'" @submit.prevent="handleUpdate" class="space-y-4 px-6">
                <div>
                  <label class="block text-sm font-medium text-white mb-2">Project Name</label>
                  <input
                    v-model="editForm.name"
                    type="text"
                    class="w-full px-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-blue-300/50 focus:border-transparent"
                  />
                </div>

                <!-- Provider Display (Read-only) -->
                <div>
                  <label class="block text-sm font-medium text-white mb-2">AI Provider</label>
                  <div class="w-full px-4 py-2 text-gray-400 bg-gray-500/5 border border-gray-500/10 rounded-lg">
                    {{ providerLabels[project.provider] || 'OpenAI' }}
                  </div>
                  <p class="text-xs text-gray-500 mt-1">Provider cannot be changed after project creation</p>
                </div>

                <!-- Limit Period -->
                <div>
                  <label class="block text-sm font-medium text-white mb-2">Limit Period</label>
                  <div class="relative">
                    <select
                      v-model="editForm.limitPeriod"
                      class="w-full px-4 py-2.5 text-white bg-gray-500/10 border border-gray-500/20 rounded-lg focus:ring-2 focus:ring-blue-300/50 focus:border-transparent appearance-none cursor-pointer pr-10 transition-all hover:bg-gray-500/20"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <p class="text-xs text-gray-400 mt-1">
                    Reset limits daily, weekly, or monthly
                  </p>
                </div>

                <!-- Limit Type -->
                <div>
                  <label class="block text-sm font-medium text-white mb-2">Limit Type</label>
                  <div class="relative">
                    <select
                      v-model="editForm.limitType"
                      class="w-full px-4 py-2.5 text-white bg-gray-500/10 border border-gray-500/20 rounded-lg focus:ring-2 focus:ring-blue-300/50 focus:border-transparent appearance-none cursor-pointer pr-10 transition-all hover:bg-gray-500/20"
                    >
                      <option value="both">Both Requests & Tokens</option>
                      <option value="requests">Requests Only (Image Gen)</option>
                      <option value="tokens">Tokens Only (Chat)</option>
                    </select>
                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <p class="text-xs text-gray-400 mt-1">
                    Choose how to track usage: requests for image generation, tokens for chat, or both
                  </p>
                </div>

                <div v-if="editForm.limitType !== 'tokens'">
                  <label class="block text-sm font-medium text-white mb-2">Request Limit</label>
                  <input
                    v-model.number="editForm.dailyRequestLimit"
                    type="number"
                    min="0"
                    class="w-full px-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-blue-300/50 focus:border-transparent"
                  />
                  <p class="text-xs text-gray-500 mt-1">Leave empty for unlimited</p>
                </div>

                <div v-if="editForm.limitType !== 'requests'">
                  <label class="block text-sm font-medium text-white mb-2">Token Limit</label>
                  <input
                    v-model.number="editForm.dailyTokenLimit"
                    type="number"
                    min="0"
                    class="w-full px-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-blue-300/50 focus:border-transparent"
                  />
                  <p class="text-xs text-gray-500 mt-1">Leave empty for unlimited</p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-white mb-2">
                    Limit Exceeded Message
                  </label>
                  <textarea
                    v-model="editForm.limitMessage"
                    rows="3"
                    placeholder='{"error": "limit_exceeded", "message": "Upgrade to Pro!", "deepLink": "myapp://upgrade"}'
                    class="w-full px-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-blue-300/50 focus:border-transparent"
                  />
                  <p class="text-xs text-gray-500 mt-1">
                    Custom JSON response sent when limits are exceeded
                  </p>
                </div>

                <div v-if="updateError" class="p-3 bg-red-400/10 text-red-400 rounded-lg text-sm">
                  {{ updateError }}
                </div>

                <div v-if="updateSuccess" class="p-3 bg-green-300/10 text-green-300 rounded-lg text-sm">
                  Configuration updated successfully!
                </div>

                <button
                  type="submit"
                  :disabled="updating"
                  class="w-full px-6 py-2 bg-blue-300 text-black text-sm font-medium rounded-lg hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ updating ? 'Saving...' : 'Save Changes' }}
                </button>
              </form>

              <!-- Tiers Tab -->
              <div v-show="configTab === 'tiers'" class="space-y-4 px-6">
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
                    <p class="text-xs text-gray-400 mt-2">
                      <strong>Example:</strong> "You've used {{"{{"}}usage}}/{{"{{"}}limit}} {{"{{"}}tier}} requests. [Upgrade](app://upgrade)!"
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
                    Tiers let you set different limits for free, pro, and enterprise users. Add your first tier below to get started.
                  </p>
                </div>

                <div v-for="(tier, tierName) in editForm.tiers" :key="tierName" class="border border-gray-500/10 rounded-lg p-4">
                  <div class="flex justify-between items-center mb-3">
                    <h4 class="font-semibold text-white capitalize">{{ tierName }} Tier</h4>
                    <button
                      @click="deleteTier(String(tierName))"
                      class="text-gray-500 hover:text-red-500 text-xs"
                    >
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

                  <!-- Custom Message -->
                  <div>
                    <label class="block text-xs font-medium text-white mb-1">
                      Custom Message (Optional)
                      <span class="text-gray-500 font-normal ml-1">- Supports {{"{{"}}tier}}, {{"{{"}}limit}}, {{"{{"}}usage}}, {{"{{"}}limitType}}, {{"{{"}}period}}</span>
                    </label>
                    <textarea
                      v-model="tier.customMessage"
                      rows="3"
                      placeholder='You&apos;ve used {{usage}}/{{limit}} {{tier}} {{limitType}} this {{period}}. [Upgrade](app://upgrade)!'
                      class="w-full px-3 py-2 text-sm text-white bg-gray-500/10 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-blue-300/50 focus:border-transparent font-mono"
                    />
                    <p class="text-xs text-gray-500 mt-1">
                      Shown when this tier hits its limit. Use markdown for links: [Text](url)
                    </p>
                  </div>
                </div>

                <div class="flex items-center space-x-2">
                  <input
                    v-model="newTierName"
                    type="text"
                    placeholder="e.g., free, pro, enterprise"
                    class="flex-1 px-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg text-sm"
                  />
                  <button
                    @click="addTier"
                    class="px-4 py-2 bg-gray-500/10 border border-gray-500/10 text-white text-sm font-medium rounded-lg hover:bg-gray-500/15 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    + Add Tier
                  </button>
                </div>

                <button
                  @click="handleUpdate"
                  :disabled="updating"
                  class="w-full px-6 py-2 bg-blue-300 text-black text-sm font-medium rounded-lg hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ updating ? 'Saving...' : 'Save Tiers' }}
                </button>
              </div>

              <!-- Model Limits Tab -->
              <div v-show="configTab === 'models'" class="space-y-4 px-6">
                <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-4">
                  <h3 class="font-semibold text-white mb-2">How Model Limits Work</h3>
                  <p class="text-sm text-white mb-2">
                    Set different limits for each AI model (e.g., <strong>gpt-4o</strong>, <strong>claude-3-5-sonnet</strong>, <strong>gemini-pro</strong>).
                    Usage is tracked separately per model, and you can configure limits at both the project and tier level.
                  </p>
                  <div class="mt-3 p-3 bg-gray-500/5 border border-gray-500/10 rounded-lg">
                    <p class="text-xs text-gray-300 font-semibold mb-1">Priority Order</p>
                    <p class="text-xs text-gray-400">
                      <strong>Tier Model Limits</strong> → <strong>Project Model Limits</strong> → <strong>Tier General Limits</strong> → <strong>Project General Limits</strong>
                    </p>
                    <p class="text-xs text-gray-400 mt-2">
                      Model-specific limits override general limits. Configure model limits per tier in the Plan Tiers tab.
                    </p>
                  </div>
                </div>

                <!-- Empty State -->
                <div v-if="Object.keys(editForm.modelLimits || {}).length === 0" class="text-center py-12 bg-gray-500/10 border border-gray-500/20 rounded-lg">
                  <p class="text-white text-sm mb-1">No model-specific limits configured</p>
                  <p class="text-gray-400 text-xs">
                    Add limits for specific models below
                  </p>
                </div>

                <div v-for="(modelLimit, modelName) in editForm.modelLimits" :key="modelName" class="border border-gray-500/10 rounded-lg p-4">
                  <div class="flex justify-between items-center mb-3">
                    <h4 class="font-semibold text-white">{{ modelName }}</h4>
                    <button
                      @click="deleteModelLimit(String(modelName))"
                      class="text-gray-500 hover:text-red-500 text-xs"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4">
                        <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  
                  <!-- Limits -->
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-xs font-medium text-white mb-1">Request Limit</label>
                      <input
                        v-model.number="modelLimit.requestLimit"
                        type="number"
                        min="0"
                        class="w-full px-3 py-2 text-sm text-white bg-gray-500/10 border border-gray-500/10 rounded-lg"
                      />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-white mb-1">Token Limit</label>
                      <input
                        v-model.number="modelLimit.tokenLimit"
                        type="number"
                        min="0"
                        class="w-full px-3 py-2 text-sm text-white bg-gray-500/10 border border-gray-500/10 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div class="flex items-center space-x-2">
                  <input
                    v-model="newModelName"
                    type="text"
                    placeholder="e.g., gpt-4o, claude-3-5-sonnet, gemini-pro"
                    class="flex-1 px-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg text-sm"
                  />
                  <button
                    @click="addModelLimit"
                    class="px-4 py-2 bg-gray-500/10 border border-gray-500/10 text-white text-sm font-medium rounded-lg hover:bg-gray-500/15 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    + Add Model
                  </button>
                </div>

                <button
                  @click="handleUpdate"
                  :disabled="updating"
                  class="w-full px-6 py-2 bg-blue-300 text-black text-sm font-medium rounded-lg hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ updating ? 'Saving...' : 'Save Model Limits' }}
                </button>
              </div>

              <!-- Rules Tab -->
              <div v-show="configTab === 'rules'" class="px-6">
                <RuleBuilder v-model="editForm.rules" />
                <button
                  v-if="editForm.rules && editForm.rules.length > 0"
                  @click="handleUpdate"
                  :disabled="updating"
                  class="mt-4 w-full px-6 py-2 bg-blue-300 text-black text-sm font-medium rounded-lg hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ updating ? 'Saving...' : 'Save Rules' }}
                </button>
              </div>

              <!-- Analytics Tab -->
              <div v-show="configTab === 'analytics'" class="px-6 space-y-4">
                <div v-if="!analytics && !analyticsLoading && !analyticsError" class="text-center py-16">
                  <div class="flex justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" class="w-20 h-20 text-gray-500">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                    </svg>
                  </div>
                  <h3 class="text-lg font-semibold text-white mb-2">Rule Analytics</h3>
                  <p class="text-sm text-gray-400 mb-6 max-w-md mx-auto">
                    See which rules trigger most often, track user behavior, and optimize your upgrade messaging with detailed analytics.
                  </p>
                  <button
                    @click="loadAnalytics()"
                    class="px-6 py-2.5 bg-blue-300 text-black text-sm font-medium rounded-lg hover:bg-blue-400 inline-flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                      <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 01-.784.785l-1.192.238a1 1 0 000 1.962l1.192.238a1 1 0 01.785.785l.238 1.192a1 1 0 001.962 0l.238-1.192a1 1 0 01.785-.785l1.192-.238a1 1 0 000-1.962l-1.192-.238a1 1 0 01-.785-.785l-.238-1.192zM6.949 5.684a1 1 0 00-1.898 0l-.683 2.051a1 1 0 01-.633.633l-2.051.683a1 1 0 000 1.898l2.051.684a1 1 0 01.633.632l.683 2.051a1 1 0 001.898 0l.683-2.051a1 1 0 01.633-.633l2.051-.683a1 1 0 000-1.898l-2.051-.683a1 1 0 01-.633-.633L6.95 5.684zM13.949 13.684a1 1 0 00-1.898 0l-.184.551a1 1 0 01-.632.633l-.551.183a1 1 0 000 1.898l.551.183a1 1 0 01.633.633l.183.551a1 1 0 001.898 0l.184-.551a1 1 0 01.632-.633l.551-.183a1 1 0 000-1.898l-.551-.184a1 1 0 01-.633-.632l-.183-.551z" />
                    </svg>
                    Load Analytics
                  </button>
                </div>

                <div v-else-if="analyticsLoading" class="text-center py-16">
                  <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-300"></div>
                  <p class="text-gray-400 text-sm mt-3">Loading analytics...</p>
                </div>

                <div v-else-if="analyticsError" class="text-center py-16">
                  <div class="flex justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-16 h-16 text-red-400">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                  </div>
                  <p class="text-red-400 font-medium mb-2">Failed to Load Analytics</p>
                  <p class="text-sm text-gray-400">{{ analyticsError }}</p>
                  <button
                    @click="loadAnalytics()"
                    class="mt-4 px-4 py-2 bg-gray-500/10 border border-gray-500/20 text-white text-sm rounded-lg hover:bg-gray-500/20"
                  >
                    Try Again
                  </button>
                </div>

                <div v-else-if="analytics" class="space-y-4">
                  <!-- Summary Cards -->
                  <div class="grid grid-cols-3 gap-4">
                    <div class="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
                      <p class="text-xs text-gray-400 mb-1">Total Triggers</p>
                      <p class="text-2xl font-bold text-white">{{ totalTriggers }}</p>
                      <p class="text-xs text-gray-500 mt-1">Last 7 days</p>
                    </div>
                    <div class="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
                      <p class="text-xs text-gray-400 mb-1">Active Rules</p>
                      <p class="text-2xl font-bold text-white">{{ analytics.stats.length }}</p>
                      <p class="text-xs text-gray-500 mt-1">Triggered at least once</p>
                    </div>
                    <div class="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
                      <p class="text-xs text-gray-400 mb-1">Unique Users</p>
                      <p class="text-2xl font-bold text-white">{{ uniqueUsers }}</p>
                      <p class="text-xs text-gray-500 mt-1">Affected by rules</p>
                    </div>
                  </div>

                  <!-- Rule Statistics -->
                  <div class="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
                    <h3 class="text-sm font-semibold text-white mb-3">Most Triggered Rules</h3>
                    <div v-if="analytics.stats.length === 0" class="text-center py-12">
                      <div class="flex justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" class="w-16 h-16 text-gray-500">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                        </svg>
                      </div>
                      <p class="text-white font-medium mb-1">No Triggers Yet</p>
                      <p class="text-sm text-gray-400 max-w-sm mx-auto">
                        Your rules haven't been triggered yet. Once users start hitting limits, you'll see analytics here.
                      </p>
                    </div>
                    <div v-else class="space-y-2">
                      <div
                        v-for="stat in analytics.stats"
                        :key="stat.ruleId"
                        class="flex items-center justify-between p-3 bg-gray-500/10 border border-gray-500/20 rounded-lg"
                      >
                        <div class="flex-1">
                          <p class="text-sm font-medium text-white">{{ stat.ruleName || 'Unnamed Rule' }}</p>
                          <p class="text-xs text-gray-400 mt-0.5">
                            {{ stat.uniqueIdentities }} unique {{ stat.uniqueIdentities === 1 ? 'user' : 'users' }} affected
                          </p>
                        </div>
                        <div class="text-right">
                          <p class="text-lg font-bold text-blue-300">{{ stat.triggerCount }}</p>
                          <p class="text-xs text-gray-500">triggers</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Triggers by Day Chart -->
                  <div class="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
                    <h3 class="text-sm font-semibold text-white mb-3">Triggers Over Time</h3>
                    <div v-if="analytics.byDay.length === 0" class="text-center py-12">
                      <div class="flex justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" class="w-16 h-16 text-gray-500">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                        </svg>
                      </div>
                      <p class="text-white font-medium mb-1">No Activity Recorded</p>
                      <p class="text-sm text-gray-400 max-w-sm mx-auto">
                        Timeline data will appear here once your rules start triggering. Check back after some API usage.
                      </p>
                    </div>
                    <div v-else class="space-y-2">
                      <div
                        v-for="day in analytics.byDay"
                        :key="day.date"
                        class="flex items-center gap-3"
                      >
                        <div class="text-xs text-gray-400 w-24">{{ formatDate(day.date) }}</div>
                        <div class="flex-1 bg-gray-500/10 rounded-full h-6 overflow-hidden">
                          <div
                            class="bg-blue-300 h-full rounded-full"
                            :style="{ width: `${(day.count / maxDayCount) * 100}%` }"
                          ></div>
                        </div>
                        <div class="text-sm text-white w-12 text-right">{{ day.count }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
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
const newTierName = ref('')
const newModelName = ref('')
const analytics = ref<any>(null)
const analyticsLoading = ref(false)
const analyticsError = ref('')

const api = useApi()

const providerLabels: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  xai: 'xAI',
  other: 'Other (OpenAI-compatible)',
}

const addTier = () => {
  if (newTierName.value && !props.editForm.tiers[newTierName.value]) {
    props.editForm.tiers[newTierName.value] = {
      requestLimit: 0,
      tokenLimit: 0,
      customMessage: '',
    }
    newTierName.value = ''
  }
}

const deleteTier = (tierName: string) => {
  delete props.editForm.tiers[tierName]
}

const addModelLimit = () => {
  if (newModelName.value && !props.editForm.modelLimits[newModelName.value]) {
    props.editForm.modelLimits[newModelName.value] = {
      requestLimit: 0,
      tokenLimit: 0,
    }
    newModelName.value = ''
  }
}

const deleteModelLimit = (modelName: string) => {
  delete props.editForm.modelLimits[modelName]
}

const handleUpdate = () => {
  emit('update')
}

const loadAnalytics = async () => {
  if (!props.project?.id) return

  analyticsLoading.value = true
  analyticsError.value = ''

  try {
    const data = await api(`/projects/${props.project.id}/analytics/rule-triggers?days=7`)
    analytics.value = data
  } catch (err: any) {
    analyticsError.value = err.message || 'Failed to load analytics'
  } finally {
    analyticsLoading.value = false
  }
}

const totalTriggers = computed(() => {
  if (!analytics.value?.stats) return 0
  return analytics.value.stats.reduce((sum: number, stat: any) => sum + stat.triggerCount, 0)
})

const uniqueUsers = computed(() => {
  if (!analytics.value?.stats) return 0
  const allUsers = new Set()
  analytics.value.stats.forEach((stat: any) => {
    // This is an approximation; actual unique count would need server-side
    allUsers.add(stat.uniqueIdentities)
  })
  return analytics.value.stats.reduce((sum: number, stat: any) => sum + stat.uniqueIdentities, 0)
})

const maxDayCount = computed(() => {
  if (!analytics.value?.byDay || analytics.value.byDay.length === 0) return 1
  return Math.max(...analytics.value.byDay.map((d: any) => d.count))
})

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Reset analytics when modal closes
watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    analytics.value = null
  }
})
</script>

