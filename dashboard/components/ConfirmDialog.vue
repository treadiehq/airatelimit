<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 overflow-y-auto"
        @click.self="cancel"
      >
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/70 transition-opacity" @click="cancel"></div>

        <!-- Modal -->
        <div class="flex min-h-full items-center justify-center p-4">
          <div
            class="relative bg-black border border-gray-500/20 rounded-lg shadow-xl w-full max-w-md"
            @click.stop
          >
            <!-- Icon -->
            <div class="px-6 pt-6 pb-4">
              <div
                :class="[
                  'mx-auto flex items-center justify-center h-12 w-12 rounded-full',
                  variant === 'danger' ? 'bg-red-400/10' : 'bg-yellow-300/10'
                ]"
              >
                <svg
                  v-if="variant === 'danger'"
                  class="h-6 w-6 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <svg
                  v-else
                  class="h-6 w-6 text-yellow-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>

            <!-- Content -->
            <div class="px-6 pb-4 text-center">
              <h3 class="text-lg font-medium text-white mb-2">
                {{ title }}
              </h3>
              <p class="text-sm text-gray-400">
                {{ message }}
              </p>
            </div>

            <!-- Actions -->
            <div class="px-6 py-4 border-t border-gray-500/20 flex space-x-3">
              <button
                @click="cancel"
                type="button"
                class="flex-1 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-500/10 border border-gray-500/20 rounded-lg hover:bg-gray-500/20 transition-colors"
              >
                {{ cancelText }}
              </button>
              <button
                @click="confirm"
                type="button"
                :class="[
                  'flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  variant === 'danger'
                    ? 'bg-red-400 text-white hover:bg-red-500'
                    : 'bg-yellow-300 text-black hover:bg-yellow-400'
                ]"
              >
                {{ confirmText }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning'
}>(), {
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'danger'
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const confirm = () => {
  emit('confirm')
}

const cancel = () => {
  emit('cancel')
}

// Close on Escape key
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    cancel()
  }
}

onMounted(() => {
  if (process.client) {
    document.addEventListener('keydown', handleKeydown)
  }
})

onUnmounted(() => {
  if (process.client) {
    document.removeEventListener('keydown', handleKeydown)
  }
})
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>

