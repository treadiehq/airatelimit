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
                    @click="loadSecurityEvents(); configTab = 'security'"
                    :class="configTab === 'security' ? 'border-blue-300 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-400 hover:border-gray-300'"
                    class="whitespace-nowrap py-3 px-6 border-b-2 font-medium text-sm"
                  >
                    Security
                  </button>
                </nav>
              </div>

              <!-- Transparent Proxy Mode Info -->
              <div v-if="configTab === 'basic'" class="mx-6 mt-4 bg-blue-300/10 border border-blue-300/20 rounded-lg p-4">
                <div class="flex">
                  <svg class="w-5 h-5 text-blue-300 mt-0.5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <div>
                    <p class="font-medium text-blue-200 mb-1">Proxy</p>
                    <p class="text-sm text-blue-300/80">
                      Your API key is passed per-request, we never store it. Just point your OpenAI SDK to our proxy with your project key.
                    </p>
                    <div class="mt-3 p-3 bg-black/30 rounded-lg font-mono text-xs text-gray-300">
                      <div class="text-gray-500 mb-1">// Use with any OpenAI-compatible SDK:</div>
                      <div><span class="text-blue-300">baseURL:</span> "https://your-proxy.com/v1"</div>
                      <div><span class="text-blue-300">headers:</span> {{ '{' }} "x-project-key": "{{ project.projectKey || 'pk_...' }}", "x-identity": "user-123" {{ '}' }}</div>
                    </div>
                  </div>
                </div>
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

                  <!-- Tier Model Limits (Optional) -->
                  <div class="mt-4 pt-4 border-t border-gray-500/10">
                    <div class="flex items-center justify-between mb-2">
                      <label class="text-xs font-medium text-white">Model-Specific Limits (Optional)</label>
                      <button
                        @click="toggleTierModelLimits(String(tierName))"
                        class="text-xs text-blue-300 hover:text-blue-400"
                      >
                        {{ showTierModelLimitsSection[String(tierName)] ? 'Hide' : '+ Add Model Limits' }}
                      </button>
                    </div>
                    
                    <div v-if="showTierModelLimitsSection[String(tierName)]" class="space-y-2 mt-2">
                      <!-- Empty state when expanded but no models -->
                      <div v-if="!tier.modelLimits || Object.keys(tier.modelLimits).length === 0" class="text-center py-4 bg-gray-500/5 border border-gray-500/10 rounded">
                        <p class="text-xs text-gray-400">No model-specific limits yet. Add one below.</p>
                      </div>
                      
                      <div v-for="(modelLimit, modelName) in tier.modelLimits" :key="modelName" class="bg-gray-500/5 border border-gray-500/10 rounded p-3">
                        <div class="flex justify-between items-center mb-2">
                          <span class="text-xs font-medium text-white">{{ modelName }}</span>
                          <button
                            @click="deleteTierModelLimit(String(tierName), String(modelName))"
                            class="text-gray-500 hover:text-red-500 text-xs"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-3">
                              <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" />
                            </svg>
                          </button>
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                          <div>
                            <label class="block text-xs text-gray-400 mb-1">Requests</label>
                            <div class="flex items-center space-x-1">
                              <input
                                v-model.number="modelLimit.requestLimit"
                                type="number"
                                min="-1"
                                :disabled="modelLimit.requestLimit === -1"
                                class="flex-1 px-2 py-1 text-xs text-white bg-gray-500/10 border border-gray-500/10 rounded disabled:opacity-50"
                              />
                              <label class="flex items-center cursor-pointer" title="Unlimited">
                                <input
                                  type="checkbox"
                                  :checked="modelLimit.requestLimit === -1"
                                  @change="modelLimit.requestLimit = ($event.target as HTMLInputElement).checked ? -1 : 0"
                                  class="w-3 h-3 rounded border-gray-500/20 bg-gray-500/10 text-blue-300"
                                />
                              </label>
                            </div>
                          </div>
                          <div>
                            <label class="block text-xs text-gray-400 mb-1">Tokens</label>
                            <div class="flex items-center space-x-1">
                              <input
                                v-model.number="modelLimit.tokenLimit"
                                type="number"
                                min="-1"
                                :disabled="modelLimit.tokenLimit === -1"
                                class="flex-1 px-2 py-1 text-xs text-white bg-gray-500/10 border border-gray-500/10 rounded disabled:opacity-50"
                              />
                              <label class="flex items-center cursor-pointer" title="Unlimited">
                                <input
                                  type="checkbox"
                                  :checked="modelLimit.tokenLimit === -1"
                                  @change="modelLimit.tokenLimit = ($event.target as HTMLInputElement).checked ? -1 : 0"
                                  class="w-3 h-3 rounded border-gray-500/20 bg-gray-500/10 text-blue-300"
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div class="relative">
                        <div class="flex items-center space-x-2">
                          <div class="flex-1 relative">
                            <input
                              v-model="tierNewModelNames[String(tierName)]"
                              @input="showTierModelSuggestions[String(tierName)] = true"
                              @focus="showTierModelSuggestions[String(tierName)] = true"
                              @blur="hideTierModelSuggestions(String(tierName))"
                              type="text"
                              placeholder="Type model name"
                              class="w-full px-2 py-1 text-xs text-white bg-gray-500/10 border border-gray-500/10 rounded focus:ring-1 focus:ring-blue-300/50"
                            />
                            <!-- Suggestions for tier models -->
                            <div 
                              v-if="showTierModelSuggestions[String(tierName)] && getTierFilteredModels(String(tierName)).length > 0" 
                              class="absolute z-20 w-full mt-1 bg-black border border-gray-500/20 rounded shadow-xl max-h-48 overflow-y-auto"
                            >
                              <div
                                v-for="model in getTierFilteredModels(String(tierName))"
                                :key="model.name"
                                @click="selectTierModelSuggestion(String(tierName), model.name)"
                                class="px-3 py-2 hover:bg-gray-500/10 cursor-pointer border-b border-gray-500/10 last:border-b-0"
                              >
                                <div class="text-xs text-white font-mono">{{ model.name }}</div>
                                <div class="text-xs text-gray-500">{{ model.provider }}</div>
                              </div>
                            </div>
                          </div>
                          <button
                            @click="addTierModelLimit(String(tierName))"
                            class="px-2 py-1 text-xs bg-gray-500/10 border border-gray-500/10 text-white rounded hover:bg-gray-500/15"
                          >
                            + Add
                          </button>
                        </div>
                        <div v-if="tierNewModelNames[String(tierName)] && !isKnownModel(tierNewModelNames[String(tierName)])" class="mt-1 text-xs text-amber-300/80">
                          ⚠️ Unknown model
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Custom Message -->
                  <div class="mt-4">
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

              <!-- Security Tab -->
              <div v-show="configTab === 'security'" class="px-6 space-y-6">
                <!-- Security Header -->
                <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-6">
                  <div class="flex items-start">
                    <div>
                      <h3 class="font-semibold text-white mb-2">Prompt Injection Protection</h3>
                      <p class="text-sm text-white">
                        Protect your system prompts from being extracted or leaked through prompt injection attacks. 
                        Enable intelligent detection and blocking of malicious patterns.
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Enable Security -->
                <div class="bg-gray-500/10 border border-gray-500/20 rounded-lg p-6">
                  <div class="flex items-center justify-between">
                    <div>
                      <h4 class="text-sm font-semibold text-white mb-1">Security Protection</h4>
                      <p class="text-xs text-gray-400">Enable prompt injection detection for all requests</p>
                    </div>
                    <button
                      type="button"
                      @click="editForm.securityEnabled = !editForm.securityEnabled"
                      :class="editForm.securityEnabled ? 'bg-blue-300' : 'bg-gray-600'"
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                    >
                      <span
                        :class="editForm.securityEnabled ? 'translate-x-6' : 'translate-x-1'"
                        class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                      />
                    </button>
                  </div>

                  <!-- Security Mode -->
                  <div v-if="editForm.securityEnabled" class="mt-4 pt-4 border-t border-gray-500/20">
                    <label class="block text-sm font-medium text-white mb-2">Action Mode</label>
                    <div class="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        @click="editForm.securityMode = 'block'"
                        :class="editForm.securityMode === 'block' ? 'bg-gray-500/25 border-gray-500/10 text-white' : 'bg-gray-500/10 border-gray-500/10 text-gray-400'"
                        class="px-4 py-3 border rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                      >
                        <span class="block font-semibold mb-1">Block</span>
                        <span class="text-xs opacity-80">Reject suspicious requests</span>
                      </button>
                      <button
                        type="button"
                        @click="editForm.securityMode = 'log'"
                        :class="editForm.securityMode === 'log' ? 'bg-gray-500/25 border-gray-500/10 text-white' : 'bg-gray-500/10 border-gray-500/10 text-gray-400'"
                        class="px-4 py-3 border rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                      >
                        <span class="block font-semibold mb-1">Log Only</span>
                        <span class="text-xs opacity-80">Allow but track attempts</span>
                      </button>
                    </div>
                  </div>

                  <!-- Advanced Heuristics -->
                  <div v-if="editForm.securityEnabled" class="mt-4 pt-4 border-t border-gray-500/20">
                    <div class="flex items-center justify-between">
                      <div>
                        <h4 class="text-sm font-medium text-white mb-1">Advanced Heuristics</h4>
                        <p class="text-xs text-gray-400">Detect sophisticated attacks using AI patterns</p>
                      </div>
                      <button
                        type="button"
                        @click="editForm.securityHeuristicsEnabled = !editForm.securityHeuristicsEnabled"
                        :class="editForm.securityHeuristicsEnabled ? 'bg-blue-300' : 'bg-gray-600'"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                      >
                        <span
                          :class="editForm.securityHeuristicsEnabled ? 'translate-x-6' : 'translate-x-1'"
                          class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                        />
                      </button>
                    </div>
                  </div>

                  <!-- Detection Categories -->
                  <div v-if="editForm.securityEnabled" class="mt-4 pt-4 border-t border-gray-500/20">
                    <label class="block text-sm font-medium text-white mb-3">Detection Categories</label>
                    <div class="space-y-2">
                      <div
                        v-for="category in securityCategories"
                        :key="category.id"
                        class="flex items-start gap-3 p-3 bg-gray-500/10 border border-gray-500/20 rounded-lg"
                      >
                        <input
                          type="checkbox"
                          :id="`cat-${category.id}`"
                          :checked="editForm.securityCategories.includes(category.id)"
                          @change="toggleSecurityCategory(category.id)"
                          class="mt-1 w-4 h-4 rounded border-gray-500 text-blue-300 focus:ring-blue-300/50"
                        />
                        <label :for="`cat-${category.id}`" class="flex-1 cursor-pointer">
                          <div class="flex items-center gap-2 mb-1">
                            <span class="text-sm font-medium text-white">{{ category.name }}</span>
                            <span
                              :class="{
                                'bg-red-400/10 text-red-400': category.severity === 'high',
                                'bg-orange-300/10 text-orange-300': category.severity === 'medium',
                                'bg-yellow-300/10 text-yellow-300': category.severity === 'low'
                              }"
                              class="px-2 py-0.5 text-xs font-medium rounded"
                            >
                              {{ category.severity }}
                            </span>
                          </div>
                          <p class="text-xs text-gray-400">{{ category.description }}</p>
                        </label>
                      </div>
                    </div>
                  </div>

                  <!-- Save Button -->
                  <button
                    v-if="editForm.securityEnabled"
                    @click="handleUpdate"
                    :disabled="updating"
                    class="mt-6 w-full px-6 py-2 bg-blue-300 text-black text-sm font-medium rounded-lg hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {{ updating ? 'Saving...' : 'Save Security Settings' }}
                  </button>
                </div>

                <!-- Security Events -->
                <div class="bg-gray-500/10 border border-gray-500/20 rounded-lg p-6">
                  <div class="flex items-center justify-between mb-4">
                    <h4 class="text-sm font-semibold text-white">Recent Security Events</h4>
                  </div>

                  <div v-if="securityEventsLoading" class="text-center py-12">
                    <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-300"></div>
                    <p class="text-gray-400 text-sm mt-3">Loading events...</p>
                  </div>

                  <div v-else-if="securityEventsError" class="text-center py-12">
                    <p class="text-red-400 text-sm">{{ securityEventsError }}</p>
                  </div>

                  <div v-else-if="!securityEvents || securityEvents.length === 0" class="text-center py-12">
                    <div class="flex justify-center mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" class="w-12 h-12 text-gray-500">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p class="text-white font-medium mb-1">All Clear</p>
                    <p class="text-sm text-gray-400">No security threats detected</p>
                  </div>

                  <div v-else class="space-y-2">
                    <div
                      v-for="event in securityEvents.slice(0, 10)"
                      :key="event.id"
                      class="p-3 bg-gray-500/10 border border-gray-500/20 rounded-lg"
                    >
                      <div class="flex items-start justify-between mb-2">
                        <div class="flex items-center gap-2">
                          <span
                            :class="{
                              'bg-red-500/20 text-red-300': event.severity === 'high',
                              'bg-orange-500/20 text-orange-300': event.severity === 'medium',
                              'bg-yellow-500/20 text-yellow-300': event.severity === 'low'
                            }"
                            class="px-2 py-0.5 text-xs font-medium rounded"
                          >
                            {{ event.severity }}
                          </span>
                          <span
                            :class="event.blocked ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'"
                            class="px-2 py-0.5 text-xs font-medium rounded"
                          >
                            {{ event.blocked ? 'Blocked' : 'Logged' }}
                          </span>
                        </div>
                        <span class="text-xs text-gray-500">{{ formatEventTime(event.createdAt) }}</span>
                      </div>
                      <p class="text-sm text-white mb-1">{{ event.reason }}</p>
                      <div class="flex items-center gap-2 text-xs text-gray-400">
                        <span>User: {{ event.identity }}</span>
                        <span>•</span>
                        <span>Pattern: {{ formatCategoryName(event.pattern) }}</span>
                      </div>
                      <div v-if="event.messagePreview" class="mt-2 p-2 bg-black/20 rounded text-xs text-gray-400 font-mono truncate">
                        {{ event.messagePreview }}
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
const showTierModelSuggestions = ref<Record<string, boolean>>({})
const showTierModelLimitsSection = ref<Record<string, boolean>>({})
const tierNewModelNames = ref<Record<string, string>>({})

