<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAdmin, PLAN_OPTIONS } from '~/composables/useAdmin'
import { useFeatures } from '~/composables/useFeatures'

definePageMeta({
  middleware: 'auth',
})

useHead({
  title: 'Admin - AI Ratelimit',
})

const features = useFeatures()
const {
  organizations,
  loading,
  error,
  isAdmin,
  loadOrganizations,
  updateOrganizationPlan,
} = useAdmin()

const router = useRouter()

// Redirect if not admin or not cloud mode
onMounted(async () => {
  if (features.mode.value !== 'cloud') {
    router.replace('/projects')
    return
  }
  
  if (!isAdmin.value) {
    router.replace('/projects')
    return
  }

  await loadOrganizations()
})

// Track which org is being edited
const editingOrgId = ref<string | null>(null)
const selectedPlan = ref<string>('')
const updating = ref(false)

const startEdit = (org: any) => {
  editingOrgId.value = org.id
  selectedPlan.value = org.plan
}

const cancelEdit = () => {
  editingOrgId.value = null
  selectedPlan.value = ''
}

const savePlan = async (orgId: string) => {
  if (!selectedPlan.value) return
  
  updating.value = true
  try {
    await updateOrganizationPlan(orgId, selectedPlan.value)
    editingOrgId.value = null
  } catch (err: any) {
    console.error('Failed to update plan:', err)
  } finally {
    updating.value = false
  }
}

const getPlanColor = (plan: string) => {
  const option = PLAN_OPTIONS.find(p => p.value === plan)
  return option?.color || 'gray'
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-xl font-bold text-white">Organization Management</h1>
      <p class="text-gray-400 mt-1 text-sm">View and manage all organizations and their plans.</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <svg class="w-8 h-8 animate-spin text-white/40" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-400/10 border border-red-400/10 rounded-lg p-4 text-red-400">
      {{ error }}
    </div>

    <!-- Organizations Table -->
    <div v-else class="bg-gray-500/10 rounded-lg border border-gray-500/10 overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-500/10 text-left">
            <th class="px-4 py-3 text-gray-400 font-medium text-sm">Organization</th>
            <th class="px-4 py-3 text-gray-400 font-medium text-sm">Plan</th>
            <th class="px-4 py-3 text-gray-400 font-medium text-sm">Status</th>
            <th class="px-4 py-3 text-gray-400 font-medium text-sm">Members</th>
            <th class="px-4 py-3 text-gray-400 font-medium text-sm">Created</th>
            <th class="px-4 py-3 text-gray-400 font-medium text-sm">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="org in organizations"
            :key="org.id"
            class="border-b border-gray-500/10 hover:bg-gray-500/10 transition-colors"
          >
            <td class="px-4 py-4">
              <div class="font-medium">{{ org.name }}</div>
              <div class="text-xs text-gray-400 font-mono">{{ org.id }}</div>
            </td>
            <td class="px-4 py-4">
              <!-- Editing mode -->
              <div v-if="editingOrgId === org.id" class="flex items-center gap-2">
                <select
                  v-model="selectedPlan"
                  class="bg-gray-500/10 border border-gray-500/10 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-300"
                >
                  <option
                    v-for="option in PLAN_OPTIONS"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
                <button
                  @click="savePlan(org.id)"
                  :disabled="updating"
                  class="p-1 text-green-300 hover:text-green-400 disabled:opacity-50"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  @click="cancelEdit"
                  :disabled="updating"
                  class="p-1 text-red-400 hover:text-red-300 disabled:opacity-50"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <!-- Display mode -->
              <span
                v-else
                :class="[
                  'px-2 py-1 rounded text-xs font-medium',
                  getPlanColor(org.plan) === 'gray' && 'bg-gray-500/10 text-gray-400',
                  getPlanColor(org.plan) === 'blue' && 'bg-blue-300/10 text-blue-300',
                  getPlanColor(org.plan) === 'purple' && 'bg-purple-300/10 text-purple-300',
                  getPlanColor(org.plan) === 'amber' && 'bg-amber-300/10 text-amber-300',
                ]"
              >
                {{ org.plan.charAt(0).toUpperCase() + org.plan.slice(1) }}
              </span>
            </td>
            <td class="px-4 py-4">
              <!-- Status badge -->
              <span
                v-if="org.status === 'expired'"
                class="px-2 py-1 rounded text-xs font-medium bg-red-400/10 text-red-400"
              >
                Expired
              </span>
              <span
                v-else-if="org.status === 'trial'"
                :class="[
                  'px-2 py-1 rounded text-xs font-medium',
                  (org.trialDaysRemaining ?? 0) <= 2 
                    ? 'bg-orange-300/10 text-orange-300' 
                    : 'bg-yellow-300/10 text-yellow-300'
                ]"
              >
                {{ org.trialDaysRemaining ?? 0 }} day{{ org.trialDaysRemaining === 1 ? '' : 's' }} left
              </span>
              <span
                v-else
                class="px-2 py-1 rounded text-xs font-medium bg-green-300/10 text-green-300"
              >
                Active
              </span>
            </td>
            <td class="px-4 py-4 text-gray-400 text-sm">
              {{ org.userCount }}
            </td>
            <td class="px-4 py-4 text-gray-400 text-sm">
              {{ formatDate(org.createdAt) }}
            </td>
            <td class="px-4 py-4">
              <button
                v-if="editingOrgId !== org.id"
                @click="startEdit(org)"
                class="text-blue-300 hover:text-blue-400 transition-colors flex items-center gap-1 text-xs"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4">
                  <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                  <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                </svg>

                Edit
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State -->
      <div v-if="organizations.length === 0" class="px-4 py-8 text-center text-gray-400">
        No organizations found.
      </div>
    </div>

    <!-- Stats Summary -->
    <div v-if="!loading && organizations.length > 0" class="mt-8 space-y-4">
      <!-- Plan Stats -->
      <div class="grid grid-cols-4 gap-4">
        <div
          v-for="option in PLAN_OPTIONS"
          :key="option.value"
          class="bg-gray-500/10 rounded-lg border border-gray-500/10 p-4"
        >
          <div class="text-2xl font-bold">
            {{ organizations.filter(o => o.plan === option.value).length }}
          </div>
          <div class="text-gray-400 text-sm">{{ option.label }}</div>
        </div>
      </div>
      
      <!-- Status Stats -->
      <div class="grid grid-cols-3 gap-4">
        <div class="bg-green-300/5 rounded-lg border border-green-300/10 p-4">
          <div class="text-2xl font-bold text-green-300">
            {{ organizations.filter(o => o.status === 'active').length }}
          </div>
          <div class="text-gray-400 text-sm">Active (paid)</div>
        </div>
        <div class="bg-yellow-300/5 rounded-lg border border-yellow-300/10 p-4">
          <div class="text-2xl font-bold text-yellow-300">
            {{ organizations.filter(o => o.status === 'trial').length }}
          </div>
          <div class="text-gray-400 text-sm">On Trial</div>
        </div>
        <div class="bg-red-400/5 rounded-lg border border-red-400/10 p-4">
          <div class="text-2xl font-bold text-red-400">
            {{ organizations.filter(o => o.status === 'expired').length }}
          </div>
          <div class="text-gray-400 text-sm">Expired</div>
        </div>
      </div>
    </div>
  </div>
</template>

