<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Feature Gate: Only show in cloud/enterprise mode -->
      <FeatureGate
        feature="showTeamManagement"
        title="Team Management"
        description="Invite team members and manage roles. Available on Pro and Enterprise plans."
      >
        <div class="space-y-8">
          <!-- Header -->
          <div class="flex items-start justify-between">
            <div>
              <h1 class="text-xl font-bold text-white">Team</h1>
              <p class="text-gray-400 mt-1 text-sm">
                Manage your team members and their permissions.
              </p>
            </div>
            
            <!-- Invite Button -->
            <button
              v-if="canInvite"
              @click="showInviteModal = true"
              class="inline-flex items-center gap-2 px-4 py-2 bg-blue-300 hover:bg-blue-400 text-black font-medium rounded-lg transition-colors text-sm"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Invite Member
            </button>
          </div>

          <!-- Over Limit Warning (for downgraded plans) -->
          <div v-if="isOverLimit && isOwner && !loading" class="bg-orange-300/10 border border-orange-300/10 rounded-lg p-4">
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-orange-300 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 class="text-sm font-medium text-orange-300">Team Over Plan Limit</h3>
                <p class="text-sm text-orange-300/70 mt-1">
                  Your team has <span class="font-medium text-orange-300">{{ members.length }} members</span> but your plan allows <span class="font-medium text-orange-300">{{ limits?.maxTeamMembers || 1 }}</span>.
                  <NuxtLink to="/billing" class="underline hover:no-underline font-medium text-orange-300">Upgrade your plan</NuxtLink> to continue inviting members.
                </p>
              </div>
            </div>
          </div>

          <!-- Plan Limit Notice (for Basic/Trial plans) -->
          <div v-else-if="!teamManagementAvailable && !loading" class="bg-amber-300/10 border border-amber-300/10 rounded-lg p-4">
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-amber-300 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 class="text-sm font-medium text-amber-300">Team Management</h3>
                <p class="text-sm text-amber-300/70 mt-1">
                  Team management is available on Pro and Enterprise plans. 
                  <NuxtLink to="/billing" class="underline hover:no-underline font-medium">Upgrade your plan</NuxtLink> to invite team members.
                </p>
              </div>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="loading" class="space-y-4">
            <div v-for="i in 3" :key="i" class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-4 animate-pulse">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-gray-500/10 border border-gray-500/10"></div>
                <div class="flex-1">
                  <div class="h-4 bg-gray-500/10 border border-gray-500/10 rounded w-48 mb-2"></div>
                  <div class="h-3 bg-gray-500/10 border border-gray-500/10 rounded w-24"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Members List -->
          <div v-else class="space-y-3">
            <div
              v-for="member in members"
              :key="member.id"
              class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-4 hover:bg-gray-500/15 transition-colors"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <!-- Avatar -->
                  <div class="w-10 h-10 rounded-full bg-gray-500/10 border border-gray-500/10 flex items-center justify-center text-gray-300 font-medium">
                    {{ getInitials(member.email) }}
                  </div>
                  
                  <!-- Info -->
                  <div>
                    <p class="text-sm font-medium text-white">{{ member.email }}</p>
                    <div class="flex items-center gap-2 mt-0.5">
                      <span 
                        :class="[
                          'text-xs px-2 py-0.5 rounded-full border',
                          getRoleConfig(member.role).bgColor,
                          getRoleConfig(member.role).color
                        ]"
                      >
                        {{ getRoleConfig(member.role).label }}
                      </span>
                      <span class="text-xs text-gray-500">
                        Joined {{ formatDate(member.createdAt) }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2">
                  <!-- Role Selector (Owners only) -->
                  <div v-if="isOwner && member.role !== 'owner'" class="relative">
                    <select
                      :value="member.role"
                      @change="handleRoleChange(member, ($event.target as HTMLSelectElement).value as MemberRole)"
                      class="appearance-none bg-gray-500/10 border border-gray-500/10 text-gray-300 text-xs rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                    </select>
                    <svg class="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  <!-- Promote to Owner (Owners only) -->
                  <button
                    v-if="isOwner && member.role !== 'owner'"
                    @click="handlePromoteToOwner(member)"
                    class="p-1.5 text-gray-400 hover:text-amber-300 hover:bg-amber-300/10 rounded-lg transition-colors"
                    title="Promote to Owner"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  </button>

                  <!-- Remove Member -->
                  <button
                    v-if="canRemoveMember(member)"
                    @click="handleRemoveMember(member)"
                    class="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    title="Remove member"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Pending Invitations -->
          <div v-if="invites.length > 0" class="space-y-4">
            <h2 class="text-lg font-semibold text-white">Pending Invitations</h2>
            <div class="space-y-3">
              <div
                v-for="invite in invites"
                :key="invite.id"
                class="bg-gray-500/5 border border-gray-500/10 border-dashed rounded-lg p-4"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <!-- Pending Avatar -->
                    <div class="w-10 h-10 rounded-full bg-gray-500/10 border border-gray-500/10 flex items-center justify-center text-gray-300">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    
                    <div>
                      <p class="text-sm font-medium text-gray-300">{{ invite.email }}</p>
                      <div class="flex items-center gap-2 mt-0.5">
                        <span 
                          :class="[
                            'text-xs px-2 py-0.5 rounded-full border',
                            getRoleConfig(invite.role).bgColor,
                            getRoleConfig(invite.role).color
                          ]"
                        >
                          {{ getRoleConfig(invite.role).label }}
                        </span>
                        <span class="text-xs text-gray-500">
                          Invited by {{ invite.invitedBy }}
                        </span>
                        <span class="text-xs text-gray-500">
                          · Expires {{ formatDate(invite.expiresAt) }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Cancel Invite -->
                  <button
                    v-if="canManageMembers"
                    @click="handleCancelInvite(invite)"
                    class="text-xs text-gray-400 hover:text-red-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </FeatureGate>
    </div>

    <!-- Invite Modal -->
    <Teleport to="body">
      <div 
        v-if="showInviteModal" 
        class="fixed inset-0 z-50 flex items-center justify-center"
        @click.self="showInviteModal = false"
      >
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        <div class="relative bg-black border border-gray-500/20 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
          <h2 class="text-lg font-semibold text-white mb-4">Invite Team Member</h2>
          
          <form @submit.prevent="handleInvite" class="space-y-4">
            <!-- Email -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1.5">Email Address</label>
              <input
                v-model="inviteForm.email"
                type="email"
                required
                placeholder="colleague@company.com"
                class="w-full px-3 py-2 bg-gray-500/10 border border-gray-500/10 rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            <!-- Role -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1.5">Role</label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="role in availableRoles"
                  :key="role"
                  type="button"
                  @click="inviteForm.role = role"
                  :class="[
                    'px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
                    inviteForm.role === role
                      ? 'border-blue-300 bg-blue-300/10 text-blue-300'
                      : 'border-gray-500/10 bg-gray-500/10 text-gray-400 hover:bg-gray-500/15'
                  ]"
                >
                  {{ getRoleConfig(role).label }}
                </button>
              </div>
              <p class="mt-2 text-xs text-gray-500">
                {{ roleDescriptions[inviteForm.role] }}
              </p>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-3 pt-2">
              <button
                type="button"
                @click="showInviteModal = false"
                class="flex-1 px-4 py-2 text-sm font-medium text-gray-400 hover:text-white bg-gray-500/10 hover:bg-gray-500/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="inviting"
                class="flex-1 px-4 py-2 text-sm font-medium text-black bg-blue-300 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {{ inviting ? 'Sending...' : 'Send Invitation' }}
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
      :confirm-text="confirmDialog.confirmText"
      :cancel-text="confirmDialog.cancelText"
      :variant="confirmDialog.danger ? 'danger' : 'warning'"
      @confirm="confirmDialog.onConfirm"
      @cancel="confirmDialog.open = false"
    />
