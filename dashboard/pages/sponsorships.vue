<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
  layout: 'default',
})

const route = useRoute()
const router = useRouter()
const { features } = useFeatures()
const sponsorship = useSponsorship()
const { copy } = useClipboard()
const team = useTeam()

// =====================================================
// TABS
// =====================================================
const activeTab = ref<'sponsor' | 'received' | 'pools'>('received') // Default to received

// Only admins and owners can access the sponsor tab (create keys/sponsorships)
const canManageSponsorships = computed(() => team.isOwner.value || team.isAdmin.value)

// Set initial tab from URL query
onMounted(async () => {
  // Load team members to check role
  await team.loadMembers()
  
  const tab = route.query.tab as string
  if (tab === 'sponsor' && canManageSponsorships.value) {
    activeTab.value = 'sponsor'
  } else if (tab === 'pools') {
    activeTab.value = 'pools'
  } else if (tab === 'received' || !canManageSponsorships.value) {
    activeTab.value = 'received'
  } else {
    // Default for admins/owners with no tab specified
    activeTab.value = 'sponsor'
  }
})

// Update URL when tab changes
watch(activeTab, (newTab) => {
  router.replace({ query: { ...route.query, tab: newTab === 'sponsor' ? undefined : newTab } })
})

// =====================================================
// SPONSOR TAB STATE
// =====================================================
const showCreateKeyModal = ref(false)
const showCreateSponsorshipModal = ref(false)
const showTokenModal = ref(false)
const showDeleteKeyConfirm = ref(false)
const keyToDelete = ref<{ id: string; name: string } | null>(null)
const showRevokeSponsorshipConfirm = ref(false)
const sponsorshipToRevoke = ref<{ id: string; name: string } | null>(null)
const showDeleteSponsorshipConfirm = ref(false)
const sponsorshipToDelete = ref<{ id: string; name: string } | null>(null)
const showTopUpModal = ref(false)
const sponsorshipToTopUp = ref<{ id: string; name: string; currentCap: number; spent: number } | null>(null)
const topUpAmount = ref(50)
const showUnlinkGitHubConfirm = ref(false)
const newToken = ref('')

const newKey = ref({
  name: '',
  provider: 'openai' as 'openai' | 'anthropic' | 'google' | 'xai' | 'openrouter',
  apiKey: '',
  ipRestrictionsEnabled: false,
  allowedIpRanges: '' as string, // comma-separated for UI, converted to array on submit
})

const newSponsorship = ref({
  sponsorKeyId: '',
  name: '',
  description: '',
  spendCapUsd: 50,
  billingPeriod: 'one_time' as 'one_time' | 'monthly',
  selectedMemberId: '' as string, // Team member selection
  targetGitHubUsername: '',
  recipientEmail: '',
  allowedModels: [] as string[],
  maxTokensPerRequest: null as number | null,
  expiresAt: '',
  ipRestrictionMode: 'inherit' as 'inherit' | 'custom' | 'none',
  allowedIpRanges: '' as string, // comma-separated for UI
})

// Team members available for sponsorship (excluding current user)
const availableTeamMembers = computed(() => {
  return team.members.value.filter(m => m.role !== 'owner') // Show non-owner members
})

// When a team member is selected, auto-fill their email
watch(() => newSponsorship.value.selectedMemberId, (memberId) => {
  if (memberId) {
    const member = team.members.value.find(m => m.id === memberId)
    if (member) {
      newSponsorship.value.recipientEmail = member.email
      newSponsorship.value.targetGitHubUsername = '' // Clear GitHub username
    }
  } else {
    // Clear email when deselecting (only if it was auto-filled)
    newSponsorship.value.recipientEmail = ''
  }
})

// Open sponsorship modal and load team members
const openCreateSponsorshipModal = async () => {
  // Load team members if not already loaded
  if (team.members.value.length === 0) {
    await team.loadMembers()
  }
  showCreateSponsorshipModal.value = true
}

// =====================================================
// RECEIVED TAB STATE
// =====================================================
const selectedReceivedId = ref<string | null>(null)
const receivedUsageSummary = ref<any>(null)
const loadingReceivedUsage = ref(false)

// GitHub verification state
const githubConfigured = ref(false)
const claimingGitHub = ref(false)

// Badge generator state
const showBadgeModal = ref(false)
const badgeUrl = computed(() => {
  const username = sponsorship.githubLinkStatus.value?.githubUsername
  if (!username) return ''
  // Use current origin in browser, fallback for SSR
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://airatelimit.com'
  return `${origin}/sponsor/${username}`
})

// Logo SVG as base64 (white version for dark badge background)
const logoBase64 = 'PHN2ZyB3aWR0aD0iMzc5IiBoZWlnaHQ9IjI5NSIgdmlld0JveD0iMCAwIDM3OSAyOTUiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xODkuMzkzIDMxLjUxNDNDMjE0LjkwOCAzMS41MTQzIDI0MC4xNSAzMi42NjkzIDI2NS4wNzcgMzQuOTE2M0MyNjguMzQxIDM1LjIwNjcgMjcxLjQwNyAzNi42MTExIDI3My43NTggMzguODkzOUMyNzYuMTEgNDEuMTc2NyAyNzcuNjA1IDQ0LjE5ODkgMjc3Ljk5MiA0Ny40NTMzQzI4MC41OTYgNjkuMjUxMyAyODIuMzYgOTEuMzAxMyAyODMuMjQyIDExMy42MDNMMjQ3Ljc3MyA3OC4xMTMzQzI0NC44MDEgNzUuMjQ1NyAyNDAuODIyIDczLjY2IDIzNi42OTIgNzMuNjk3OEMyMzIuNTYzIDczLjczNTYgMjI4LjYxMyA3NS4zOTM5IDIyNS42OTQgNzguMzE1NUMyMjIuNzc1IDgxLjIzNyAyMjEuMTIxIDg1LjE4ODEgMjIxLjA4NyA4OS4zMTc4QzIyMS4wNTMgOTMuNDQ3NCAyMjIuNjQyIDk3LjQyNTEgMjI1LjUxMyAxMDAuMzk0TDI4OC40OTIgMTYzLjM5NEMyOTEuNDQ1IDE2Ni4zNDQgMjk1LjQ0OCAxNjggMjk5LjYyMiAxNjhDMzAzLjc5NiAxNjggMzA3Ljc5OSAxNjYuMzQ0IDMxMC43NTIgMTYzLjM5NEwzNzMuNzczIDEwMC4zOTRDMzc1LjMyIDk4Ljk1MjQgMzc2LjU2MSA5Ny4yMTM1IDM3Ny40MjIgOTUuMjgxNkMzNzguMjgzIDkzLjM0OTYgMzc4Ljc0NiA5MS4yNjQgMzc4Ljc4MyA4OS4xNDkyQzM3OC44MjEgODcuMDM0NSAzNzguNDMyIDg0LjkzMzkgMzc3LjYzOSA4Mi45NzI3QzM3Ni44NDcgODEuMDExNiAzNzUuNjY4IDc5LjIzMDEgMzc0LjE3MyA3Ny43MzQ1QzM3Mi42NzcgNzYuMjM4OSAzNzAuODk2IDc1LjA1OTggMzY4LjkzNCA3NC4yNjc3QzM2Ni45NzMgNzMuNDc1NiAzNjQuODczIDczLjA4NjUgMzYyLjc1OCA3My4xMjM5QzM2MC42NDMgNzMuMTYxMiAzNTguNTU4IDczLjYyNCAzNTYuNjI2IDc0LjQ4NDlDMzU0LjY5NCA3NS4zNDU3IDM1Mi45NTUgNzYuNTg2OSAzNTEuNTEzIDc4LjEzNDNMMzE0LjgwNSAxMTQuODIxQzMxMy45MzIgOTEuMDUzMyAzMTIuMDgzIDY3LjMzMTMgMzA5LjI2MSA0My43MTUzQzMwOC4wMTcgMzMuMjkwNyAzMDMuMjI4IDIzLjYxMDMgMjk1LjY5NiAxNi4yOTY1QzI4OC4xNjQgOC45ODI2NSAyNzguMzQ4IDQuNDc5NzQgMjY3Ljg5MSAzLjU0MjM2QzIxNS42NTggLTEuMTgwNzkgMTYzLjEwNiAtMS4xODA3OSAxMTAuODc0IDMuNTQyMzZDMTAwLjQyMSA0LjQ4NDMxIDkwLjYwOTEgOC45ODkyNSA4My4wODE2IDE2LjMwMjdDNzUuNTU0IDIzLjYxNjEgNzAuNzY3OSAzMy4yOTM5IDY5LjUyNDkgNDMuNzE1M0M2OC4xODM1IDU0Ljk2MjIgNjcuMDYzMiA2Ni4yMzQ0IDY2LjE2NDkgNzcuNTI1M0M2NS45NjQ0IDc5LjYwNTEgNjYuMTc5OCA4MS43MDQxIDY2Ljc5ODUgODMuNjk5OUM2Ny40MTcyIDg1LjY5NTcgNjguNDI2OSA4Ny41NDg1IDY5Ljc2ODcgODkuMTUwMkM3MS4xMTA1IDkwLjc1MiA3Mi43NTc2IDkyLjA3MDcgNzQuNjE0MSA5My4wMjk3Qzc2LjQ3MDUgOTMuOTg4NiA3OC40OTkzIDk0LjU2ODYgODAuNTgyMSA5NC43MzU3QzgyLjY2NDkgOTQuOTAyOSA4NC43NjAxIDk0LjY1NCA4Ni43NDU4IDk0LjAwMzRDODguNzMxNSA5My4zNTI5IDkwLjU2NzggOTIuMzEzOCA5Mi4xNDc5IDkwLjk0NjVDOTMuNzI4IDg5LjU3OTMgOTUuMDIwMyA4Ny45MTEzIDk1Ljk0OTQgODYuMDM5OEM5Ni44Nzg2IDg0LjE2ODIgOTcuNDI2IDgyLjEzMDUgOTcuNTU5OSA4MC4wNDUzQzk4LjQyMDkgNjkuMTI1MyA5OS41MTI5IDU4LjI0NzMgMTAwLjc5NCA0Ny40NTMzQzEwMS4xODEgNDQuMTk4OSAxMDIuNjc2IDQxLjE3NjcgMTA1LjAyNyAzOC44OTM5QzEwNy4zNzkgMzYuNjExMSAxMTAuNDQ0IDM1LjIwNjcgMTEzLjcwOSAzNC45MTYzQzEzOC44NzMgMzIuNjQ1IDE2NC4xMjcgMzEuNTA5OCAxODkuMzkzIDMxLjUxNDNaTTkwLjI5MzkgMTMwLjYzNEM4Ny4zNDA3IDEyNy42ODUgODMuMzM3NiAxMjYuMDI4IDc5LjE2MzkgMTI2LjAyOEM3NC45OTAxIDEyNi4wMjggNzAuOTg3IDEyNy42ODUgNjguMDMzOSAxMzAuNjM0TDUuMDEyODggMTkzLjYzNEMzLjQ2NTQ1IDE5NS4wNzYgMi4yMjQzIDE5Ni44MTUgMS4zNjM0NyAxOTguNzQ3QzAuNTAyNjQyIDIwMC42NzkgMC4wMzk3NjM2IDIwMi43NjQgMC4wMDI0NTExNCAyMDQuODc5Qy0wLjAzNDg2MTMgMjA2Ljk5NCAwLjM1NDE1NyAyMDkuMDk1IDEuMTQ2MyAyMTEuMDU2QzEuOTM4NDQgMjEzLjAxNyAzLjExNzQ3IDIxNC43OTggNC42MTMwNyAyMTYuMjk0QzYuMTA4NjYgMjE3Ljc4OSA3Ljg5MDE3IDIxOC45NjkgOS44NTEzMyAyMTkuNzYxQzExLjgxMjUgMjIwLjU1MyAxMy45MTMxIDIyMC45NDIgMTYuMDI3OCAyMjAuOTA1QzE4LjE0MjYgMjIwLjg2NyAyMC4yMjgyIDIyMC40MDQgMjIuMTYwMiAyMTkuNTQ0QzI0LjA5MjIgMjE4LjY4MyAyNS44MzEgMjE3LjQ0MiAyNy4yNzI5IDIxNS44OTRMNjMuOTgwOSAxNzkuMjA3QzY0Ljg2MjkgMjAzLjE2OCA2Ni43MTA5IDIyNi44NzcgNjkuNTI0OSAyNTAuMzEzQzcwLjc2ODggMjYwLjczOCA3NS41NTc5IDI3MC40MTggODMuMDg5NyAyNzcuNzMyQzkwLjYyMTUgMjg1LjA0NiAxMDAuNDM4IDI4OS41NDkgMTEwLjg5NSAyOTAuNDg2QzE2My4xMjcgMjk1LjIwNyAyMTUuNjc5IDI5NS4yMDcgMjY3LjkxMiAyOTAuNDg2QzI3OC4zNjUgMjg5LjU0NCAyODguMTc3IDI4NS4wMzkgMjk1LjcwNCAyNzcuNzI2QzMwMy4yMzIgMjcwLjQxMiAzMDguMDE4IDI2MC43MzQgMzA5LjI2MSAyNTAuMzEzQzMxMC42MDUgMjM5LjA5OSAzMTEuNzE4IDIyNy44MjIgMzEyLjYyMSAyMTYuNTAzQzMxMi44MjEgMjE0LjQyMyAzMTIuNjA2IDIxMi4zMjQgMzExLjk4NyAyMTAuMzI4QzMxMS4zNjggMjA4LjMzMyAzMTAuMzU5IDIwNi40OCAzMDkuMDE3IDIwNC44NzhDMzA3LjY3NSAyMDMuMjc2IDMwNi4wMjggMjAxLjk1OCAzMDQuMTcyIDIwMC45OTlDMzAyLjMxNSAyMDAuMDQgMzAwLjI4NiAxOTkuNDYgMjk4LjIwNCAxOTkuMjkzQzI5Ni4xMjEgMTk5LjEyNSAyOTQuMDI2IDE5OS4zNzQgMjkyLjA0IDIwMC4wMjVDMjkwLjA1NCAyMDAuNjc1IDI4OC4yMTggMjAxLjcxNSAyODYuNjM4IDIwMy4wODJDMjg1LjA1OCAyMDQuNDQ5IDI4My43NjUgMjA2LjExNyAyODIuODM2IDIwNy45ODlDMjgxLjkwNyAyMDkuODYgMjgxLjM2IDIxMS44OTggMjgxLjIyNiAyMTMuOTgzQzI4MC4zNjUgMjI0LjkwMyAyNzkuMjczIDIzNS43NiAyNzcuOTkyIDI0Ni41NzVDMjc3LjYwNSAyNDkuODMgMjc2LjExIDI1Mi44NTIgMjczLjc1OCAyNTUuMTM1QzI3MS40MDcgMjU3LjQxNyAyNjguMzQxIDI1OC44MjIgMjY1LjA3NyAyNTkuMTEyQzIxNC43MjQgMjYzLjY2NiAxNjQuMDYyIDI2My42NjYgMTEzLjcwOSAyNTkuMTEyQzExMC40NDQgMjU4LjgyMiAxMDcuMzc5IDI1Ny40MTcgMTA1LjAyNyAyNTUuMTM1QzEwMi42NzYgMjUyLjg1MiAxMDEuMTgxIDI0OS44MyAxMDAuNzk0IDI0Ni41NzVDOTguMTY4NiAyMjQuNjAzIDk2LjQxNzIgMjAyLjUzNiA5NS41NDM5IDE4MC40MjVMMTMxLjAxMyAyMTUuOTE1QzEzMy45ODUgMjE4Ljc4MyAxMzcuOTY0IDIyMC4zNjggMTQyLjA5NCAyMjAuMzMxQzE0Ni4yMjMgMjIwLjI5MyAxNTAuMTczIDIxOC42MzQgMTUzLjA5MiAyMTUuNzEzQzE1Ni4wMSAyMTIuNzkxIDE1Ny42NjUgMjA4Ljg0IDE1Ny42OTkgMjA0LjcxMUMxNTcuNzMzIDIwMC41ODEgMTU2LjE0MyAxOTYuNjAzIDE1My4yNzMgMTkzLjYzNEw5MC4yOTM5IDEzMC42MzRaIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPgo='

