<template>
  <div class="min-h-screen relative bg-black flex items-center justify-center p-4">
    <div class="radial-gradient absolute top-0 md:right-14 right-5"></div>
    <div class="max-w-md w-full relative z-10">
      <div class="text-center mb-8">
        <div class="inline-flex items-center gap-2 mb-3">
          <img src="/logo.png" alt="AI Rate Limiting" class="w-14 h-14">
        </div>
        <h1 class="text-2xl font-bold text-white mb-2">Create your account</h1>
        <p class="text-gray-400 text-sm">Get started with AI Rate Limit</p>
      </div>

      <div class="bg-gray-500/10 border border-gray-500/15 rounded-lg p-8">
        <div v-if="!accountCreated">
          <form @submit.prevent="handleSignup">
            <div class="mb-4">
              <label class="block text-sm font-medium text-white mb-2">
                Organization Name
              </label>
              <input
                v-model="organizationName"
                type="text"
                required
                minlength="2"
                maxlength="100"
                class="w-full px-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-gray-500/10 focus:border-transparent"
                placeholder="Acme Inc"
              />
            </div>

            <div class="mb-6">
              <label class="block text-sm font-medium text-white mb-2">
                Email Address
              </label>
              <input
                v-model="email"
                type="email"
                required
                class="w-full px-4 py-2 text-white bg-gray-500/10 border border-gray-500/10 rounded-lg focus:ring-2 focus:ring-gray-500/10 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>

            <div v-if="error" class="mb-4 p-3 bg-red-400/10 border border-red-400/20 text-red-400 rounded-lg text-sm">
              <p>{{ error }}</p>
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="w-full px-4 py-2 font-medium bg-blue-300 text-black rounded-lg hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ loading ? 'Creating account...' : 'Create account' }}
            </button>
          </form>

          <div class="mt-4 text-center text-sm text-gray-400">
            Already have an account?
            <NuxtLink to="/login" class="text-blue-300 hover:text-blue-400 font-medium">
              Sign in
            </NuxtLink>
          </div>
        </div>

        <div v-else class="text-center">
          <div class="mb-6">
            <div class="w-16 h-16 bg-green-300/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-white mb-2">Account created!</h3>
            <p class="text-gray-400 mb-4">
              Check your email at <strong>{{ email }}</strong> for a magic link to sign in.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Sign Up - AI Ratelimit'
})

const api = useApi()
const email = ref('')
const organizationName = ref('')
const loading = ref(false)
const error = ref('')
const accountCreated = ref(false)

const handleSignup = async () => {
  loading.value = true
  error.value = ''

  try {
    await api('/auth/signup', {
      method: 'POST',
      body: { 
        email: email.value,
        organizationName: organizationName.value
      }
    })
    accountCreated.value = true
  } catch (err: any) {
    error.value = err.message || 'Signup failed'
  } finally {
    loading.value = false
  }
}
</script>
