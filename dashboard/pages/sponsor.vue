<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Feature Gate: Only show in cloud (Pro+) or enterprise mode -->
    <FeatureGate
      feature="showSponsorship"
      title="Sponsorship & Key Pooling"
      description="Donate API credits to developers or contribute your API keys to shared pools. Available on Pro and Enterprise plans."
    >
    <div class="space-y-8">
      <!-- Header -->
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-2xl font-bold text-white flex items-center gap-3">
            Sponsor
          </h1>
          <p class="text-gray-400 mt-1 text-sm">
            Donate API credits to developers or contribute keys to shared pools.
          </p>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Sponsorships Overview -->
        <div class="bg-gray-500/10 border border-gray-500/10 rounded-xl p-6">
          <div class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            SPONSORSHIPS
          </div>
          <div class="text-3xl font-bold text-white mb-1">
            {{ sponsorStats?.activeSponsorships || 0 }} <span class="text-base font-normal text-gray-500">active</span>
          </div>
          <div class="text-sm text-emerald-300">
            {{ sponsorStats?.recipients || 0 }} recipients
          </div>
        </div>

        <!-- Token Budgets -->
        <div class="bg-gray-500/10 border border-gray-500/10 rounded-xl p-6">
          <div class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            TOKEN BUDGETS
          </div>
          <div class="space-y-2">
            <!-- Monthly tokens -->
            <div v-if="sponsorStats?.tokens?.monthly?.count" class="flex items-center justify-between text-sm">
              <span class="text-gray-400">Monthly</span>
              <span class="text-white font-medium">
                {{ formatNumber(sponsorStats.tokens.monthly.budget) }}
                <span class="text-gray-500 font-normal">({{ formatNumber(sponsorStats.tokens.monthly.used) }} used)</span>
              </span>
            </div>
            <!-- One-time tokens -->
            <div v-if="sponsorStats?.tokens?.oneTime?.count" class="flex items-center justify-between text-sm">
              <span class="text-amber-300">One-time</span>
              <span class="text-white font-medium">
                {{ formatNumber(sponsorStats.tokens.oneTime.budget) }}
                <span class="text-gray-500 font-normal">({{ formatNumber(sponsorStats.tokens.oneTime.used) }} used)</span>
              </span>
            </div>
            <!-- Empty state -->
            <div v-if="!sponsorStats?.tokens?.monthly?.count && !sponsorStats?.tokens?.oneTime?.count" class="text-gray-500 text-sm">
              No token budgets
            </div>
          </div>
        </div>

        <!-- Request Budgets -->
        <div class="bg-gray-500/10 border border-gray-500/10 rounded-xl p-6">
          <div class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            REQUEST BUDGETS
          </div>
          <div class="space-y-2">
            <!-- Monthly requests -->
            <div v-if="sponsorStats?.requests?.monthly?.count" class="flex items-center justify-between text-sm">
              <span class="text-gray-400">Monthly</span>
              <span class="text-white font-medium">
                {{ formatNumber(sponsorStats.requests.monthly.budget) }}
                <span class="text-gray-500 font-normal">({{ formatNumber(sponsorStats.requests.monthly.used) }} used)</span>
              </span>
            </div>
            <!-- One-time requests -->
            <div v-if="sponsorStats?.requests?.oneTime?.count" class="flex items-center justify-between text-sm">
              <span class="text-amber-300">One-time</span>
              <span class="text-white font-medium">
                {{ formatNumber(sponsorStats.requests.oneTime.budget) }}
                <span class="text-gray-500 font-normal">({{ formatNumber(sponsorStats.requests.oneTime.used) }} used)</span>
              </span>
            </div>
            <!-- Empty state -->
            <div v-if="!sponsorStats?.requests?.monthly?.count && !sponsorStats?.requests?.oneTime?.count" class="text-gray-500 text-sm">
              No request budgets
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-500/20">
        <nav class="flex gap-4">
          <button
            @click="activeTab = 'sponsorships'"
            :class="[
              'pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5',
              activeTab === 'sponsorships'
                ? 'border-blue-300 text-blue-300'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            ]"
          >
            <!-- <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg> -->
            Token
          </button>
          <button
            @click="activeTab = 'keys'"
            :class="[
              'pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5',
              activeTab === 'keys'
                ? 'border-blue-300 text-blue-300'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            ]"
          >
            <!-- <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg> -->
            Key Pool
          </button>
          <button
            @click="activeTab = 'received'"
            :class="[
              'pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5',
              activeTab === 'received'
                ? 'border-blue-300 text-blue-300'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            ]"
          >
            <!-- <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg> -->
            Received
          </button>
        </nav>
      </div>

      <!-- TAB: Token Donations -->
      <div v-if="activeTab === 'sponsorships'" class="space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-white">Your Sponsorships</h2>
          <button
            @click="showCreateModal = true"
            class="inline-flex items-center gap-2 px-4 py-2 bg-blue-300 hover:bg-blue-400 text-black font-medium rounded-lg transition-colors text-sm"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Sponsor Someone
          </button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="grid gap-4">
          <div v-for="i in 3" :key="i" class="bg-gray-500/10 border border-gray-500/10 rounded-xl p-5 animate-pulse">
            <div class="h-6 bg-gray-500/20 rounded w-48 mb-4"></div>
            <div class="h-4 bg-gray-500/10 rounded w-32"></div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="mySponsorships.length === 0" class="text-center py-16 bg-gray-500/10 border border-gray-500/10 border-dashed rounded-xl">
          <div class="flex justify-center mb-4">
            <svg class="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-white mb-2">No sponsorships yet</h3>
          <p class="text-gray-400 text-sm mb-4">
            Sponsor a developer or project with API credits.
          </p>
          <button
            @click="showCreateModal = true"
            class="inline-flex items-center gap-2 px-4 py-2 bg-blue-300 hover:bg-blue-400 text-black font-medium rounded-lg transition-colors text-sm"
          >
            Create Your First Sponsorship
          </button>
        </div>

        <!-- Sponsorships List -->
        <div v-else class="space-y-4">
          <div
            v-for="sponsorship in mySponsorships"
            :key="sponsorship.id"
            class="bg-gray-500/10 border border-gray-500/10 rounded-xl p-5 hover:bg-gray-500/10 transition-colors"
          >
            <div class="flex items-start justify-between mb-4">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-white font-medium">{{ sponsorship.recipientName || sponsorship.recipientIdentity }}</span>
                  <span
                    :class="[
                      'text-xs px-2 py-0.5 rounded-full',
                      sponsorship.active ? 'bg-emerald-300/10 text-emerald-300' : 'bg-gray-500/10 text-gray-400'
                    ]"
                  >
                    {{ sponsorship.active ? 'Active' : 'Paused' }}
                  </span>
                </div>
                <div class="text-sm text-gray-400 mt-1">
                  {{ sponsorship.recipientIdentity }}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="toggleSponsorship(sponsorship)"
                  :class="[
                    'p-2 rounded-lg transition-colors',
                    sponsorship.active
                      ? 'text-gray-400 hover:text-amber-300 hover:bg-amber-300/10'
                      : 'text-gray-400 hover:text-emerald-300 hover:bg-emerald-300/10'
                  ]"
                  :title="sponsorship.active ? 'Pause sponsorship' : 'Resume sponsorship'"
                >
                  <svg v-if="sponsorship.active" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <button
                  @click="confirmDelete(sponsorship)"
                  class="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  title="Delete sponsorship"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Usage Progress -->
            <div class="mb-4">
              <div class="flex items-center justify-between text-sm mb-2">
                <span class="text-gray-400">
                  {{ formatBudget(sponsorship.currentPeriodUsage, sponsorship.budgetType) }} used
                </span>
                <span class="text-gray-300">
                  {{ formatBudget(sponsorship.budget, sponsorship.budgetType) }}
                  <span :class="sponsorship.renewalType === 'one-time' ? 'text-amber-300' : 'text-gray-500'">
                    {{ sponsorship.renewalType === 'one-time' ? 'one-time' : '/ month' }}
                  </span>
                </span>
              </div>
              <div class="h-2 bg-gray-500/20 rounded-full overflow-hidden">
                <div
                  :class="[
                    'h-full rounded-full transition-all',
                    sponsorship.renewalType === 'one-time' ? 'bg-amber-400' : 'bg-blue-300'
                  ]"
                  :style="{ width: `${Math.min(100, getUsagePercent(sponsorship))}%` }"
                ></div>
              </div>
            </div>

            <!-- Details -->
            <div class="flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span>Project: {{ sponsorship.project?.name || sponsorship.projectId.slice(0, 8) }}</span>
              <span v-if="sponsorship.expiresAt">Expires: {{ formatDate(sponsorship.expiresAt) }}</span>
              <span>Created: {{ formatDate(sponsorship.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB: Key Pool -->
      <div v-if="activeTab === 'keys'" class="space-y-6">
        <!-- Generate Invite Link Section -->
        <div class="bg-gray-500/5 border border-gray-500/10 rounded-xl p-6">
          <h3 class="text-base font-medium text-white mb-1">Generate Contribution Link</h3>
          <p class="text-sm text-gray-400 mb-4">
            Create a link so others can contribute their API keys to your project.
          </p>
          
          <div class="flex items-end gap-3">
            <!-- Project Dropdown -->
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-300 mb-1.5">Project</label>
              <div class="relative">
                <select
                  v-model="inviteLinkForm.projectId"
                  class="w-full px-3 py-2.5 pr-10 bg-gray-800 border border-gray-500/10 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300 appearance-none"
                >
                  <option value="" disabled>Select a project</option>
                  <option v-for="p in myOwnedProjects" :key="p.id" :value="p.id" class="bg-gray-800 text-gray-200">
                    {{ p.name }}
                  </option>
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                  </svg>
                </div>
              </div>
            </div>
            
            <!-- Link Name (optional) -->
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-300 mb-1.5">Link Name (optional)</label>
              <input
                v-model="inviteLinkForm.name"
                type="text"
                placeholder="e.g., Public Contributors"
                class="w-full px-3 py-2.5 bg-gray-500/10 border border-gray-500/10 rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            
            <!-- Generate Button -->
            <button
              @click="generateInviteLink"
              :disabled="!inviteLinkForm.projectId || generatingInviteLink"
              class="px-5 py-2.5 bg-blue-300 hover:bg-blue-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              {{ generatingInviteLink ? 'Generating...' : 'Generate Link' }}
            </button>
          </div>
          
          <!-- Generated Link Display -->
          <div v-if="generatedInviteLink" class="mt-4 p-3 bg-green-300/10 border border-green-300/20 rounded-lg">
            <div class="flex items-center justify-between gap-3">
              <input
                :value="generatedInviteLink"
                readonly
                class="flex-1 px-3 py-2 bg-gray-500/10 border border-gray-500/10 rounded-lg text-sm text-gray-300 font-mono"
              />
              <button
                @click="copyInviteLink"
                class="px-4 py-2 bg-green-300/20 hover:bg-green-300/30 text-green-300 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg v-if="!inviteLinkCopied" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                {{ inviteLinkCopied ? 'Copied!' : 'Copy' }}
              </button>
            </div>
          </div>
        </div>

        <div class="border-t border-gray-500/10"></div>

        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-white">Your Contributed Keys</h2>
        </div>

        <!-- Info Box -->
        <div v-if="myKeys.length === 0 " class="bg-gray-500/10 border border-gray-500/10 rounded-xl p-4">
          <div class="flex items-start gap-3">
            <svg class="w-6 h-6 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <div>
              <h3 class="text-sm font-medium text-gray-400">How Key Pooling Works</h3>
              <p class="text-sm text-gray-400/70 mt-1">
                When project owners share a contribution link with you, you can add your API keys to help power their projects.
                Your keys will be load-balanced with others, and you can track usage here.
              </p>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="myKeys.length === 0 && !loading" class="text-center py-16 bg-gray-500/10 border border-gray-500/10 border-dashed rounded-xl">
          <div class="flex justify-center mb-4">
            <svg class="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-white mb-2">No contributed keys yet</h3>
          <p class="text-gray-400 text-sm max-w-md mx-auto">
            When you contribute API keys to other projects using their invite links, 
            they'll appear here so you can manage them.
          </p>
        </div>

        <!-- Keys List -->
        <div v-else class="space-y-4">
          <div
            v-for="key in myKeys"
            :key="key.id"
            class="bg-gray-500/5 border border-gray-500/10 rounded-xl p-5"
          >
            <div class="flex items-start justify-between mb-4">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-white font-medium">{{ key.name || `${key.provider} Key` }}</span>
                  <span
                    :class="[
                      'text-xs px-2 py-0.5 rounded-full border',
                      providerColors[key.provider].bg,
                      providerColors[key.provider].text,
                      providerColors[key.provider].border,
                    ]"
                  >
                    {{ key.provider }}
                  </span>
                  <span
                    :class="[
                      'text-xs px-2 py-0.5 rounded-full',
                      key.active ? 'bg-emerald-300/10 text-emerald-300' : 'bg-gray-500/10 text-gray-400'
                    ]"
                  >
                    {{ key.active ? 'Active' : 'Paused' }}
                  </span>
                  <span
                    v-if="key.rateLimited"
                    class="text-xs px-2 py-0.5 rounded-full bg-red-400/10 text-red-400"
                  >
                    Rate Limited
                  </span>
                </div>
                <div class="text-sm text-gray-400 mt-1">
                  Project: {{ key.project?.name || key.projectId.slice(0, 8) }}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="toggleKey(key)"
                  :class="[
                    'p-2 rounded-lg transition-colors',
                    key.active
                      ? 'text-gray-400 hover:text-amber-300 hover:bg-amber-300/10'
                      : 'text-gray-400 hover:text-emerald-300 hover:bg-emerald-300/10'
                  ]"
                  :title="key.active ? 'Pause key' : 'Resume key'"
                >
                  <svg v-if="key.active" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <button
                  @click="confirmDeleteKey(key)"
                  class="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  title="Remove key"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Stats -->
            <div class="grid grid-cols-3 gap-4 text-center bg-gray-500/10 rounded-lg p-4">
              <div>
                <div class="text-xl font-bold text-white">{{ formatNumber(Number(key.currentPeriodTokens)) }}</div>
                <div class="text-xs text-gray-400">Tokens This Month</div>
              </div>
              <div>
                <div class="text-xl font-bold text-white">{{ key.currentPeriodRequests }}</div>
                <div class="text-xs text-gray-400">Requests</div>
              </div>
              <div>
                <div class="text-xl font-bold text-white">${{ (key.currentPeriodCostCents / 100).toFixed(2) }}</div>
                <div class="text-xs text-gray-400">Cost</div>
              </div>
            </div>

            <!-- <div class="mt-3 text-xs text-gray-500 flex items-center gap-4">
              <span>Weight: {{ key.weight }}</span>
              <span>Priority: {{ key.priority }}</span>
              <span>Total served: {{ formatNumber(Number(key.totalTokens)) }} tokens</span>
            </div> -->
          </div>
        </div>
      </div>

      <!-- TAB: Received Sponsorships -->
      <div v-if="activeTab === 'received'" class="space-y-6">
        <h2 class="text-lg font-semibold text-white">Sponsorships You've Received</h2>
        
        <!-- Empty State -->
        <div v-if="receivedSponsorships.length === 0 && !loading" class="text-center py-16 bg-gray-500/10 border border-gray-500/10 border-dashed rounded-xl">
          <div class="flex justify-center mb-4">
            <svg class="w-12 h-12 text-gray-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-white mb-2">No sponsorships received</h3>
          <p class="text-gray-400 text-sm">
            When someone sponsors you, their donations will appear here.
          </p>
        </div>

        <!-- Received List -->
        <div v-else class="space-y-4">
          <div
            v-for="sponsorship in receivedSponsorships"
            :key="sponsorship.id"
            class="bg-gray-500/10 border border-gray-500/10 rounded-xl p-5"
          >
            <div class="flex items-start justify-between mb-4">
              <div>
                <div class="flex items-center gap-2">
                  <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span class="text-white font-medium">
                    {{ sponsorship.isPublic ? (sponsorship.sponsor?.email || 'Anonymous') : 'Anonymous Sponsor' }}
                  </span>
                </div>
                <div v-if="sponsorship.message" class="text-sm text-gray-400 mt-2 italic">
                  "{{ sponsorship.message }}"
                </div>
              </div>
              <div class="text-right">
                <div class="text-lg font-bold text-emerald-300">
                  {{ formatBudget(sponsorship.budget, sponsorship.budgetType) }}
                </div>
                <div class="text-xs text-gray-400">per month</div>
              </div>
            </div>

            <div class="h-2 bg-gray-500/20 rounded-full overflow-hidden">
              <div
                class="h-full bg-blue-300 rounded-full"
                :style="{ width: `${Math.min(100, getUsagePercent(sponsorship))}%` }"
              ></div>
            </div>
            <div class="flex items-center justify-between text-xs text-gray-400 mt-2">
              <span>{{ formatBudget(sponsorship.currentPeriodUsage, sponsorship.budgetType) }} used</span>
              <span>{{ formatBudget(sponsorship.budget - sponsorship.currentPeriodUsage, sponsorship.budgetType) }} remaining</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </FeatureGate>

    <!-- Create Sponsorship Modal -->
    <Teleport to="body">
      <div 
        v-if="showCreateModal" 
        class="fixed inset-0 z-50 flex items-center justify-center"
        @click.self="showCreateModal = false"
      >
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        <div class="relative bg-black border border-gray-500/20 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
          <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <!-- <svg class="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg> -->
            Create Sponsorship
          </h2>
          
          <form @submit.prevent="handleCreateSponsorship" class="space-y-4">
            <!-- Project -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1.5">Project</label>
              <div class="relative">
                <select
                  v-model="createForm.projectId"
                  required
                  class="w-full px-4 py-2.5 bg-gray-500/10 border border-gray-500/10 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300/50 focus:border-blue-300/30 appearance-none cursor-pointer hover:bg-gray-500/15 transition-colors"
                >
                  <option value="" disabled>Select a project</option>
                  <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <!-- Recipient -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1.5">Recipient Identity</label>
              <input
                v-model="createForm.recipientIdentity"
                type="text"
                required
                placeholder="email@example.com or user-123"
                class="w-full px-3 py-2 bg-gray-500/10 border border-gray-500/10 rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <p class="text-xs text-gray-500 mt-1">The x-identity header value the recipient uses</p>
            </div>

            <!-- Recipient Name -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1.5">Recipient Name (optional)</label>
              <input
                v-model="createForm.recipientName"
                type="text"
                placeholder="John Doe"
                class="w-full px-3 py-2 bg-gray-500/10 border border-gray-500/10 rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            <!-- Budget Type -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1.5">Budget Type</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="type in ['tokens', 'requests'] as const"
                  :key="type"
                  type="button"
                  @click="createForm.budgetType = type"
                  :class="[
                    'px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
                    createForm.budgetType === type
                      ? 'border-blue-300/10 bg-blue-300/10 text-blue-300'
                      : 'border-gray-500/10 bg-gray-500/10 text-gray-400 hover:bg-gray-500/15'
                  ]"
                >
                  {{ type.charAt(0).toUpperCase() + type.slice(1) }}
                </button>
              </div>
            </div>

            <!-- Renewal Type -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1.5">Renewal</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  @click="createForm.renewalType = 'monthly'"
                  :class="[
                    'px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
                    createForm.renewalType === 'monthly'
                      ? 'border-blue-300/10 bg-blue-300/10 text-blue-300'
                      : 'border-gray-500/10 bg-gray-500/10 text-gray-400 hover:bg-gray-500/15'
                  ]"
                >
                  Monthly
                </button>
                <button
                  type="button"
                  @click="createForm.renewalType = 'one-time'"
                  :class="[
                    'px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
                    createForm.renewalType === 'one-time'
                      ? 'border-blue-300/10 bg-blue-300/10 text-blue-300'
                      : 'border-gray-500/10 bg-gray-500/10 text-gray-400 hover:bg-gray-500/15'
                  ]"
                >
                  One-time
                </button>
              </div>
              <p class="text-xs text-gray-500 mt-1">
                {{ createForm.renewalType === 'monthly' ? 'Budget resets at the start of each month' : 'Fixed budget like gifted tokens (never resets)' }}
              </p>
            </div>

            <!-- Budget Amount -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1.5">
                {{ createForm.renewalType === 'monthly' ? 'Monthly Budget' : 'Total Budget' }}
                <span class="text-gray-500">({{ createForm.budgetType }})</span>
              </label>
              <input
                v-model.number="createForm.budget"
                type="number"
                required
                min="1"
                :placeholder="createForm.budgetType === 'tokens' ? '100000' : '1000'"
                class="w-full px-3 py-2 bg-gray-500/10 border border-gray-500/10 rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            <!-- Message -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1.5">Message (optional)</label>
              <textarea
                v-model="createForm.message"
                rows="2"
                placeholder="Keep building great stuff!"
                class="w-full px-3 py-2 bg-gray-500/10 border border-gray-500/10 rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              ></textarea>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-3 pt-2">
              <button
                type="button"
                @click="showCreateModal = false"
                class="flex-1 px-4 py-2 text-sm font-medium text-gray-400 hover:text-white bg-gray-500/10 hover:bg-gray-500/15 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="creating"
                class="flex-1 px-4 py-2 text-sm font-medium text-black bg-blue-300 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {{ creating ? 'Creating...' : 'Create Sponsorship' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Confirm Dialog -->
    <ConfirmDialog
      :is-open="confirmDialog.open"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      confirm-text="Yes, Delete"
      cancel-text="Cancel"
      variant="danger"
      @confirm="confirmDialog.onConfirm"
      @cancel="confirmDialog.open = false"
    />
  </div>
