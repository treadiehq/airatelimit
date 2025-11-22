<template>
  <div class="text-center py-12 px-4">
    <!-- Icon -->
    <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-500/10 mb-4">
      <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    </div>

    <!-- Message -->
    <h3 class="text-lg font-medium text-white mb-2">{{ title }}</h3>
    <p class="text-gray-400 text-sm mb-6 max-w-sm mx-auto">{{ description }}</p>

    <!-- Action Button -->
    <slot name="action">
      <button
        v-if="buttonText"
        @click="$emit('action')"
        class="px-4 py-2 bg-blue-300 text-black text-sm font-medium rounded-lg hover:bg-blue-400 inline-flex items-center space-x-2 transition-colors"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span>{{ buttonText }}</span>
      </button>
    </slot>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description: string
  buttonText?: string
}>()

defineEmits<{
  action: []
}>()
</script>

