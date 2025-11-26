<template>
  <div class="fixed bottom-6 right-6 z-40">
    <!-- Expanded Menu -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95 translate-y-2"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-95 translate-y-2"
    >
      <div v-if="isOpen" class="absolute bottom-16 right-0 mb-2 space-y-2">
        <button
          v-for="action in actions"
          :key="action.id"
          @click="handleAction(action)"
          class="flex items-center gap-3 px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg shadow-lg hover:bg-gray-800 hover:border-gray-600 transition-all group whitespace-nowrap"
        >
          <span class="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 group-hover:bg-gray-700 transition-colors">
            <component :is="action.icon" class="w-4 h-4 text-blue-300" />
          </span>
          <div class="text-left">
            <div class="text-sm font-medium text-white">{{ action.label }}</div>
            <div class="text-xs text-gray-400">{{ action.description }}</div>
          </div>
        </button>
      </div>
    </Transition>

    <!-- FAB Button -->
    <button
      @click="isOpen = !isOpen"
      :class="[
        'w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200',
        isOpen 
          ? 'bg-gray-700 rotate-45' 
          : 'bg-blue-500 hover:bg-blue-400 hover:scale-105'
      ]"
    >
      <svg class="w-6 h-6 text-white transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: 'action', id: string): void
}>()

const props = defineProps<{
  actions: Array<{
    id: string
    label: string
    description: string
    icon: any
  }>
}>()

const isOpen = ref(false)

const handleAction = (action: { id: string }) => {
  emit('action', action.id)
  isOpen.value = false
}

// Close on escape
onMounted(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') isOpen.value = false
  }
  window.addEventListener('keydown', handler)
  onUnmounted(() => window.removeEventListener('keydown', handler))
})

// Close on click outside
const closeOnOutside = (e: MouseEvent) => {
  if (isOpen.value && !(e.target as Element).closest('.fixed.bottom-6')) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeOnOutside)
  onUnmounted(() => document.removeEventListener('click', closeOnOutside))
})
</script>