// Shields.io badge image URL (black two-part badge)
const badgeImageUrl = computed(() => {
  return `https://img.shields.io/badge/AI_Ratelimit-Sponsor_me-black?style=for-the-badge&logo=data:image/svg%2bxml;base64,${logoBase64}&logoColor=white`
})

// =====================================================
// POOLS TAB STATE
// =====================================================
const showCreatePoolModal = ref(false)
const showPoolDetailsModal = ref(false)
const showAddMemberModal = ref(false)
const showGeneratePoolTokenModal = ref(false)
const showDeletePoolConfirm = ref(false)

const newPool = ref({
  name: '',
  description: '',
  routingStrategy: 'proportional' as string,
})

const addMemberForm = ref({
  sponsorshipId: '',
  token: '',
  priority: 0,
  weight: 1,
})
const addMemberMode = ref<'select' | 'token'>('select')

const selectedPool = ref<any>(null)
const selectedPoolTokens = ref<any[]>([])
const generatedPoolToken = ref('')
const poolToDelete = ref<string | null>(null)

// =====================================================
// LOAD DATA
// =====================================================
onMounted(async () => {
  await Promise.all([
    sponsorship.fetchSponsorKeys(),
    sponsorship.fetchSponsorships(),
    sponsorship.fetchReceivedSponsorships(),
    sponsorship.fetchPools(),
    sponsorship.fetchPendingSponsorships(), // Always fetch pending (email + GitHub)
  ])
  
  // Load GitHub status
  githubConfigured.value = await sponsorship.checkGitHubConfigured()
  if (githubConfigured.value) {
    await sponsorship.fetchGitHubLinkStatus()
  }
  
  // Check for GitHub callback params
  const githubLinked = route.query.github_linked
  const githubError = route.query.github_error
  
  if (githubLinked) {
    useToast().success(`GitHub account @${githubLinked} linked successfully!`)
    // Auto-claim pending sponsorships
    await handleClaimGitHub()
    // Clean up URL
    router.replace({ query: { ...route.query, github_linked: undefined, github_error: undefined } })
  } else if (githubError) {
    useToast().error(`GitHub verification failed: ${githubError}`)
    router.replace({ query: { ...route.query, github_linked: undefined, github_error: undefined } })
  }
})

// =====================================================
// SPONSOR TAB METHODS
// =====================================================
const handleCreateKey = async () => {
  try {
    // Parse comma-separated IP ranges
    const ipRanges = newKey.value.allowedIpRanges
      .split(',')
      .map(ip => ip.trim())
      .filter(ip => ip.length > 0)

    await sponsorship.createSponsorKey({
      name: newKey.value.name,
      provider: newKey.value.provider,
      apiKey: newKey.value.apiKey,
      ipRestrictionsEnabled: newKey.value.ipRestrictionsEnabled,
      allowedIpRanges: ipRanges.length > 0 ? ipRanges : undefined,
    })
    showCreateKeyModal.value = false
    newKey.value = { name: '', provider: 'openai', apiKey: '', ipRestrictionsEnabled: false, allowedIpRanges: '' }
  } catch (error) {}
}

const handleCreateSponsorship = async () => {
  try {
    // Parse comma-separated IP ranges
    const ipRanges = newSponsorship.value.allowedIpRanges
      .split(',')
      .map(ip => ip.trim())
      .filter(ip => ip.length > 0)

    const result = await sponsorship.createSponsorship({
      sponsorKeyId: newSponsorship.value.sponsorKeyId,
      name: newSponsorship.value.name,
      description: newSponsorship.value.description || undefined,
      spendCapUsd: newSponsorship.value.spendCapUsd,
      billingPeriod: newSponsorship.value.billingPeriod,
      targetGitHubUsername: newSponsorship.value.targetGitHubUsername || undefined,
      recipientEmail: newSponsorship.value.recipientEmail || undefined,
      allowedModels: newSponsorship.value.allowedModels.length > 0 
        ? newSponsorship.value.allowedModels 
        : undefined,
      maxTokensPerRequest: newSponsorship.value.maxTokensPerRequest || undefined,
      expiresAt: newSponsorship.value.expiresAt || undefined,
      ipRestrictionMode: newSponsorship.value.ipRestrictionMode,
      allowedIpRanges: ipRanges.length > 0 ? ipRanges : undefined,
    })
    
    newToken.value = result.token
    showTokenModal.value = true
    showCreateSponsorshipModal.value = false
    
    newSponsorship.value = {
      sponsorKeyId: '',
      name: '',
      description: '',
      spendCapUsd: 50,
      billingPeriod: 'one_time',
      selectedMemberId: '',
      targetGitHubUsername: '',
      recipientEmail: '',
      allowedModels: [],
      maxTokensPerRequest: null,
      expiresAt: '',
      ipRestrictionMode: 'inherit',
      allowedIpRanges: '',
    }
  } catch (error) {}
}

