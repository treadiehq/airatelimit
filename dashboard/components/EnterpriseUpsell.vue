<template>
  <div class="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-4">
    <div class="flex items-start gap-4">
      <div class="flex-shrink-0">
        <div class="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
          <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="text-sm font-semibold text-white">{{ title }}</h3>
        <p class="text-sm text-gray-400 mt-1">{{ description }}</p>
        <div class="mt-3 flex items-center gap-3">
          <a
            :href="enterpriseUpgradeUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-sm font-medium rounded-lg transition-colors"
          >
            <span>Learn More</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <button
            v-if="dismissible"
            @click="$emit('dismiss')"
            class="text-sm text-gray-500 hover:text-gray-400 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
    
    <!-- Feature List -->
    <div v-if="showFeatures" class="mt-4 pt-4 border-t border-purple-500/20">
      <p class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Enterprise Features</p>
      <ul class="grid grid-cols-2 gap-2">
        <li v-for="feature in enterpriseFeatures" :key="feature" class="flex items-center gap-2 text-sm text-gray-300">
          <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          {{ feature }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string
  description?: string
  showFeatures?: boolean
  dismissible?: boolean
}

withDefaults(defineProps<Props>(), {
  title: 'Unlock Enterprise Features',
  description: 'Get SSO, audit logs, team management, advanced analytics, and priority support.',
  showFeatures: false,
  dismissible: false,
})

defineEmits<{
  (e: 'dismiss'): void
}>()

const { enterpriseUpgradeUrl } = useFeatures()

const enterpriseFeatures = [
  'Single Sign-On (SSO)',
  'SAML Authentication',
  'Audit Logs',
  'Team Management',
  'Advanced Analytics',
  'Custom Branding',
  'Webhooks',
  'Data Export',
]
</script>