</template>

<script setup lang="ts">
import type { MemberRole, TeamMember, TeamInvite } from '~/composables/useTeam'

definePageMeta({
  middleware: 'auth'
})

// Redirect away from team page in self-hosted mode
const { features } = useFeatures()
const router = useRouter()

if (!features.value.showTeamManagement) {
  router.replace('/projects')
}

useHead({
  title: 'Team - AI Ratelimit'
})

const {
  members,
  invites,
  currentUserRole,
  teamManagementAvailable,
  loading,
  loadMembers,
  loadInvites,
  inviteMember,
  cancelInvite,
  updateMemberRole,
  removeMember,
  isOwner,
  isAdmin,
  canManageMembers,
  canInvite,
  canRemoveMember,
  getRoleConfig,
} = useTeam()

// Plan limits for over-limit warning
const { limits, loadPlan } = usePlan()

// Check if team is over the plan limit
const isOverLimit = computed(() => {
  if (!limits.value?.maxTeamMembers) return false
  return members.value.length > limits.value.maxTeamMembers
})

const membersOverLimit = computed(() => {
  if (!limits.value?.maxTeamMembers) return 0
  return Math.max(0, members.value.length - limits.value.maxTeamMembers)
})

// Invite Modal State
const showInviteModal = ref(false)
const inviting = ref(false)
const inviteForm = reactive({
  email: '',
  role: 'member' as MemberRole,
})