</template>

<script setup lang="ts">
import type { Sponsorship, KeyPoolEntry } from '~/composables/useSponsorship'

definePageMeta({
  middleware: 'auth'
})

// Redirect away from sponsor page in self-hosted mode
const { features } = useFeatures()
const router = useRouter()
const route = useRoute()

if (!features.value.showSponsorship) {
  router.replace('/projects')
}

useHead({
  title: 'Sponsor - AI Ratelimit'
})

const api = useApi()
const toast = useToast()
const {
  mySponsorships,
  receivedSponsorships,
  myKeys,
  sponsorStats,
  keyStats,
  loading,
  loadMySponsorships,
  loadReceivedSponsorships,
  loadSponsorStats,
  loadMyKeys,
  loadKeyStats,
  createSponsorship,
  updateSponsorship,
  deleteSponsorship,
  contributeKey,
  updateKey,
  removeKey,
  formatBudget,
  getUsagePercent,
  providerColors,
} = useSponsorship()

const { user } = useAuth()

// State
const activeTab = ref<'sponsorships' | 'keys' | 'received'>('sponsorships')
const projects = ref<{ id: string; name: string; ownerId?: string }[]>([])
const showCreateModal = ref(false)

const creating = ref(false)

// Invite Link Generation
const inviteLinkForm = reactive({
  projectId: '',
  name: '',
})
const generatingInviteLink = ref(false)
const generatedInviteLink = ref('')
const inviteLinkCopied = ref(false)