const securityEventsLoading = ref(false)
const securityEventsError = ref('')
const securityEvents = ref<any[]>([])

const securityCategories = ref([
  {
    id: 'systemPromptExtraction',
    name: 'System Prompt Extraction',
    description: 'Detects attempts to extract or reveal system prompts and instructions',
    severity: 'high'
  },
  {
    id: 'roleManipulation',
    name: 'Role Manipulation',
    description: 'Detects attempts to change the AI role or behavior (e.g., "DAN mode")',
    severity: 'high'
  },
  {
    id: 'instructionOverride',
    name: 'Instruction Override',
    description: 'Detects attempts to inject system-level commands or overrides',
    severity: 'high'
  },
  {
    id: 'boundaryBreaking',
    name: 'Boundary Breaking',
    description: 'Detects attempts to break out of the conversation context',
    severity: 'medium'
  },
  {
    id: 'obfuscation',
    name: 'Obfuscation',
    description: 'Detects suspicious encoding or obfuscation techniques',
    severity: 'medium'
  },
  {
    id: 'directLeakage',
    name: 'Direct Leakage',
    description: 'Detects direct requests to leak internal context or memory',
    severity: 'high'
  }
])

const api = useApi()

// Initialize visibility for tiers with existing model limits
watch(() => props.editForm.tiers, (tiers) => {
  if (tiers) {
    for (const [tierName, tier] of Object.entries(tiers)) {
      if ((tier as any).modelLimits && Object.keys((tier as any).modelLimits).length > 0) {
        showTierModelLimitsSection.value[tierName] = true
      }
    }
  }
}, { immediate: true, deep: true })