// Available roles based on current user's role
const availableRoles = computed<MemberRole[]>(() => {
  if (isOwner.value) return ['owner', 'admin', 'member']
  if (isAdmin.value) return ['member']
  return []
})

const roleDescriptions: Record<MemberRole, string> = {
  owner: 'Full access including billing and organization management.',
  admin: 'Can manage projects and invite/remove members.',
  member: 'Can access and work on all projects.',
}

// Confirm Dialog
const confirmDialog = reactive({
  open: false,
  title: '',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  danger: false,
  onConfirm: () => {},
})

// Helpers
const getInitials = (email: string) => {
  const parts = email.split('@')[0].split(/[._-]/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Actions
const handleInvite = async () => {
  inviting.value = true
  try {
    await inviteMember(inviteForm.email, inviteForm.role)
    showInviteModal.value = false
    inviteForm.email = ''
    inviteForm.role = 'member'
  } finally {
    inviting.value = false
  }
}

const handleRoleChange = async (member: TeamMember, newRole: MemberRole) => {
  try {
    await updateMemberRole(member.id, newRole)
  } catch (err) {
    // Role will revert on error (handled by composable)
  }
}

const handlePromoteToOwner = (member: TeamMember) => {
  confirmDialog.title = 'Promote to Owner'
  confirmDialog.message = `Are you sure you want to promote ${member.email} to Owner? They will have full control over the organization.`
  confirmDialog.confirmText = 'Yes, Promote'
  confirmDialog.cancelText = 'Cancel'
  confirmDialog.danger = false
  confirmDialog.onConfirm = async () => {
    await updateMemberRole(member.id, 'owner')
    confirmDialog.open = false
  }
  confirmDialog.open = true
}

const handleRemoveMember = (member: TeamMember) => {
  confirmDialog.title = 'Remove Member'
  confirmDialog.message = `Are you sure you want to remove ${member.email} from the organization? Their projects will be reassigned to an owner.`
  confirmDialog.confirmText = 'Yes, Remove'
  confirmDialog.cancelText = 'Cancel'
  confirmDialog.danger = true
  confirmDialog.onConfirm = async () => {
    await removeMember(member.id)
    confirmDialog.open = false
  }
  confirmDialog.open = true
}

const handleCancelInvite = (invite: TeamInvite) => {
  confirmDialog.title = 'Cancel Invitation'
  confirmDialog.message = `Are you sure you want to cancel the invitation to ${invite.email}?`
  confirmDialog.confirmText = 'Yes, Cancel It'
  confirmDialog.cancelText = 'No, Keep It'
  confirmDialog.danger = true
  confirmDialog.onConfirm = async () => {
    await cancelInvite(invite.id)
    confirmDialog.open = false
  }
  confirmDialog.open = true
}

// Load data on mount
onMounted(async () => {
  await Promise.all([
    loadMembers(),
    loadInvites(),
    loadPlan(),
  ])
})
</script>

