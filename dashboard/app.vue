<template>
  <div class="min-h-screen bg-black">
    <NuxtPage />
    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
// Load auth on app mount
onMounted(() => {
  const { loadFromStorage } = useAuth()
  loadFromStorage()
})
</script>

<style>
/* Page transitions */
.page-enter-active,
.page-leave-active {
  transition: all 0.2s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