// Filter to only show projects owned by current user
const myOwnedProjects = computed(() => {
  if (!user.value?.id) return projects.value
  return projects.value.filter(p => p.ownerId === user.value?.id)
})

// Forms
const createForm = reactive({
  projectId: '',
  recipientIdentity: '',
  recipientName: '',
  budgetType: 'tokens' as 'tokens' | 'requests',
  renewalType: 'monthly' as 'monthly' | 'one-time',
  budget: 100000,
  message: '',
})

// Confirm dialog
const confirmDialog = reactive({
  open: false,
  title: '',
  message: '',
  onConfirm: () => {},
})

// Helpers
const formatNumber = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toString()
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Generate invite link for key pool
const generateInviteLink = async () => {
  if (!inviteLinkForm.projectId) return
  
  generatingInviteLink.value = true
  generatedInviteLink.value = ''
  
  try {
    // First, ensure key pool is enabled for this project
    await api(`/projects/${inviteLinkForm.projectId}`, {
      method: 'PUT',
      body: JSON.stringify({ keyPoolEnabled: true }),
    })
    
    // Then generate the invite link
    const invite = await api(`/sponsorships/projects/${inviteLinkForm.projectId}/invites`, {
      method: 'POST',
      body: JSON.stringify({
        name: inviteLinkForm.name || 'Invite Link',
      }),
    })
    
    // Build the contribution URL
    generatedInviteLink.value = `${window.location.origin}/contribute/${invite.token}`
    
    // Reset form
    inviteLinkForm.name = ''
  } catch (err: any) {
    console.error('Failed to generate invite link:', err)
    toast.error(err.message || 'Failed to generate invite link')
  } finally {
    generatingInviteLink.value = false
  }
}

