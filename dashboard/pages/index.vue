<template>
  <div class="min-h-screen bg-black flex items-center justify-center">
    <div class="text-center">
      <h1 class="text-4xl font-bold text-white mb-4">AI Rate Limit</h1>
      <p class="text-gray-400 mb-8">Manage your AI API projects and usage</p>
      <div class="space-x-4">
        <NuxtLink
          to="/login"
          class="px-6 py-3 font-medium bg-blue-300 text-black rounded-lg hover:bg-blue-400 inline-block"
        >
          Login
        </NuxtLink>
        <NuxtLink
          to="/signup"
          class="px-6 py-3 font-medium bg-gray-300 text-black rounded-lg hover:bg-gray-400 inline-block"
        >
          Sign Up
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'AI Rate Limiting - Smart Rate Limiting for AI APIs'
})
</script>
