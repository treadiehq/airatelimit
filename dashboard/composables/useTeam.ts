/**
 * Team Management Composable
 * 
 * Provides team member management functionality.
 */

export type MemberRole = 'owner' | 'admin' | 'member'

export interface TeamMember {
  id: string
  userId: string
  email: string
  role: MemberRole
  createdAt: string
}

export interface TeamInvite {
  id: string
  email: string
  role: MemberRole
  invitedBy: string
  expiresAt: string
  createdAt: string
}

export interface InviteDetails {
  valid: boolean
  email?: string
  role?: MemberRole
  organizationName?: string
  expiresAt?: string
}

// Role display names and colors
export const ROLE_CONFIG: Record<MemberRole, { label: string; color: string; bgColor: string }> = {
  owner: { label: 'Owner', color: 'text-amber-300', bgColor: 'bg-amber-300/10 border-amber-300/10' },
  admin: { label: 'Admin', color: 'text-blue-300', bgColor: 'bg-blue-300/10 border-blue-300/10' },
  member: { label: 'Member', color: 'text-gray-300', bgColor: 'bg-gray-300/10 border-gray-300/10' },
}

// Role hierarchy for permission checks
const ROLE_HIERARCHY: Record<MemberRole, number> = {
  owner: 3,
  admin: 2,
  member: 1,
}

export function useTeam() {
  const api = useApi()
  const { addToast } = useToast()

  const members = ref<TeamMember[]>([])
  const invites = ref<TeamInvite[]>([])
  const currentUserRole = ref<MemberRole | null>(null)
  const teamManagementAvailable = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Load team members and current user role
   */
  const loadMembers = async () => {
    loading.value = true
    error.value = null

    try {
      const data = await api('/members')
      members.value = data.members || []
      currentUserRole.value = data.currentUserRole
      teamManagementAvailable.value = data.teamManagementAvailable
    } catch (err: any) {
      error.value = err.message
      console.error('Failed to load team members:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Load pending invitations
   */
  const loadInvites = async () => {
    try {
      const data = await api('/members/invites')
      invites.value = data || []
    } catch (err: any) {
      console.error('Failed to load invites:', err)
    }
  }

  /**
   * Invite a new member
   */
  const inviteMember = async (email: string, role: MemberRole) => {
    try {
      const result = await api('/members/invite', {
        method: 'POST',
        body: { email, role },
      })
      
      addToast({
        type: 'success',
        message: result.message || `Invitation sent to ${email}`,
      })
      
      // Reload invites
      await loadInvites()
      return result
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.message || 'Failed to send invitation',
      })
      throw err
    }
  }

  /**
   * Cancel a pending invitation
   */
  const cancelInvite = async (inviteId: string) => {
    try {
      await api(`/members/invites/${inviteId}`, {
        method: 'DELETE',
      })
      
      addToast({
        type: 'success',
        message: 'Invitation cancelled',
      })
      
      // Remove from local list
      invites.value = invites.value.filter(i => i.id !== inviteId)
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.message || 'Failed to cancel invitation',
      })
      throw err
    }
  }

  /**
   * Update a member's role
   */
  const updateMemberRole = async (memberId: string, role: MemberRole) => {
    try {
      const result = await api(`/members/${memberId}/role`, {
        method: 'PUT',
        body: { role },
      })
      
      addToast({
        type: 'success',
        message: result.message || `Role updated to ${role}`,
      })
      
      // Update local list
      const member = members.value.find(m => m.id === memberId)
      if (member) {
        member.role = role
      }
      
      return result
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.message || 'Failed to update role',
      })
      throw err
    }
  }

  /**
   * Remove a member from the organization
   */
  const removeMember = async (memberId: string) => {
    try {
      await api(`/members/${memberId}`, {
        method: 'DELETE',
      })
      
      addToast({
        type: 'success',
        message: 'Member removed',
      })
      
      // Remove from local list
      members.value = members.value.filter(m => m.id !== memberId)
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.message || 'Failed to remove member',
      })
      throw err
    }
  }

  /**
   * Verify an invitation token
   */
  const verifyInvite = async (token: string): Promise<InviteDetails> => {
    try {
      const result = await api(`/members/invite/verify?token=${token}`)
      return result
    } catch (err) {
      return { valid: false }
    }
  }

  /**
   * Accept an invitation
   */
  const acceptInvite = async (token: string) => {
    try {
      const result = await api('/members/invite/accept', {
        method: 'POST',
        body: { token },
      })
      
      addToast({
        type: 'success',
        message: result.message || 'You have joined the organization!',
      })
      
      return result
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.message || 'Failed to accept invitation',
      })
      throw err
    }
  }

  // Permission helpers
  const isOwner = computed(() => currentUserRole.value === 'owner')
  const isAdmin = computed(() => currentUserRole.value === 'admin' || currentUserRole.value === 'owner')
  
  const canManageMembers = computed(() => 
    teamManagementAvailable.value && (isOwner.value || isAdmin.value)
  )
  
  const canInvite = computed(() => canManageMembers.value)
  
  const canChangeRole = (targetRole: MemberRole) => {
    if (!isOwner.value) return false
    return true
  }
  
  const canRemoveMember = (member: TeamMember) => {
    if (!teamManagementAvailable.value) return false
    
    // Can't remove owners
    if (member.role === 'owner') return false
    
    // Owners can remove admins and members
    if (isOwner.value) return true
    
    // Admins can only remove members
    if (isAdmin.value && member.role === 'member') return true
    
    return false
  }

  const getRoleConfig = (role: MemberRole) => ROLE_CONFIG[role]

  return {
    // State
    members,
    invites,
    currentUserRole,
    teamManagementAvailable,
    loading,
    error,
    
    // Actions
    loadMembers,
    loadInvites,
    inviteMember,
    cancelInvite,
    updateMemberRole,
    removeMember,
    verifyInvite,
    acceptInvite,
    
    // Permissions
    isOwner,
    isAdmin,
    canManageMembers,
    canInvite,
    canChangeRole,
    canRemoveMember,
    getRoleConfig,
  }
}