// Known AI models database
const knownModels = [
  // OpenAI
  { name: 'gpt-4o', provider: 'OpenAI', type: 'Chat', recommended: true },
  { name: 'gpt-4o-mini', provider: 'OpenAI', type: 'Chat', recommended: true },
  { name: 'gpt-4-turbo', provider: 'OpenAI', type: 'Chat', recommended: false },
  { name: 'gpt-4', provider: 'OpenAI', type: 'Chat', recommended: false },
  { name: 'gpt-3.5-turbo', provider: 'OpenAI', type: 'Chat', recommended: false },
  { name: 'o1-preview', provider: 'OpenAI', type: 'Reasoning', recommended: true },
  { name: 'o1-mini', provider: 'OpenAI', type: 'Reasoning', recommended: true },
  
  // Anthropic
  { name: 'claude-3-5-sonnet-20241022', provider: 'Anthropic', type: 'Chat', recommended: true },
  { name: 'claude-3-5-sonnet-latest', provider: 'Anthropic', type: 'Chat', recommended: true },
  { name: 'claude-3-opus-20240229', provider: 'Anthropic', type: 'Chat', recommended: false },
  { name: 'claude-3-sonnet-20240229', provider: 'Anthropic', type: 'Chat', recommended: false },
  { name: 'claude-3-haiku-20240307', provider: 'Anthropic', type: 'Chat', recommended: false },
  
  // Google
  { name: 'gemini-2.5-flash', provider: 'Google', type: 'Chat', recommended: true },
  { name: 'gemini-2.0-flash-exp', provider: 'Google', type: 'Chat', recommended: true },
  { name: 'gemini-1.5-pro', provider: 'Google', type: 'Chat', recommended: true },
  { name: 'gemini-1.5-flash', provider: 'Google', type: 'Chat', recommended: false },
  
  // xAI
  { name: 'grok-beta', provider: 'xAI', type: 'Chat', recommended: true },
  { name: 'grok-2-1212', provider: 'xAI', type: 'Chat', recommended: false },
]