const copyToken = (token: string) => {
  copy(token)
}

const handleRevoke = (s: { id: string; name: string }) => {
  sponsorshipToRevoke.value = s
  showRevokeSponsorshipConfirm.value = true
}

const confirmRevokeSponsorship = async () => {
  if (sponsorshipToRevoke.value) {
    await sponsorship.revokeSponsorship(sponsorshipToRevoke.value.id)
  }
  showRevokeSponsorshipConfirm.value = false
  sponsorshipToRevoke.value = null
}

const cancelRevokeSponsorship = () => {
  showRevokeSponsorshipConfirm.value = false
  sponsorshipToRevoke.value = null
}

const handleDelete = (s: { id: string; name: string }) => {
  sponsorshipToDelete.value = s
  showDeleteSponsorshipConfirm.value = true
}

const handleTopUp = (s: { id: string; name: string; spendCapUsd: number; spentUsd: number }) => {
  sponsorshipToTopUp.value = {
    id: s.id,
    name: s.name,
    currentCap: s.spendCapUsd || 0,
    spent: s.spentUsd || 0
  }
  topUpAmount.value = 50 // Default top-up amount
  showTopUpModal.value = true
}

const confirmTopUp = async () => {
  if (sponsorshipToTopUp.value && topUpAmount.value > 0) {
    const newCap = sponsorshipToTopUp.value.currentCap + topUpAmount.value
    await sponsorship.updateSponsorship(sponsorshipToTopUp.value.id, { spendCapUsd: newCap })
    await sponsorship.fetchSponsorships()
  }
  showTopUpModal.value = false
  sponsorshipToTopUp.value = null
}

const cancelTopUp = () => {
  showTopUpModal.value = false
  sponsorshipToTopUp.value = null
}

const confirmDeleteSponsorship = async () => {
  if (sponsorshipToDelete.value) {
    await sponsorship.deleteSponsorship(sponsorshipToDelete.value.id)
  }
  showDeleteSponsorshipConfirm.value = false
  sponsorshipToDelete.value = null
}

const cancelDeleteSponsorship = () => {
  showDeleteSponsorshipConfirm.value = false
  sponsorshipToDelete.value = null
}

const handleRegenerate = async (id: string) => {
  if (confirm('This will invalidate the current token. Continue?')) {
    const result = await sponsorship.regenerateToken(id)
    newToken.value = result.token
    showTokenModal.value = true
  }
}

const handleDeleteKey = (key: { id: string; name: string }) => {
  keyToDelete.value = key
  showDeleteKeyConfirm.value = true
}

const confirmDeleteKey = async () => {
  if (keyToDelete.value) {
    await sponsorship.deleteSponsorKey(keyToDelete.value.id)
  }
  showDeleteKeyConfirm.value = false
  keyToDelete.value = null
}

const cancelDeleteKey = () => {
  showDeleteKeyConfirm.value = false
  keyToDelete.value = null
}

// =====================================================
// RECEIVED TAB METHODS
// =====================================================
const loadReceivedUsage = async (id: string) => {
  selectedReceivedId.value = id
  loadingReceivedUsage.value = true
  try {
    receivedUsageSummary.value = await sponsorship.getReceivedUsageSummary(id)
  } catch (error) {
    console.error('Failed to load usage:', error)
  } finally {
    loadingReceivedUsage.value = false
  }
}

// =====================================================
// GITHUB VERIFICATION METHODS
// =====================================================
const handleVerifyGitHub = () => {
  sponsorship.initiateGitHubConnect()
}

const handleClaimGitHub = async () => {
  claimingGitHub.value = true
  try {
    await sponsorship.claimAllPendingSponsorships()
    // Refresh data
    await sponsorship.fetchReceivedSponsorships()
    await sponsorship.fetchPendingSponsorships()
  } catch (error) {
    console.error('Failed to claim:', error)
  } finally {
    claimingGitHub.value = false
  }
}

const claimedTokensList = ref<{ name: string; token: string }[]>([])
const showMultiTokenModal = ref(false)

const handleClaimAll = async () => {
  claimingGitHub.value = true
  try {
    const result = await sponsorship.claimAllPendingSponsorships()
    // Show tokens if any were claimed
    if (result.claimedTokens && result.claimedTokens.length > 0) {
      if (result.claimedTokens.length === 1) {
        // Single token - use existing modal
        newToken.value = result.claimedTokens[0].token
        showTokenModal.value = true
      } else {
        // Multiple tokens - show multi-token modal
        claimedTokensList.value = result.claimedTokens
        showMultiTokenModal.value = true
      }
    }
    // Refresh data
    await sponsorship.fetchReceivedSponsorships()
    await sponsorship.fetchPendingSponsorships()
  } catch (error) {
    console.error('Failed to claim:', error)
  } finally {
    claimingGitHub.value = false
  }
}

const handleClaimOne = async (sponsorshipId: string) => {
  try {
    const result = await sponsorship.claimSponsorship(sponsorshipId)
    // Show the token if returned
    if (result?.token) {
      newToken.value = result.token
      showTokenModal.value = true
    }
    // Refresh data
    await sponsorship.fetchReceivedSponsorships()
    await sponsorship.fetchPendingSponsorships()
  } catch (error) {
    console.error('Failed to claim:', error)
  }
}

const handleUnlinkGitHub = () => {
  showUnlinkGitHubConfirm.value = true
}

const confirmUnlinkGitHub = async () => {
  showUnlinkGitHubConfirm.value = false
  await sponsorship.unlinkGitHub()
  await sponsorship.fetchPendingGitHubSponsorships()
}

const copyBadgeUrl = () => {
  if (badgeUrl.value) {
    copy(badgeUrl.value)
  }
}

const getBudgetColor = (percent: number) => {
  if (percent >= 90) return 'bg-red-400'
  if (percent >= 70) return 'bg-yellow-300'
  return 'bg-green-300'
}

// =====================================================
// POOLS TAB METHODS
// =====================================================
const createPool = async () => {
  if (!newPool.value.name.trim()) return
  
  try {
    await sponsorship.createPool({
      name: newPool.value.name,
      description: newPool.value.description || undefined,
      routingStrategy: newPool.value.routingStrategy,
    })
    showCreatePoolModal.value = false
    newPool.value = { name: '', description: '', routingStrategy: 'proportional' }
  } catch (error) {}
}

const viewPool = async (poolId: string) => {
  try {
    selectedPool.value = await sponsorship.getPool(poolId)
    selectedPoolTokens.value = await sponsorship.listPoolTokens(poolId)
    showPoolDetailsModal.value = true
  } catch (error) {}
}

const addPoolMember = async () => {
  if (!selectedPool.value) return
  
  if (addMemberMode.value === 'select' && !addMemberForm.value.sponsorshipId) return
  if (addMemberMode.value === 'token' && !addMemberForm.value.token.trim()) return
  
  try {
    if (addMemberMode.value === 'token') {
      await sponsorship.addPoolMemberByToken(selectedPool.value.id, {
        token: addMemberForm.value.token.trim(),
        priority: addMemberForm.value.priority,
        weight: addMemberForm.value.weight,
      })
    } else {
      await sponsorship.addPoolMember(selectedPool.value.id, {
        sponsorshipId: addMemberForm.value.sponsorshipId,
        priority: addMemberForm.value.priority,
        weight: addMemberForm.value.weight,
      })
    }
    selectedPool.value = await sponsorship.getPool(selectedPool.value.id)
    showAddMemberModal.value = false
    addMemberForm.value = { sponsorshipId: '', token: '', priority: 0, weight: 1 }
    addMemberMode.value = 'select'
  } catch (error) {}
}

const removePoolMember = async (memberId: string) => {
  if (!selectedPool.value) return
  try {
    await sponsorship.removePoolMember(selectedPool.value.id, memberId)
    selectedPool.value = await sponsorship.getPool(selectedPool.value.id)
  } catch (error) {}
}

const generatePoolToken = async () => {
  if (!selectedPool.value) return
  try {
    generatedPoolToken.value = await sponsorship.generatePoolToken(selectedPool.value.id)
    selectedPoolTokens.value = await sponsorship.listPoolTokens(selectedPool.value.id)
    showGeneratePoolTokenModal.value = true
  } catch (error) {}
}

const revokePoolToken = async (tokenId: string) => {
  if (!selectedPool.value) return
  try {
    await sponsorship.revokePoolToken(selectedPool.value.id, tokenId)
    selectedPoolTokens.value = await sponsorship.listPoolTokens(selectedPool.value.id)
  } catch (error) {}
}

const confirmDeletePool = (poolId: string) => {
  poolToDelete.value = poolId
  showDeletePoolConfirm.value = true
}

const deletePool = async () => {
  if (!poolToDelete.value) return
  try {
    await sponsorship.deletePool(poolToDelete.value)
    showDeletePoolConfirm.value = false
    poolToDelete.value = null
  } catch (error) {}
}

const getStrategyLabel = (strategy: string) => {
  const labels: Record<string, string> = {
    proportional: 'Proportional',
    round_robin: 'Round Robin',
    priority: 'Priority',
    cheapest_first: 'Cheapest First',
    random: 'Random',
  }
  return labels[strategy] || strategy
}

const availableSponsorships = computed(() => {
  if (!selectedPool.value) return sponsorship.activeSponsorships.value
  const memberIds = new Set(selectedPool.value.members?.map((m: any) => m.sponsorshipId) || [])
  return sponsorship.activeSponsorships.value.filter(s => !memberIds.has(s.id))
})

// =====================================================
// SHARED HELPERS
// =====================================================
const formatCost = (cost: number) => {
  if (cost === 0) return '$0.00'
  if (cost >= 1) return `$${cost.toFixed(2)}`
  if (cost >= 0.01) return `$${cost.toFixed(4)}`
  if (cost >= 0.0001) return `$${cost.toFixed(6)}`
  return `$${cost.toFixed(8)}`
}

