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
      <h1 class="text-2xl font-bold mb-2">Organization Management</h1>
      <p class="text-white/60">View and manage all organizations and their plans.</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <Icon name="heroicons:arrow-path" class="w-8 h-8 animate-spin text-white/40" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
      {{ error }}
    </div>

    <!-- Organizations Table -->
    <div v-else class="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="border-b border-white/10 text-left">
            <th class="px-4 py-3 text-white/60 font-medium">Organization</th>
            <th class="px-4 py-3 text-white/60 font-medium">Plan</th>
            <th class="px-4 py-3 text-white/60 font-medium">Members</th>
            <th class="px-4 py-3 text-white/60 font-medium">Created</th>
            <th class="px-4 py-3 text-white/60 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="org in organizations"
            :key="org.id"
            class="border-b border-white/5 hover:bg-white/5 transition-colors"
          >
            <td class="px-4 py-4">
              <div class="font-medium">{{ org.name }}</div>
              <div class="text-xs text-white/40 font-mono">{{ org.id }}</div>
            </td>
            <td class="px-4 py-4">
              <!-- Editing mode -->
              <div v-if="editingOrgId === org.id" class="flex items-center gap-2">
                <select
                  v-model="selectedPlan"
                  class="bg-white/10 border border-white/20 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500"
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
                  class="p-1 text-green-400 hover:text-green-300 disabled:opacity-50"
                >
                  <Icon name="heroicons:check" class="w-5 h-5" />
                </button>
                <button
                  @click="cancelEdit"
                  :disabled="updating"
                  class="p-1 text-red-400 hover:text-red-300 disabled:opacity-50"
                >
                  <Icon name="heroicons:x-mark" class="w-5 h-5" />
                </button>
              </div>
              <!-- Display mode -->
              <span
                v-else
                :class="[
                  'px-2 py-1 rounded text-xs font-medium',
                  getPlanColor(org.plan) === 'gray' && 'bg-gray-500/20 text-gray-400',
                  getPlanColor(org.plan) === 'blue' && 'bg-blue-500/20 text-blue-400',
                  getPlanColor(org.plan) === 'purple' && 'bg-purple-500/20 text-purple-400',
                  getPlanColor(org.plan) === 'amber' && 'bg-amber-500/20 text-amber-400',
                ]"
              >
                {{ org.plan.charAt(0).toUpperCase() + org.plan.slice(1) }}
              </span>
            </td>
            <td class="px-4 py-4 text-white/60">
              {{ org.userCount }} {{ org.userCount === 1 ? 'member' : 'members' }}
            </td>
            <td class="px-4 py-4 text-white/60">
              {{ formatDate(org.createdAt) }}
            </td>
            <td class="px-4 py-4">
              <button
                v-if="editingOrgId !== org.id"
                @click="startEdit(org)"
                class="text-white/60 hover:text-white transition-colors flex items-center gap-1 text-sm"
              >
                <Icon name="heroicons:pencil" class="w-4 h-4" />
                Edit Plan
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State -->
      <div v-if="organizations.length === 0" class="px-4 py-8 text-center text-white/40">
        No organizations found.
      </div>
    </div>

    <!-- Stats Summary -->
    <div v-if="!loading && organizations.length > 0" class="mt-8 grid grid-cols-4 gap-4">
      <div
        v-for="option in PLAN_OPTIONS"
        :key="option.value"
        class="bg-white/5 rounded-lg border border-white/10 p-4"
      >
        <div class="text-2xl font-bold">
          {{ organizations.filter(o => o.plan === option.value).length }}
        </div>
        <div class="text-white/60 text-sm">{{ option.label }} orgs</div>
      </div>
    </div>
  </div>
</template>