const isKnownModel = (modelName: string) => {
  return knownModels.some(m => m.name.toLowerCase() === modelName.toLowerCase())
}

const getTierFilteredModels = (tierName: string) => {
  // Transparent proxy mode: show all models from all providers
  const search = tierNewModelNames.value[tierName]
  if (!search) {
    return knownModels.filter(m => m.recommended).slice(0, 6)
  }
  return knownModels.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.provider.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 8)
}

const selectTierModelSuggestion = (tierName: string, modelName: string) => {
  tierNewModelNames.value[tierName] = modelName
  showTierModelSuggestions.value[tierName] = false
}

const hideTierModelSuggestions = (tierName: string) => {
  setTimeout(() => {
    showTierModelSuggestions.value[tierName] = false
  }, 200)
}

const addTier = () => {
  if (newTierName.value && !props.editForm.tiers[newTierName.value]) {
    props.editForm.tiers[newTierName.value] = {
      requestLimit: 0,
      tokenLimit: 0,
      customMessage: '',
      modelLimits: {},
    }
    // Auto-show model limits section for new tiers
    showTierModelLimitsSection.value[newTierName.value] = false
    newTierName.value = ''
  }
}

const deleteTier = (tierName: string) => {
  delete props.editForm.tiers[tierName]
  delete tierNewModelNames.value[tierName]
}