const getStatusClasses = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-400/10 text-green-400 border-green-400/20'
    case 'paused': return 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20'
    case 'revoked': return 'bg-red-400/10 text-red-400 border-red-400/20'
    case 'exhausted': return 'bg-orange-400/10 text-orange-400 border-orange-400/20'
    case 'expired': return 'bg-gray-400/10 text-gray-400 border-gray-400/20'
    default: return 'bg-gray-400/10 text-gray-400 border-gray-400/20'
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-xl font-bold text-white">
          Sponsorship
          <span class="text-xs text-amber-400 bg-amber-500/15 px-2 py-1 rounded-full font-normal">Beta</span>
        </h2>
        <p class="text-sm text-gray-400 mt-1">
          <template v-if="canManageSponsorships">
            Give friends or employees API credits, receive sponsorships, or create pools from multiple sponsors.
          </template>
          <template v-else>
            View and manage sponsorships you've received, or add them to pools.
          </template>
        </p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-8 mb-6 border-b border-gray-500/20">
      <!-- My Sponsorships tab - only visible to admins and owners -->
      <button
        v-if="canManageSponsorships"
        @click="activeTab = 'sponsor'"
        :class="[
          'pb-3 text-sm font-medium transition-colors relative',
          activeTab === 'sponsor' 
            ? 'text-white' 
            : 'text-gray-500 hover:text-gray-300'
        ]"
      >
        My Sponsorships
        <div v-if="activeTab === 'sponsor'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-300"></div>
      </button>
      <button
        @click="activeTab = 'received'"
        :class="[
          'pb-3 text-sm font-medium transition-colors relative flex items-center gap-2',
          activeTab === 'received' 
            ? 'text-white' 
            : 'text-gray-500 hover:text-gray-300'
        ]"
      >
        Received
        <span v-if="sponsorship.activeReceivedSponsorships.value.length > 0" class="text-xs bg-gray-500/40 text-white rounded-full px-1.5">
          {{ sponsorship.activeReceivedSponsorships.value.length }}
        </span>
        <div v-if="activeTab === 'received'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-300"></div>
      </button>
      <button
        @click="activeTab = 'pools'"
        :class="[
          'pb-3 text-sm font-medium transition-colors relative flex items-center gap-2',
          activeTab === 'pools' 
            ? 'text-white' 
            : 'text-gray-500 hover:text-gray-300'
        ]"
      >
        Pools
        <span v-if="sponsorship.activePools.value.length > 0" class="text-xs bg-gray-500/40 text-white rounded-full px-1.5">
          {{ sponsorship.activePools.value.length }}
        </span>
        <div v-if="activeTab === 'pools'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-300"></div>
      </button>
    </div>

    <!-- =====================================================
         SPONSOR TAB (Only for admins and owners)
         ===================================================== -->
    <div v-if="activeTab === 'sponsor' && canManageSponsorships">
      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
          <div class="text-gray-400 text-xs mb-1">Registered Keys</div>
          <div class="text-lg font-semibold text-white">{{ sponsorship.sponsorKeys.value.length }}</div>
        </div>
        <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
          <div class="text-gray-400 text-xs mb-1">Active Sponsorships</div>
          <div class="text-lg font-semibold text-green-300">{{ sponsorship.activeSponsorships.value.length }}</div>
        </div>
        <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
          <div class="text-gray-400 text-xs mb-1">Total Budget</div>
          <div class="text-lg font-semibold text-white">${{ sponsorship.totalBudgetUsd.value.toFixed(2) }}</div>
        </div>
        <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
          <div class="text-gray-400 text-xs mb-1">Total Spent</div>
          <div class="text-lg font-semibold text-white">{{ formatCost(sponsorship.totalSpentUsd.value) }}</div>
        </div>
      </div>

      <!-- Provider Keys Section -->
      <div class="mb-8">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-white">Provider Keys</h3>
          <button
            @click="showCreateKeyModal = true"
            class="flex items-center gap-2 px-3 py-1.5 bg-gray-500/10 border border-gray-500/10 hover:bg-gray-500/20 text-white rounded-lg text-sm transition-colors"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Key
          </button>
        </div>

        <div v-if="sponsorship.sponsorKeys.value.length === 0" class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-6 text-center">
          <p class="text-sm text-gray-400">No provider keys registered. Add a key to start creating sponsorships.</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            v-for="key in sponsorship.sponsorKeys.value"
            :key="key.id"
            class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-3"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-[10px] text-gray-500 uppercase bg-gray-500/10 px-1.5 py-0.5 rounded">{{ key.provider }}</span>
                <span class="text-sm text-white font-medium">{{ key.name }}</span>
                <span v-if="key.ipRestrictionsEnabled" class="text-[10px] text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded" title="IP restrictions enabled">
                  IP
                </span>
              </div>
              <button
                @click="handleDeleteKey(key)"
                class="text-gray-500 hover:text-red-400 transition-colors"
                title="Delete key"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <code class="text-xs text-gray-500 mt-1 block">...{{ key.keyHint }}</code>
          </div>
        </div>
      </div>

      <!-- Sponsorships Section -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-white">Sponsorships</h3>
          <button
            @click="openCreateSponsorshipModal"
            :disabled="sponsorship.sponsorKeys.value.length === 0"
            class="flex items-center gap-2 px-3 py-1.5 bg-white text-black hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Create
          </button>
        </div>

        <div v-if="sponsorship.sponsorships.value.length === 0" class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-8 text-center">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-500/10 mb-3">
            <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p class="text-sm text-gray-400 mb-1">No sponsorships yet</p>
          <p class="text-xs text-gray-500">Create a sponsorship to share your API credits with others.</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="s in sponsorship.sponsorships.value"
            :key="s.id"
            class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4"
          >
            <div class="flex items-start justify-between mb-3">
              <div>
                <div class="flex items-center gap-2">
                  <h4 class="text-sm font-medium text-white">{{ s.name }}</h4>
                  <span :class="['text-[10px] px-1.5 py-0.5 rounded border', getStatusClasses(s.status)]">
                    {{ s.status }}
                  </span>
                  <span v-if="s.provider" class="text-[10px] text-gray-500 bg-gray-500/10 px-1.5 py-0.5 rounded uppercase">{{ s.provider }}</span>
                  <span class="text-[10px] text-gray-500 bg-gray-500/10 px-1.5 py-0.5 rounded">{{ s.billingPeriod === 'monthly' ? 'Monthly' : 'One-time' }}</span>
                </div>
                <p v-if="s.description" class="text-xs text-gray-400 mt-1">{{ s.description }}</p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  v-if="s.status === 'active'"
                  @click="handleRegenerate(s.id)"
                  class="text-xs text-gray-400 hover:text-white transition-colors"
                  title="Regenerate token"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button
                  v-if="s.status === 'active' && s.spendCapUsd"
                  @click="handleTopUp({ id: s.id, name: s.name, spendCapUsd: s.spendCapUsd, spentUsd: s.spentUsd })"
                  class="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Top Up
                </button>
                <button
                  v-if="s.status === 'active'"
                  @click="handleRevoke({ id: s.id, name: s.name })"
                  class="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Revoke
                </button>
                <button
                  v-if="s.status === 'revoked'"
                  @click="handleDelete({ id: s.id, name: s.name })"
                  class="text-xs text-gray-400 hover:text-red-400 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>

            <!-- Budget Progress -->
            <div class="mb-3">
              <div class="flex justify-between text-xs mb-1">
                <span class="text-gray-400">Budget: ${{ s.spendCapUsd?.toFixed(2) || '∞' }}</span>
                <span class="text-white">{{ formatCost(s.spentUsd || 0) }} spent</span>
              </div>
              <div class="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  class="h-full bg-blue-500 transition-all"
                  :style="{ width: `${Math.min(s.budgetUsedPercent || 0, 100)}%` }"
                ></div>
              </div>
            </div>

            <!-- Recipient Info -->
            <div class="text-xs text-gray-500">
              <span v-if="s.recipientOrgName">Recipient: {{ s.recipientOrgName }}</span>
              <span v-else-if="s.recipientEmail">For: {{ s.recipientEmail }}</span>
              <span v-else>Not yet claimed</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- =====================================================
         RECEIVED TAB
         ===================================================== -->
    <div v-if="activeTab === 'received'">
      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
          <div class="text-gray-400 text-xs mb-1">Active Sponsorships</div>
          <div class="text-lg font-semibold text-white">{{ sponsorship.activeReceivedSponsorships.value.length }}</div>
        </div>
        <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
          <div class="text-gray-400 text-xs mb-1">Total Available Budget</div>
          <div class="text-lg font-semibold text-green-300">${{ sponsorship.totalReceivedBudgetUsd.value.toFixed(2) }}</div>
        </div>
        <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
          <div class="text-gray-400 text-xs mb-1">Total Sponsorships</div>
          <div class="text-lg font-semibold text-white">{{ sponsorship.receivedSponsorships.value.length }}</div>
        </div>
      </div>

      <!-- Pending Sponsorships Banner -->
      <div v-if="sponsorship.pendingSponsorships.value?.pending?.length > 0" class="mb-6">
        <div class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-green-300/10 flex items-center justify-center">
                <svg class="w-5 h-5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <div>
                <h4 class="text-sm font-medium text-white">
                  {{ sponsorship.pendingSponsorships.value.pending.length }} Pending Sponsorship(s)
                </h4>
                <p class="text-xs text-gray-400">
                  Sent to your email
                  <span v-if="sponsorship.pendingSponsorships.value.githubLinked">
                    or GitHub <span class="text-green-300">@{{ sponsorship.pendingSponsorships.value.githubUsername }}</span>
                  </span>
                </p>
              </div>
            </div>
            <button
              @click="handleClaimAll"
              :disabled="claimingGitHub"
              class="flex items-center gap-2 px-4 py-2 bg-blue-300 text-black rounded-lg text-xs font-medium hover:bg-blue-400 transition-colors disabled:opacity-50"
            >
              <!-- <svg v-if="claimingGitHub" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg> -->
              Claim All
            </button>
          </div>
          <!-- Pending list -->
          <div class="mt-3 space-y-2">
            <div
              v-for="pending in sponsorship.pendingSponsorships.value.pending"
              :key="pending.id"
              class="flex items-center justify-between bg-black/30 rounded p-2"
            >
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <div class="text-xs text-white font-medium">{{ pending.name }}</div>
                  <span v-if="pending.targetGitHubUsername && !pending.canClaimDirectly" class="text-[10px] px-1.5 py-0.5 bg-gray-500/20 text-gray-400 rounded">
                    Requires GitHub
                  </span>
                </div>
                <div class="text-[10px] text-gray-500">
                  From {{ pending.sponsorName || 'Anonymous' }} 
                  <span v-if="pending.spendCapUsd">• ${{ pending.spendCapUsd.toFixed(2) }}</span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] text-gray-500 uppercase">{{ pending.provider }}</span>
                <button
                  v-if="pending.canClaimDirectly"
                  @click.stop="handleClaimOne(pending.id)"
                  class="text-xs text-blue-300 hover:text-blue-200"
                >
                  Claim
                </button>
                <button
                  v-else-if="!sponsorship.pendingSponsorships.value.githubLinked"
                  @click.stop="handleVerifyGitHub"
                  class="text-xs text-blue-300 hover:text-blue-200"
                >
                  Verify GitHub
                </button>
                <button
                  v-else
                  @click.stop="handleClaimOne(pending.id)"
                  class="text-xs text-blue-300 hover:text-blue-200"
                >
                  Claim
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- GitHub Link Banner (only show if no pending and GitHub is configured) -->
      <div v-else-if="githubConfigured" class="mb-6">
        <!-- Not linked yet -->
        <div
          v-if="!sponsorship.githubLinkStatus.value?.linked"
          class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-gray-500/10 flex items-center justify-center">
                <svg class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 class="text-sm font-medium text-white">Link GitHub Account</h4>
                <p class="text-xs text-gray-400">Sponsors can send you credits by GitHub username</p>
              </div>
            </div>
            <button
              @click="handleVerifyGitHub"
              class="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
              </svg>
              Verify GitHub
            </button>
          </div>
        </div>

        <!-- Linked, no pending -->
        <div
          v-else
          class="flex items-center justify-between bg-gray-500/5 border border-gray-500/10 rounded-lg px-4 py-3"
        >
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span class="text-xs text-gray-400">
              GitHub linked as <span class="text-green-300">@{{ sponsorship.githubLinkStatus.value.githubUsername }}</span>
            </span>
          </div>
          <button
            @click="handleUnlinkGitHub"
            class="text-xs text-gray-500 hover:text-red-400 transition-colors"
          >
            Unlink
          </button>
        </div>
      </div>

      <!-- Your Sponsor Badge (only show if GitHub is linked) -->
      <div v-if="sponsorship.githubLinkStatus.value?.linked" class="mb-6">
        <div class="bg-blue-300/10 border border-blue-300/10 rounded-lg p-4">
          <div class="flex items-start justify-between mb-3">
            <div>
              <h4 class="text-sm font-medium text-white flex items-center gap-2">
                <svg class="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Your Sponsor Badge
              </h4>
              <p class="text-xs text-gray-400 mt-1">Share this link to let anyone sponsor your AI usage</p>
            </div>
            <button
              @click="showBadgeModal = true"
              class="px-3 py-1.5 bg-blue-300/10 hover:bg-blue-300/20 text-blue-300 border border-blue-300/20 rounded-lg text-xs font-medium transition-colors"
            >
              Get Badge
            </button>
          </div>
          <div class="flex items-center gap-2 bg-black/40 rounded-lg px-3 py-2">
            <code class="text-xs text-gray-300 flex-1 truncate">{{ badgeUrl }}</code>
            <button
              @click="copyBadgeUrl"
              class="text-xs text-blue-300 hover:text-blue-400 whitespace-nowrap"
            >
              Copy
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="sponsorship.loadingReceived.value" class="text-center py-12">
        <div class="text-gray-400 text-sm">Loading sponsorships...</div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="sponsorship.receivedSponsorships.value.length === 0"
        class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-12 text-center"
      >
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-500/10 mb-4">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
        </div>
        <h3 class="text-sm font-medium text-white mb-2">No sponsorships received yet</h3>
        <p class="text-xs text-gray-400 max-w-md mx-auto">
          When someone creates a sponsorship for you, it will appear here.
          You can use the sponsored token as your API key.
        </p>
      </div>

      <!-- Sponsorships Grid -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          v-for="s in sponsorship.receivedSponsorships.value"
          :key="s.id"
          class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4 hover:border-gray-500/20 transition-colors cursor-pointer"
          @click="loadReceivedUsage(s.id)"
        >
          <div class="flex items-start justify-between mb-3">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 class="text-sm font-medium text-white">{{ s.name }}</h3>
              </div>
              <p v-if="s.description" class="text-xs text-gray-400 mt-1">{{ s.description }}</p>
              <p class="text-xs text-gray-500 mt-2">
                Sponsored by <span class="text-blue-300">{{ s.sponsorName || 'Anonymous' }}</span>
              </p>
            </div>
            <span class="text-[10px] text-gray-500 uppercase bg-gray-500/10 px-1.5 py-0.5 rounded">{{ s.provider || 'unknown' }}</span>
          </div>

          <!-- Budget Display -->
          <div class="mb-3">
            <div class="flex items-center justify-between text-xs mb-1">
              <span class="text-gray-400">Remaining Budget</span>
              <span class="text-white font-medium">${{ s.remainingBudgetUsd?.toFixed(2) || '∞' }}</span>
            </div>
            <div class="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                :class="['h-full transition-all', getBudgetColor(s.budgetUsedPercent)]"
                :style="{ width: `${100 - Math.min(s.budgetUsedPercent, 100)}%` }"
              ></div>
            </div>
            <div class="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>{{ (100 - s.budgetUsedPercent).toFixed(1) }}% remaining</span>
              <span>My spend: {{ formatCost(s.mySpentUsd || 0) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- =====================================================
         POOLS TAB
         ===================================================== -->
    <div v-if="activeTab === 'pools'">
      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
          <div class="text-gray-400 text-xs mb-1">Active Pools</div>
          <div class="text-lg font-semibold text-white">{{ sponsorship.activePools.value.length }}</div>
        </div>
        <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
          <div class="text-gray-400 text-xs mb-1">Total Pools</div>
          <div class="text-lg font-semibold text-white">{{ sponsorship.pools.value.length }}</div>
        </div>
        <div class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4">
          <div class="text-gray-400 text-xs mb-1">Available Sponsorships</div>
          <div class="text-lg font-semibold text-blue-300">{{ sponsorship.activeSponsorships.value.length }}</div>
        </div>
      </div>

      <!-- Action Button -->
      <div class="flex justify-end mb-4">
        <button
          @click="showCreatePoolModal = true"
          class="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Create Pool
        </button>
      </div>

      <!-- Empty State -->
      <div
        v-if="sponsorship.pools.value.length === 0"
        class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-12 text-center"
      >
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-500/10 mb-4">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 class="text-sm font-medium text-white mb-2">No pools yet</h3>
        <p class="text-xs text-gray-400 max-w-md mx-auto">
          Create a pool to combine multiple sponsorships into a single token with intelligent routing.
        </p>
      </div>

      <!-- Pools Grid -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          v-for="pool in sponsorship.pools.value"
          :key="pool.id"
          class="bg-gray-500/5 border border-gray-500/10 rounded-lg p-4 hover:border-gray-500/20 transition-colors"
        >
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 class="text-sm font-medium text-white">{{ pool.name }}</h3>
                <span 
                  :class="[
                    'text-[10px] px-1.5 py-0.5 rounded uppercase',
                    pool.isActive ? 'bg-green-400/10 text-green-300' : 'bg-gray-500/10 text-gray-400'
                  ]"
                >
                  {{ pool.isActive ? 'Active' : 'Inactive' }}
                </span>
              </div>
              <p v-if="pool.description" class="text-xs text-gray-400 mt-1">{{ pool.description }}</p>
            </div>
          </div>

          <!-- Pool Stats -->
          <div class="grid grid-cols-3 gap-2 mb-3 text-xs">
            <div class="bg-gray-500/10 rounded p-2">
              <div class="text-gray-500">Sponsors</div>
              <div class="text-white font-medium">{{ pool.activeMemberCount || 0 }} / {{ pool.memberCount || 0 }}</div>
            </div>
            <div class="bg-gray-500/10 rounded p-2">
              <div class="text-gray-500">Budget</div>
              <div class="text-white font-medium">${{ (pool.totalBudgetUsd || 0).toFixed(2) }}</div>
            </div>
            <div class="bg-gray-500/10 rounded p-2">
              <div class="text-gray-500">Remaining</div>
              <div class="text-green-300 font-medium">${{ (pool.remainingBudgetUsd || 0).toFixed(2) }}</div>
            </div>
          </div>

          <!-- Routing Strategy Badge -->
          <div class="flex items-center justify-between">
            <span class="text-[10px] px-2 py-1 bg-blue-400/10 text-blue-300 rounded">
              {{ getStrategyLabel(pool.routingStrategy) }} Routing
            </span>
            <div class="flex items-center gap-2">
              <button
                @click="viewPool(pool.id)"
                class="text-xs text-gray-400 hover:text-white transition-colors"
              >
                View Details
              </button>
              <button
                @click="confirmDeletePool(pool.id)"
                class="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- =====================================================
         MODALS
         ===================================================== -->
    
    <!-- Create Key Modal -->
    <Teleport to="body">
      <div v-if="showCreateKeyModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="showCreateKeyModal = false">
        <div class="bg-black rounded-xl p-6 w-full max-w-md border border-gray-500/20">
          <h3 class="text-sm font-semibold text-white mb-4">Register Provider Key</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-xs text-gray-400 mb-1">Name</label>
              <input
                v-model="newKey.name"
                type="text"
                placeholder="My OpenAI Key"
                class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-400"
              />
            </div>
            
            <div>
              <label class="block text-xs text-gray-400 mb-1">Provider</label>
              <div class="relative">
                <select
                  v-model="newKey.provider"
                  class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-400 appearance-none cursor-pointer"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google</option>
                  <option value="xai">xAI</option>
                </select>
                <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            <div>
              <label class="block text-xs text-gray-400 mb-1">API Key</label>
              <input
                v-model="newKey.apiKey"
                type="password"
                placeholder="sk-..."
                class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-400 font-mono"
              />
            </div>

            <!-- IP Restrictions -->
            <div class="border-t border-gray-500/10 pt-4">
              <div class="flex items-center justify-between mb-3">
                <div>
                  <label class="block text-xs text-gray-400">IP Restrictions</label>
                  <p class="text-[10px] text-gray-500 mt-0.5">Limit usage to specific IP addresses</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="newKey.ipRestrictionsEnabled"
                    class="sr-only peer"
                  />
                  <div class="w-9 h-5 bg-gray-500/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-300 peer-checked:after:bg-white"></div>
                </label>
              </div>
              
              <div v-if="newKey.ipRestrictionsEnabled">
                <label class="block text-xs text-gray-400 mb-1">Allowed IP Ranges</label>
                <textarea
                  v-model="newKey.allowedIpRanges"
                  placeholder="10.0.0.0/8, 192.168.1.100, 2001:db8::/32"
                  rows="2"
                  class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-400 font-mono resize-none"
                />
                <p class="text-[10px] text-gray-500 mt-1">Comma-separated IP addresses or CIDR ranges</p>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <button @click="showCreateKeyModal = false" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button
              @click="handleCreateKey"
              :disabled="!newKey.name || !newKey.apiKey"
              class="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Register Key
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Create Sponsorship Modal -->
    <Teleport to="body">
      <div v-if="showCreateSponsorshipModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="showCreateSponsorshipModal = false">
        <div class="bg-black rounded-xl p-6 w-full max-w-md border border-gray-500/20 max-h-[85vh] overflow-y-auto">
          <h3 class="text-sm font-semibold text-white mb-4">Create Sponsorship</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-xs text-gray-400 mb-1">Provider Key</label>
              <div class="relative">
                <select
                  v-model="newSponsorship.sponsorKeyId"
                  class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-400 appearance-none cursor-pointer"
                >
                  <option value="">Select a key...</option>
                  <option v-for="key in sponsorship.sponsorKeys.value" :key="key.id" :value="key.id">
                    {{ key.name }} ({{ key.provider }})
                  </option>
                </select>
                <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            <div>
              <label class="block text-xs text-gray-400 mb-1">Name</label>
              <input
                v-model="newSponsorship.name"
                type="text"
                placeholder="OSS Developer Grant"
                class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-400"
              />
            </div>
            
            <!-- <div>
              <label class="block text-xs text-gray-400 mb-1">Description (optional)</label>
              <textarea
                v-model="newSponsorship.description"
                rows="2"
                placeholder="For open source development..."
                class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-400 resize-none"
              ></textarea>
            </div> -->
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-gray-400 mb-1">Budget (USD)</label>
                <input
                  v-model.number="newSponsorship.spendCapUsd"
                  type="number"
                  min="1"
                  step="1"
                  class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">Type</label>
                <div class="relative">
                  <select
                    v-model="newSponsorship.billingPeriod"
                    class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-400 appearance-none cursor-pointer"
                  >
                    <option value="one_time">One-time</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <!-- Team Member Selection (if team members exist) -->
            <div v-if="availableTeamMembers.length > 0">
              <label class="block text-xs text-gray-400 mb-1">
                Send to Team Member
                <span class="text-gray-500">(optional)</span>
              </label>
              <div class="relative">
                <div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <select
                  v-model="newSponsorship.selectedMemberId"
                  class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg pl-9 pr-8 py-2 text-sm text-white focus:outline-none focus:border-gray-400 appearance-none cursor-pointer"
                >
                  <option value="">Select a team member...</option>
                  <option v-for="member in availableTeamMembers" :key="member.id" :value="member.id">
                    {{ member.email }}
                  </option>
                </select>
                <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <p class="text-[10px] text-gray-500 mt-1">
                Sponsorship will appear in their pending sponsorships
              </p>
            </div>

            <!-- Target GitHub username (only shown if no team member selected) -->
            <div v-if="!newSponsorship.selectedMemberId">
              <label class="block text-xs text-gray-400 mb-1">
                Target GitHub Username 
                <span class="text-gray-500">(optional)</span>
              </label>
              <div class="relative">
                <div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
                  </svg>
                </div>
                <input
                  v-model="newSponsorship.targetGitHubUsername"
                  type="text"
                  placeholder="octocat"
                  class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-400"
                />
              </div>
              <p class="text-[10px] text-gray-500 mt-1">
                Recipient must verify their GitHub identity to claim this sponsorship
              </p>
            </div>

            <!-- Recipient Email (shown when GitHub username is entered, hidden when team member selected) -->
            <div v-if="newSponsorship.targetGitHubUsername && !newSponsorship.selectedMemberId">
              <label class="block text-xs text-gray-400 mb-1">
                Recipient Email
                <!-- <span class="text-gray-500">(optional, for notification)</span> -->
              </label>
              <div class="relative">
                <div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  v-model="newSponsorship.recipientEmail"
                  type="email"
                  placeholder="dev@example.com"
                  class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-400"
                />
              </div>
              <p class="text-[10px] text-gray-500 mt-1">
                We'll email them instructions to claim the sponsorship
              </p>
            </div>

            <!-- Show selected team member info -->
            <div v-if="newSponsorship.selectedMemberId" class="bg-blue-300/10 border border-blue-300/20 rounded-lg p-3">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span class="text-sm text-blue-300">{{ newSponsorship.recipientEmail }}</span>
              </div>
              <p class="text-[10px] text-gray-400 mt-1">This team member will receive the sponsorship</p>
            </div>
            
            <!-- <div>
              <label class="block text-xs text-gray-400 mb-1">Max Tokens per Request (optional)</label>
              <input
                v-model.number="newSponsorship.maxTokensPerRequest"
                type="number"
                min="1"
                placeholder="e.g., 4000"
                class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-400"
              />
            </div> -->
            
            <!-- IP Restrictions -->
            <div class="border-t border-gray-500/10 pt-4 mt-2">
              <label class="block text-xs text-gray-400 mb-2">IP Restrictions</label>
              <div class="flex gap-2">
                <button
                  v-for="mode in [
                    { value: 'inherit', label: 'Inherit' },
                    { value: 'custom', label: 'Custom' },
                    { value: 'none', label: 'None' }
                  ]"
                  :key="mode.value"
                  type="button"
                  @click="newSponsorship.ipRestrictionMode = mode.value as any"
                  :class="[
                    'flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    newSponsorship.ipRestrictionMode === mode.value
                      ? 'bg-blue-300 text-black'
                      : 'bg-gray-500/10 text-gray-400 hover:bg-gray-500/20'
                  ]"
                >
                  {{ mode.label }}
                </button>
              </div>
              <p class="text-[10px] text-gray-500 mt-1.5">
                <template v-if="newSponsorship.ipRestrictionMode === 'inherit'">
                  Use IP restrictions from the provider key (if enabled)
                </template>
                <template v-else-if="newSponsorship.ipRestrictionMode === 'custom'">
                  Set custom IP restrictions for this sponsorship
                </template>
                <template v-else>
                  No IP restrictions (anyone can use this sponsorship)
                </template>
              </p>
              
              <div v-if="newSponsorship.ipRestrictionMode === 'custom'" class="mt-3">
                <label class="block text-xs text-gray-400 mb-1">Allowed IP Ranges</label>
                <textarea
                  v-model="newSponsorship.allowedIpRanges"
                  placeholder="10.0.0.0/8, 192.168.1.100"
                  rows="2"
                  class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-400 font-mono resize-none"
                />
                <p class="text-[10px] text-gray-500 mt-1">Comma-separated IP addresses or CIDR ranges</p>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <button @click="showCreateSponsorshipModal = false" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button
              @click="handleCreateSponsorship"
              :disabled="!newSponsorship.sponsorKeyId || !newSponsorship.name"
              class="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Token Modal -->
    <Teleport to="body">
      <div v-if="showTokenModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="showTokenModal = false">
        <div class="bg-black rounded-xl p-6 w-full max-w-lg border border-gray-500/20">
          <div class="flex items-center gap-2 mb-4">
            <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="text-sm font-semibold text-white">Sponsored Token</h3>
          </div>
          
          <div class="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4 mb-4">
            <div class="flex items-center justify-between">
              <code class="text-sm text-green-300 break-all">{{ newToken }}</code>
              <button @click="copyToken(newToken)" class="ml-3 text-gray-400 hover:text-white flex-shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          <div class="bg-yellow-400/10 border border-yellow-400/10 rounded-lg p-3 mb-4">
            <div class="flex items-start gap-2">
              <svg class="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div class="text-xs text-yellow-300">
                <strong>Save this token now!</strong> It won't be shown again.
              </div>
            </div>
          </div>

          <button @click="showTokenModal = false" class="w-full px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
            Done
          </button>
        </div>
      </div>
    </Teleport>

    <!-- Multi-Token Modal (for claiming multiple sponsorships) -->
    <Teleport to="body">
      <div v-if="showMultiTokenModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="showMultiTokenModal = false">
        <div class="bg-black rounded-xl p-6 w-full max-w-lg border border-gray-500/20 max-h-[80vh] overflow-y-auto">
          <div class="flex items-center gap-2 mb-4">
            <svg class="w-5 h-5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="text-sm font-semibold text-white">Claimed {{ claimedTokensList.length }} Sponsorship(s)</h3>
          </div>

          <div class="bg-yellow-300/10 border border-yellow-300/10 rounded-lg p-3 mb-4">
            <div class="flex items-start gap-2">
              <svg class="w-4 h-4 text-yellow-300 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div class="text-xs text-yellow-300">
                <strong>Save these tokens now!</strong> They won't be shown again.
              </div>
            </div>
          </div>
          
          <div class="space-y-3 mb-4">
            <div v-for="item in claimedTokensList" :key="item.token" class="bg-gray-500/10 border border-gray-500/10 rounded-lg p-3">
              <div class="text-xs text-gray-400 mb-1">{{ item.name }}</div>
              <div class="flex items-center justify-between">
                <code class="text-sm text-green-300 break-all">{{ item.token }}</code>
                <button @click="copyToken(item.token)" class="ml-3 text-gray-400 hover:text-white shrink-0">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <button @click="showMultiTokenModal = false" class="w-full px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
            Done
          </button>
        </div>
      </div>
    </Teleport>

    <!-- Delete Key Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showDeleteKeyConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="cancelDeleteKey">
        <div class="bg-black rounded-xl p-6 w-full max-w-md border border-gray-500/20">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 class="text-sm font-semibold text-white">Delete Provider Key</h3>
              <p class="text-xs text-gray-400">This action cannot be undone.</p>
            </div>
          </div>
          
          <p class="text-sm text-gray-300 mb-6">
            Are you sure you want to delete <strong class="text-white">{{ keyToDelete?.name }}</strong>? 
            Any sponsorships using this key will stop working.
          </p>

          <div class="flex justify-end gap-3">
            <button @click="cancelDeleteKey" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button @click="confirmDeleteKey" class="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">
              Delete Key
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Revoke Sponsorship Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showRevokeSponsorshipConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="cancelRevokeSponsorship">
        <div class="bg-black rounded-xl p-6 w-full max-w-md border border-gray-500/20">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 class="text-sm font-semibold text-white">Revoke Sponsorship</h3>
              <p class="text-xs text-gray-400">This action cannot be undone.</p>
            </div>
          </div>
          
          <p class="text-sm text-gray-300 mb-6">
            Are you sure you want to revoke <strong class="text-white">{{ sponsorshipToRevoke?.name }}</strong>? 
            The recipient will no longer be able to use this sponsorship.
          </p>

          <div class="flex justify-end gap-3">
            <button @click="cancelRevokeSponsorship" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button @click="confirmRevokeSponsorship" class="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">
              Revoke
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Top Up Sponsorship Modal -->
    <Teleport to="body">
      <div v-if="showTopUpModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="cancelTopUp">
        <div class="bg-black rounded-xl p-6 w-full max-w-md border border-gray-500/20">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-blue-300/10 flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <h3 class="text-sm font-semibold text-white">Top Up Sponsorship</h3>
              <p class="text-xs text-gray-400">Increase the spending cap for {{ sponsorshipToTopUp?.name }}</p>
            </div>
          </div>
          
          <!-- Current Status -->
          <div class="bg-gray-500/10 rounded-lg p-4 mb-4">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div class="text-gray-400 text-xs mb-1">Current Cap</div>
                <div class="text-white font-medium">${{ sponsorshipToTopUp?.currentCap?.toFixed(2) }}</div>
              </div>
              <div>
                <div class="text-gray-400 text-xs mb-1">Already Spent</div>
                <div class="text-white font-medium">${{ sponsorshipToTopUp?.spent?.toFixed(2) }}</div>
              </div>
            </div>
          </div>

          <!-- Top Up Amount -->
          <div class="mb-4">
            <label class="block text-xs text-gray-400 mb-2">Add Amount ($)</label>
            <div class="flex gap-2">
              <button 
                v-for="amount in [25, 50, 100, 200]" 
                :key="amount"
                @click="topUpAmount = amount"
                :class="[
                  'px-3 py-2 text-sm rounded-lg border transition-colors',
                  topUpAmount === amount 
                    ? 'bg-blue-300/20 border-blue-300/20 text-blue-300' 
                    : 'bg-gray-500/10 border-gray-500/20 text-gray-400 hover:border-gray-500/40'
                ]"
              >
                ${{ amount }}
              </button>
            </div>
            <div class="mt-3">
              <input
                v-model.number="topUpAmount"
                type="number"
                min="1"
                step="1"
                class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-400"
                placeholder="Custom amount"
              />
            </div>
          </div>

          <!-- New Cap Preview -->
          <div class="bg-blue-300/10 border border-blue-300/20 rounded-lg p-3 mb-6">
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-300">New Cap</span>
              <span class="text-lg font-semibold text-blue-300">${{ ((sponsorshipToTopUp?.currentCap || 0) + topUpAmount).toFixed(2) }}</span>
            </div>
            <div class="text-xs text-gray-400 mt-1">
              Remaining after top-up: ${{ ((sponsorshipToTopUp?.currentCap || 0) + topUpAmount - (sponsorshipToTopUp?.spent || 0)).toFixed(2) }}
            </div>
          </div>

          <div class="flex justify-end gap-3">
            <button @click="cancelTopUp" class="px-4 py-2 text-sm text-gray-400 border border-gray-500/10 bg-gray-500/10 rounded-lg hover:text-white transition-colors">Cancel</button>
            <button 
              @click="confirmTopUp" 
              :disabled="topUpAmount <= 0"
              class="px-4 py-2 bg-blue-300 text-black rounded-lg text-sm font-medium hover:bg-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Top Up ${{ topUpAmount }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Sponsorship Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showDeleteSponsorshipConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="cancelDeleteSponsorship">
        <div class="bg-black rounded-xl p-6 w-full max-w-md border border-gray-500/20">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-red-400/10 flex items-center justify-center">
              <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h3 class="text-sm font-semibold text-white">Delete Sponsorship</h3>
              <p class="text-xs text-gray-400">This will permanently remove the sponsorship.</p>
            </div>
          </div>
          
          <p class="text-sm text-gray-300 mb-6">
            Are you sure you want to delete <strong class="text-white">{{ sponsorshipToDelete?.name }}</strong>? 
            This action cannot be undone.
          </p>

          <div class="flex justify-end gap-3">
            <button @click="cancelDeleteSponsorship" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button @click="confirmDeleteSponsorship" class="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">
              Delete
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Received Usage Details Modal -->
    <Teleport to="body">
      <div v-if="selectedReceivedId" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="selectedReceivedId = null">
        <div class="bg-black rounded-xl p-6 w-full max-w-2xl border border-gray-500/20 max-h-[80vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-sm font-semibold text-white">My Usage Details</h3>
            <button @click="selectedReceivedId = null" class="text-gray-400 hover:text-white">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div v-if="loadingReceivedUsage" class="text-center py-8 text-gray-400 text-sm">Loading usage data...</div>

          <div v-else-if="receivedUsageSummary" class="space-y-6">
            <div class="grid grid-cols-3 gap-4">
              <div class="bg-gray-500/10 rounded-lg p-4 text-center">
                <div class="text-lg font-semibold text-white">{{ formatCost(receivedUsageSummary.totalCost) }}</div>
                <div class="text-xs text-gray-400">Total Cost</div>
              </div>
              <div class="bg-gray-500/10 rounded-lg p-4 text-center">
                <div class="text-lg font-semibold text-white">{{ receivedUsageSummary.totalTokens.toLocaleString() }}</div>
                <div class="text-xs text-gray-400">Total Tokens</div>
              </div>
              <div class="bg-gray-500/10 rounded-lg p-4 text-center">
                <div class="text-lg font-semibold text-white">{{ receivedUsageSummary.totalRequests }}</div>
                <div class="text-xs text-gray-400">Requests</div>
              </div>
            </div>

            <div v-if="Object.keys(receivedUsageSummary.byModel).length > 0">
              <h4 class="text-xs font-medium text-gray-400 mb-3">Usage by Model</h4>
              <div class="space-y-2">
                <div v-for="(data, model) in receivedUsageSummary.byModel" :key="model" class="flex items-center justify-between bg-gray-500/10 rounded-lg p-3">
                  <code class="text-xs text-blue-300">{{ model }}</code>
                  <div class="flex items-center gap-4 text-xs">
                    <span class="text-gray-400">{{ data.requests }} requests</span>
                    <span class="text-gray-400">{{ data.tokens.toLocaleString() }} tokens</span>
                    <span class="text-white font-medium">{{ formatCost(data.cost) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="text-center py-8 text-gray-400 text-sm">No usage recorded yet</div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Create Pool Modal -->
    <Teleport to="body">
      <div v-if="showCreatePoolModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="showCreatePoolModal = false">
        <div class="bg-black rounded-xl p-6 w-full max-w-md border border-gray-500/20">
          <h3 class="text-sm font-semibold text-white mb-4">Create Sponsorship Pool</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-xs text-gray-400 mb-1">Pool Name</label>
              <input
                v-model="newPool.name"
                type="text"
                placeholder="e.g., OSS Project Fund"
                class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-400"
              />
            </div>
            
            <!-- <div>
              <label class="block text-xs text-gray-400 mb-1">Description (optional)</label>
              <textarea
                v-model="newPool.description"
                placeholder="Describe what this pool is for..."
                rows="2"
                class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-400 resize-none"
              ></textarea>
            </div> -->
            
            <div>
              <label class="block text-xs text-gray-400 mb-1">Routing Strategy</label>
              <div class="relative">
                <select
                  v-model="newPool.routingStrategy"
                  class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-400 appearance-none cursor-pointer"
                >
                  <option value="proportional">Proportional (by remaining budget)</option>
                  <option value="priority">Priority (highest priority first)</option>
                  <option value="round_robin">Round Robin (rotate evenly)</option>
                  <option value="cheapest_first">Cheapest First (most budget first)</option>
                  <option value="random">Random</option>
                </select>
                <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <button @click="showCreatePoolModal = false" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button
              @click="createPool"
              :disabled="!newPool.name.trim()"
              class="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Pool
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Pool Details Modal -->
    <Teleport to="body">
      <div v-if="showPoolDetailsModal && selectedPool" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="showPoolDetailsModal = false">
        <div class="bg-black rounded-xl p-6 w-full max-w-3xl border border-gray-500/20 max-h-[85vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h3 class="text-sm font-semibold text-white">{{ selectedPool.name }}</h3>
              <p class="text-xs text-gray-400 mt-1">{{ selectedPool.description || 'No description' }}</p>
            </div>
            <button @click="showPoolDetailsModal = false" class="text-gray-400 hover:text-white">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Pool Stats -->
          <div class="grid grid-cols-4 gap-4 mb-6">
            <div class="bg-gray-500/10 rounded-lg p-3 text-center">
              <div class="text-lg font-semibold text-white">{{ selectedPool.stats?.activeSponsors || 0 }}</div>
              <div class="text-xs text-gray-400">Active Sponsors</div>
            </div>
            <div class="bg-gray-500/10 rounded-lg p-3 text-center">
              <div class="text-lg font-semibold text-white">${{ (selectedPool.stats?.totalBudgetUsd || 0).toFixed(2) }}</div>
              <div class="text-xs text-gray-400">Total Budget</div>
            </div>
            <div class="bg-gray-500/10 rounded-lg p-3 text-center">
              <div class="text-lg font-semibold text-white">${{ (selectedPool.stats?.totalSpentUsd || 0).toFixed(2) }}</div>
              <div class="text-xs text-gray-400">Total Spent</div>
            </div>
            <div class="bg-gray-500/10 rounded-lg p-3 text-center">
              <div class="text-lg font-semibold text-green-300">${{ (selectedPool.stats?.remainingBudgetUsd || 0).toFixed(2) }}</div>
              <div class="text-xs text-gray-400">Remaining</div>
            </div>
          </div>

          <!-- Pool Tokens -->
          <div class="mb-6">
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-xs font-medium text-gray-400 uppercase">Pool Tokens</h4>
              <button @click="generatePoolToken" class="text-xs text-blue-400 hover:text-blue-300 transition-colors">Generate Token</button>
            </div>
            <div v-if="selectedPoolTokens.length === 0" class="bg-gray-500/10 rounded-lg p-4 text-center text-xs text-gray-400">No tokens generated yet</div>
            <div v-else class="space-y-2">
              <div v-for="token in selectedPoolTokens" :key="token.id" class="flex items-center justify-between bg-gray-500/10 rounded-lg p-3">
                <div>
                  <code class="text-xs text-blue-300">{{ token.tokenHint }}</code>
                  <span :class="['ml-2 text-[10px] px-1.5 py-0.5 rounded', token.isActive ? 'bg-green-400/10 text-green-300' : 'bg-red-400/10 text-red-300']">
                    {{ token.isActive ? 'Active' : 'Revoked' }}
                  </span>
                </div>
                <div class="flex items-center gap-3 text-xs text-gray-400">
                  <span>{{ token.usageCount }} uses</span>
                  <button v-if="token.isActive" @click="revokePoolToken(token.id)" class="text-red-400 hover:text-red-300">Revoke</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Pool Members -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-xs font-medium text-gray-400 uppercase">Pool Members (Sponsorships)</h4>
              <button @click="showAddMemberModal = true" class="text-xs text-blue-400 hover:text-blue-300 transition-colors">Add Sponsorship</button>
            </div>
            <div v-if="!selectedPool.members?.length" class="bg-gray-500/10 rounded-lg p-4 text-center text-xs text-gray-400">
              No sponsorships added yet. Add sponsorships to enable the pool.
            </div>
            <div v-else class="space-y-2">
              <div v-for="member in selectedPool.members" :key="member.id" class="flex items-center justify-between bg-gray-500/10 rounded-lg p-3">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-white font-medium">{{ member.sponsorship?.name || 'Unknown' }}</span>
                    <span class="text-[10px] px-1.5 py-0.5 bg-gray-500/20 rounded text-gray-400">{{ member.sponsorship?.provider || 'unknown' }}</span>
                    <span :class="['text-[10px] px-1.5 py-0.5 rounded', member.isActive && member.sponsorship?.status === 'active' ? 'bg-green-400/10 text-green-300' : 'bg-gray-500/10 text-gray-400']">
                      {{ member.isActive && member.sponsorship?.status === 'active' ? 'Active' : 'Inactive' }}
                    </span>
                  </div>
                  <div class="text-xs text-gray-400 mt-1">
                    Sponsor: {{ member.sponsorship?.sponsorName || 'Unknown' }} | 
                    Budget: ${{ (member.sponsorship?.spendCapUsd || 0).toFixed(2) }} | 
                    Remaining: ${{ (member.sponsorship?.remainingUsd || 0).toFixed(2) }}
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <div class="text-xs text-gray-400">P:{{ member.priority }} W:{{ member.weight }}</div>
                  <button @click="removePoolMember(member.id)" class="text-xs text-red-400 hover:text-red-300">Remove</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Add Pool Member Modal -->
    <Teleport to="body">
      <div v-if="showAddMemberModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="showAddMemberModal = false">
        <div class="bg-black rounded-xl p-6 w-full max-w-md border border-gray-500/20">
          <h3 class="text-sm font-semibold text-white mb-4">Add Sponsorship to Pool</h3>
          
          <!-- Mode Toggle -->
          <div class="flex mb-4 bg-gray-500/10 rounded-lg p-1">
            <button
              @click="addMemberMode = 'select'"
              :class="['flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors', addMemberMode === 'select' ? 'bg-white text-black' : 'text-gray-400 hover:text-white']"
            >
              Select Existing
            </button>
            <button
              @click="addMemberMode = 'token'"
              :class="['flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors', addMemberMode === 'token' ? 'bg-white text-black' : 'text-gray-400 hover:text-white']"
            >
              Enter Token
            </button>
          </div>
          
          <div class="space-y-4">
            <div v-if="addMemberMode === 'select'">
              <label class="block text-xs text-gray-400 mb-1">Select Sponsorship</label>
              <div class="relative">
                <select v-model="addMemberForm.sponsorshipId" class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-400 appearance-none cursor-pointer">
                  <option value="">Select a sponsorship...</option>
                  <option v-for="s in availableSponsorships" :key="s.id" :value="s.id">
                    {{ s.name }} ({{ s.provider }}) - ${{ s.remainingBudgetUsd?.toFixed(2) }} remaining
                  </option>
                </select>
                <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <p v-if="availableSponsorships.length === 0" class="text-xs text-gray-500 mt-1">No available sponsorships. Use "Enter Token" to add by sponsored token.</p>
            </div>
            
            <div v-if="addMemberMode === 'token'">
              <label class="block text-xs text-gray-400 mb-1">Sponsored Token</label>
              <input
                v-model="addMemberForm.token"
                type="text"
                placeholder="spt_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-400 font-mono"
              />
              <p class="text-xs text-gray-500 mt-1">Enter the sponsored token you received. It will be validated and linked to your organization.</p>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-gray-400 mb-1">Priority</label>
                <input v-model.number="addMemberForm.priority" type="number" min="0" class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-400" />
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">Weight</label>
                <input v-model.number="addMemberForm.weight" type="number" min="0" step="0.1" class="w-full bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-400" />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <button @click="showAddMemberModal = false" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button
              @click="addPoolMember"
              :disabled="(addMemberMode === 'select' && !addMemberForm.sponsorshipId) || (addMemberMode === 'token' && !addMemberForm.token.trim())"
              class="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add to Pool
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Generated Pool Token Modal -->
    <Teleport to="body">
      <div v-if="showGeneratePoolTokenModal && generatedPoolToken" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="showGeneratePoolTokenModal = false">
        <div class="bg-black rounded-xl p-6 w-full max-w-lg border border-gray-500/20">
          <div class="flex items-center gap-2 mb-4">
            <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="text-sm font-semibold text-white">Pool Token Generated</h3>
          </div>
          
          <div class="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4 mb-4">
            <div class="flex items-center justify-between">
              <code class="text-sm text-green-300 break-all">{{ generatedPoolToken }}</code>
              <button @click="copyToken(generatedPoolToken)" class="ml-3 text-gray-400 hover:text-white flex-shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          <div class="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3 mb-4">
            <div class="flex items-start gap-2">
              <svg class="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div class="text-xs text-yellow-300"><strong>Save this token now!</strong> It won't be shown again.</div>
            </div>
          </div>

          <button @click="showGeneratePoolTokenModal = false" class="w-full px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">Done</button>
        </div>
      </div>
    </Teleport>

    <!-- Delete Pool Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showDeletePoolConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="showDeletePoolConfirm = false">
        <div class="bg-black rounded-xl p-6 w-full max-w-md border border-gray-500/20">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 class="text-sm font-semibold text-white">Delete Pool</h3>
              <p class="text-xs text-gray-400">This action cannot be undone.</p>
            </div>
          </div>
          
          <p class="text-sm text-gray-300 mb-6">Are you sure you want to delete this pool? All pool tokens will be invalidated immediately.</p>

          <div class="flex justify-end gap-3">
            <button @click="showDeletePoolConfirm = false" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button @click="deletePool" class="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">Delete Pool</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Sponsor Badge Modal -->
    <Teleport to="body">
      <div v-if="showBadgeModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="showBadgeModal = false">
        <div class="bg-black rounded-xl p-6 w-full max-w-lg border border-gray-500/20">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-semibold text-white">Your Sponsor Badge</h3>
            <button @click="showBadgeModal = false" class="text-gray-400 hover:text-white">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <p class="text-xs text-gray-400 mb-4">
            Add this badge to your README, website, or anywhere else to let people sponsor your AI usage.
          </p>

          <!-- Preview -->
          <div class="bg-gray-500/10 rounded-lg p-6 mb-4 flex items-center justify-center">
            <a :href="badgeUrl" target="_blank">
              <img 
                :src="badgeImageUrl" 
                alt="Sponsor me on AI Ratelimit"
                class="h-7"
              />
            </a>
          </div>
          
          <p class="text-[10px] text-gray-500 mb-4 text-center">
            This is how the badge will look. Copy the code below to add it to your README or website.
          </p>

          <!-- Embed Options -->
          <div class="space-y-4">
            <!-- Markdown -->
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-2">Markdown (for GitHub READMEs)</label>
              <div class="relative">
                <code class="block bg-gray-500/10 rounded-lg p-3 text-xs text-gray-300 font-mono overflow-x-auto">[![Sponsor me on AI Ratelimit]({{ badgeImageUrl }})]({{ badgeUrl }})</code>
                <button 
                  @click="copy(`[![Sponsor me on AI Ratelimit](${badgeImageUrl})](${badgeUrl})`)"
                  class="absolute top-2 right-2 p-1.5 bg-gray-500/10 hover:bg-gray-500/20 rounded text-gray-400"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- HTML -->
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-2">HTML (for websites)</label>
              <div class="relative">
                <code class="block bg-gray-500/10 rounded-lg p-3 text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap">&lt;a href="{{ badgeUrl }}"&gt;
  &lt;img src="{{ badgeImageUrl }}" alt="Sponsor me on AI Ratelimit"&gt;
&lt;/a&gt;</code>
                <button 
                  @click="copy(`<a href=&quot;${badgeUrl}&quot;>\n  <img src=&quot;${badgeImageUrl}&quot; alt=&quot;Sponsor me on AI Ratelimit&quot;>\n</a>`)"
                  class="absolute top-2 right-2 p-1.5 bg-gray-500/10 hover:bg-gray-500/20 rounded text-gray-400"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Direct Link -->
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-2">Direct Link</label>
              <div class="relative">
                <code class="block bg-gray-500/10 rounded-lg p-3 text-xs text-gray-300 font-mono overflow-x-auto">{{ badgeUrl }}</code>
                <button 
                  @click="copy(badgeUrl)"
                  class="absolute top-2 right-2 p-1.5 bg-gray-500/10 hover:bg-gray-500/20 rounded text-gray-400"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <button @click="showBadgeModal = false" class="w-full mt-6 px-4 py-2 bg-gray-500/10 border border-gray-500/10 hover:bg-gray-500/20 text-white rounded-lg text-sm font-medium transition-colors">Done</button>
        </div>
      </div>
    </Teleport>

    <!-- Unlink GitHub Confirm Dialog -->
    <ConfirmDialog
      :is-open="showUnlinkGitHubConfirm"
      title="Unlink GitHub Account"
      message="Are you sure you want to unlink your GitHub account? You won't be able to receive sponsorships targeted to your GitHub username until you link it again."
      confirm-text="Unlink"
      cancel-text="Cancel"
      variant="danger"
      @confirm="confirmUnlinkGitHub"
      @cancel="showUnlinkGitHubConfirm = false"
    />
  </div>
</template>
