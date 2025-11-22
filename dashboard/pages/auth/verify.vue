<template>
  <div class="min-h-screen bg-black flex items-center justify-center px-4">
    <div class="max-w-md w-full text-center">
      <div v-if="loading" class="bg-gray-500/10 border border-gray-500/15 rounded-lg p-8">
        <div class="w-16 h-16 bg-blue-300/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-blue-300 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-white mb-2">Verifying your magic link...</h2>
        <p class="text-gray-400">Please wait while we sign you in.</p>
      </div>

      <div v-else-if="error" class="bg-gray-500/10 border border-gray-500/15 rounded-lg p-8">
        <div class="w-16 h-16 bg-red-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-white mb-2">Verification failed</h2>
        <p class="text-gray-400 mb-6">{{ error }}</p>
        <NuxtLink
          to="/login"
          class="inline-block px-6 py-2 font-medium bg-blue-300 text-black rounded-lg hover:bg-blue-400"
        >
          Back to login
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Verifying - AI Rate Limiting'
})

const route = useRoute()
const api = useApi()
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  const token = route.query.token as string

  if (!token) {
    error.value = 'No verification token provided'
    loading.value = false
    return
  }

  try {
    const response = await api('/auth/magic-link/verify', {
      method: 'POST',
      body: { token }
    })

    // Store the token and user data
    if (response.accessToken && response.user) {
      localStorage.setItem('accessToken', response.accessToken)
      localStorage.setItem('user', JSON.stringify(response.user))
      
      // Redirect to projects page
      await navigateTo('/projects')
    } else {
      error.value = 'Invalid response from server'
    }
  } catch (err: any) {
    error.value = err.message || 'Verification failed. The link may have expired.'
  } finally {
    loading.value = false
  }
})
</script>

