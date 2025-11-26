<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-2"
  >
    <div v-if="changes.length > 0" class="bg-amber-300/10 border border-amber-300/10 rounded-lg p-4 mb-4">
      <div class="flex items-start gap-3">
        <div class="w-8 h-8 rounded-lg bg-amber-300/10 flex items-center justify-center shrink-0">
          <svg class="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="text-sm font-medium text-amber-300 mb-2">Unsaved Changes</h4>
          <ul class="space-y-1.5">
            <li 
              v-for="(change, i) in changes" 
              :key="i"
              class="flex items-start gap-2 text-xs"
            >
              <span class="text-gray-400 shrink-0">{{ change.field }}:</span>
              <span class="text-red-400/70 line-through truncate">{{ formatValue(change.from) }}</span>
              <svg class="w-3 h-3 text-gray-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <span class="text-green-300 truncate">{{ formatValue(change.to) }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
interface Change {
  field: string
  from: any
  to: any
}

defineProps<{
  changes: Change[]
}>()

const formatValue = (value: any) => {
  if (value === null || value === undefined || value === '') return '(empty)'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return value.toLocaleString()
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
</script>

