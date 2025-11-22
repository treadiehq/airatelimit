<template>
  <span>{{ displayValue }}</span>
</template>

<script setup lang="ts">
const props = defineProps<{
  value: number
  duration?: number
  formatFn?: (val: number) => string
}>()

const displayValue = ref(0)
let animationFrame: number | null = null

const animate = (start: number, end: number, duration: number) => {
  const startTime = performance.now()
  
  const step = (currentTime: number) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    // Easing function (easeOutQuad)
    const eased = 1 - (1 - progress) * (1 - progress)
    
    const current = start + (end - start) * eased
    displayValue.value = props.formatFn ? 
      props.formatFn(Math.round(current)) : 
      Math.round(current)
    
    if (progress < 1) {
      animationFrame = requestAnimationFrame(step)
    }
  }
  
  animationFrame = requestAnimationFrame(step)
}

watch(() => props.value, (newVal, oldVal) => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
  animate(oldVal || 0, newVal, props.duration || 500)
}, { immediate: true })

onUnmounted(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
})
</script>