const toggleTierModelLimits = (tierName: string) => {
  // Initialize modelLimits if it doesn't exist
  if (!props.editForm.tiers[tierName].modelLimits) {
    props.editForm.tiers[tierName].modelLimits = {}
  }
  // Toggle visibility
  showTierModelLimitsSection.value[tierName] = !showTierModelLimitsSection.value[tierName]
}

const addTierModelLimit = (tierName: string) => {
  const modelName = tierNewModelNames.value[tierName]
  if (modelName && !props.editForm.tiers[tierName].modelLimits[modelName]) {
    if (!props.editForm.tiers[tierName].modelLimits) {
      props.editForm.tiers[tierName].modelLimits = {}
    }
    props.editForm.tiers[tierName].modelLimits[modelName] = {
      requestLimit: 0,
      tokenLimit: 0,
    }
    tierNewModelNames.value[tierName] = ''
  }
}

const deleteTierModelLimit = (tierName: string, modelName: string) => {
  delete props.editForm.tiers[tierName].modelLimits[modelName]
}

const handleUpdate = () => {
  emit('update')
}

const loadSecurityEvents = async () => {
  if (!props.project?.id) return

  securityEventsLoading.value = true
  securityEventsError.value = ''

  try {
    const data = await api(`/projects/${props.project.id}/security/events?limit=50`)
    securityEvents.value = data
  } catch (err: any) {
    securityEventsError.value = err.message || 'Failed to load security events'
  } finally {
    securityEventsLoading.value = false
  }
}

const toggleSecurityCategory = (categoryId: string) => {
  const index = props.editForm.securityCategories.indexOf(categoryId)
  if (index > -1) {
    props.editForm.securityCategories.splice(index, 1)
  } else {
    props.editForm.securityCategories.push(categoryId)
  }
}

const formatEventTime = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

const formatCategoryName = (category: string) => {
  return category.replace(/([A-Z])/g, ' $1').trim()
}

// Reset security events when modal closes
watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    securityEvents.value = []
  }
})
</script>

