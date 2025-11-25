<template>
  <div class="min-h-screen relative bg-black flex items-center justify-center p-4">
    <div class="radial-gradient absolute top-0 md:right-14 right-5"></div>
    <div class="max-w-md w-full relative z-10">
      <!-- Logo/Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center gap-2 mb-3">
          <img src="/logo.png" alt="AI Rate Limiting" class="w-14 h-14">
        </div>
        <h1 class="text-2xl font-bold text-white mb-2">Welcome back</h1>
        <p class="text-gray-400 text-sm">Log in to your account</p>
      </div>

      <div class="bg-gray-500/10 border border-gray-500/15 rounded-lg p-8">
        <div v-if="!linkSent">
          <form @submit.prevent="handleRequestMagicLink">
            <div class="mb-6">
              <label class="block text-sm font-medium text-white mb-2">
                Email Address
              </label>
              <input
                v-model="email"
                type="email"
                required
                class="w-full px-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-gray-500/10 focus:border-transparent"
                placeholder="your@companyemail.com"
              />
            </div>

            <div v-if="error" class="mb-4 p-3 bg-red-400/10 border border-red-400/20 text-red-400 rounded-lg text-sm">
              <p>{{ error }}</p>
              <!-- <p v-if="error.includes('No account found')" class="mt-2">
                <NuxtLink to="/signup" class="text-blue-300 hover:text-blue-400 font-medium underline">
                  Create an account →
                </NuxtLink>
              </p> -->
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="w-full px-4 py-2 font-medium bg-blue-300 text-black rounded-lg hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ loading ? 'Sending...' : 'Send magic link' }}
            </button>
          </form>

          <div class="mt-4 text-center text-sm text-gray-400">
            Don't have an account?
            <NuxtLink to="/signup" class="text-blue-300 hover:text-blue-400 font-medium">
              Sign up
            </NuxtLink>
          </div>
        </div>

        <div v-else class="text-center">
          <div class="mb-6">
            <div class="w-16 h-16 bg-green-300/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-white mb-2">Check your email!</h3>
            <p class="text-gray-400 mb-4">
              We've sent a magic link to <strong>{{ email }}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Login - AI Ratelimit'
})

const api = useApi()
const email = ref('')
const loading = ref(false)
const error = ref('')
const linkSent = ref(false)

const handleRequestMagicLink = async () => {
  loading.value = true
  error.value = ''

  try {
    await api('/auth/magic-link/request', {
      method: 'POST',
      body: { email: email.value }
    })
    linkSent.value = true
  } catch (err: any) {
    error.value = err.message || 'Failed to send magic link'
  } finally {
    loading.value = false
  }
}
</script>
