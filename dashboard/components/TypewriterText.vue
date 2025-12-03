<template>
  <span>{{ displayedText }}<span v-if="isTyping" class="cursor">|</span></span>
</template>

<script setup lang="ts">
const props = defineProps<{
  text: string
  speed?: number
}>()

const displayedText = ref('')
const isTyping = ref(true)

onMounted(() => {
  let index = 0
  const speed = props.speed || 15
  
  const typeNextChar = () => {
    if (index < props.text.length) {
      displayedText.value += props.text[index]
      index++
      setTimeout(typeNextChar, speed + Math.random() * 10)
    } else {
      isTyping.value = false
    }
  }
  
  typeNextChar()
})

watch(() => props.text, () => {
  displayedText.value = ''
  isTyping.value = true
})
</script>

<style scoped>
.cursor {
  animation: blink 1s infinite;
  color: rgb(147 197 253);
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
</style>

