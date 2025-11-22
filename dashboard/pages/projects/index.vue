<template>
  <NuxtLayout>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Breadcrumbs -->
      <!-- <Breadcrumbs :items="breadcrumbs" /> -->

      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-xl font-medium text-white">Projects</h2>
          <p class="text-sm text-gray-400 mt-1">
            {{ projects.length }} {{ projects.length === 1 ? 'project' : 'projects' }}
          </p>
        </div>
        <button
          @click="showModal = true"
          class="px-4 py-2 bg-blue-300 text-black text-sm font-medium rounded-lg hover:bg-blue-400 transition-colors inline-flex items-center space-x-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Create Project</span>
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SkeletonCard v-for="i in 3" :key="i" />
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-400/10 text-red-400 p-4 rounded-lg border border-red-400/20">
        <div class="flex items-center space-x-2">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          <span>{{ error }}</span>
        </div>
      </div>

      <!-- Empty State -->
      <EmptyState
        v-else-if="projects.length === 0"
        title="No projects yet"
        description="Create your first project to start managing your AI API rate limits and usage tracking."
        button-text="Create Your First Project"
        @action="showModal = true"
      />

      <!-- Projects Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ProjectCard
          v-for="project in projects"
          :key="project.id"
          :project="project"
          :usage="projectUsage[project.id]"
          @delete="handleDeleteRequest"
        />
      </div>
    </div>

    <!-- Create Project Modal -->
    <CreateProjectModal
      :is-open="showModal"
      @close="showModal = false"
      @created="handleProjectCreated"
    />

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
      :is-open="showDeleteConfirm"
      title="Delete Project"
      message="Are you sure you want to delete this project? This action cannot be undone and all associated data will be permanently removed."
      confirm-text="Delete"
      cancel-text="Cancel"
      variant="danger"
      @confirm="confirmDelete"
      @cancel="showDeleteConfirm = false"
    />
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

useHead({
  title: 'Projects - AI Rate Limiting'
})

const api = useApi()
const { success, error: showError } = useToast()

const projects = ref<any[]>([])
const projectUsage = ref<Record<string, any>>({})
const loading = ref(true)
const error = ref('')
const showModal = ref(false)
const showDeleteConfirm = ref(false)
const projectToDelete = ref<string | null>(null)

// const breadcrumbs = [
//   { label: 'Home', to: '/' },
//   { label: 'Projects' }
// ]

const loadProjects = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const data = await api('/projects')
    projects.value = data

    // Load usage data for each project
    for (const project of data) {
      try {
        const usage = await api(`/projects/${project.id}/usage/summary`)
        projectUsage.value[project.id] = usage
      } catch (err) {
        // Silently fail for usage data
        projectUsage.value[project.id] = {
          requestsUsed: 0,
          tokensUsed: 0,
          withinLimits: true
        }
      }
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load projects'
    showError('Failed to load projects')
  } finally {
    loading.value = false
  }
}

// Optimistic UI: Add project immediately, then update from server
const handleProjectCreated = async () => {
  showModal.value = false
  success('Project created successfully!')
  
  // Reload projects to get the new one
  await loadProjects()
}

const handleDeleteRequest = (projectId: string) => {
  projectToDelete.value = projectId
  showDeleteConfirm.value = true
}

const confirmDelete = async () => {
  if (!projectToDelete.value) return

  const projectId = projectToDelete.value
  showDeleteConfirm.value = false

  // Optimistic update: Remove from UI immediately
  const removedProject = projects.value.find(p => p.id === projectId)
  projects.value = projects.value.filter(p => p.id !== projectId)

  try {
    await api(`/projects/${projectId}`, { method: 'DELETE' })
    success('Project deleted successfully')
  } catch (err: any) {
    // Revert on error
    if (removedProject) {
      projects.value.push(removedProject)
    }
    showError(err.message || 'Failed to delete project')
  } finally {
    projectToDelete.value = null
  }
}

onMounted(() => {
  loadProjects()
})

// Reload projects when navigating to this page
const route = useRoute()
watch(() => route.path, (newPath) => {
  if (newPath === '/projects') {
    loadProjects()
  }
})
</script>