const copyInviteLink = () => {
  if (!generatedInviteLink.value) return
  navigator.clipboard.writeText(generatedInviteLink.value)
  inviteLinkCopied.value = true
  setTimeout(() => { inviteLinkCopied.value = false }, 2000)
}

// Actions
const handleCreateSponsorship = async () => {
  creating.value = true
  try {
    await createSponsorship({
      projectId: createForm.projectId,
      recipientIdentity: createForm.recipientIdentity,
      recipientName: createForm.recipientName || undefined,
      budgetType: createForm.budgetType,
      renewalType: createForm.renewalType,
      budget: createForm.budget,
      message: createForm.message || undefined,
    })
    showCreateModal.value = false
    Object.assign(createForm, {
      projectId: '',
      recipientIdentity: '',
      recipientName: '',
      budgetType: 'tokens',
      renewalType: 'monthly',
      budget: 100000,
      message: '',
    })
    await loadSponsorStats()
  } finally {
    creating.value = false
  }
}

const toggleSponsorship = async (sponsorship: Sponsorship) => {
  await updateSponsorship(sponsorship.id, { active: !sponsorship.active })
}

const toggleKey = async (key: KeyPoolEntry) => {
  await updateKey(key.id, { active: !key.active })
}

const confirmDelete = (sponsorship: Sponsorship) => {
  confirmDialog.title = 'Delete Sponsorship'
  confirmDialog.message = `Are you sure you want to delete the sponsorship for ${sponsorship.recipientName || sponsorship.recipientIdentity}?`
  confirmDialog.onConfirm = async () => {
    await deleteSponsorship(sponsorship.id)
    await loadSponsorStats()
    confirmDialog.open = false
  }
  confirmDialog.open = true
}

const confirmDeleteKey = (key: KeyPoolEntry) => {
  confirmDialog.title = 'Remove Key'
  confirmDialog.message = `Are you sure you want to remove this ${key.provider} key from the pool?`
  confirmDialog.onConfirm = async () => {
    await removeKey(key.id)
    await loadKeyStats()
    confirmDialog.open = false
  }
  confirmDialog.open = true
}

// Load projects for dropdown
const loadProjects = async () => {
  try {
    projects.value = await api('/projects')
  } catch (err) {
    console.error('Failed to load projects:', err)
  }
}

// Load data on mount
onMounted(async () => {
  // Check for tab query param (e.g., /sponsor?tab=keys)
  const tabParam = route.query.tab as string
  if (tabParam && ['sponsorships', 'keys', 'received'].includes(tabParam)) {
    activeTab.value = tabParam as 'sponsorships' | 'keys' | 'received'
  }
  
  await Promise.all([
    loadMySponsorships(),
    loadReceivedSponsorships(),
    loadMyKeys(),
    loadSponsorStats(),
    loadKeyStats(),
    loadProjects(),
  ])
})
</script>

