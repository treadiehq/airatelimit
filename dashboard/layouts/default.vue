<template>
  <div class="min-h-screen bg-black">
    <nav class="bg-black border-b border-gray-500/20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-12 items-center">
          <div class="flex items-center space-x-4">
            <NuxtLink to="/projects" class="text-base font-medium text-white">
              <img src="~/assets/img/logo.png" alt="AI Rate Limiting" class="w-6 h-6">
            </NuxtLink>
            <span class="text-sm text-gray-500/50">|</span>
            <div class="text-sm text-white font-medium">{{ organization?.name || 'Loading...' }}</div>
          </div>
          
          <div class="relative">
            <button
              @click="toggleDropdown"
              class="flex items-center space-x-2 focus:outline-none"
            >
              <div class="w-6 h-6 bg-amber-300 rounded-full flex items-center justify-center text-black font-semibold text-[10px]">
                {{ userInitials }}
              </div>
            </button>

            <!-- Dropdown Menu -->
            <div
              v-if="showDropdown"
              class="absolute right-0 mt-2 w-56 bg-black rounded-lg shadow-lg border border-gray-500/20 py-1 z-50"
            >
              <div class="px-4 py-3 border-b border-gray-500/20">
                <p class="text-sm text-gray-400">Signed in as</p>
                <p class="text-sm font-medium text-white truncate">{{ user?.email }}</p>
              </div>
              <button
                @click="handleLogout"
                class="w-full text-left px-4 py-2 text-sm text-gray-400 hover:bg-gray-500/10 hover:text-white flex items-center space-x-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <slot />
  </div>
</template>

<script setup lang="ts">
const { user, logout } = useAuth()
const { organization, loadOrganization } = useOrganization()

const showDropdown = ref(false)

const userInitials = computed(() => {
  if (!user.value?.email) return '?'
  const email = user.value.email
  const name = email.split('@')[0]
  return name.substring(0, 2).toUpperCase()
})

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

const handleLogout = () => {
  showDropdown.value = false
  logout()
}

// Close dropdown when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.relative')) {
    showDropdown.value = false
  }
}

onMounted(() => {
  loadOrganization()
  if (process.client) {
    document.addEventListener('click', handleClickOutside)
  }
})

onUnmounted(() => {
  if (process.client) {
    document.removeEventListener('click', handleClickOutside)
  }
})
</script>

